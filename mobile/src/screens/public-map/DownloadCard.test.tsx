import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: {} },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
// The shared Reanimated mock, with a recording entering builder and a host view for the card.
jest.mock("react-native-reanimated", () => {
  const ReactRef = require("react") as typeof import("react")
  const shared = jest.requireActual("../../../test/react-native-reanimated.mock") as {
    default: Record<string, unknown>
  }
  const builder = (calls: Record<string, unknown>) => ({
    duration: (ms: number) => builder({ ...calls, durationMs: ms }),
    reduceMotion: (mode: string) => builder({ ...calls, reduceMotion: mode }),
    calls,
  })
  return {
    ...shared,
    __esModule: true,
    default: {
      ...shared.default,
      View: ({ children, ...props }: { children?: React.ReactNode }) =>
        ReactRef.createElement("AnimatedView", props, children),
    },
    FadeIn: builder({}),
    ReduceMotion: { System: "system" },
  }
})
jest.mock("../../ui/AppPressable", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    AppPressable: ({
      children,
      disableScale: _disableScale,
      disableRipple: _disableRipple,
      ...props
    }: {
      children?: React.ReactNode
      disableScale?: boolean
      disableRipple?: boolean
    }) => ReactRef.createElement("Pressable", props, children),
  }
})
jest.mock("../../ui/AppButton", () => ({ AppButton: "AppButton" }))
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})
jest.mock("./DownloadStatusView", () => ({ DownloadStatusView: "DownloadStatusView" }))
const mockDefaultName = jest.fn(() => "Zone du 11/10 09:05")
jest.mock("./area-name", () => ({ defaultAreaName: () => mockDefaultName() }))

import { brandComponentTokens, brandMotion, brandRadius } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import type { AreaLayersEstimate } from "../../map/offline-estimate"
import { DownloadCard, type DownloadCardProps } from "./DownloadCard"

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

const estimate = (overrides: Partial<AreaLayersEstimate> = {}): AreaLayersEstimate => ({
  policy: "all",
  layers: [],
  totalTileCount: 1200,
  estimatedBytes: 84_000_000,
  baseBytes: 53_000_000,
  extraBytes: 31_000_000,
  exceedsCap: false,
  ...overrides,
})

function mount(props: Partial<DownloadCardProps> = {}) {
  const handlers = {
    onDownload: jest.fn(),
    onRetry: jest.fn(),
    onDone: jest.fn(),
    onClose: jest.fn(),
  }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <DownloadCard
        estimate={estimate()}
        view="form"
        failedLayers={[]}
        runningElsewhere={false}
        bottom={90}
        {...handlers}
        {...props}
      />,
    )
  })
  return { tree, handlers }
}

const byTestId = (tree: renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")
const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat().join(""))
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

describe("DownloadCard (28-15)", () => {
  test("form, policy all: title, close, the three estimate lines and the start button", () => {
    const { tree, handlers } = mount()
    expect(byTestId(tree, "download-card")).toHaveLength(1)
    expect(texts(tree)).toEqual([
      "Télécharger cette zone",
      "Environ 84 Mo pour la zone encadrée en vert",
      "Fonds de carte : 53 Mo. Autres couches : 31 Mo.",
      "Réglable dans Paramètres, Cartes.",
    ])
    const close = byTestId(tree, "download-close")[0]
    expect(close.props.accessibilityLabel).toBe("Fermer")
    expect(close.props.accessibilityRole).toBe("button")
    expect(flat(close.props.style)).toMatchObject({ width: 44, height: 44 })
    act(() => close.props.onPress())
    expect(handlers.onClose).toHaveBeenCalledTimes(1)

    const [start] = byTestId(tree, "download-start")
    expect(start.props.label).toBe("Télécharger")
    expect(start.props.accessibilityLabel).toBe("Télécharger la zone encadrée en vert")
    expect(start.props.disabled).toBe(false)
    expect(flat(start.props.style).minHeight).toBe(brandComponentTokens.button.minHeightPanel)
    expect(flat(start.props.labelStyle).fontSize).toBe(16)
    act(() => start.props.onPress())
    expect(handlers.onDownload).toHaveBeenCalledWith("Zone du 11/10 09:05")
  })

  test("form, policy base: the base-only line and no policy hint", () => {
    const { tree } = mount({
      estimate: estimate({ policy: "base", estimatedBytes: 53_000_000, extraBytes: 0 }),
    })
    expect(texts(tree)).toEqual([
      "Télécharger cette zone",
      "Environ 53 Mo pour la zone encadrée en vert",
      "Fonds de carte seulement, réglable dans Paramètres.",
    ])
  })

  test("too large: the warning replaces line 1 and the button is disabled", () => {
    const { tree, handlers } = mount({ estimate: estimate({ exceedsCap: true }) })
    const lines = texts(tree)
    expect(lines[1]).toBe("Zone trop grande pour le téléchargement : zoomez avant de réessayer.")
    expect(lines).not.toContain("Environ 84 Mo pour la zone encadrée en vert")
    const [start] = byTestId(tree, "download-start")
    expect(start.props.disabled).toBe(true)
    expect(handlers.onDownload).not.toHaveBeenCalled()
  })

  test("a download running elsewhere: a disabled button reading Téléchargement…, no lines 2 and 3, no progress", () => {
    const { tree } = mount({ runningElsewhere: true })
    expect(texts(tree)).toEqual([
      "Télécharger cette zone",
      "Environ 84 Mo pour la zone encadrée en vert",
    ])
    const [start] = byTestId(tree, "download-start")
    expect(start.props.label).toBe("Téléchargement…")
    expect(start.props.accessibilityLabel).toBe("Téléchargement…")
    expect(start.props.disabled).toBe(true)
    expect(byTestId(tree, "offline-download-bar")).toHaveLength(0)
  })

  test("failed view: the status view with Réessayer, the card closable", () => {
    const { tree, handlers } = mount({ view: "failed" })
    const [view] = tree.root.findAll((node) => (node.type as unknown) === "DownloadStatusView")
    expect(view.props.status.phase).toBe("failed")
    expect(view.props.announce).toBe(false)
    act(() => view.props.onRetry())
    expect(handlers.onRetry).toHaveBeenCalledTimes(1)
    expect(byTestId(tree, "download-start")).toHaveLength(0)
    act(() => byTestId(tree, "download-close")[0].props.onPress())
    expect(handlers.onClose).toHaveBeenCalledTimes(1)
  })

  test("partial view: the done status with the failed layers and Terminé", () => {
    const { tree, handlers } = mount({
      view: "partial",
      failedLayers: ["photos-1950", "types-foret"],
    })
    const [view] = tree.root.findAll((node) => (node.type as unknown) === "DownloadStatusView")
    expect(view.props.status).toMatchObject({
      phase: "done",
      failedLayers: ["photos-1950", "types-foret"],
    })
    act(() => view.props.onDone())
    expect(handlers.onDone).toHaveBeenCalledTimes(1)
    expect(byTestId(tree, "download-start")).toHaveLength(0)
  })

  test("sits 14 pt from the sides at the given bottom, radius 22, padding 12, on the map panel glass", () => {
    const { tree } = mount({ bottom: 96 })
    const [host] = byTestId(tree, "download-card")
    expect(flat(host.props.style)).toMatchObject({
      position: "absolute",
      left: 14,
      right: 14,
      bottom: 96,
    })
    const surface = tree.root.find((node) => (node.type as unknown) === "GlassSurface")
    expect(surface.props.surface).toBe(defaultTheme.visual.mapPanel)
    expect(flat(surface.props.style)).toMatchObject({ borderRadius: brandRadius.card, padding: 12 })
    expect(brandRadius.card).toBe(22)
  })

  test("reports its drawn height when asked, and says nothing when not", () => {
    const onHeight = jest.fn()
    const { tree } = mount({ onHeight })
    const [host] = byTestId(tree, "download-card")
    act(() => host.props.onLayout({ nativeEvent: { layout: { height: 152 } } }))
    expect(onHeight).toHaveBeenCalledWith(152)

    const { tree: silent } = mount()
    expect(byTestId(silent, "download-card")[0].props.onLayout).toBeUndefined()
  })

  test("enters with a 160 ms fade that follows Reduce Motion", () => {
    const { tree } = mount()
    const [host] = byTestId(tree, "download-card")
    expect(host.props.entering.calls).toEqual({
      durationMs: brandMotion.durations.fast,
      reduceMotion: "system",
    })
  })

  test("never draws a progress bar, a percentage or a tile count", () => {
    const { tree } = mount({ runningElsewhere: true })
    const joined = texts(tree).join(" ")
    expect(joined).not.toMatch(/%|tuiles|En cours/)
  })
})
