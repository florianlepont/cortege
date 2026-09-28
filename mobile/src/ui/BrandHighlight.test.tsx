import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandColors } from "../app/brand-tokens"
import { BrandHighlight } from "./BrandHighlight"

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
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})

function render(props: Partial<React.ComponentProps<typeof BrandHighlight>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <BrandHighlight {...props}>{props.children ?? "10 facteurs"}</BrandHighlight>,
    )
  })
  return tree!
}

describe("BrandHighlight (charter §6.1)", () => {
  test("renders the label in uppercase styling", () => {
    const tree = render()
    const text = tree.root.findByType("Text" as unknown as React.ComponentType)
    expect([text.props.style].flat(2)).toEqual(
      expect.arrayContaining([expect.objectContaining({ textTransform: "uppercase" })]),
    )
  })

  test("defaults to the sage highlight fill", () => {
    const tree = render()
    const view = tree.root.findByType("View" as unknown as React.ComponentType)
    const flatStyle = [view.props.style].flat(2)
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: brandColors.sage })]),
    )
  })

  test("accepts a custom fill and text color", () => {
    const tree = render({ color: brandColors.forest, textColor: brandColors.white })
    const view = tree.root.findByType("View" as unknown as React.ComponentType)
    const flatStyle = [view.props.style].flat(2)
    expect(flatStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: brandColors.forest })]),
    )
    const text = tree.root.findByType("Text" as unknown as React.ComponentType)
    expect([text.props.style].flat(2)).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: brandColors.white })]),
    )
  })
})
