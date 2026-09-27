import React from "react"
import renderer, { act } from "react-test-renderer"
import { fr } from "../i18n"
import { FactorChipsInput } from "./FactorChipsInput"

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

const options = fr.factorInput.strataOptions
const countLabel = (count: number): string => `${count} strate(s)`

function render(value: string, extra: Partial<React.ComponentProps<typeof FactorChipsInput>> = {}) {
  const onChange = jest.fn()
  const onTouch = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorChipsInput
        label="Nombre de strates"
        value={value}
        onChange={onChange}
        options={options}
        touched={false}
        onTouch={onTouch}
        error={null}
        countLabel={countLabel}
        testID="b"
        {...extra}
      />,
    )
  })
  return { tree: tree!, onChange, onTouch }
}

describe("FactorChipsInput (FLOW-01 chips variant, count derived from selection)", () => {
  test("pre-checks the first N options from the incoming count", () => {
    const { tree } = render("2")
    const chips = tree.root.findAll(
      (n) => (n.type as unknown) === "Pressable" && n.props.accessibilityState !== undefined,
    )
    expect(chips[0].props.accessibilityState.selected).toBe(true)
    expect(chips[1].props.accessibilityState.selected).toBe(true)
    expect(chips[2].props.accessibilityState.selected).toBe(false)
  })

  test("toggling a chip updates the derived count and calls onTouch", () => {
    const { tree, onChange, onTouch } = render("0")
    const chips = tree.root.findAll(
      (n) => (n.type as unknown) === "Pressable" && n.props.accessibilityState !== undefined,
    )
    act(() => {
      chips[0].props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith("1")
    act(() => {
      chips[1].props.onPress()
    })
    expect(onChange).toHaveBeenLastCalledWith("2")
    expect(onTouch).toHaveBeenCalledTimes(2)
  })

  test("unchecking a chip decreases the derived count", () => {
    const { tree, onChange } = render("2")
    const chips = tree.root.findAll(
      (n) => (n.type as unknown) === "Pressable" && n.props.accessibilityState !== undefined,
    )
    act(() => {
      chips[0].props.onPress()
    })
    expect(onChange).toHaveBeenCalledWith("1")
  })

  test("shows the derived count label", () => {
    const { tree } = render("2")
    const texts = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && String(n.props.children) === "2 strate(s)",
    )
    expect(texts.length).toBeGreaterThan(0)
  })
})
