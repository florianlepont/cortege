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
    StyleSheet: { create: <T,>(value: T): T => value, hairlineWidth: 0.5, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
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
jest.mock("../../ui/GlassSurface", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    GlassSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassSurface", props, children),
  }
})

import { brandMotion } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { DownloadChip, type DownloadChipProps } from "./DownloadChip"
import { MAP_CONTROL_HIT_SLOP, MAP_PILL_HEIGHT } from "./MapChips"
import {
  CAPSULE_BUTTON_SIZE,
  CAPSULE_RIGHT,
  capsuleButtonCenterY,
  capsuleHeight,
  createControlStyles,
} from "./styles"

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

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

const running = (percentage: number): AreaDownloadStatus => ({
  phase: "running",
  areaId: "a1",
  name: "Zone",
  percentage,
  downloadedTiles: 0,
  totalTiles: 10,
})
const done = (failedLayers: DownloadChipStatusLayers = []): AreaDownloadStatus => ({
  phase: "done",
  areaId: "a1",
  name: "Zone",
  percentage: 100,
  downloadedTiles: 10,
  totalTiles: 10,
  failedLayers,
})
type DownloadChipStatusLayers = Extract<AreaDownloadStatus, { phase: "done" }>["failedLayers"]
const failed: AreaDownloadStatus = { phase: "failed", areaId: "a1", name: "Zone" }

function mount(props: Partial<DownloadChipProps> = {}) {
  const handlers = { onPress: jest.fn(), onExpire: jest.fn() }
  const base = { status: running(42), visible: true, top: 100, ...handlers }
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<DownloadChip {...base} {...props} />)
  })
  const rerender = (next: Partial<DownloadChipProps>) =>
    act(() => tree.update(<DownloadChip {...base} {...props} {...next} />))
  return { tree, handlers, rerender }
}

const chip = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((node) => node.props.testID === "download-chip")[0]
const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => (node.type as unknown) === "Text")
    .map((node) => [node.props.children].flat().join(""))
const glyph = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((node) => (node.type as unknown) === "Ionicons")[0]
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

describe("DownloadChip (28-15)", () => {
  test("renders nothing without a status or while hidden", () => {
    expect(mount({ status: null }).tree.toJSON()).toBeNull()
    expect(mount({ visible: false }).tree.toJSON()).toBeNull()
  })

  test("running: the weighted percentage as a progressbar that nothing presses", () => {
    const { tree, handlers } = mount()
    expect(texts(tree)).toEqual(["Téléchargement : 42 %"])
    expect(glyph(tree).props.name).toBe("cloud-download-outline")
    const node = chip(tree)
    expect(node.props.accessibilityRole).toBe("progressbar")
    expect(node.props.accessibilityLabel).toBe("Téléchargement de la zone")
    expect(node.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 })
    expect(node.props.onPress).toBeUndefined()
    expect(handlers.onPress).not.toHaveBeenCalled()
  })

  test("running: the percentage is rounded", () => {
    expect(texts(mount({ status: running(41.6) }).tree)).toEqual(["Téléchargement : 42 %"])
  })

  test("done: the confirmation goes after 4 s, once", () => {
    const { tree, handlers } = mount({ status: done() })
    expect(texts(tree)).toEqual(["Zone disponible hors connexion"])
    expect(glyph(tree).props.name).toBe("checkmark-circle-outline")
    expect(chip(tree).props.onPress).toBeUndefined()
    act(() => {
      jest.advanceTimersByTime(3999)
    })
    expect(handlers.onExpire).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(handlers.onExpire).toHaveBeenCalledTimes(1)
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    expect(handlers.onExpire).toHaveBeenCalledTimes(1)
  })

  test("done: the timer is cleared on unmount and runs only while the chip is shown", () => {
    const { tree, handlers, rerender } = mount({ status: done(), visible: false })
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(handlers.onExpire).not.toHaveBeenCalled()
    rerender({ visible: true })
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    act(() => tree.unmount())
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(handlers.onExpire).not.toHaveBeenCalled()
  })

  test("a new status before the 4 s restarts nothing it should not", () => {
    const { handlers, rerender } = mount({ status: done() })
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    rerender({ status: running(10) })
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(handlers.onExpire).not.toHaveBeenCalled()
  })

  test("partial: pressable, never expires", () => {
    const { tree, handlers } = mount({ status: done(["photos-1950"]) })
    expect(texts(tree)).toEqual(["Zone enregistrée, sauf certaines couches"])
    expect(glyph(tree).props.name).toBe("alert-circle-outline")
    const node = chip(tree)
    expect(node.props.accessibilityRole).toBe("button")
    expect(node.props.accessibilityLabel).toBe(
      "Zone enregistrée, sauf certaines couches, toucher pour voir le détail",
    )
    expect(node.props.hitSlop).toEqual({ top: MAP_CONTROL_HIT_SLOP, bottom: MAP_CONTROL_HIT_SLOP })
    act(() => node.props.onPress())
    expect(handlers.onPress).toHaveBeenCalledTimes(1)
    act(() => {
      jest.advanceTimersByTime(60000)
    })
    expect(handlers.onExpire).not.toHaveBeenCalled()
  })

  test("failed: the danger glyph, pressable, never expires", () => {
    const { tree, handlers } = mount({ status: failed })
    expect(texts(tree)).toEqual(["Téléchargement échoué"])
    expect(glyph(tree).props.color).toBe(defaultTheme.onSurface.danger)
    const node = chip(tree)
    expect(node.props.accessibilityRole).toBe("button")
    expect(node.props.accessibilityLabel).toBe("Téléchargement échoué, toucher pour réessayer")
    act(() => node.props.onPress())
    expect(handlers.onPress).toHaveBeenCalledTimes(1)
    act(() => {
      jest.advanceTimersByTime(60000)
    })
    expect(handlers.onExpire).not.toHaveBeenCalled()
  })

  test("sits 8 pt left of the capsule, centred on its download button, 40 high, 160 ms fade", () => {
    const { tree } = mount({ top: 120 })
    const position = tree.root.find((node) => node.props.testID === "download-chip-position")
    expect(flat(position.props.style).right).toBe(72)
    expect(CAPSULE_RIGHT + CAPSULE_BUTTON_SIZE + 8).toBe(72)
    expect(flat(position.props.style).top).toBe(capsuleButtonCenterY(120, 1) - 20)
    expect(position.props.entering.calls).toEqual({
      durationMs: brandMotion.durations.fast,
      reduceMotion: "system",
    })
    const surface = tree.root.find((node) => (node.type as unknown) === "GlassSurface")
    expect(surface.props.surface).toBe(defaultTheme.visual.mapControl.glass)
    expect(flat(surface.props.style).height).toBe(MAP_PILL_HEIGHT)
    expect(MAP_PILL_HEIGHT).toBe(40)
  })
})

describe("capsule constants", () => {
  test("the buttons are 50 pt, 14 pt from the right, and the capsule is built on them", () => {
    expect(CAPSULE_BUTTON_SIZE).toBe(50)
    expect(CAPSULE_RIGHT).toBe(14)
    const styles = createControlStyles(defaultTheme)
    expect(styles.capsule).toMatchObject({
      right: 14,
      width: 50,
      borderRadius: 25,
      borderWidth: 1,
    })
    expect(styles.capsuleButton).toMatchObject({ width: 50, height: 50 })
  })

  test("the centre of a button counts the border and the hairlines above it", () => {
    expect(capsuleButtonCenterY(100, 0)).toBe(126)
    expect(capsuleButtonCenterY(100, 1)).toBe(126 + 50.5)
    expect(capsuleHeight(1)).toBe(52)
    expect(capsuleHeight(2)).toBe(102.5)
    expect(capsuleHeight(0)).toBe(2)
  })
})
