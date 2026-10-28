import React from "react"
import renderer, { act } from "react-test-renderer"
import { ValueStepper } from "./ValueStepper"
import { HOLD_REPEAT_DELAY_MS, HOLD_REPEAT_INTERVAL_MS } from "./useHoldRepeat"

const mockSelection = jest.fn()
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("./feedback", () => ({ feedback: { selection: () => mockSelection() } }))

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
  jest.useFakeTimers()
})

beforeEach(() => mockSelection.mockClear())

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

const format = (n: number): string => String(n).replace(".", ",")

function render(props: Partial<React.ComponentProps<typeof ValueStepper>> = {}) {
  const onStep = jest.fn()
  const onSubmitText = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ValueStepper
        value={2}
        onStep={onStep}
        onSubmitText={onSubmitText}
        accessibilityLabel="Surface"
        accessibilityValueText="2 hectares"
        editHint="Saisir"
        incrementLabel="Plus"
        decrementLabel="Moins"
        min={0}
        max={5}
        step={0.1}
        format={format}
        keyboardType="decimal-pad"
        testID="v"
        {...props}
      />,
    )
  })
  const find = (id: string) => tree!.root.findAll((n) => n.props.testID === id)[0]
  const press = (id: string): void => {
    act(() => find(id).props.onPressIn())
    act(() => find(id).props.onPressOut())
    act(() => find(id).props.onPress())
  }
  return { tree: tree!, onStep, onSubmitText, find, press }
}

describe("ValueStepper", () => {
  test("a tap steps by the step, without float drift, with a selection tick", () => {
    const { press, onStep } = render({ value: 0.2 })
    press("v-increase")
    expect(onStep).toHaveBeenLastCalledWith(0.3)
    const down = render({ value: 0.2 })
    down.press("v-decrease")
    expect(down.onStep).toHaveBeenLastCalledWith(0.1)
    expect(mockSelection).toHaveBeenCalledTimes(2)
  })

  test("the value is drawn by format and the bounds hold", () => {
    const { find, press, onStep } = render({ value: 5, max: 5 })
    expect(find("v-value").props.children.props.children).toBe("5")
    press("v-increase")
    expect(onStep).not.toHaveBeenCalled()
    const low = render({ value: 0 })
    low.press("v-decrease")
    expect(low.onStep).not.toHaveBeenCalled()
  })

  test("a hold repeats by the step", () => {
    const { find, onStep } = render({ value: 1 })
    act(() => find("v-increase").props.onPressIn())
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_DELAY_MS + HOLD_REPEAT_INTERVAL_MS)
    })
    act(() => find("v-increase").props.onPressOut())
    expect(onStep).toHaveBeenNthCalledWith(1, 1.1)
    expect(onStep).toHaveBeenNthCalledWith(2, 1.2)
  })

  test("the accessibility actions step by the step", () => {
    const { tree, onStep } = render({ value: 1 })
    const outer = tree.root.findAll(
      (n) => (n.type as unknown) === "View" && n.props.accessibilityRole === "adjustable",
    )[0]
    act(() => outer.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }))
    act(() => outer.props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } }))
    expect(onStep).toHaveBeenNthCalledWith(1, 1.1)
    expect(onStep).toHaveBeenNthCalledWith(2, 0.9)
    expect(outer.props.accessibilityValue).toEqual({ text: "2 hectares" })
  })

  test("the typed field keeps the given test id, takes the keyboard and commits on blur", () => {
    const { find, onSubmitText } = render({ value: 1.5, inputTestID: "surface-input" })
    act(() => find("v-value").props.onPress())
    const input = find("surface-input")
    expect(input.props.keyboardType).toBe("decimal-pad")
    expect(input.props.value).toBe("1,5")
    act(() => input.props.onChangeText("2,3"))
    act(() => find("surface-input").props.onBlur())
    expect(onSubmitText).toHaveBeenCalledWith("2,3")
  })

  test("not editable: a read-only value", () => {
    const { find, tree } = render({ editable: false })
    expect(find("v-increase")).toBeUndefined()
    expect(find("v-value").props.children).toBe("2")
    expect(tree.root.findAll((n) => n.props.accessibilityRole === "text")).not.toHaveLength(0)
  })
})
