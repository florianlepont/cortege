import React from "react"
import renderer, { act } from "react-test-renderer"
import { IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import type { FactorField } from "../../app/types"
import { fr } from "../../i18n"
import { createDetailStyles } from "../factor-detail.styles"
import { defaultTheme } from "../../app/theme"
import { ReadOnlyValueField } from "./ReadOnlyValueField"
import { renderFactorField } from "./renderFactorField"

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
    TextInput: mockComponent("TextInput"),
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

const mountElement = (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(element)
  })
  return tree
}
const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => String(n.props.children))

describe("ReadOnlyValueField (follow-up 32-24)", () => {
  test("a labelled value, one accessible element, nothing to focus", () => {
    const tree = mountElement(
      <ReadOnlyValueField
        label="Arbres par ha"
        value="4"
        accessibilityLabel="Arbres par hectare, 4"
      />,
    )
    expect(texts(tree)).toEqual(["Arbres par ha", "4"])
    const root = tree.root.find(
      (n) => (n.type as unknown) === "View" && n.props.accessible === true,
    )
    expect(root.props.accessibilityRole).toBe("text")
    expect(root.props.accessibilityLabel).toBe("Arbres par hectare, 4")
    expect(tree.root.findAll((n) => (n.type as unknown) === "TextInput")).toHaveLength(0)
  })

  test("the error shows under the value when there is one", () => {
    const tree = mountElement(
      <ReadOnlyValueField label="x" value="0" accessibilityLabel="x, 0" error="Valeur requise" />,
    )
    expect(texts(tree)).toEqual(["x", "0", "Valeur requise"])
  })
})

describe("renderFactorField read-only numeric", () => {
  const styles = createDetailStyles(defaultTheme)
  const field = (value: string, touched = false, error: string | null = null): FactorField => ({
    label: "trees_per_ha",
    value,
    onChange: jest.fn(),
    required: true,
    error,
    touched,
    onTouch: jest.fn(),
  })
  const variant = { kind: "numeric", companion: "F" } as const
  const render = (f: FactorField, options: { readOnly: boolean; readOnlyEmpty?: string }) =>
    mountElement(<>{renderFactorField("F", variant, f, IBP_METHOD_V3_2, styles, options)}</>)

  test("the stored figure wins; an empty one falls back to the page's text, or to nothing", () => {
    expect(texts(render(field("5"), { readOnly: true, readOnlyEmpty: "0" }))).toEqual([
      fr.factorDetail.fieldLabels.trees_per_ha,
      "5",
    ])
    expect(texts(render(field("  "), { readOnly: true, readOnlyEmpty: "0" }))[1]).toBe("0")
    expect(texts(render(field(""), { readOnly: true }))[1]).toBe("")
  })

  test("the label carries no required star, and a touched error is shown", () => {
    const tree = render(field("", true, "Valeur requise"), { readOnly: true, readOnlyEmpty: "0" })
    expect(texts(tree)).toEqual([fr.factorDetail.fieldLabels.trees_per_ha, "0", "Valeur requise"])
  })
})
