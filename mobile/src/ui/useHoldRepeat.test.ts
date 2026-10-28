import React from "react"
import renderer, { act } from "react-test-renderer"
import {
  HOLD_ACCELERATE_AFTER_MS,
  HOLD_REPEAT_DELAY_MS,
  HOLD_REPEAT_FAST_INTERVAL_MS,
  HOLD_REPEAT_INTERVAL_MS,
  nudgeValue,
  useHoldRepeat,
} from "./useHoldRepeat"

type Engine = ReturnType<typeof useHoldRepeat>
type HarnessProps = {
  value: number | null
  min: number
  max: number
  onChange: (next: number, kind: string) => void
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

const originalConsoleError = console.error
beforeEach(() => {
  jest.useFakeTimers()
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

function mount(initial: Partial<HarnessProps> = {}) {
  const onChange = jest.fn()
  const engine: { current: Engine | null } = { current: null }
  const base: HarnessProps = { value: 0, min: 0, max: 999, onChange, ...initial }
  function Harness(props: HarnessProps) {
    engine.current = useHoldRepeat(props)
    return null
  }
  let tree: renderer.ReactTestRenderer | undefined
  act(() => {
    tree = renderer.create(React.createElement(Harness, base))
  })
  return {
    onChange: base.onChange as jest.Mock,
    result: engine as { current: Engine },
    rerender: (next: Partial<HarnessProps>) =>
      act(() => {
        tree!.update(React.createElement(Harness, { ...base, ...next }))
      }),
    unmount: () =>
      act(() => {
        tree!.unmount()
      }),
  }
}

const advance = (ms: number): void => {
  act(() => {
    jest.advanceTimersByTime(ms)
  })
}

describe("useHoldRepeat", () => {
  test("the timing constants: 600 ms before a repeat, 5 steps a second, 10 after 2 more seconds", () => {
    expect(HOLD_REPEAT_DELAY_MS).toBe(600)
    expect(HOLD_REPEAT_INTERVAL_MS).toBe(200)
    expect(HOLD_REPEAT_FAST_INTERVAL_MS).toBe(100)
    expect(HOLD_ACCELERATE_AFTER_MS).toBe(2000)
  })

  test("a quick tap is exactly one step, made by the release, and no timer is left", () => {
    const { result, onChange } = mount({ value: 2 })
    act(() => result.current.begin(1))
    expect(onChange).not.toHaveBeenCalled()
    advance(150)
    act(() => result.current.end())
    expect(onChange).not.toHaveBeenCalled()
    act(() => result.current.tap(1))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(3, "tap")
    expect(jest.getTimerCount()).toBe(0)
    advance(HOLD_REPEAT_DELAY_MS * 5)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("holding for 500 ms is still no step at all (no repeat yet), and the release makes one tap", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS - 100)
    expect(onChange).not.toHaveBeenCalled()
    act(() => result.current.end())
    act(() => result.current.tap(1))
    expect(onChange.mock.calls).toEqual([[1, "tap"]])
  })

  test("a deliberate hold steps once at 600 ms, then every 200 ms", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS - 1)
    expect(onChange).not.toHaveBeenCalled()
    advance(1)
    expect(onChange.mock.calls).toEqual([[1, "hold"]])
    advance(HOLD_REPEAT_INTERVAL_MS - 1)
    expect(onChange).toHaveBeenCalledTimes(1)
    advance(1)
    expect(onChange).toHaveBeenLastCalledWith(2, "repeat")
    advance(HOLD_REPEAT_INTERVAL_MS * 3)
    expect(onChange).toHaveBeenLastCalledWith(5, "repeat")
    act(() => result.current.end())
  })

  test("one second of holding gives three steps: 5 per second after the delay", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(1000)
    // At 600 (hold), 800 and 1000 (repeats).
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1, 2, 3])
    act(() => result.current.end())
  })

  test("the release of a hold is not a tap, so the hold's last step is the only one", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS)
    act(() => result.current.end())
    act(() => result.current.tap(1))
    expect(onChange).toHaveBeenCalledTimes(1)
    // The next activation, long after (a screen reader's double tap has no press in), counts.
    advance(HOLD_REPEAT_DELAY_MS)
    act(() => result.current.tap(1))
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(2, "tap")
  })

  test("a new press after a hold taps again", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS)
    act(() => result.current.end())
    act(() => result.current.begin(1))
    act(() => result.current.end())
    act(() => result.current.tap(1))
    expect(onChange.mock.calls.map((c) => c[1])).toEqual(["hold", "tap"])
  })

  test("after 2 more seconds of holding the pace doubles to 10 per second, never faster", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS + HOLD_ACCELERATE_AFTER_MS)
    // The hold's step plus ten slow repeats.
    expect(onChange).toHaveBeenCalledTimes(11)
    expect(onChange).toHaveBeenLastCalledWith(11, "repeat")
    advance(HOLD_REPEAT_FAST_INTERVAL_MS - 1)
    expect(onChange).toHaveBeenCalledTimes(11)
    advance(1)
    expect(onChange).toHaveBeenCalledTimes(12)
    advance(1000)
    expect(onChange).toHaveBeenCalledTimes(22)
    // One step each time: the multiplier of the old engine is gone.
    expect(onChange).toHaveBeenLastCalledWith(22, "repeat")
    act(() => result.current.end())
  })

  test("the result is clamped to min and max", () => {
    const down = mount({ value: 1, min: 0, max: 3 })
    act(() => down.result.current.begin(-1))
    advance(HOLD_REPEAT_DELAY_MS + HOLD_REPEAT_INTERVAL_MS * 2)
    expect(down.onChange.mock.calls.map((c) => c[0])).toEqual([0, 0, 0])
    act(() => down.result.current.end())

    const up = mount({ value: 2, min: 0, max: 3 })
    act(() => up.result.current.tap(1))
    act(() => up.result.current.tap(1))
    expect(up.onChange.mock.calls.map((c) => c[0])).toEqual([3, 3])
  })

  test("a cancelled press (end with no tap) stops the hold and leaves no timer", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS + HOLD_REPEAT_INTERVAL_MS)
    expect(onChange).toHaveBeenCalledTimes(2)
    act(() => result.current.end())
    expect(jest.getTimerCount()).toBe(0)
    advance(HOLD_REPEAT_INTERVAL_MS * 10)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  test("a second press in without a press out leaves a single timer", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    act(() => result.current.begin(1))
    expect(jest.getTimerCount()).toBe(1)
    advance(HOLD_REPEAT_DELAY_MS)
    expect(onChange).toHaveBeenCalledTimes(1)
    act(() => result.current.end())
  })

  test("a press that ends before the delay never steps", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS - 1)
    act(() => result.current.end())
    advance(HOLD_REPEAT_DELAY_MS * 3)
    expect(onChange).not.toHaveBeenCalled()
  })

  test("unmount clears a running hold", () => {
    const { result, onChange, unmount } = mount({ value: 0 })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS)
    unmount()
    expect(jest.getTimerCount()).toBe(0)
    advance(HOLD_REPEAT_INTERVAL_MS * 5)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("unmount during the delay clears the timer", () => {
    const { result, onChange, unmount } = mount({ value: 0 })
    act(() => result.current.begin(1))
    unmount()
    expect(jest.getTimerCount()).toBe(0)
    advance(HOLD_REPEAT_DELAY_MS * 2)
    expect(onChange).not.toHaveBeenCalled()
  })

  test("a value changed from outside is the new base of the next step", () => {
    const { result, onChange, rerender } = mount({ value: 2 })
    rerender({ value: 40 })
    act(() => result.current.tap(1))
    expect(onChange).toHaveBeenLastCalledWith(41, "tap")
  })

  test("a null value keeps the last known one, and starts from min at first", () => {
    const fresh = mount({ value: null, min: 0 })
    act(() => fresh.result.current.tap(1))
    expect(fresh.onChange).toHaveBeenLastCalledWith(1, "tap")

    const { result, onChange, rerender } = mount({ value: 7 })
    rerender({ value: null })
    act(() => result.current.tap(1))
    expect(onChange).toHaveBeenLastCalledWith(8, "tap")
  })

  test("a hold already running calls the latest onChange", () => {
    const first = jest.fn()
    const second = jest.fn()
    const { result, rerender } = mount({ onChange: first })
    act(() => result.current.begin(1))
    advance(HOLD_REPEAT_DELAY_MS)
    rerender({ onChange: second })
    advance(HOLD_REPEAT_INTERVAL_MS)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    act(() => result.current.end())
  })
})

describe("nudgeValue", () => {
  test("holds the result to the bounds and cleans float drift", () => {
    expect(nudgeValue(0.1, 0.2, 0, 10)).toBe(0.3)
    expect(nudgeValue(1.1, 2.2, 0, 10)).toBe(3.3)
    expect(nudgeValue(5, -1, 0, 10)).toBe(4)
    expect(nudgeValue(0, -0.1, 0, 10)).toBe(0)
    expect(nudgeValue(9.95, 0.1, 0, 10)).toBe(10)
  })
})
