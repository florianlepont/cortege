import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Text: mockComponent("Text"),
    StyleSheet: { create: <T,>(value: T): T => value, absoluteFill: { position: "absolute" } },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))

import type { SharedValue } from "react-native-reanimated"
import { defaultTheme } from "../../app/theme"
import { CompareUnavailableCard } from "./CompareUnavailableCard"

const originalConsoleError = console.error
beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})
afterAll(() => jest.restoreAllMocks())

const shared = (value: number) => ({ value }) as unknown as SharedValue<number>
const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(3).filter(Boolean))

function render(side: "left" | "right") {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<CompareUnavailableCard side={side} lineX={shared(150)} width={400} />)
  })
  return tree
}

describe("CompareUnavailableCard", () => {
  test("the left card covers the left half up to the line, on the canvas colour", () => {
    const card = render("left").root.findByProps({ testID: "compare-unavailable-left" })
    expect(flat(card.props.style)).toMatchObject({
      position: "absolute",
      left: 0,
      width: 150,
      backgroundColor: defaultTheme.colors.canvas,
    })
    expect(card.props.pointerEvents).toBe("none")
    expect(card.props.accessibilityLabel).toBe("Non téléchargé ici")
  })

  test("the right card starts at the line and runs to the right edge, with one short text", () => {
    const tree = render("right")
    const card = tree.root.findByProps({ testID: "compare-unavailable-right" })
    expect(flat(card.props.style)).toMatchObject({ left: 150, width: 250 })
    const texts = tree.root.findAllByType("Text" as never).map((node) => node.props.children)
    expect(texts).toEqual(["Non téléchargé ici"])
  })
})
