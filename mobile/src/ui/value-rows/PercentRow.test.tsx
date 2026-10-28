import React from "react"
import renderer, { act } from "react-test-renderer"
import { PercentRow } from "./PercentRow"

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }))
jest.mock("../feedback", () => ({ feedback: { selection: jest.fn() } }))
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
  jest.useFakeTimers()
})
afterAll(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

function mount(props: Partial<React.ComponentProps<typeof PercentRow>> = {}) {
  const onChange = jest.fn()
  const onTouch = jest.fn()
  let tree!: renderer.ReactTestRenderer
  act(() => {
    tree = renderer.create(
      <PercentRow
        label="Couvert"
        value="40"
        onChange={onChange}
        onTouch={onTouch}
        step={5}
        testID="p"
        {...props}
      />,
    )
  })
  const byId = (id: string) => tree.root.findAll((n) => n.props.testID === id)
  return { tree, onChange, onTouch, byId }
}

describe("PercentRow", () => {
  test("one row: the label and the typed value over the track, no -/+ capsule", () => {
    const { byId } = mount()
    expect(byId("p-group")).not.toHaveLength(0)
    expect(byId("p-row")).not.toHaveLength(0)
    expect(byId("p-value")).not.toHaveLength(0)
    expect(byId("p-slider-track")).not.toHaveLength(0)
    expect(byId("p-increase")).toHaveLength(0)
    expect(byId("p-decrease")).toHaveLength(0)
  })

  test("tapping the value opens a numeric field; a typed value is held to 100", () => {
    const { byId, onChange, onTouch } = mount({ inputTestID: "p-typed" })
    act(() => byId("p-value")[0].props.onPress())
    const input = byId("p-typed")[0]
    expect(input.props.keyboardType).toBe("decimal-pad")
    act(() => input.props.onChangeText("250"))
    act(() => input.props.onBlur())
    expect(onChange).toHaveBeenLastCalledWith("100")
    expect(onTouch).toHaveBeenCalled()
  })

  test("the track writes the percent on the row's step as the form's text and touches on release", () => {
    const { byId, onChange, onTouch } = mount({ value: "" })
    const track = byId("p-slider-track")[0]
    act(() => track.props.onLayout({ nativeEvent: { layout: { width: 200 } } }))
    expect(track.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 0 })
    act(() => track.props.onResponderMove({ nativeEvent: { locationX: 90 } }))
    expect(onChange).toHaveBeenLastCalledWith("45")
    act(() => track.props.onResponderRelease())
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  test("the step 1 (G) takes any whole percent", () => {
    const { byId, onChange } = mount({ step: 1 })
    const track = byId("p-slider-track")[0]
    act(() => track.props.onLayout({ nativeEvent: { layout: { width: 200 } } }))
    act(() => track.props.onResponderMove({ nativeEvent: { locationX: 94 } }))
    expect(onChange).toHaveBeenLastCalledWith("47")
  })

  test("a value above 100 or not a number keeps the track within 0 to 100", () => {
    expect(mount({ value: "250" }).byId("p-slider-track")[0].props.accessibilityValue.now).toBe(100)
    expect(mount({ value: "abc" }).byId("p-slider-track")[0].props.accessibilityValue.now).toBe(0)
  })

  test("not editable: the value is shown and there is no track", () => {
    const { byId } = mount({ editable: false })
    expect(byId("p-slider-track")).toHaveLength(0)
    expect(byId("p-value")).not.toHaveLength(0)
  })
})
