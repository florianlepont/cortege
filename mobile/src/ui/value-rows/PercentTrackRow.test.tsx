import React from "react"
import renderer, { act } from "react-test-renderer"
import { ScrollLockProvider } from "../ScrollLockContext"
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

function render(percent: number, step = 1, showEnds = false) {
  const onChangePercent = jest.fn()
  const onTouch = jest.fn()
  const setLocked = jest.fn()
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(
      <ScrollLockProvider value={setLocked}>
        <PercentTrackRow
          label="Milieux ouverts fleuris"
          percent={percent}
          step={step}
          showEnds={showEnds}
          onChangePercent={onChangePercent}
          onTouch={onTouch}
          testID="g"
        />
      </ScrollLockProvider>,
    )
  })
  const track = tree!.root.findAll(
    (n) => (n.type as unknown) === "View" && n.props.testID === "g-track",
  )[0]
  act(() => track.props.onLayout({ nativeEvent: { layout: { width: 200 } } }))
  return { tree: tree!, track, onChangePercent, onTouch, setLocked }
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

  test("on a step of 5 a touch snaps to the nearest multiple of 5", () => {
    expect(percentAt(100, 200, 5)).toBe(50)
    expect(percentAt(26, 200, 5)).toBe(15)
    expect(percentAt(24, 200, 5)).toBe(10)
    expect(percentAt(199, 200, 5)).toBe(100)
    expect(percentAt(-4, 200, 5)).toBe(0)
    expect(percentAt(10, 0, 5)).toBe(0)
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

  test("a step of 5 writes multiples of 5 only, one tick for each move", () => {
    const { track, onChangePercent } = render(0, 5)
    for (const x of [6, 14, 20, 30]) act(() => track.props.onResponderMove(at(x)))
    expect(onChangePercent.mock.calls.map(([value]) => value)).toEqual([5, 10, 15])
    expect(mockSelection).toHaveBeenCalledTimes(3)
  })

  test("the ends are named over the track only when asked", () => {
    const texts = (tree: renderer.ReactTestRenderer) =>
      tree.root.findAll((n) => (n.type as unknown) === "Text").map((n) => n.props.children)
    expect(texts(render(10, 1, true).tree)).toEqual(["0\u00a0%", "100\u00a0%"])
    expect(texts(render(10).tree)).toEqual([])
  })

  describe("the track keeps the touch (follow-up 32-33)", () => {
    test("it claims the responder in the capture phase and never gives it back", () => {
      const { track } = render(10)
      expect(track.props.onStartShouldSetResponderCapture()).toBe(true)
      expect(track.props.onMoveShouldSetResponderCapture()).toBe(true)
      expect(track.props.onStartShouldSetResponder()).toBe(true)
      expect(track.props.onMoveShouldSetResponder()).toBe(true)
      expect(track.props.onResponderTerminationRequest()).toBe(false)
    })

    test("the pages around hold still from the touch down to the release", () => {
      const { track, setLocked } = render(10)
      act(() => track.props.onResponderGrant(at(100)))
      expect(setLocked).toHaveBeenLastCalledWith(true)
      act(() => track.props.onResponderMove(at(120)))
      expect(setLocked).toHaveBeenCalledTimes(1)
      act(() => track.props.onResponderRelease())
      expect(setLocked).toHaveBeenLastCalledWith(false)
    })

    test("a touch the system takes away still frees the pages", () => {
      const { track, setLocked } = render(10)
      act(() => track.props.onResponderGrant(at(100)))
      act(() => track.props.onResponderTerminate())
      expect(setLocked).toHaveBeenLastCalledWith(false)
    })

    test("a track that goes away mid-drag frees the pages", () => {
      const { tree, track, setLocked } = render(10)
      act(() => track.props.onResponderGrant(at(100)))
      act(() => tree.unmount())
      expect(setLocked).toHaveBeenLastCalledWith(false)
    })
  })
})
