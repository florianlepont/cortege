import React from "react"
import renderer, { act } from "react-test-renderer"

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Pressable: mockComponent("Pressable"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./AppText", () => ({ AppText: "Text" }))

import { defaultTheme } from "../app/theme"
import { RadioCard, type RadioCardProps } from "./RadioCard"

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

function render(props: Partial<RadioCardProps> = {}) {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <RadioCard
        selected={false}
        onPress={jest.fn()}
        title="Titre"
        caption="Légende"
        accessibilityLabel="Titre. Légende"
        testID="card"
        {...props}
      />,
    )
  })
  return tree
}

function card(tree: renderer.ReactTestRenderer) {
  // The outermost node carrying the radio role: the AppPressable the card renders.
  return tree.root.findAll(
    (node) => node.props.testID === "card" && node.props.accessibilityRole === "radio",
  )[0]
}

describe("RadioCard", () => {
  test("is a radio with its label, state and test id", () => {
    const tree = render({ selected: true })
    const node = card(tree)
    expect(node.props.accessibilityRole).toBe("radio")
    expect(node.props.accessibilityLabel).toBe("Titre. Légende")
    expect(node.props.accessibilityState).toEqual({ selected: true, disabled: undefined })
  })

  test("selected: a 2 pt accent border and a checkmark on the filled radio", () => {
    const tree = render({ selected: true })
    const checks = tree.root.findAllByType("Ionicons" as never)
    expect(checks).toHaveLength(1)
    expect(checks[0].props.name).toBe("checkmark-outline")
    expect(checks[0].props.size).toBe(14)
    expect(checks[0].props.color).toBe(defaultTheme.semanticColors.onCtaPrimary)
    const style = JSON.stringify(card(tree).props.style)
    expect(style).toContain('"borderWidth":2')
    expect(style).toContain(defaultTheme.semanticColors.ctaPrimary)
  })

  test("unselected: no checkmark", () => {
    const tree = render({ selected: false })
    expect(tree.root.findAllByType("Ionicons" as never)).toHaveLength(0)
  })

  test("an icon is drawn in the title row and hidden from a screen reader", () => {
    const tree = render({ icon: "lock-closed-outline" })
    const glyphs = tree.root.findAllByType("Ionicons" as never)
    expect(glyphs).toHaveLength(1)
    expect(glyphs[0].props.name).toBe("lock-closed-outline")
    expect(glyphs[0].props.size).toBe(18)
    expect(glyphs[0].props.accessible).toBe(false)
    expect(glyphs[0].props.importantForAccessibility).toBe("no")
    expect(glyphs[0].props.color).toBe(defaultTheme.colors.textSecondary)
  })

  test("a selected icon takes the strong ink", () => {
    const tree = render({ icon: "people-outline", selected: true })
    const glyph = tree.root
      .findAllByType("Ionicons" as never)
      .find((node) => node.props.name === "people-outline")
    expect(glyph?.props.color).toBe(defaultTheme.semanticColors.textStrong)
  })

  test("a press calls onPress; a disabled card blocks it without dimming", () => {
    const onPress = jest.fn()
    const tree = render({ onPress })
    act(() => {
      card(tree).props.onPress()
    })
    expect(onPress).toHaveBeenCalledTimes(1)

    const blocked = render({ onPress: jest.fn(), disabled: true })
    const node = card(blocked)
    expect(node.props.disabled).toBe(true)
    expect(node.props.accessibilityState).toEqual({ selected: false, disabled: true })
    expect(JSON.stringify(node.props.style)).not.toContain("opacity")
  })
})
