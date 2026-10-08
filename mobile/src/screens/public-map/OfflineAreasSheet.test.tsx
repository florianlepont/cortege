import React from "react"
import renderer, { act } from "react-test-renderer"

const mockDismissKeyboard = jest.fn()
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Keyboard: { dismiss: () => mockDismissKeyboard() },
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/GlassSurface", () => ({ GlassSurface: "GlassSurface" }))
jest.mock("../../ui/AppField", () => ({ AppField: "AppField" }))
jest.mock("../../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))
jest.mock("../../ui/AppSectionHeader", () => ({ AppSectionHeader: "AppSectionHeader" }))
jest.mock("./DownloadStatusView", () => ({
  DownloadStatusView: "DownloadStatusView",
  measureStatuses: (
    jest.requireActual("./DownloadStatusView") as typeof import("./DownloadStatusView")
  ).measureStatuses,
}))

import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import { OfflineAreasSheet } from "./OfflineAreasSheet"

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

const estimate = {
  tileCountPerBasemap: 93,
  totalTileCount: 186,
  estimatedBytes: 2_000_000,
  exceedsCap: false,
}
const running: AreaDownloadStatus = {
  phase: "running",
  areaId: "area-1",
  name: "Bois du Nord",
  percentage: 42,
  downloadedTiles: 78,
  totalTiles: 186,
}

function render(
  downloadStatus: AreaDownloadStatus | null,
  downloadingAreaId: string | null = null,
  exceedsCap = false,
) {
  const handlers = {
    onDownload: jest.fn(),
    onDone: jest.fn(),
    onRetry: jest.fn(),
    onClose: jest.fn(),
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <OfflineAreasSheet
        downloadingAreaId={downloadingAreaId}
        downloadStatus={downloadStatus}
        estimate={{ ...estimate, exceedsCap }}
        {...handlers}
      />,
    )
  })
  const form = tree.root.find((node) => node.props.testID === "offline-area-form")
  const status = tree.root.findAll(
    (node) => (node.type as unknown) === "DownloadStatusView" && node.props.announce !== false,
  )
  return { tree, form, status, handlers }
}

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

describe("OfflineAreasSheet states (12.2-19 third round)", () => {
  test("before a download: the form, seen and usable, with no status over it", () => {
    const { form, status, tree, handlers } = render(null)
    expect(status).toHaveLength(0)
    expect(form.props.pointerEvents).toBe("auto")
    expect(form.props.accessibilityElementsHidden).toBe(false)
    expect(form.props.importantForAccessibility).toBe("auto")
    expect(flat(form.props.style).opacity).toBeUndefined()

    const button = tree.root.findByType("GlassButton" as never)
    act(() => button.props.onPress())
    // The keyboard of the name field goes with the form; the default name is used when empty.
    expect(mockDismissKeyboard).toHaveBeenCalledTimes(1)
    expect(handlers.onDownload).toHaveBeenCalledWith(expect.stringContaining("Zone du "))

    const field = tree.root.findByType("AppField" as never)
    act(() => field.props.onChangeText("  Bois du Nord  "))
    act(() => tree.root.findByType("GlassButton" as never).props.onPress())
    expect(handlers.onDownload).toHaveBeenLastCalledWith("Bois du Nord")
  })

  test("while it runs: the status lies over the form, which keeps its place but is hidden", () => {
    const { form, status } = render(running, "area-1")
    expect(status).toHaveLength(1)
    expect(status[0].props.status).toBe(running)
    // Laid out (so the panel keeps its height) but not seen, not touched, not read.
    expect(flat(form.props.style).opacity).toBe(0)
    expect(form.props.pointerEvents).toBe("none")
    expect(form.props.accessibilityElementsHidden).toBe(true)
    expect(form.props.importantForAccessibility).toBe("no-hide-descendants")
    const layer = status[0].parent!
    expect(flat(layer.props.style)).toMatchObject({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    })
  })

  test("the same form under every state, so the panel never changes height", () => {
    const states: AreaDownloadStatus[] = [
      running,
      { ...running, phase: "done", percentage: 100, downloadedTiles: 186 },
      { phase: "failed", areaId: "area-1", name: "Bois du Nord" },
    ]
    const shapes = [null, ...states].map((state) => {
      const { tree } = render(state)
      return [
        tree.root.findAllByType("AppField" as never).length,
        tree.root.findAllByType("GlassButton" as never).length,
      ]
    })
    expect(new Set(shapes.map((shape) => shape.join()))).toEqual(new Set(["1,1"]))
  })

  test("done closes through onDone; retry starts again with the area's name", () => {
    const failed: AreaDownloadStatus = { phase: "failed", areaId: "area-2", name: "Lisière" }
    const { status, handlers } = render(failed)
    expect(status[0].props.onDone).toBe(handlers.onDone)
    act(() => status[0].props.onRetry())
    expect(handlers.onRetry).toHaveBeenCalledWith("Lisière")
    // One view per download: a retry is a new area, so its announcements start again.
    expect(status[0].props.status.areaId).toBe("area-2")
  })

  test("the close button stays in every state", () => {
    const { tree, handlers } = render(running, "area-1")
    const header = tree.root.findByType("AppSectionHeader" as never)
    expect(header.props.title).toBe(fr.offlineMap.areas.title)
    const close = header.props.trailing as React.ReactElement<{ onPress: () => void }>
    close.props.onPress()
    expect(handlers.onClose).toHaveBeenCalledTimes(1)
  })

  describe("layout: the estimate, the warning and the button stack, never overlap (12.2-19)", () => {
    // The owner's iPhone showed the button over the estimate line. Everything between the header
    // and the button's bottom edge must be in the flow of one column: no absolute position, no
    // negative margin, no fixed height, from the button and the estimate line up to the panel.
    const host = (tree: renderer.ReactTestRenderer, testID: string) =>
      tree.root.find((node) => node.props.testID === testID && typeof node.type === "string")

    function ancestorsOf(
      node: renderer.ReactTestInstance,
      root: renderer.ReactTestInstance,
    ): renderer.ReactTestInstance[] {
      const chain: renderer.ReactTestInstance[] = []
      for (
        let current: renderer.ReactTestInstance | null = node;
        current;
        current = current.parent
      ) {
        chain.push(current)
        if (current === root) break
      }
      return chain
    }

    function expectInFlow(node: renderer.ReactTestInstance, root: renderer.ReactTestInstance) {
      for (const link of ancestorsOf(node, root)) {
        const style = flat(link.props.style)
        expect(style.position).not.toBe("absolute")
        expect(style).not.toHaveProperty("height")
        expect(style).not.toHaveProperty("maxHeight")
        for (const key of ["margin", "marginTop", "marginBottom", "top", "bottom"]) {
          expect((style[key] as number | undefined) ?? 0).toBeGreaterThanOrEqual(0)
        }
      }
    }

    test.each([
      ["the estimate", false, () => fr.offlineMap.areas.estimate({ tiles: 186, bytes: 2_000_000 })],
      ["the size warning", true, () => fr.offlineMap.areas.tooLarge],
    ])("%s sits above the button, both in the column's flow", (_name, exceedsCap, line) => {
      const { tree } = render(null, null, exceedsCap)
      const body = host(tree, "offline-area-body")
      const form = host(tree, "offline-area-form")
      const children = form.children as renderer.ReactTestInstance[]
      const textIndex = children.findIndex((child) => child.props.children === line())
      const buttonIndex = children.findIndex((child) => (child.type as unknown) === "GlassButton")
      // Field, then the line, then the button: siblings of one column, spaced by its gap.
      expect(textIndex).toBe(1)
      expect(buttonIndex).toBe(textIndex + 1)
      expect(flat(form.props.style).gap).toBeGreaterThan(0)
      expect(flat(form.props.style).flexDirection ?? "column").toBe("column")
      expectInFlow(children[textIndex], body)
      expectInFlow(children[buttonIndex], body)
      // The body only ever has a floor: it can always grow with the form.
      expect(flat(body.props.style)).not.toHaveProperty("height")
      expect(flat(body.props.style)).not.toHaveProperty("maxHeight")
    })

    test("the panel reserves the tallest status, as measured, never a fixed number", () => {
      const { tree } = render(null)
      const body = () => host(tree, "offline-area-body")
      const layer = tree.root.find((node) => node.props.testID === "offline-area-measure")
      // Unseen, untouchable, unread, out of the flow.
      expect(flat(layer.props.style)).toMatchObject({ position: "absolute", opacity: 0 })
      expect(layer.props.pointerEvents).toBe("none")
      expect(layer.props.accessibilityElementsHidden).toBe(true)
      expect(layer.props.importantForAccessibility).toBe("no-hide-descendants")
      const copies = layer.findAll((node) => (node.type as unknown) === "DownloadStatusView")
      expect(copies.map((copy) => copy.props.status.phase)).toEqual(["running", "done", "failed"])
      for (const copy of copies) expect(copy.props.announce).toBe(false)
      expect(flat(body().props.style).minHeight).toBe(0)

      const report = (phase: string, height: number) =>
        act(() =>
          tree.root
            .find((node) => node.props.testID === `offline-area-measure-${phase}`)
            .props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 340, height } } }),
        )
      report("running", 92)
      report("done", 128)
      report("failed", 120)
      expect(flat(body().props.style).minHeight).toBe(128)
      // A larger text size makes a status taller: the floor follows.
      report("failed", 176)
      expect(flat(body().props.style).minHeight).toBe(176)
      report("failed", 176)
      expect(flat(body().props.style).minHeight).toBe(176)
    })

    test("the status lies over the in-flow form, inside the reserved body", () => {
      const { tree } = render(running, "area-1")
      const body = host(tree, "offline-area-body")
      const status = tree.root.find(
        (node) => (node.type as unknown) === "DownloadStatusView" && node.props.announce !== false,
      )
      const chain = ancestorsOf(status, body)
      expect(chain[chain.length - 1] === body).toBe(true)
      // Its layer is out of the flow on purpose: the body's measured floor holds it.
      expect(flat(chain[1].props.style)).toMatchObject({ position: "absolute", top: 0 })
      expectInFlow(host(tree, "offline-area-form"), body)
    })

    test("the unseen copies are measured with the area's name and its widest figures", () => {
      const { tree } = render(null)
      const copies = tree.root
        .find((node) => node.props.testID === "offline-area-measure")
        .findAll((node) => (node.type as unknown) === "DownloadStatusView")
      expect(copies[0].props.status).toMatchObject({
        phase: "running",
        name: expect.stringContaining("Zone du "),
        percentage: 100,
        totalTiles: 10000,
      })
      // With a status, the copies take its name.
      const named = render(running, "area-1")
        .tree.root.find((node) => node.props.testID === "offline-area-measure")
        .findAll((node) => (node.type as unknown) === "DownloadStatusView")
      expect(named[2].props.status).toEqual({
        phase: "failed",
        areaId: "measure-failed",
        name: "Bois du Nord",
      })
    })
  })
})
