import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../../test/react-native-reanimated.mock"
import { defaultTheme } from "../../app/theme"
import {
  edgeGlowGeometry,
  edgeGlowGreens,
  edgeLightMotion,
  edgePulseMotion,
} from "../../app/visual-tokens"
import { ScreenCoverContext } from "../../ui/screen-cover-context"
import { EdgePulse, lightPath, roundedRectPerimeter } from "./EdgePulse"

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
    useWindowDimensions: () => ({ width: 400, height: 800 }),
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

function render({ focused, covered = false }: { focused?: boolean; covered?: boolean } = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  const element = (
    <ScreenCoverContext.Provider value={covered}>
      <EdgePulse />
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

type StyleEntry = Record<string, unknown>
const byTestId = (tree: renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll((n) => n.props.testID === testID && typeof n.type === "string")
const halo = (tree: renderer.ReactTestRenderer) => byTestId(tree, "explorer-edge-halo")[0]
const haloStyle = (tree: renderer.ReactTestRenderer): StyleEntry =>
  Object.assign({}, ...(halo(tree).props.style as StyleEntry[]))
const lights = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => (n.type as unknown) === "Rect")

describe("EdgePulse (12.2-19)", () => {
  test("covers the whole screen with rounded corners and never takes a touch", () => {
    const tree = render()
    const [root] = byTestId(tree, "explorer-edge-pulse")
    expect(root.props.pointerEvents).toBe("none")
    expect(root.props.accessibilityElementsHidden).toBe(true)
    expect(root.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(root.props.style).toEqual({ position: "absolute" })
    const style = haloStyle(tree)
    expect(style.position).toBe("absolute")
    expect(style.borderRadius).toBe(edgeGlowGeometry.corner)
    expect(edgeGlowGeometry.corner).toBeGreaterThanOrEqual(47)
    expect(edgeGlowGeometry.corner).toBeLessThanOrEqual(55)
    expect(style.boxShadow).toBe(defaultTheme.visual.edgeGlow)
    expect(String(style.boxShadow)).toMatch(/^inset /)
    // A line, a band and a wide halo, all inset.
    expect(String(style.boxShadow).split(", inset ")).toHaveLength(3)
    // Layer rules of 12.2-17: no border and no continuous corners on this layer.
    expect(style).not.toHaveProperty("borderWidth")
    expect(style).not.toHaveProperty("borderCurve")
  })

  test("the halo pulses gently on the UI thread, guarded by Reduce Motion", () => {
    const tree = render()
    expect(haloStyle(tree).opacity).toBe(edgePulseMotion.minOpacity)
    expect(edgePulseMotion.minOpacity).toBe(0.7)
    expect(withRepeatSpy).toHaveBeenCalledTimes(2)
    const [, count, reverse, , reduceMotion] = withRepeatSpy.mock.calls[0] as unknown[]
    expect(count).toBe(-1)
    expect(reverse).toBe(true)
    expect(reduceMotion).toBe(reanimated.ReduceMotion.System)
    expect(withTimingSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        duration: edgePulseMotion.halfCycleMs,
        reduceMotion: reanimated.ReduceMotion.System,
      }),
    )
    expect(edgePulseMotion.halfCycleMs * 2).toBe(2200)
  })

  test("a brighter light travels round the screen, one lap in 3.2 s, never reversing", () => {
    const tree = render()
    const [, count, reverse, , reduceMotion] = withRepeatSpy.mock.calls[1] as unknown[]
    expect(count).toBe(-1)
    expect(reverse).toBe(false)
    expect(reduceMotion).toBe(reanimated.ReduceMotion.System)
    expect(withTimingSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        duration: edgeLightMotion.lapMs,
        easing: reanimated.Easing.linear,
        reduceMotion: reanimated.ReduceMotion.System,
      }),
    )
    expect(edgeLightMotion.lapMs).toBe(3200)

    const [glow, core] = lights(tree)
    expect(glow.props.stroke).toBe(edgeGlowGreens.halo)
    expect(glow.props.strokeWidth).toBe(edgeLightMotion.glowWidth)
    expect(core.props.stroke).toBe(edgeGlowGreens.light)
    expect(core.props.strokeWidth).toBe(edgeLightMotion.coreWidth)
    for (const [node, width] of [
      [glow, edgeLightMotion.glowWidth],
      [core, edgeLightMotion.coreWidth],
    ] as const) {
      const path = lightPath(400, 800, width)
      expect(node.props).toMatchObject(path.rect)
      expect(node.props.strokeDasharray).toEqual(path.dashArray)
      // The mock resolves the lap at its start: the dash sits at the top left, offset 0.
      expect(Object.is(node.props.animatedProps.strokeDashoffset, -0)).toBe(true)
    }
  })

  test("the light's outline is the screen inset by half its stroke, with rounded corners", () => {
    const path = lightPath(400, 800, 14)
    expect(path.rect).toEqual({
      x: 7,
      y: 7,
      width: 386,
      height: 786,
      rx: edgeGlowGeometry.corner - 7,
      ry: edgeGlowGeometry.corner - 7,
    })
    expect(path.perimeter).toBeCloseTo(roundedRectPerimeter(386, 786, edgeGlowGeometry.corner - 7))
    const [dash, gap] = path.dashArray
    expect(dash + gap).toBeCloseTo(path.perimeter)
    expect(dash / path.perimeter).toBeCloseTo(edgeLightMotion.fraction)
    // A square with corners of radius r: four sides of 2r less the corners, plus one circle.
    expect(roundedRectPerimeter(20, 20, 10)).toBeCloseTo(2 * Math.PI * 10)
    expect(roundedRectPerimeter(10, 20, 0)).toBe(60)
    // A screen smaller than the stroke draws nothing rather than a negative rectangle.
    expect(lightPath(4, 4, 14).rect).toMatchObject({ width: 0, height: 0 })
  })

  test("pulses while the screen is focused", () => {
    render({ focused: true })
    expect(withRepeatSpy).toHaveBeenCalledTimes(2)
  })

  test("under Reduce Motion the glow is still at full strength, with no travelling light", () => {
    reanimated.setReducedMotion(true)
    const tree = render()
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(haloStyle(tree).opacity).toBe(edgePulseMotion.stillOpacity)
    expect(edgePulseMotion.stillOpacity).toBe(1)
    expect(lights(tree)).toHaveLength(0)
  })

  test("no loop while the screen is not focused or is covered by an overlay", () => {
    render({ focused: false })
    render({ covered: true })
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })
})
