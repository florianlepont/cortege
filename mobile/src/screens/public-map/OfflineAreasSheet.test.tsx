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
jest.mock("./DownloadStatusView", () => ({ DownloadStatusView: "DownloadStatusView" }))

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
        estimate={estimate}
        {...handlers}
      />,
    )
  })
  const form = tree.root.find((node) => node.props.testID === "offline-area-form")
  const status = tree.root.findAll((node) => (node.type as unknown) === "DownloadStatusView")
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
})
