import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../../i18n"
import { CountingModeChip } from "./CountingModeStrip"

const t = fr.factorDetail.countingMode

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
    useColorScheme: () => "light",
  }
})

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

function render(element: React.ReactElement) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return tree
}

const textOf = (node: renderer.ReactTestInstance): string =>
  node.children.map((child) => (typeof child === "string" ? child : textOf(child))).join("")

describe("CountingModeChip", () => {
  test("is the non-interactive 'Relevé déplafonné' badge", () => {
    const tree = render(<CountingModeChip />)
    const chip = tree.root.findAll((n) => n.props.testID === "counting-chip")[0]
    expect(chip).toBeDefined()
    expect(textOf(chip)).toBe("Relevé déplafonné")
    expect(textOf(chip)).toBe(t.chip)
    expect(tree.root.findAllByType("Pressable" as unknown as React.ElementType)).toHaveLength(0)
  })
})
