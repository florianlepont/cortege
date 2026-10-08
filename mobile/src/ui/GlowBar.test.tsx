import React from "react"
import renderer, { act } from "react-test-renderer"

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
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

import * as reanimated from "../../test/react-native-reanimated.mock"
import { defaultTheme } from "../app/theme"
import { GlowBar } from "./GlowBar"

const withDelaySpy = jest.spyOn(reanimated, "withDelay")
const withTimingSpy = jest.spyOn(reanimated, "withTiming")

afterEach(() => {
  reanimated.setReducedMotion(false)
  withDelaySpy.mockClear()
  withTimingSpy.mockClear()
})

function render(props: Partial<React.ComponentProps<typeof GlowBar>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<GlowBar ratio={0.5} {...props} />)
  })
  const views = tree!.root.findAll((n) => (n.type as unknown) === "View")
  return { track: views[0], fill: flatten(views[1].props.style) }
}

describe("GlowBar", () => {
  test.each([
    [0.5, "50%"],
    [1.4, "100%"],
    [-1, "0%"],
    [0, "0%"],
  ])("ratio %s gives a fill width of %s", (ratio, width) => {
    expect(render({ ratio }).fill.width).toBe(width)
  })

  test("the fill carries the glow tokens and the track the 6 pt geometry", () => {
    const forest = defaultTheme.visual.forest
    const { track, fill } = render()
    expect(fill).toMatchObject({
      experimental_backgroundImage: forest.glowImage,
      backgroundColor: forest.glowFallback,
      boxShadow: forest.glowShadow,
      transformOrigin: "left",
    })
    expect(flatten(track.props.style)).toMatchObject({
      backgroundColor: forest.glowTrack,
      height: 6,
      borderRadius: 6,
    })
    expect(track.props.accessibilityElementsHidden).toBe(true)
  })

  test("the fill grows with scaleX only, never with an animated width", () => {
    const { fill } = render({ animate: true })
    expect(fill.transform).toEqual([{ scaleX: 0 }])
    expect(fill.width).toBe("50%")
  })

  test("animate starts a delayed timing", () => {
    render({ animate: true })
    expect(withDelaySpy).toHaveBeenCalledTimes(1)
    expect(withDelaySpy.mock.calls[0][0]).toBe(120)
    expect(withTimingSpy).toHaveBeenCalledTimes(1)
    // The mock's withTiming types only `toValue`; the config is the second runtime argument.
    const config = (withTimingSpy.mock.calls[0] as unknown[])[1]
    expect(config).toMatchObject({ duration: 500, reduceMotion: "system" })
  })

  test("a custom delay is passed through", () => {
    render({ animate: true, delayMs: 300 })
    expect(withDelaySpy.mock.calls[0][0]).toBe(300)
  })

  test("without animate the final state shows and no timing starts", () => {
    const { fill } = render()
    expect(fill.transform).toEqual([{ scaleX: 1 }])
    expect(withTimingSpy).not.toHaveBeenCalled()
  })

  test("under Reduce Motion the scale is 1 at first render and no timing starts", () => {
    reanimated.setReducedMotion(true)
    const { fill } = render({ animate: true })
    expect(fill.transform).toEqual([{ scaleX: 1 }])
    expect(withTimingSpy).not.toHaveBeenCalled()
    expect(withDelaySpy).not.toHaveBeenCalled()
  })
})
