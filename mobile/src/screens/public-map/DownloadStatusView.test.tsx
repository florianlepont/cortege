import React from "react"
import renderer, { act } from "react-test-renderer"

const mockAnnounce = jest.fn()
jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    AccessibilityInfo: { announceForAccessibility: (text: string) => mockAnnounce(text) },
    FlatList: mockComponent("FlatList"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: { position: "absolute" } },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../../ui/GlassButton", () => ({ GlassButton: "GlassButton" }))

import type { ReactTestInstance } from "react-test-renderer"
import * as reanimated from "../../../test/react-native-reanimated.mock"
import { brandComponentTokens, brandInteraction } from "../../app/brand-tokens"
import { contrastRatio } from "../../app/contrast"
import { defaultTheme } from "../../app/theme"
import { downloadBarGeometry } from "../../app/visual-tokens"
import type { AreaDownloadProgress, AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import {
  announceStep,
  DownloadProgressBar,
  DownloadStatusView,
  measureStatuses,
} from "./DownloadStatusView"

const t = fr.offlineMap.areas
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

const withTimingSpy = jest.spyOn(reanimated, "withTiming")

afterEach(() => {
  mockAnnounce.mockClear()
  withTimingSpy.mockClear()
})

const progress = (percentage: number, downloadedTiles = 0): AreaDownloadProgress => ({
  areaId: "area-1",
  name: "Bois du Nord",
  percentage,
  downloadedTiles,
  totalTiles: 186,
})
const running = (percentage: number, downloadedTiles = 0): AreaDownloadStatus => ({
  phase: "running",
  ...progress(percentage, downloadedTiles),
})

function mount(status: AreaDownloadStatus) {
  const handlers = { onDone: jest.fn(), onRetry: jest.fn() }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<DownloadStatusView status={status} {...handlers} />)
  })
  const rerender = (next: AreaDownloadStatus) =>
    act(() => tree.update(<DownloadStatusView status={next} {...handlers} />))
  return { tree, handlers, rerender }
}

const byTestId = (tree: renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll((node) => node.props.testID === testID && typeof node.type === "string")
const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat().join(""))
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

describe("DownloadStatusView (12.2-19 third round)", () => {
  test("running: the area's name, the bar, the percentage and the tiles done", () => {
    const { tree } = mount(running(41.6, 78))
    expect(byTestId(tree, "offline-download-running")).toHaveLength(1)
    expect(texts(tree)).toEqual(["Bois du Nord", "Téléchargement : 42 %", "78 sur 186 tuiles"])
    const [bar] = byTestId(tree, "offline-download-bar")
    expect(bar.props.accessible).toBe(true)
    expect(bar.props.accessibilityRole).toBe("progressbar")
    expect(bar.props.accessibilityLabel).toBe("Téléchargement de la zone Bois du Nord")
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42, text: "42 %" })
  })

  test("a thick rounded bar, track and fill from the theme", () => {
    const { tree } = mount(running(10))
    const [bar] = byTestId(tree, "offline-download-bar")
    const track = flat(bar.props.style)
    expect(track.height).toBe(10)
    expect(downloadBarGeometry.height).toBe(10)
    expect(track.borderRadius).toBe(5)
    expect(track.overflow).toBe("hidden")
    expect(track.backgroundColor).toBe(defaultTheme.visual.downloadBar.track)
    const fill = flat(byTestId(tree, "offline-download-bar-fill")[0].props.style)
    expect(fill.backgroundColor).toBe(defaultTheme.visual.downloadBar.fill)
    expect(fill.borderRadius).toBe(5)
  })

  test("the fill slides in from the left once the track is measured, never full before", () => {
    const { tree, rerender } = mount(running(25))
    const fill = () => flat(byTestId(tree, "offline-download-bar-fill")[0].props.style)
    // Not measured yet: hidden, so it never flashes full.
    expect(fill().opacity).toBe(0)
    const [bar] = byTestId(tree, "offline-download-bar")
    act(() => bar.props.onLayout({ nativeEvent: { layout: { width: 300 } } }))
    rerender(running(50))
    expect(fill().opacity).toBe(1)
    // The mock lands each timing on its target: half the track still to fill.
    expect(fill().transform).toEqual([{ translateX: -150 }])
    rerender(running(100))
    expect(fill().transform).toEqual([{ translateX: 0 }])
  })

  test("each report eases in on the UI thread, Reduce Motion showing it at once", () => {
    mount(running(30))
    expect(withTimingSpy).toHaveBeenCalledWith(
      0.3,
      expect.objectContaining({
        duration: downloadBarGeometry.smoothMs,
        reduceMotion: reanimated.ReduceMotion.System,
      }),
    )
  })

  test("VoiceOver hears every 25 % step once, never a step back", () => {
    const { rerender } = mount(running(10))
    expect(mockAnnounce).not.toHaveBeenCalled()
    rerender(running(26))
    rerender(running(30))
    rerender(running(49))
    rerender(running(76))
    expect(mockAnnounce.mock.calls).toEqual([["Téléchargement : 25 %"], ["Téléchargement : 75 %"]])
    expect(announceStep(0)).toBe(0)
    expect(announceStep(24.9)).toBe(0)
    expect(announceStep(50)).toBe(50)
    expect(announceStep(140)).toBe(100)
    expect(announceStep(-3)).toBe(0)
  })

  test("done: a short confirmation and a 46 pt Terminé that closes", () => {
    const { tree, handlers } = mount({ phase: "done", ...progress(100, 186) })
    expect(byTestId(tree, "offline-download-done")).toHaveLength(1)
    expect(texts(tree)).toEqual([t.done.title, "Bois du Nord est enregistrée sur ce téléphone."])
    expect(mockAnnounce).toHaveBeenCalledWith(t.done.title)
    const button = tree.root.findByType("GlassButton" as never)
    expect(button.props.label).toBe("Terminé")
    expect(button.props.minHeight).toBe(brandComponentTokens.button.minHeightPanel)
    expect(button.props.minHeight).toBeGreaterThanOrEqual(brandInteraction.hitTarget.min)
    act(() => button.props.onPress())
    expect(handlers.onDone).toHaveBeenCalledTimes(1)
  })

  test("failed: the failure in the danger text and a retry", () => {
    const { tree, handlers } = mount({ phase: "failed", areaId: "area-1", name: "Bois du Nord" })
    expect(byTestId(tree, "offline-download-failed")).toHaveLength(1)
    expect(texts(tree)).toEqual([t.failed.title, t.failed.message])
    expect(mockAnnounce).toHaveBeenCalledWith(t.failed.title)
    const title = tree.root.find(
      (node) => (node.type as unknown) === "Text" && node.props.children === t.failed.title,
    ) as ReactTestInstance
    expect(flat(title.props.style).color).toBe(defaultTheme.onSurface.danger)
    expect(byTestId(tree, "offline-download-bar")).toHaveLength(0)
    const button = tree.root.findByType("GlassButton" as never)
    expect(button.props.label).toBe("Réessayer")
    expect(button.props.minHeight).toBe(46)
    act(() => button.props.onPress())
    expect(handlers.onRetry).toHaveBeenCalledTimes(1)
  })

  test("the bar alone: its value follows the percentage given", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<DownloadProgressBar percent={7} name="Lisière" />)
    })
    const [bar] = byTestId(tree, "offline-download-bar")
    expect(bar.props.accessibilityValue.now).toBe(7)
    // The fill keeps 3:1 against its track (non-text contrast).
    const { track, fill } = defaultTheme.visual.downloadBar
    expect(contrastRatio(fill, track)).toBeGreaterThanOrEqual(3)
  })

  test("the panel's unseen measuring copies never speak, and are at their widest", () => {
    const statuses = measureStatuses("Lisière", 186)
    expect(statuses.map((status) => status.phase)).toEqual(["running", "done", "failed"])
    expect(statuses[0]).toMatchObject({
      percentage: 100,
      downloadedTiles: 10000,
      totalTiles: 10000,
    })
    expect(measureStatuses("Lisière", 123456)[1]).toMatchObject({ totalTiles: 123456 })
    for (const status of statuses) {
      act(() => {
        renderer.create(
          <DownloadStatusView
            status={status}
            announce={false}
            onDone={jest.fn()}
            onRetry={jest.fn()}
          />,
        )
      })
    }
    expect(mockAnnounce).not.toHaveBeenCalled()
  })
})
