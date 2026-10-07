import React from "react"
import renderer, { act } from "react-test-renderer"
import { PageTitle } from "./PageTitle"
import { FrameLargeTitleContext } from "./frame-large-title"
import { brandFontScaleCaps, brandTypography } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"

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
  const ReactActual = jest.requireActual<typeof import("react")>("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

describe("PageTitle (OA-21)", () => {
  test("is the page's large title: a header for screen readers, Sora SemiBold 24 with tight tracking", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<PageTitle>Compte</PageTitle>)
    })
    const text = tree!.root.findByType("Text" as unknown as React.ComponentType)
    expect(text.props.accessibilityRole).toBe("header")
    expect(text.props.children).toBe("Compte")
    const style = ([] as object[]).concat(text.props.style).reduce((a, b) => ({ ...a, ...b }), {})
    expect(style).toMatchObject({
      ...brandTypography.screenTitle,
      fontSize: 24,
      fontFamily: "Sora-SemiBold",
      letterSpacing: -0.6,
      color: defaultTheme.colors.textPrimary,
    })
    expect(style).not.toHaveProperty("fontWeight")
    expect(text.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.title)
  })
})

describe("PageTitle under the native large title (12.2-17)", () => {
  test("renders nothing: the native header already names the page, never twice", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(
        <FrameLargeTitleContext.Provider value>
          <PageTitle>Compte</PageTitle>
        </FrameLargeTitleContext.Provider>,
      )
    })
    expect(tree!.toJSON()).toBeNull()
  })
})
