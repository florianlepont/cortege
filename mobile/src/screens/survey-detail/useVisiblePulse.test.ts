jest.mock("react-native", () => ({
  Platform: { select: (opts: Record<string, unknown>) => opts.default ?? Object.values(opts)[0] },
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { APPEAR_FALLBACK_MS, type PulseNavigation, useVisiblePulse } from "./useVisiblePulse"

afterEach(async () => {
  await cleanup()
  jest.useRealTimers()
})

type Listener = (event: { data?: { closing?: boolean } }) => void

function fakeNavigation(initiallyFocused: boolean) {
  const listeners: Record<string, Listener[]> = {}
  const state = { focused: initiallyFocused }
  const navigation: PulseNavigation = {
    isFocused: () => state.focused,
    addListener: (type, callback) => {
      ;(listeners[type] ??= []).push(callback)
      return () => {
        listeners[type] = listeners[type].filter((item) => item !== callback)
      }
    },
  }
  const emit = (type: string, event: Parameters<Listener>[0] = {}) =>
    (listeners[type] ?? []).forEach((listener) => listener(event))
  const count = (type: string) => (listeners[type] ?? []).length
  return { navigation, state, emit, count }
}

const renderPulse = (trigger: number, navigation: PulseNavigation) =>
  renderHook((props: { trigger: number }) => useVisiblePulse(props.trigger, navigation), {
    initialProps: { trigger },
  })

describe("useVisiblePulse (D-26)", () => {
  test("on screen, the trigger passes at once", async () => {
    const { navigation } = fakeNavigation(true)
    const { result, rerender } = await renderPulse(0, navigation)
    expect(result.current).toBe(0)
    await rerender({ trigger: 1 })
    expect(result.current).toBe(1)
  })

  test("a navigation without focus information counts as on screen", async () => {
    const { result, rerender } = await renderPulse(0, {})
    await rerender({ trigger: 1 })
    expect(result.current).toBe(1)
  })

  test("covered by the pager, it waits for the summary to appear again", async () => {
    const fake = fakeNavigation(false)
    const { result, rerender } = await renderPulse(0, fake.navigation)
    await rerender({ trigger: 1 })
    expect(result.current).toBe(0)
    // The pager's own transition ending (closing) is not the summary appearing.
    await act(async () => {
      fake.emit("transitionEnd", { data: { closing: true } })
    })
    expect(result.current).toBe(0)
    fake.state.focused = true
    await act(async () => {
      fake.emit("transitionEnd", { data: { closing: false } })
    })
    expect(result.current).toBe(1)
    // Listeners are removed once played.
    expect(fake.count("transitionEnd")).toBe(0)
    expect(fake.count("focus")).toBe(0)
  })

  test("without the appear event, it plays 600 ms after the focus comes back", async () => {
    jest.useFakeTimers()
    const fake = fakeNavigation(false)
    const { result, rerender } = await renderPulse(0, fake.navigation)
    await rerender({ trigger: 1 })
    await act(async () => {
      fake.emit("focus")
    })
    await act(async () => {
      jest.advanceTimersByTime(APPEAR_FALLBACK_MS - 1)
    })
    expect(result.current).toBe(0)
    await act(async () => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current).toBe(1)
    expect(APPEAR_FALLBACK_MS).toBe(600)
  })

  test("unmounted while waiting: listeners and the timer are cleared", async () => {
    jest.useFakeTimers()
    const fake = fakeNavigation(false)
    const { rerender, unmount } = await renderPulse(0, fake.navigation)
    await rerender({ trigger: 1 })
    await act(async () => {
      fake.emit("focus")
    })
    const clear = jest.spyOn(global, "clearTimeout")
    await unmount()
    expect(fake.count("transitionEnd")).toBe(0)
    expect(fake.count("focus")).toBe(0)
    expect(clear).toHaveBeenCalled()
    clear.mockRestore()
  })
})
