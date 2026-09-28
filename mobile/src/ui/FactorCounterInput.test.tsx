import React from "react"
import renderer, { act } from "react-test-renderer"
import { View } from "react-native"
import { AppText as Text } from "./AppText"
import { brandColors } from "../app/brand-tokens"
import { FactorCounterInput } from "./FactorCounterInput"

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

type Node = renderer.ReactTestInstance

function render(props: Partial<React.ComponentProps<typeof FactorCounterInput>> = {}) {
  const onChange = jest.fn()
  const onTouch = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <FactorCounterInput
        label="Nombre de BMg"
        value=""
        onChange={onChange}
        touched={false}
        onTouch={onTouch}
        error={null}
        {...props}
      />,
    )
  })
  const root = tree!.root
  const findByTestID = (id: string): Node => root.findAll((n) => n.props.testID === id)[0]
  return { tree: tree!, onChange, onTouch, findByTestID }
}

describe("FactorCounterInput (FLOW-01 counter variant, FLOW-02 error timing)", () => {
  test("shows 0 when empty and does not show an error before any interaction", () => {
    const { findByTestID } = render({
      value: "",
      touched: false,
      error: "Champ obligatoire",
      testID: "c",
    })
    const texts = findByTestID("c-value").findAllByType(Text)
    expect(String(texts[0].props.children)).toBe("0")
  })

  test("tapping + increases the value by step and marks the field touched", () => {
    const { onChange, onTouch, findByTestID } = render({ value: "2", step: 1, testID: "c" })
    act(() => {
      findByTestID("c-increase").props.onPressIn()
    })
    act(() => {
      findByTestID("c-increase").props.onPressOut()
    })
    expect(onChange).toHaveBeenCalledWith("3")
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  test("tapping - decreases and clamps at min", () => {
    const { onChange, findByTestID } = render({ value: "0", min: 0, testID: "c" })
    act(() => {
      findByTestID("c-decrease").props.onPressIn()
    })
    act(() => {
      findByTestID("c-decrease").props.onPressOut()
    })
    expect(onChange).toHaveBeenCalledWith("0")
  })

  test("holding + accelerates via long-press repeat", () => {
    const { onChange, findByTestID } = render({ value: "0", step: 1, max: 999, testID: "c" })
    act(() => {
      findByTestID("c-increase").props.onPressIn()
    })
    act(() => {
      jest.advanceTimersByTime(120 * 20)
    })
    act(() => {
      findByTestID("c-increase").props.onPressOut()
    })
    // 1 immediate tap + 20 ticks, later ticks accelerated: total must exceed 21.
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(Number(last)).toBeGreaterThan(21)
  })

  test("tapping the number opens a text fallback that commits on blur", () => {
    const { onChange, onTouch, findByTestID } = render({ value: "4", testID: "c" })
    act(() => {
      findByTestID("c-value").props.onPress()
    })
    const input = findByTestID("c-input")
    act(() => {
      input.props.onChangeText("12,5")
    })
    act(() => {
      input.props.onBlur()
    })
    expect(onChange).toHaveBeenCalledWith("12,5")
    expect(onTouch).toHaveBeenCalled()
  })

  test("touched + error renders the error tone", () => {
    const { tree } = render({ value: "", touched: true, error: "Champ obligatoire", testID: "c" })
    const shell = tree.root.findAll((n) => n.type === View && n.props.testID === "c")[0]
    const style = Array.isArray(shell.props.style)
      ? Object.assign({}, ...shell.props.style)
      : shell.props.style
    // FactorInputShell's error border is `colors.terracotta`, a theme-invariant hue (same in
    // light and dark), so this stays a direct comparison against the static token.
    expect(style.borderColor).toBe(brandColors.terracotta)
  })
})
