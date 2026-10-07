import React from "react"
import renderer, { act } from "react-test-renderer"
import { NavigationContext } from "@react-navigation/native"
import * as reanimated from "../../../test/react-native-reanimated.mock"
import { defaultTheme } from "../../app/theme"
import { edgePulseMotion } from "../../app/visual-tokens"
import { ScreenCoverContext } from "../../ui/screen-cover-context"
import { EdgePulse } from "./EdgePulse"

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
const layer = (tree: renderer.ReactTestRenderer) =>
  tree.root.find((n) => n.props.testID === "explorer-edge-pulse")
const flatStyle = (tree: renderer.ReactTestRenderer): StyleEntry =>
  Object.assign({}, ...(layer(tree).props.style as StyleEntry[]))

describe("EdgePulse (12.2-19)", () => {
  test("covers the map with the green inset glow and never takes a touch", () => {
    const tree = render()
    const node = layer(tree)
    expect(node.props.pointerEvents).toBe("none")
    expect(node.props.accessibilityElementsHidden).toBe(true)
    expect(node.props.importantForAccessibility).toBe("no-hide-descendants")
    const style = flatStyle(tree)
    expect(style.position).toBe("absolute")
    expect(style.boxShadow).toBe(defaultTheme.visual.edgeGlow)
    expect(String(style.boxShadow)).toMatch(/^inset /)
    // Layer rules of 12.2-17: no border and no continuous corners on this layer.
    expect(style).not.toHaveProperty("borderWidth")
    expect(style).not.toHaveProperty("borderCurve")
  })

  test("pulses on the UI thread in a 1.6 s cycle, guarded by Reduce Motion", () => {
    render()
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
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
    expect(edgePulseMotion.halfCycleMs * 2).toBe(1600)
  })

  test("pulses while the screen is focused", () => {
    render({ focused: true })
    expect(withRepeatSpy).toHaveBeenCalledTimes(1)
  })

  test("under Reduce Motion the glow is still: no loop, a fixed opacity", () => {
    reanimated.setReducedMotion(true)
    const tree = render()
    expect(withRepeatSpy).not.toHaveBeenCalled()
    expect(flatStyle(tree).opacity).toBe(edgePulseMotion.stillOpacity)
  })

  test("no loop while the screen is not focused or is covered by an overlay", () => {
    render({ focused: false })
    render({ covered: true })
    expect(withRepeatSpy).not.toHaveBeenCalled()
  })
})
