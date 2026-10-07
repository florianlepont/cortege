import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../test/react-native-reanimated.mock"
import { defaultTheme } from "../app/theme"
import { forestWaves } from "../app/visual-tokens"
import { ScreenCoverContext } from "./screen-cover-context"
import { buildWavePath, ForestWaves } from "./ForestWaves"

// The real package is ESM and cannot be loaded here; only its context object is needed.
jest.mock("@react-navigation/native", () => {
  const ReactRef = jest.requireActual("react") as typeof import("react")
  return { NavigationContext: ReactRef.createContext(undefined) }
})

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    FlatList: mockComponent("FlatList"),
    ScrollView: mockComponent("ScrollView"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: { position: "absolute" } },
  }
})

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

const withRepeatSpy = jest.spyOn(reanimated, "withRepeat")
const withTimingSpy = jest.spyOn(reanimated, "withTiming")

afterEach(() => {
  reanimated.setReducedMotion(false)
  withRepeatSpy.mockClear()
  withTimingSpy.mockClear()
})

const noopUnsubscribe = () => undefined
const fakeNavigation = (focused: boolean) =>
  ({ isFocused: () => focused, addListener: () => noopUnsubscribe }) as never

const CARD = { width: 360, height: 150 }

function render({ focused, covered = false }: { focused?: boolean; covered?: boolean } = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  const element = (
    <ScreenCoverContext.Provider value={covered}>
      <ForestWaves testID="waves" />
    </ScreenCoverContext.Provider>
  )
  act(() => {
    tree = renderer.create(
      focused === undefined ? (
        element
      ) : (
        <NavigationContext.Provider value={fakeNavigation(focused)}>
          {element}
        </NavigationContext.Provider>
      ),
    )
  })
  return tree!
}

const root = (tree: renderer.ReactTestRenderer) =>
  tree.root.find((n) => n.props.testID === "waves" && (n.type as unknown) === "View")

function layout(tree: renderer.ReactTestRenderer, size = CARD) {
  act(() => root(tree).props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, ...size } } }))
}

const paths = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => (n.type as unknown) === "Path")

type Transform = Record<string, number>[]
function transformOf(tree: renderer.ReactTestRenderer): Transform {
  const flow = tree.root.findAll(
    (n) => (n.type as unknown) === "View" && Array.isArray(n.props.style),
  )[0]
  const style = Object.assign({}, ...(flow.props.style as Record<string, unknown>[]))
  return style.transform as Transform
}

describe("buildWavePath", () => {
  test("three lines, one path, in the lower half of the card", () => {
    const d = buildWavePath(CARD)
    const starts = d.match(/M [-\d.]+ [-\d.]+/g) ?? []
    expect(starts).toHaveLength(3)
    const baselines = starts.map((start) => Number(start.split(" ")[2]))
    expect(baselines).toEqual(
      forestWaves.baselines.map((b) => Math.round(CARD.height * b * 10) / 10),
    )
    for (const y of baselines) expect(y).toBeGreaterThan(CARD.height / 2)
  })

  test("each line starts a wavelength before the card and runs past the sliding layer", () => {
    const period = CARD.width * forestWaves.periodRatio
    const lines = buildWavePath(CARD).split("M ").filter(Boolean)
    lines.forEach((line, index) => {
      const xs = [...line.matchAll(/(?:^|[QT] )(?:[-\d.]+ [-\d.]+ )?([-\d.]+) [-\d.]+/g)].map(
        (match) => Number(match[1]),
      )
      expect(xs[0]).toBeCloseTo(-period + (index * period) / 3, 0)
      expect(xs[0]).toBeLessThanOrEqual(0)
      expect(Math.max(...xs)).toBeGreaterThanOrEqual(CARD.width + period)
    })
  })

  test("nothing to draw before the card has a size", () => {
    expect(buildWavePath({ width: 0, height: 150 })).toBe("")
    expect(buildWavePath({ width: 360, height: 0 })).toBe("")
  })
})

describe("ForestWaves (12.2-19 fix round)", () => {
  test("decoration only: never a touch, hidden from screen readers, one faint sage path", () => {
    const tree = render()
    const node = root(tree)
    expect(node.props.pointerEvents).toBe("none")
    expect(node.props.accessibilityElementsHidden).toBe(true)
    expect(node.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(paths(tree)).toHaveLength(0)
    layout(tree)
    const [path] = paths(tree)
    expect(paths(tree)).toHaveLength(1)
    expect(path.props.d).toBe(buildWavePath(CARD))
    expect(path.props.stroke).toBe(defaultTheme.visual.forest.contourSage)
    expect(path.props.strokeOpacity).toBe(forestWaves.opacity)
    expect(path.props.fill).toBe("none")
  })

  test("drifts a wavelength in 12 s and breathes over 10 s, both linear endless loops", () => {
    const tree = render()
    expect(withRepeatSpy).not.toHaveBeenCalled()
    layout(tree)
    expect(withRepeatSpy).toHaveBeenCalledTimes(2)
    for (const call of withRepeatSpy.mock.calls) {
      const [, count, reverse, , reduceMotion] = call as unknown[]
      expect(count).toBe(-1)
      expect(reverse).toBe(false)
      expect(reduceMotion).toBe(reanimated.ReduceMotion.System)
    }
    const durations = withTimingSpy.mock.calls.map(
      (call) => ((call as unknown[])[1] as { duration: number }).duration,
    )
    expect(durations).toEqual([forestWaves.travelMs, forestWaves.breatheMs])
    for (const ms of durations) {
      expect(ms).toBeGreaterThanOrEqual(8000)
      expect(ms).toBeLessThanOrEqual(14000)
    }
    // The mock lands each loop on its end, a whole lap: the frame is the still first one.
    const [x, y, scale] = transformOf(tree)
    expect(x.translateX).toBeCloseTo(0)
    expect(y.translateY).toBeCloseTo(0)
    expect(scale.scaleY).toBeCloseTo(1)
  })

  test("the layer is one wavelength wider than the card, so a lap loops with no seam", () => {
    const tree = render()
    layout(tree)
    const svg = tree.root.find((n) => (n.type as unknown) === "Svg")
    expect(svg.props.width).toBeCloseTo(CARD.width * (1 + forestWaves.periodRatio))
    expect(svg.props.height).toBe(CARD.height)
  })

  test("under Reduce Motion the waves are still", () => {
    reanimated.setReducedMotion(true)
    const tree = render()
    layout(tree)
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(paths(tree)).toHaveLength(1)
    const [x, y, scale] = transformOf(tree)
    expect(x.translateX).toBeCloseTo(0)
    expect(y.translateY).toBeCloseTo(0)
    expect(scale.scaleY).toBeCloseTo(1)
  })

  test("flows while Accueil is focused, not while it is hidden or covered", () => {
    layout(render({ focused: true }))
    expect(withRepeatSpy).toHaveBeenCalledTimes(2)
    withRepeatSpy.mockClear()
    layout(render({ focused: false }))
    layout(render({ covered: true }))
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })

  test("a new layout of the same size keeps the drawn path", () => {
    const tree = render()
    layout(tree)
    const first = paths(tree)[0].props.d
    layout(tree)
    expect(paths(tree)[0].props.d).toBe(first)
  })
})
