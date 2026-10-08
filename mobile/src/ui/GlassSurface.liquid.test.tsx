import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    View: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("View", props, children),
    StyleSheet: {
      create: <T,>(styles: T): T => styles,
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
const mockScheme = { value: "light" as "light" | "dark" }
jest.mock("../app/theme", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    useBrandTheme: () => ({ scheme: mockScheme.value }),
    GlassInkProvider: ({ children }: { children?: React.ReactNode }) =>
      ReactRef.createElement("GlassInkProvider", null, children),
  }
})

import { liquidGlassDark } from "../app/visual-tokens"
import { View } from "react-native"
import { GlassSurface } from "./GlassSurface"

function glassOf(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  const glass = tree.root.findByType("GlassView" as never)
  return { glass, style: Object.assign({}, ...[glass.props.style].flat(Infinity)) }
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  mockScheme.value = "light"
})

describe("GlassSurface on Liquid Glass (iOS 26)", () => {
  test("renders a GlassView and drops the caller's outline, keeping the shape", () => {
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(
        <GlassSurface
          interactive
          style={{ borderRadius: 20, borderWidth: 1, borderColor: "#000", padding: 8 }}
        />,
      )
    })
    const glass = tree.root.findByType("GlassView" as never)
    const style = Object.assign({}, ...[glass.props.style].flat(Infinity))
    expect(style).toMatchObject({ borderRadius: 20, padding: 8 })
    expect(style.borderWidth).toBeUndefined()
    expect(style.borderColor).toBeUndefined()
    expect(glass.props.isInteractive).toBe(true)
    expect(glass.props.tintColor).toBeUndefined()
    expect(glass.props.colorScheme).toBe("light")
  })

  test("a surface with its own glass tints the Liquid Glass (map controls, 12.2-19)", () => {
    const surface = { tint: "rgba(16, 24, 14, 0.84)", fill: "unused", android: "unused" }
    let tree!: renderer.ReactTestRenderer
    act(() => {
      tree = renderer.create(<GlassSurface surface={surface} />)
    })
    expect(tree.root.findByType("GlassView" as never).props.tintColor).toBe(surface.tint)
  })

  test("light: the untinted system glass, no fill behind it, its content in the theme's ink", () => {
    const { glass, style } = glassOf(
      <GlassSurface>
        <View />
      </GlassSurface>,
    )
    expect(glass.props.tintColor).toBeUndefined()
    expect(style.backgroundColor).toBeUndefined()
    expect(glass.findAllByType("GlassInkProvider" as never)).toHaveLength(0)
  })

  test("dark (12.2-23 correction): the translucent default tint, no underlay, glass ink inside", () => {
    mockScheme.value = "dark"
    const { glass, style } = glassOf(
      <GlassSurface style={{ borderRadius: 12 }}>
        <View testID="content" />
      </GlassSurface>,
    )
    expect(glass.props.tintColor).toBe(liquidGlassDark.tint)
    expect(style.backgroundColor).toBeUndefined()
    expect(style.borderRadius).toBe(12)
    expect(glass.props.colorScheme).toBe("dark")
    const ink = glass.findByType("GlassInkProvider" as never)
    expect(ink.findAll((node) => node.props.testID === "content").length).toBeGreaterThan(0)
  })

  test("dark: a surface's own tint, and still no fill behind the glass", () => {
    mockScheme.value = "dark"
    const surface = { tint: "rgba(16, 24, 14, 0.66)", fill: "unused", android: "unused" }
    const { glass, style } = glassOf(<GlassSurface surface={surface} />)
    expect(glass.props.tintColor).toBe(surface.tint)
    expect(style.backgroundColor).toBeUndefined()
  })

  test("tone dark over a light app: dark glass, the content wrapped in the glass ink scope", () => {
    const { glass } = glassOf(
      <GlassSurface tone="dark">
        <View />
      </GlassSurface>,
    )
    expect(glass.props.colorScheme).toBe("dark")
    expect(glass.findAllByType("GlassInkProvider" as never)).toHaveLength(1)
  })
})
