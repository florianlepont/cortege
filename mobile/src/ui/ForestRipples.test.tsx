import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../test/react-native-reanimated.mock"
import { defaultTheme } from "../app/theme"
import { forestRipples } from "../app/visual-tokens"
import { ScreenCoverContext } from "./screen-cover-context"
import {
  defaultRippleOrigin,
  ForestRipples,
  rippleAt,
  rippleEndScale,
  ringProgress,
  type RipplePoint,
} from "./ForestRipples"

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
const BUTTON: RipplePoint = { x: 290, y: 52 }

function render({
  focused,
  covered = false,
  origin = BUTTON,
}: { focused?: boolean; covered?: boolean; origin?: RipplePoint | null } = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  const element = (
    <ScreenCoverContext.Provider value={covered}>
      <ForestRipples origin={origin} testID="ripples" />
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
  tree.root.find((n) => n.props.testID === "ripples" && (n.type as unknown) === "View")
const rings = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => n.props.testID === "forest-ripple" && (n.type as unknown) === "View")
const ringStyle = (ring: renderer.ReactTestInstance): Record<string, unknown> =>
  Object.assign({}, ...(ring.props.style as Record<string, unknown>[]))

function layout(tree: renderer.ReactTestRenderer, size = CARD) {
  act(() => root(tree).props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, ...size } } }))
}

describe("ForestRipples (12.2-19 third round: the sign-in screen's ripples)", () => {
  test("decoration only: never touched, hidden from screen readers, over the whole card", () => {
    const tree = render()
    const layer = root(tree)
    expect(layer.props.pointerEvents).toBe("none")
    expect(layer.props.accessibilityElementsHidden).toBe(true)
    expect(layer.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(layer.props.style).toEqual({ position: "absolute" })
    // Nothing is drawn before the card is measured.
    expect(rings(tree)).toHaveLength(0)
  })

  test("three discs centred behind the button, in the card's ripple green", () => {
    const tree = render()
    layout(tree)
    const discs = rings(tree)
    expect(discs).toHaveLength(3)
    for (const disc of discs) {
      const style = ringStyle(disc)
      expect(style).toMatchObject({
        position: "absolute",
        width: forestRipples.size,
        height: forestRipples.size,
        borderRadius: forestRipples.size / 2,
        left: BUTTON.x - forestRipples.size / 2,
        top: BUTTON.y - forestRipples.size / 2,
        backgroundColor: defaultTheme.visual.forest.ripple,
      })
      // Transforms and opacity only: no width, border or colour animated.
      expect(Object.keys(style)).toEqual(expect.arrayContaining(["opacity", "transform"]))
    }
    expect(defaultTheme.visual.forest.ripple).toBe(forestRipples.colour)
  })

  test("without a point from the card they start about where its button sits", () => {
    const tree = render({ origin: null })
    layout(tree)
    const origin = defaultRippleOrigin(CARD)
    expect(origin.x).toBeGreaterThan(CARD.width / 2)
    expect(ringStyle(rings(tree)[0])).toMatchObject({
      left: origin.x - forestRipples.size / 2,
      top: origin.y - forestRipples.size / 2,
    })
  })

  test("one linear 10 s loop on the UI thread drives the three, guarded by Reduce Motion", () => {
    const tree = render()
    expect(withRepeatSpy).not.toHaveBeenCalled()
    layout(tree)
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
    const [, count, reverse, , reduceMotion] = withRepeatSpy.mock.calls[0] as unknown[]
    expect(count).toBe(-1)
    expect(reverse).toBe(false)
    expect(reduceMotion).toBe(reanimated.ReduceMotion.System)
    expect(withTimingSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        duration: 10000,
        easing: reanimated.Easing.linear,
        reduceMotion: reanimated.ReduceMotion.System,
      }),
    )
    expect(forestRipples.cycleMs).toBe(10000)
  })

  test("runs while the screen is focused; not while it is hidden or covered", () => {
    const focused = render({ focused: true })
    layout(focused)
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
    withRepeatSpy.mockClear()
    for (const tree of [render({ focused: false }), render({ covered: true })]) {
      layout(tree)
      // Stopped where they are: the rings stay drawn, frozen.
      expect(rings(tree)).toHaveLength(3)
    }
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })

  test("under Reduce Motion the card is still: no rings, no loop", () => {
    reanimated.setReducedMotion(true)
    const tree = render()
    layout(tree)
    expect(rings(tree)).toHaveLength(0)
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })

  test("a second layout of the same size changes nothing", () => {
    const tree = render()
    layout(tree)
    const before = rings(tree)[0].props.style
    layout(tree)
    expect(rings(tree)[0].props.style).toEqual(before)
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
  })
})

describe("ripple motion: the sign-in hero's keyframes", () => {
  const end = 12

  test("each disc swells from 0.3 to 1.6 by 15 % of its cycle, then on to the far corner", () => {
    expect(rippleAt(0, end).scale).toBeCloseTo(0.3)
    expect(rippleAt(0.15, end).scale).toBeCloseTo(1.6)
    expect(rippleAt(1, end).scale).toBeCloseTo(end)
    expect(rippleAt(0.575, end).scale).toBeCloseTo((1.6 + end) / 2)
  })

  test("it comes in by 6 %, is nearly gone by 70 % and out at the end, never above 0.16", () => {
    expect(rippleAt(0, end).opacity).toBe(0)
    expect(rippleAt(0.06, end).opacity).toBeCloseTo(forestRipples.peakOpacity)
    expect(rippleAt(0.7, end).opacity).toBeCloseTo(forestRipples.fadeOpacity)
    expect(rippleAt(1, end).opacity).toBe(0)
    for (let p = 0; p <= 1; p += 0.01) {
      expect(rippleAt(p, end).opacity).toBeLessThanOrEqual(0.16)
    }
  })

  test("the three discs are a third of a cycle apart", () => {
    expect(ringProgress(0.5, 0)).toBeCloseTo(0.5)
    expect(ringProgress(0.5, 1)).toBeCloseTo(0.5 - 1 / 3)
    expect(ringProgress(0.5, 2)).toBeCloseTo(0.5 - 2 / 3 + 1)
    expect(ringProgress(1.25, 0)).toBeCloseTo(0.25)
  })

  test("the last scale reaches the card's farthest corner from the button", () => {
    const scale = rippleEndScale(CARD, BUTTON)
    // The farthest corner from (290, 52) is the bottom left one.
    expect((scale * forestRipples.size) / 2).toBeCloseTo(Math.hypot(290, 150 - 52))
    // A tiny card never makes the disc shrink after its early swell.
    expect(rippleEndScale({ width: 10, height: 10 }, { x: 5, y: 5 })).toBe(forestRipples.scaleEarly)
  })
})
