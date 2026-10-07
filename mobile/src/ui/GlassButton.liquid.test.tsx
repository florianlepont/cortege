import React from "react"
import renderer, { act, type ReactTestInstance } from "react-test-renderer"
import { defaultTheme } from "../app/theme"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: ({
      children,
      ...props
    }: {
      children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode)
    }) =>
      ReactRef.createElement(
        "Pressable",
        props,
        typeof children === "function" ? children({ pressed: false }) : children,
      ),
    Platform: { OS: "ios" },
    StyleSheet: {
      create: <T,>(styles: T) => styles,
      absoluteFill: {},
      flatten: (style: unknown) =>
        Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity)) : (style ?? {}),
    },
  }
})
jest.mock("expo-glass-effect", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    isLiquidGlassAvailable: () => true,
    GlassView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassView", props, children),
  }
})

import { GlassButton } from "./GlassButton"

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const originalConsoleError = console.error
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

type Style = Record<string, unknown>
function flatten(style: unknown): Style {
  if (Array.isArray(style)) return style.reduce<Style>((acc, s) => ({ ...acc, ...flatten(s) }), {})
  return (style as Style | undefined | null) ?? {}
}

function render(props: Partial<React.ComponentProps<typeof GlassButton>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<GlassButton label="Terminer" onPress={() => {}} {...props} />)
  })
  const root = tree!.root
  const glass = root.findAll((n) => (n.type as unknown) === "GlassView") as ReactTestInstance[]
  const container = root.findAll((n) => (n.type as unknown) === "View")[0]
  return { root, glass, style: flatten(container.props.style) }
}

const cta = defaultTheme.visual.glassCta

describe("GlassButton on Liquid Glass (iOS 26)", () => {
  test("is one interactive GlassView tinted green, filling the pill behind the label", () => {
    const { glass } = render()
    expect(glass).toHaveLength(1)
    expect(glass[0].props.tintColor).toBe(cta.tint)
    expect(glass[0].props.isInteractive).toBe(true)
    expect(glass[0].props.glassEffectStyle).toBe("regular")
    expect(flatten(glass[0].props.style)).toMatchObject({
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    })
  })

  test("the button itself carries no fill, hairline or shadow: the glass draws its own edge", () => {
    const { style } = render()
    for (const key of ["backgroundColor", "borderWidth", "borderColor", "boxShadow"]) {
      expect(style).not.toHaveProperty(key)
    }
  })

  test("disabled swaps in the pale tint and stops the press shimmer", () => {
    const { glass } = render({ disabled: true })
    expect(glass[0].props.tintColor).toBe(cta.tintOff)
    expect(glass[0].props.isInteractive).toBe(false)
  })

  test("loading keeps the green tint but is not interactive", () => {
    const { glass } = render({ loading: true })
    expect(glass[0].props.tintColor).toBe(cta.tint)
    expect(glass[0].props.isInteractive).toBe(false)
  })
})
