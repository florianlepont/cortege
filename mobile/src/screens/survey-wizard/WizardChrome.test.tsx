import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandFontScaleCaps } from "../../app/brand-tokens"
import { WizardHeading } from "./WizardChrome"

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
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, hairlineWidth: 1 },
    Platform: { OS: "ios", select: <T,>(spec: { ios?: T }) => spec.ios },
  }
})

describe("WizardHeading", () => {
  test("caps the heading's font scale so a long word never breaks in two at the largest text size", () => {
    let tree: renderer.ReactTestRenderer | undefined
    act(() => {
      tree = renderer.create(<WizardHeading title="Quelle est la surface ?" lead="Une phrase." />)
    })
    const header = tree!.root.findAll((node) => node.props.accessibilityRole === "header")[0]
    expect(header.props.maxFontSizeMultiplier).toBe(brandFontScaleCaps.title)
  })
})
