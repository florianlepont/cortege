import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandFontScaleCaps } from "../app/brand-tokens"
import { AppText } from "./AppText"

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

function render(props: Partial<React.ComponentProps<typeof AppText>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(<AppText {...props}>hello</AppText>)
  })
  return tree!.root.findByType("Text" as unknown as React.ComponentType)
}

// DS-05: no text in the app should scale unbounded under Larger Accessibility Sizes (tested here
// against the AX3-oriented caps in `brandFontScaleCaps` — RN's actual OS-driven scaling isn't
// reproducible in a Jest/node environment, so this asserts the prop every AppText carries).
describe("AppText (DS-05: maxFontSizeMultiplier caps)", () => {
  test("defaults to the app-wide cap when the caller passes none", () => {
    const text = render()
    expect(text.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.default)
  })

  test("a caller on a fixed-width layout can pass a tighter role cap", () => {
    const text = render({ maxFontSizeMultiplier: brandFontScaleCaps.label })
    expect(text.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.label)
  })

  test("still applies the branded default font family under a custom style", () => {
    const text = render({ style: { color: "red" } })
    expect(text.props.style).toEqual([
      expect.objectContaining({ fontFamily: expect.any(String) }),
      { color: "red" },
    ])
  })
})
