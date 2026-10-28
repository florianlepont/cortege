import React from "react"
import renderer, { act } from "react-test-renderer"
import { crossesTick, percentAt, PercentTrackRow } from "./PercentTrackRow"

const mockSelection = jest.fn()
jest.mock("../feedback", () => ({ feedback: { selection: () => mockSelection() } }))

const originalConsoleError = console.error

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})
beforeEach(() => mockSelection.mockClear())
afterAll(() => jest.restoreAllMocks())

jest.mock("react-native", () => {
  const ReactRef = require("react") as typeof import("react")
  const mockComponent =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactRef.createElement(name, props, children)
  return {
    Text: mockComponent("Text"),
    View: mockComponent("View"),
    StyleSheet: { create: <T,>(styles: T) => styles },
  }
})

function render(percent: number) {
  const onChangePercent = jest.fn()
  const onTouch = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <PercentTrackRow
        label="Milieux ouverts fleuris"
        percent={percent}
        onChangePercent={onChangePercent}
        onTouch={onTouch}
        testID="g"
      />,
    )
  })
  const track = tree!.root.findAll(
    (n) => (n.type as unknown) === "View" && n.props.testID === "g-track",
  )[0]
  act(() => track.props.onLayout({ nativeEvent: { layout: { width: 200 } } }))
  return { tree: tree!, track, onChangePercent, onTouch }
}

const at = (x: number) => ({ nativeEvent: { locationX: x } })

describe("percentAt and crossesTick", () => {
  test("map a touch to a whole percent held to 0..100", () => {
    expect(percentAt(100, 200)).toBe(50)
    expect(percentAt(6, 200)).toBe(3)
    expect(percentAt(-20, 200)).toBe(0)
    expect(percentAt(260, 200)).toBe(100)
    expect(percentAt(10, 0)).toBe(0)
  })

  test("a tick falls only when a multiple of 5 is crossed", () => {
    expect(crossesTick(1, 3)).toBe(false)
    expect(crossesTick(4, 5)).toBe(true)
    expect(crossesTick(9, 10)).toBe(true)
    expect(crossesTick(10, 9)).toBe(true)
    expect(crossesTick(12, 14)).toBe(false)
  })
})

describe("PercentTrackRow", () => {
  test("a tap or drag sets any whole percent: 1 and 3 are possible", () => {
    const { track, onChangePercent } = render(0)
    act(() => track.props.onResponderGrant(at(2)))
    expect(onChangePercent).toHaveBeenLastCalledWith(1)
    act(() => track.props.onResponderMove(at(6)))
    expect(onChangePercent).toHaveBeenLastCalledWith(3)
  })

  test("a drag ticks once per multiple of 5 crossed, not per percent, and not on release", () => {
    const { track, onChangePercent, onTouch } = render(0)
    for (const x of [2, 4, 6, 8, 10, 12, 14]) {
      act(() => track.props.onResponderMove(at(x)))
    }
    // 1, 2, 3, 4, 5, 6, 7 percent: one crossing (4 to 5).
    expect(onChangePercent).toHaveBeenCalledTimes(7)
    expect(mockSelection).toHaveBeenCalledTimes(1)
    act(() => track.props.onResponderRelease())
    expect(mockSelection).toHaveBeenCalledTimes(1)
    expect(onTouch).toHaveBeenCalledTimes(1)
  })

  test("the same percent is not written twice", () => {
    const { track, onChangePercent } = render(50)
    act(() => track.props.onResponderGrant(at(100)))
    expect(onChangePercent).not.toHaveBeenCalled()
  })

  test("the screen reader moves it by 5 within 0..100 and exposes the value", () => {
    const { track, onChangePercent } = render(98)
    expect(track.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 98 })
    expect(track.props.accessibilityLabel).toBe("Milieux ouverts fleuris : 98 %")
    act(() => track.props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }))
    expect(onChangePercent).toHaveBeenLastCalledWith(100)
    const low = render(2)
    act(() => low.track.props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } }))
    expect(low.onChangePercent).toHaveBeenLastCalledWith(0)
  })
})
