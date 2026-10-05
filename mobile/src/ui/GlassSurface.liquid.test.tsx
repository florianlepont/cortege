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
jest.mock("../app/theme", () => ({ useBrandTheme: () => ({ scheme: "light" }) }))

import { GlassSurface } from "./GlassSurface"

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
    expect(glass.props.colorScheme).toBe("light")
  })
})
