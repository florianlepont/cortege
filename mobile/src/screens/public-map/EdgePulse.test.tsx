import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../../test/react-native-reanimated.mock"
import { defaultTheme } from "../../app/theme"
import { edgeGlowGeometry, edgePulseMotion } from "../../app/visual-tokens"
import { ScreenCoverContext } from "../../ui/screen-cover-context"
import { deepHaloOpacity, EdgePulse } from "./EdgePulse"

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
const layerStyle = (tree: renderer.ReactTestRenderer, testID: string): StyleEntry =>
  Object.assign({}, ...(byTestId(tree, testID)[0].props.style as StyleEntry[]))
const haloStyle = (tree: renderer.ReactTestRenderer) => layerStyle(tree, "explorer-edge-halo")
const deepStyle = (tree: renderer.ReactTestRenderer) => layerStyle(tree, "explorer-edge-deep")

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
    expect(style.boxShadow).toBe(defaultTheme.visual.edgeGlow)
    expect(String(style.boxShadow)).toMatch(/^inset /)
    // A line, a band and a wide halo, all inset.
    expect(String(style.boxShadow).split(", inset ")).toHaveLength(3)
    const deep = deepStyle(tree)
    expect(deep.position).toBe("absolute")
    expect(deep.borderRadius).toBe(edgeGlowGeometry.corner)
    expect(deep.boxShadow).toBe(defaultTheme.visual.edgeGlowDeep)
    // Layer rules of 12.2-17: no border and no continuous corners on these layers.
    for (const layer of [style, deep]) {
      expect(layer).not.toHaveProperty("borderWidth")
      expect(layer).not.toHaveProperty("borderCurve")
    }
  })

  test("only a pulse: no travelling light, no SVG stroke round the edge (third fix round)", () => {
    const tree = render()
    expect(tree.root.findAll((n) => (n.type as unknown) === "Rect")).toHaveLength(0)
    expect(tree.root.findAll((n) => (n.type as unknown) === "Svg")).toHaveLength(0)
    expect(byTestId(tree, "explorer-edge-light")).toHaveLength(0)
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
  })

  test("the halo beats strongly on the UI thread, 0.35 to full on a 1.5 s cycle", () => {
    const tree = render()
    expect(haloStyle(tree).opacity).toBe(edgePulseMotion.minOpacity)
    expect(edgePulseMotion.minOpacity).toBe(0.35)
    // The deeper halo is out at the low point of the beat.
    expect(deepStyle(tree).opacity).toBe(0)
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
    expect(edgePulseMotion.halfCycleMs * 2).toBe(1500)
  })

  test("the deeper halo swells in with the beat: nothing at the low point, full at the top", () => {
    expect(deepHaloOpacity(edgePulseMotion.minOpacity)).toBe(0)
    expect(deepHaloOpacity(1)).toBe(1)
    expect(deepHaloOpacity((edgePulseMotion.minOpacity + 1) / 2)).toBeCloseTo(0.5)
    // Clamped outside the beat.
    expect(deepHaloOpacity(0)).toBe(0)
    expect(deepHaloOpacity(1.2)).toBe(1)
  })

  test("pulses while the screen is focused", () => {
    render({ focused: true })
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
  })

  test("under Reduce Motion the glow is still at full strength, the deep halo with it", () => {
    reanimated.setReducedMotion(true)
    const tree = render()
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(haloStyle(tree).opacity).toBe(edgePulseMotion.stillOpacity)
    expect(edgePulseMotion.stillOpacity).toBe(1)
    expect(deepStyle(tree).opacity).toBe(1)
  })

  test("no loop while the screen is not focused or is covered by an overlay", () => {
    render({ focused: false })
    render({ covered: true })
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })
})
