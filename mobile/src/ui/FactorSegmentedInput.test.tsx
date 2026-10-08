import React from "react"
import renderer, { act } from "react-test-renderer"
import { brandInteraction } from "../app/brand-tokens"
import { defaultTheme } from "../app/theme"
import { fr } from "../i18n"
import { FactorSegmentedInput } from "./FactorSegmentedInput"

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
    Pressable: mockComponent("Pressable"),
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

const options = fr.factorInput.continuityOptions

function render(
  value: string,
  extra: Partial<React.ComponentProps<typeof FactorSegmentedInput>> = {},
) {
  const onChange = jest.fn()
  const onTouch = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorSegmentedInput
        label="Classe (0, 2 ou 5)"
        value={value}
        onChange={onChange}
        options={options}
        touched={false}
        onTouch={onTouch}
        error={null}
        testID="h"
        {...extra}
      />,
    )
  })
  return { tree: tree!, onChange, onTouch }
}

describe("FactorSegmentedInput (FLOW-01 segmented variant, H is 0/2/5 only)", () => {
  test("renders one radio option per allowed score with the recent/partial/ancient labels", () => {
    const { tree } = render("")
    const radios = tree.root.findAll(
      (n) => (n.type as unknown) === "Pressable" && n.props.accessibilityRole === "radio",
    )
    expect(radios).toHaveLength(3)
    expect(radios.map((r) => r.props.accessibilityLabel)).toEqual([
      "Récente",
      "Partielle",
      "Ancienne",
    ])
  })

  test("selecting an option calls onChange with its value and marks touched", () => {
    const { tree, onChange, onTouch } = render("")
    const ancient = tree.root.findAll(
      (n) => n.props.accessibilityRole === "radio" && n.props.accessibilityLabel === "Ancienne",
    )[0]
    act(() => {
      ancient.props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith("5")
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  test("the active option is marked selected", () => {
    const { tree } = render("2")
    const partial = tree.root.findAll(
      (n) => n.props.accessibilityRole === "radio" && n.props.accessibilityLabel === "Partielle",
    )[0]
    expect(partial.props.accessibilityState).toEqual({ selected: true, checked: true })
  })

  test("no error shows before the field is touched, even when one is available", () => {
    const { tree } = render("", { error: "Champ obligatoire", touched: false })
    const errorTexts = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && String(n.props.children) === "Champ obligatoire",
    )
    expect(errorTexts).toHaveLength(0)
  })

  test("touching the field then shows the error", () => {
    const { tree } = render("", { error: "Champ obligatoire", touched: true })
    const errorTexts = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && String(n.props.children) === "Champ obligatoire",
    )
    expect(errorTexts.length).toBeGreaterThan(0)
  })

  describe("variant I tokens, sizes unchanged (D-05)", () => {
    type Style = Record<string, unknown>
    const flatten = (style: unknown): Style =>
      Array.isArray(style)
        ? style.reduce<Style>((acc, item) => ({ ...acc, ...flatten(item) }), {})
        : ((style as Style | null | undefined) ?? {})
    const radio = (tree: renderer.ReactTestRenderer, label: string) =>
      tree.root.findAll(
        (n) => n.props.accessibilityRole === "radio" && n.props.accessibilityLabel === label,
      )[0]
    const textOf = (node: renderer.ReactTestInstance) =>
      flatten(node.findAll((n) => (n.type as unknown) === "Text")[0].props.style)

    test("the active segment is the inverted neutral pill, the others the chip fill", () => {
      const { tree } = render("2")
      const { chip } = defaultTheme.visual
      const active = flatten(radio(tree, "Partielle").props.style)
      expect(active.backgroundColor).toBe(chip.activeBg)
      expect(active.borderColor).toBe(chip.activeBg)
      expect(textOf(radio(tree, "Partielle")).color).toBe(chip.activeText)
      for (const label of ["Récente", "Ancienne"]) {
        const inactive = flatten(radio(tree, label).props.style)
        expect(inactive.backgroundColor).toBe(chip.fill)
        expect(inactive.borderColor).toBe(chip.border)
        expect(textOf(radio(tree, label)).color).not.toBe(chip.activeText)
      }
    })

    test("every segment keeps the 44 pt minimum height, selected or not", () => {
      expect(brandInteraction.hitTarget.min).toBe(44)
      const { tree } = render("5")
      for (const label of ["Récente", "Partielle", "Ancienne"]) {
        expect(flatten(radio(tree, label).props.style).minHeight).toBe(44)
      }
    })
  })
})
