import React from "react"
import renderer, { act } from "react-test-renderer"
import {
  HOLD_ACCELERATE_AFTER_TICKS,
  HOLD_ACCELERATE_FURTHER_AFTER_TICKS,
  HOLD_REPEAT_INTERVAL_MS,
  useHoldRepeat,
} from "./useHoldRepeat"

type Engine = ReturnType<typeof useHoldRepeat>
type HarnessProps = {
  value: number | null
  min: number
  max: number
  onChange: (next: number) => void
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

describe("useHoldRepeat", () => {
  test("exposes the repeat constants", () => {
    expect(HOLD_REPEAT_INTERVAL_MS).toBe(120)
    expect(HOLD_ACCELERATE_AFTER_TICKS).toBe(6)
    expect(HOLD_ACCELERATE_FURTHER_AFTER_TICKS).toBe(15)
  })

  test("start applies one step at once", () => {
    const { result, onChange } = mount({ value: 2 })
    act(() => result.current.start(1))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(3)
    act(() => result.current.stop())
  })

  test("holding repeats a step every 120 ms", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.start(1))
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS - 1)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(2)
    act(() => result.current.stop())
  })

  test("ticks 7 to 15 add 2 and from tick 16 add 5", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.start(1))
    // Tick 1 to 6: +1 each, so the value is 1 (immediate) + 6 = 7.
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS * HOLD_ACCELERATE_AFTER_TICKS)
    })
    expect(onChange).toHaveBeenLastCalledWith(7)
    // Tick 7: +2.
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS)
    })
    expect(onChange).toHaveBeenLastCalledWith(9)
    // Ticks 8 to 15: +2 each (8 ticks).
    act(() => {
      jest.advanceTimersByTime(
        HOLD_REPEAT_INTERVAL_MS *
          (HOLD_ACCELERATE_FURTHER_AFTER_TICKS - HOLD_ACCELERATE_AFTER_TICKS - 1),
      )
    })
    expect(onChange).toHaveBeenLastCalledWith(7 + 2 * 9)
    // Tick 16: +5.
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS)
    })
    expect(onChange).toHaveBeenLastCalledWith(7 + 2 * 9 + 5)
    act(() => result.current.stop())
  })

  test("the result is clamped to min and max", () => {
    const down = mount({ value: 1, min: 0, max: 3 })
    act(() => down.result.current.start(-1))
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS * 3)
    })
    expect(down.onChange.mock.calls.map((c) => c[0])).toEqual([0, 0, 0, 0])
    act(() => down.result.current.stop())

    const up = mount({ value: 2, min: 0, max: 3 })
    act(() => up.result.current.start(1))
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS * 2)
    })
    expect(up.onChange.mock.calls.map((c) => c[0])).toEqual([3, 3, 3])
    act(() => up.result.current.stop())
  })

  test("stop halts the repeat", () => {
    const { result, onChange } = mount({ value: 0 })
    act(() => result.current.start(1))
    act(() => result.current.stop())
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS * 5)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("unmount clears a running interval", () => {
    const { result, onChange, unmount } = mount({ value: 0 })
    act(() => result.current.start(1))
    unmount()
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS * 5)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  test("a value changed from outside is the new base of the next start", () => {
    const { result, onChange, rerender } = mount({ value: 2 })
    rerender({ value: 40 })
    act(() => result.current.start(1))
    expect(onChange).toHaveBeenLastCalledWith(41)
    act(() => result.current.stop())
  })

  test("a null value keeps the last known one, and starts from min at first", () => {
    const fresh = mount({ value: null, min: 0 })
    act(() => fresh.result.current.start(1))
    expect(fresh.onChange).toHaveBeenLastCalledWith(1)
    act(() => fresh.result.current.stop())

    const { result, onChange, rerender } = mount({ value: 7 })
    rerender({ value: null })
    act(() => result.current.start(1))
    expect(onChange).toHaveBeenLastCalledWith(8)
    act(() => result.current.stop())
  })

  test("a repeat already running calls the latest onChange", () => {
    const first = jest.fn()
    const second = jest.fn()
    const { result, rerender } = mount({ onChange: first })
    act(() => result.current.start(1))
    rerender({ onChange: second })
    act(() => {
      jest.advanceTimersByTime(HOLD_REPEAT_INTERVAL_MS)
    })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    act(() => result.current.stop())
  })
})
