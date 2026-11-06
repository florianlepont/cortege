import React from "react"
import renderer, { act } from "react-test-renderer"
import { defaultTheme } from "../app/theme"
import { SELECTION_CIRCLE_SIZE, SelectionCircle } from "./SelectionCircle"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    View: mockComponent("View"),
    Platform: { OS: "ios", select: (options: { default?: unknown }) => options.default },
    StyleSheet: { create: <T,>(styles: T) => styles, flatten: (style: unknown) => style },
    useColorScheme: () => "light",
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))

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

type Style = Record<string, unknown>
const flatten = (style: unknown): Style =>
  Array.isArray(style)
    ? style.reduce<Style>((acc, item) => ({ ...acc, ...flatten(item) }), {})
    : ((style as Style | null | undefined) ?? {})

function mount(selected: boolean) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(<SelectionCircle selected={selected} />)
  })
  const circle = tree.root.find(
    (n) => (n.type as unknown) === "View" && n.props.style !== undefined,
  )
  const check = () => tree.root.findAll((n) => (n.type as unknown) === "Ionicons")
  return { tree, circle, check }
}

describe("SelectionCircle (redesign A-C3)", () => {
  test("unticked: a 24 pt circle with a 1.5 pt ring in the input border colour, no fill, no check", () => {
    const { circle, check } = mount(false)
    expect(SELECTION_CIRCLE_SIZE).toBe(24)
    expect(flatten(circle.props.style)).toMatchObject({
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: defaultTheme.colors.inputBorder,
    })
    expect(flatten(circle.props.style).backgroundColor).toBeUndefined()
    expect(check()).toHaveLength(0)
  })

  test("ticked: filled with the call-to-action colour, no ring, an outline check on it", () => {
    const { circle, check } = mount(true)
    const style = flatten(circle.props.style)
    expect(style.backgroundColor).toBe(defaultTheme.semanticColors.ctaPrimary)
    expect(style.borderWidth).toBeUndefined()
    expect(check()).toHaveLength(1)
    expect(check()[0].props).toMatchObject({
      name: "checkmark-outline",
      size: 16,
      color: defaultTheme.semanticColors.onCtaPrimary,
    })
  })

  test("is decorative: hidden from a screen reader", () => {
    const { circle, check } = mount(true)
    expect(circle.props.accessible).toBe(false)
    expect(circle.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(check()[0].props.accessible).toBe(false)
  })

  test("a tick after mount keeps the check, and an untick removes it", () => {
    const { tree, check } = mount(false)
    act(() => tree.update(<SelectionCircle selected />))
    expect(check()).toHaveLength(1)
    act(() => tree.update(<SelectionCircle selected={false} />))
    expect(check()).toHaveLength(0)
  })
})
