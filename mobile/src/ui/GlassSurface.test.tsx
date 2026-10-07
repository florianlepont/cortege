import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandGlassFills } from "../app/visual-tokens"

const mockPlatform: { OS: "ios" | "android" } = { OS: "ios" }

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  return {
    View: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement("View", props, children),
    StyleSheet: { create: <T,>(styles: T): T => styles, absoluteFill: {} },
    get Platform() {
      return mockPlatform
    },
  }
})
jest.mock("expo-blur", () => ({ BlurView: "BlurView" }))
jest.mock("expo-glass-effect", () => ({
  isLiquidGlassAvailable: () => false,
  GlassView: "GlassView",
}))
jest.mock("../app/theme", () => ({ useBrandTheme: () => ({ scheme: "dark" }) }))

import { GlassSurface } from "./GlassSurface"

const surface = { tint: "tint", fill: "rgba(1, 2, 3, 0.84)", android: "rgba(1, 2, 3, 0.94)" }

function overlayFill(element: React.ReactElement): unknown {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  const fills = tree.root
    .findAll((node) => (node.type as unknown) === "View")
    .map((node) => Object.assign({}, ...[node.props.style].flat(3).filter(Boolean)))
    .map((style) => style.backgroundColor)
    .filter(Boolean)
  expect(fills).toHaveLength(1)
  return fills[0]
}

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

afterEach(() => {
  mockPlatform.OS = "ios"
})

describe("GlassSurface without Liquid Glass (blur and fill)", () => {
  test("the default fill follows the scheme", () => {
    expect(overlayFill(<GlassSurface />)).toBe(brandGlassFills.control.dark)
    mockPlatform.OS = "android"
    expect(overlayFill(<GlassSurface />)).toBe(brandGlassFills.android.dark)
  })

  test("a surface with its own glass replaces the fill, flat and denser on Android (12.2-19)", () => {
    expect(overlayFill(<GlassSurface surface={surface} />)).toBe(surface.fill)
    mockPlatform.OS = "android"
    expect(overlayFill(<GlassSurface surface={surface} />)).toBe(surface.android)
  })
})
