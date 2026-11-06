import React from "react"
import renderer, { act } from "react-test-renderer"
import { formatDecimalComma, formatHectares } from "../../app/decimal-text"
import { NumberRow } from "./NumberRow"

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../feedback", () => ({ feedback: { selection: jest.fn() } }))

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  jest.useFakeTimers()
})
afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
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
    TextInput: mockComponent("TextInput"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

function render(value: string, extra: Partial<React.ComponentProps<typeof NumberRow>> = {}) {
  const onChange = jest.fn()
  const onTouch = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <NumberRow
        label="Surface (ha)"
        value={value}
        onChange={onChange}
        onTouch={onTouch}
        max={100000}
        step={0.1}
        format={formatHectares}
        keyboardType="decimal-pad"
        testID="s"
        {...extra}
      />,
    )
  })
  const find = (id: string) => tree!.root.findAll((n) => n.props.testID === id)[0]
  const press = (id: string): void => {
    act(() => find(id).props.onPressIn())
    act(() => find(id).props.onPressOut())
    act(() => find(id).props.onPress())
  }
  return { tree: tree!, onChange, onTouch, find, press }
}

describe("NumberRow", () => {
  test("a step writes the number with a decimal comma and touches the field", () => {
    const { press, onChange, onTouch } = render("1,2")
    press("s-increase")
    expect(onChange).toHaveBeenLastCalledWith("1,3")
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  test("a point in the stored text is read too, and 0.1 + 0.2 is 0,3", () => {
    const { press, onChange } = render("0.2")
    press("s-increase")
    expect(onChange).toHaveBeenLastCalledWith("0,3")
  })

  test("an empty field reads 0 and the first + writes the first step", () => {
    const { press, onChange, tree } = render("")
    expect(tree.root.findAll((n) => n.props.testID === "s-value")[0]).toBeDefined()
    press("s-increase")
    expect(onChange).toHaveBeenLastCalledWith("0,1")
  })

  test("min 0: the - at 0 does nothing", () => {
    const { press, onChange } = render("0")
    press("s-decrease")
    expect(onChange).not.toHaveBeenCalled()
  })

  test("the label is drawn and spoken, the value is drawn with its unit and spoken by the caller", () => {
    const { tree } = render("70", {
      label: "Couvert des essences autochtones",
      format: formatDecimalComma,
      unitSuffix: " %",
      spokenValue: (text) => `${text} %`,
      max: 100,
      step: 1,
    })
    const label = tree.root.findAll(
      (n) =>
        (n.type as unknown) === "Text" && n.props.children === "Couvert des essences autochtones",
    )
    expect(label).toHaveLength(1)
    const adjustable = tree.root.findAll((n) => n.props.accessibilityRole === "adjustable")[0]
    expect(adjustable.props.accessibilityLabel).toBe("Couvert des essences autochtones")
    expect(adjustable.props.accessibilityValue).toEqual({ text: "70 %" })
    const value = tree.root.findAll(
      (n) => (n.type as unknown) === "Text" && n.props.children === "70\u00a0%",
    )
    expect(value).toHaveLength(1)
  })

  test("a typed value is stored as typed, or held by clampText, and touches the field", () => {
    const clamp = (text: string): string => (Number(text) > 100 ? "100" : text)
    const typed = render("5", { clampText: clamp, max: 100, step: 1, inputTestID: "s-field" })
    act(() => typed.find("s-value").props.onPress())
    act(() => typed.find("s-field").props.onChangeText("150"))
    act(() => typed.find("s-field").props.onBlur())
    expect(typed.onChange).toHaveBeenLastCalledWith("100")
    expect(typed.onTouch).toHaveBeenCalledTimes(1)
    const raw = render("5")
    act(() => raw.find("s-value").props.onPress())
    act(() => raw.find("s-input").props.onChangeText("abc"))
    act(() => raw.find("s-input").props.onBlur())
    expect(raw.onChange).toHaveBeenLastCalledWith("abc")
  })
})
