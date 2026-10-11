const mockAppStateHandlers: Array<(state: string) => void> = []
const mockAppStateRemove = jest.fn()

jest.mock("react-native", () => ({
  AppState: {
    addEventListener: (_type: string, handler: (state: string) => void) => {
      mockAppStateHandlers.push(handler)
      return { remove: mockAppStateRemove }
    },
  },
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import {
  __emitMockNetworkStateChange,
  __resetMockNetwork,
  __setMockNetworkState,
  getNetworkStateAsync,
} from "../../test/expo-network.mock"
import {
  getNetworkOnline,
  RECHECK_BASE_DELAY_MS,
  RECHECK_MAX_DELAY_MS,
  refreshNetworkStatus,
  subscribeNetworkStatus,
  useNetworkOnline,
} from "./network-status"
import { reportRequestOutcome } from "./request-outcome"

const OFFLINE = { isConnected: false, isInternetReachable: false }
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe("network status", () => {
  let unsubscribe: Array<() => void> = []
  const subscribe = (listener: (online: boolean) => void = () => undefined): void => {
    unsubscribe.push(subscribeNetworkStatus(listener))
  }

  beforeEach(() => {
    jest.useFakeTimers()
    mockAppStateHandlers.length = 0
    mockAppStateRemove.mockClear()
    getNetworkStateAsync.mockClear()
  })

  afterEach(async () => {
    await cleanup()
    unsubscribe.forEach((fn) => fn())
    unsubscribe = []
    jest.useRealTimers()
    __resetMockNetwork()
  })

  test("starts online and reads the initial state once on the first subscriber", async () => {
    __setMockNetworkState(OFFLINE)
    const seen: boolean[] = []
    expect(getNetworkOnline()).toBe(true)

    subscribe((online) => seen.push(online))
    subscribe()
    await flush()

    expect(getNetworkStateAsync).toHaveBeenCalledTimes(1)
    expect(getNetworkOnline()).toBe(false)
    expect(seen).toEqual([false])
  })

  test("follows expo-network events and applies isOnlineNetworkState", async () => {
    subscribe()
    await flush()

    __emitMockNetworkStateChange({ isConnected: true, isInternetReachable: false })
    expect(getNetworkOnline()).toBe(false)
    __emitMockNetworkStateChange({ isConnected: true })
    expect(getNetworkOnline()).toBe(true)
  })

  test("rechecks when the app returns to the foreground, ignoring other app states", async () => {
    subscribe()
    await flush()
    expect(getNetworkOnline()).toBe(true)

    // The event was lost while suspended: only the probe sees the airplane mode.
    __setMockNetworkState(OFFLINE)
    mockAppStateHandlers[0]("background")
    await flush()
    expect(getNetworkOnline()).toBe(true)

    mockAppStateHandlers[0]("active")
    await flush()
    expect(getNetworkOnline()).toBe(false)
  })

  test("a failed request marks offline, then a recheck restores the real state", async () => {
    subscribe()
    await flush()

    reportRequestOutcome("network-failure")
    expect(getNetworkOnline()).toBe(false)

    jest.advanceTimersByTime(RECHECK_BASE_DELAY_MS)
    await flush()
    expect(getNetworkOnline()).toBe(true)
  })

  test("a failed request while really offline stays offline after the recheck", async () => {
    subscribe()
    await flush()
    __setMockNetworkState(OFFLINE)

    reportRequestOutcome("network-failure")
    jest.advanceTimersByTime(RECHECK_BASE_DELAY_MS)
    await flush()

    expect(getNetworkOnline()).toBe(false)
  })

  test("a successful request marks online again and cancels the pending recheck", async () => {
    subscribe()
    await flush()
    __setMockNetworkState(OFFLINE)
    reportRequestOutcome("network-failure")
    const probes = getNetworkStateAsync.mock.calls.length

    reportRequestOutcome("ok")
    expect(getNetworkOnline()).toBe(true)
    jest.advanceTimersByTime(RECHECK_MAX_DELAY_MS)
    await flush()

    expect(getNetworkStateAsync.mock.calls.length).toBe(probes)
    expect(getNetworkOnline()).toBe(true)
  })

  test("a timeout only schedules a recheck and keeps the status", async () => {
    subscribe()
    await flush()
    __setMockNetworkState(OFFLINE)

    reportRequestOutcome("timeout")
    expect(getNetworkOnline()).toBe(true)

    jest.advanceTimersByTime(RECHECK_BASE_DELAY_MS)
    await flush()
    expect(getNetworkOnline()).toBe(false)
  })

  test("repeated failures back off up to the cap, a success resets the delay", async () => {
    subscribe()
    await flush()
    const probes = () => getNetworkStateAsync.mock.calls.length

    reportRequestOutcome("network-failure")
    reportRequestOutcome("network-failure")
    const before = probes()
    jest.advanceTimersByTime(RECHECK_BASE_DELAY_MS * 2 - 1)
    expect(probes()).toBe(before)
    jest.advanceTimersByTime(1)
    expect(probes()).toBe(before + 1)

    for (let i = 0; i < 10; i += 1) reportRequestOutcome("network-failure")
    const capped = probes()
    jest.advanceTimersByTime(RECHECK_MAX_DELAY_MS)
    expect(probes()).toBe(capped + 1)

    reportRequestOutcome("ok")
    reportRequestOutcome("network-failure")
    const reset = probes()
    jest.advanceTimersByTime(RECHECK_BASE_DELAY_MS)
    expect(probes()).toBe(reset + 1)
  })

  test("a slow probe cannot overwrite a newer event", async () => {
    let release!: (state: typeof OFFLINE) => void
    getNetworkStateAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    subscribe()
    __emitMockNetworkStateChange({ isConnected: true, isInternetReachable: true })

    release(OFFLINE)
    await flush()

    expect(getNetworkOnline()).toBe(true)
  })

  test("a failing probe keeps the last known value", async () => {
    subscribe()
    await flush()
    getNetworkStateAsync.mockRejectedValueOnce(new Error("native"))

    await expect(refreshNetworkStatus()).resolves.toBe(true)
  })

  test("the last unsubscribe stops listening and resets to online", async () => {
    __setMockNetworkState(OFFLINE)
    subscribe()
    await flush()
    expect(getNetworkOnline()).toBe(false)
    reportRequestOutcome("network-failure")

    unsubscribe.forEach((fn) => fn())
    unsubscribe = []

    expect(getNetworkOnline()).toBe(true)
    expect(mockAppStateRemove).toHaveBeenCalledTimes(1)
    const probes = getNetworkStateAsync.mock.calls.length
    jest.advanceTimersByTime(RECHECK_MAX_DELAY_MS)
    reportRequestOutcome("network-failure")
    __emitMockNetworkStateChange(OFFLINE)
    expect(getNetworkOnline()).toBe(true)
    expect(getNetworkStateAsync.mock.calls.length).toBe(probes)
  })

  test("useNetworkOnline re-renders on every change", async () => {
    const { result } = await renderHook(() => useNetworkOnline())
    await flush()
    expect(result.current).toBe(true)

    await act(async () => {
      __emitMockNetworkStateChange(OFFLINE)
    })
    expect(result.current).toBe(false)

    await act(async () => {
      reportRequestOutcome("ok")
    })
    expect(result.current).toBe(true)
  })
})
