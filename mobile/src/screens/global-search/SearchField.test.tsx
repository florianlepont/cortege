import React from "react"
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer"
import { brandInteraction, brandRadius } from "../../app/brand-tokens"
import { defaultTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SearchField } from "./SearchField"

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
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    ActivityIndicator: mockComponent("ActivityIndicator"),
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  }
})
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))

let tree: ReactTestRenderer

function mount(extra: { value?: string; busy?: boolean } = {}) {
  const handlers = {
    onChangeText: jest.fn(),
    onSubmit: jest.fn(),
    onClear: jest.fn(),
  }
  act(() => {
    tree = renderer.create(
      <SearchField value={extra.value ?? ""} busy={extra.busy ?? false} {...handlers} />,
    )
  })
  return handlers
}

afterEach(() => {
  act(() => tree?.unmount())
})

const input = () => tree.root.findByProps({ testID: "search-field" })
const queryAll = (testID: string) =>
  tree.root.findAll(
    (node: ReactTestInstance) => typeof node.type === "string" && node.props.testID === testID,
  )
const styleOf = (node: ReactTestInstance): Record<string, unknown> =>
  [node.props.style].flat(3).reduce(
    (acc: Record<string, unknown>, item: Record<string, unknown> | null | undefined) => ({
      ...acc,
      ...(item ?? {}),
    }),
    {},
  )

describe("SearchField (25-11)", () => {
  test("the input follows the field contract of the UI-SPEC", () => {
    mount({ value: "foret" })
    const props = input().props
    expect(props.returnKeyType).toBe("search")
    expect(props.autoCorrect).toBe(false)
    expect(props.autoCapitalize).toBe("none")
    expect(props.maxLength).toBe(100)
    expect(props.accessibilityRole).toBe("search")
    expect(props.accessibilityLabel).toBe(fr.search.field.a11yLabel)
    expect(props.accessibilityHint).toBe(fr.search.field.a11yHint)
    expect(props.placeholder).toBe(fr.search.field.placeholder)
    expect(props.value).toBe("foret")
  })

  test("typing and the return key reach the page", () => {
    const handlers = mount()
    act(() => input().props.onChangeText("Fon"))
    expect(handlers.onChangeText).toHaveBeenCalledWith("Fon")
    act(() => input().props.onSubmitEditing())
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1)
  })

  test("the glass field is 48 pt high with the card radius and a leading magnifier", () => {
    mount()
    const field = tree.root.findAll(
      (node) => (node.type as unknown) === "View" && styleOf(node).borderRadius !== undefined,
    )[0]
    expect(styleOf(field).minHeight).toBe(48)
    expect(styleOf(field).borderRadius).toBe(brandRadius.card)
    expect(styleOf(field).backgroundColor).toBe(defaultTheme.visual.glass.cardFill)
    const glyph = tree.root.findAllByType("Ionicons" as never)[0]
    expect(glyph.props.name).toBe("search-outline")
    expect(glyph.props.size).toBe(20)
  })

  test("the clear button shows only when the field is not empty and clears it", () => {
    mount()
    expect(queryAll("search-clear")).toHaveLength(0)
    act(() => tree.unmount())
    const handlers = mount({ value: "ab" })
    const clear = tree.root.findByProps({ testID: "search-clear" })
    expect(clear.props.accessibilityLabel).toBe(fr.search.field.clear)
    expect(clear.props.accessibilityRole).toBe("button")
    act(() => clear.props.onPress())
    expect(handlers.onClear).toHaveBeenCalledTimes(1)
  })

  test("the clear target is 44 x 44 and its glyph is the 18 pt close-circle", () => {
    mount({ value: "ab" })
    const styled = tree.root.findAll(
      (node) =>
        typeof node.type === "string" &&
        styleOf(node).width === brandInteraction.hitTarget.min &&
        styleOf(node).height === brandInteraction.hitTarget.min,
    )
    expect(styled.length).toBeGreaterThan(0)
    const glyph = tree.root
      .findAllByType("Ionicons" as never)
      .find((node) => node.props.name === "close-circle-outline")
    expect(glyph?.props.size).toBe(18)
  })

  test("the spinner shows only while busy and is hidden from accessibility", () => {
    mount({ value: "ab" })
    expect(queryAll("search-field-busy")).toHaveLength(0)
    act(() => tree.unmount())
    mount({ value: "ab", busy: true })
    const spinner = queryAll("search-field-busy")[0]
    expect(spinner.props.accessibilityElementsHidden).toBe(true)
    expect(spinner.props.importantForAccessibility).toBe("no-hide-descendants")
    expect(tree.root.findAllByType("ActivityIndicator" as never)).toHaveLength(1)
  })

  test("the spinner can show with an empty field and still no clear button", () => {
    mount({ value: "", busy: true })
    expect(queryAll("search-field-busy")).toHaveLength(1)
    expect(queryAll("search-clear")).toHaveLength(0)
  })
})
