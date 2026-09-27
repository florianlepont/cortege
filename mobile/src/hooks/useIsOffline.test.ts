jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import {
  __emitMockNetworkStateChange,
  __resetMockNetwork,
  __setMockNetworkState,
} from "../../test/expo-network.mock"
import { useIsOffline } from "./useIsOffline"

afterEach(async () => {
  await cleanup()
  __resetMockNetwork()
})

describe("useIsOffline", () => {
  test("resolves to false once the initial online state loads", async () => {
    const { result } = await renderHook(() => useIsOffline())

    expect(result.current).toBe(false)
    await waitFor(() => expect(result.current).toBe(false))
  })

  test("resolves to true when the initial state is offline", async () => {
    __setMockNetworkState({ isConnected: false })
    const { result } = await renderHook(() => useIsOffline())

    await waitFor(() => expect(result.current).toBe(true))
  })

  test("updates live when the network state changes", async () => {
    const { result } = await renderHook(() => useIsOffline())
    await waitFor(() => expect(result.current).toBe(false))

    await act(async () => {
      __emitMockNetworkStateChange({ isConnected: false })
    })
    expect(result.current).toBe(true)

    await act(async () => {
      __emitMockNetworkStateChange({ isConnected: true, isInternetReachable: true })
    })
    expect(result.current).toBe(false)
  })

  test("stops listening after unmount: a state change afterwards does not throw or update", async () => {
    const { result, unmount } = await renderHook(() => useIsOffline())
    await waitFor(() => expect(result.current).toBe(false))

    unmount()

    expect(() => __emitMockNetworkStateChange({ isConnected: false })).not.toThrow()
  })
})
