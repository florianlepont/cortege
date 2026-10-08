import React from "react"
import renderer, { act } from "react-test-renderer"
import * as reanimated from "../../test/react-native-reanimated.mock"
import { defaultTheme } from "../app/theme"
import { HaloPulse } from "./HaloPulse"

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
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    FlatList: mockComponent("FlatList"),
    ScrollView: mockComponent("ScrollView"),
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
    },
  }
})

const withSequenceSpy = jest.spyOn(reanimated, "withSequence")
const withTimingSpy = jest.spyOn(reanimated, "withTiming")

afterEach(() => {
  reanimated.setReducedMotion(false)
  withSequenceSpy.mockClear()
  withTimingSpy.mockClear()
})

type Style = Record<string, unknown>

function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

const shadow = defaultTheme.visual.forest.shadow

function mount(trigger: number) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <HaloPulse trigger={trigger} radius={26} shadow={shadow} testID="halo" />,
    )
  })
  return tree!
}

function update(tree: renderer.ReactTestRenderer, trigger: number) {
  act(() => {
    tree.update(<HaloPulse trigger={trigger} radius={26} shadow={shadow} testID="halo" />)
  })
}

function layer(tree: renderer.ReactTestRenderer) {
  return tree.root.findAll((n) => (n.type as unknown) === "View")[0]
}

describe("HaloPulse", () => {
  test("starts invisible and does not pulse on first mount", () => {
    const tree = mount(0)
    expect(flatten(layer(tree).props.style).opacity).toBe(0)
    expect(withSequenceSpy).not.toHaveBeenCalled()
  })

  test("pulses once when the trigger changes after mount, 250 ms up and 250 ms down", () => {
    const tree = mount(0)
    update(tree, 1)
    expect(withSequenceSpy).toHaveBeenCalledTimes(1)
    expect(withTimingSpy).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({ duration: 250 }))
    expect(withTimingSpy).toHaveBeenNthCalledWith(2, 0, expect.objectContaining({ duration: 250 }))
    update(tree, 1)
    expect(withSequenceSpy).toHaveBeenCalledTimes(1)
    update(tree, 2)
    expect(withSequenceSpy).toHaveBeenCalledTimes(2)
  })

  test("never pulses under Reduce Motion", () => {
    reanimated.setReducedMotion(true)
    const tree = mount(0)
    update(tree, 1)
    expect(withSequenceSpy).not.toHaveBeenCalled()
  })

  test("is a static shadow layer hidden from touch and accessibility", () => {
    const tree = mount(0)
    const view = layer(tree)
    expect(flatten(view.props.style)).toMatchObject({
      position: "absolute",
      borderRadius: 26,
      boxShadow: shadow,
    })
    expect(view.props.pointerEvents).toBe("none")
    expect(view.props.accessibilityElementsHidden).toBe(true)
    expect(view.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(view.props.testID).toBe("halo")
  })
})
