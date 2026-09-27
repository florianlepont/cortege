import React from "react"
import renderer, { act } from "react-test-renderer"
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
})
