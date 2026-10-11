jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { useTransientFlag } from "./useTransientFlag"

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(async () => {
  await cleanup()
  jest.useRealTimers()
})

describe("useTransientFlag", () => {
  test("is false at first, whatever the number present at mount", async () => {
    const { result } = await renderHook(() => useTransientFlag(0, 4000))
    expect(result.current).toBe(false)
  })

  test("is true right after a new number, false once the duration has passed", async () => {
    const { result, rerender } = await renderHook(
      ({ nonce }: { nonce: number | null }) => useTransientFlag(nonce, 4000),
      { initialProps: { nonce: null as number | null } },
    )
    expect(result.current).toBe(false)
    await rerender({ nonce: 1 })
    expect(result.current).toBe(true)
    await act(async () => jest.advanceTimersByTime(3999))
    expect(result.current).toBe(true)
    await act(async () => jest.advanceTimersByTime(1))
    expect(result.current).toBe(false)
  })

  test("a new number restarts the delay", async () => {
    const { result, rerender } = await renderHook(
      ({ nonce }: { nonce: number | null }) => useTransientFlag(nonce, 4000),
      { initialProps: { nonce: 0 as number | null } },
    )
    await rerender({ nonce: 1 })
    await act(async () => jest.advanceTimersByTime(3000))
    await rerender({ nonce: 2 })
    await act(async () => jest.advanceTimersByTime(3000))
    expect(result.current).toBe(true)
    await act(async () => jest.advanceTimersByTime(1000))
    expect(result.current).toBe(false)
  })

  test("null switches it off at once and keeps it off", async () => {
    const { result, rerender } = await renderHook(
      ({ nonce }: { nonce: number | null }) => useTransientFlag(nonce, 4000),
      { initialProps: { nonce: null as number | null } },
    )
    await rerender({ nonce: 1 })
    expect(result.current).toBe(true)
    await rerender({ nonce: null })
    expect(result.current).toBe(false)
  })

  test("unmounting clears the timer", async () => {
    const { rerender, unmount } = await renderHook(
      ({ nonce }: { nonce: number | null }) => useTransientFlag(nonce, 4000),
      { initialProps: { nonce: null as number | null } },
    )
    await rerender({ nonce: 1 })
    const clear = jest.spyOn(globalThis, "clearTimeout")
    await unmount()
    expect(clear).toHaveBeenCalled()
    clear.mockRestore()
  })
})
