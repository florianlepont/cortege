jest.mock("react-native", () => ({}))

const mockFetchParcelSurveyHistory = jest.fn()

jest.mock("../api/ibp-api", () => ({
  fetchParcelSurveyHistory: (...args: unknown[]) => mockFetchParcelSurveyHistory(...args),
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import { useParcelSurveyHistory } from "./useParcelSurveyHistory"

const API_URL = "http://localhost:3000"
const TOKEN = "access-token"

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(async () => {
  await cleanup()
})

describe("useParcelSurveyHistory", () => {
  test("stays idle without a parcel id", async () => {
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, TOKEN, null))
    expect(result.current).toEqual({
      items: [],
      loading: false,
      error: false,
      offline: false,
      reload: expect.any(Function),
    })
    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
  })

  test("stays idle without an access token", async () => {
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, null, "P1"))
    expect(result.current.loading).toBe(false)
    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
  })

  test("loads history and resolves with its items", async () => {
    mockFetchParcelSurveyHistory.mockResolvedValue({ items: [{ survey_id: "s1" }] })
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, TOKEN, "P1"))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([{ survey_id: "s1" }])
    expect(result.current.error).toBe(false)
    expect(result.current.offline).toBe(false)
  })

  test("a non-array items response yields an empty list", async () => {
    mockFetchParcelSurveyHistory.mockResolvedValue({ items: undefined })
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, TOKEN, "P1"))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([])
  })

  test("a fetch failure sets the error state", async () => {
    mockFetchParcelSurveyHistory.mockRejectedValue(new Error("boom"))
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, TOKEN, "P1"))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.offline).toBe(false)
  })

  test("a stale response is ignored when the parcel changes mid-flight", async () => {
    let resolveFirst: (value: { items: unknown[] }) => void = () => {}
    mockFetchParcelSurveyHistory
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
      )
      .mockResolvedValueOnce({ items: [{ survey_id: "second" }] })

    const { result, rerender } = await renderHook(
      ({ parcelId }: { parcelId: string }) => useParcelSurveyHistory(API_URL, TOKEN, parcelId),
      { initialProps: { parcelId: "P1" } },
    )

    await act(async () => {
      await rerender({ parcelId: "P2" })
    })
    await waitFor(() => expect(result.current.items).toEqual([{ survey_id: "second" }]))

    await act(async () => {
      resolveFirst({ items: [{ survey_id: "stale" }] })
    })
    expect(result.current.items).toEqual([{ survey_id: "second" }])
  })

  test("offline skips the network entirely and reports offline instead of loading", async () => {
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, TOKEN, "P1", true))

    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
    expect(result.current).toEqual({
      items: [],
      loading: false,
      error: false,
      offline: true,
      reload: expect.any(Function),
    })
  })

  test("going back online after being offline fetches normally", async () => {
    mockFetchParcelSurveyHistory.mockResolvedValue({ items: [{ survey_id: "s1" }] })
    const { result, rerender } = await renderHook(
      ({ isOffline }: { isOffline: boolean }) =>
        useParcelSurveyHistory(API_URL, TOKEN, "P1", isOffline),
      { initialProps: { isOffline: true } },
    )
    expect(result.current.offline).toBe(true)

    await act(async () => {
      await rerender({ isOffline: false })
    })
    await waitFor(() => expect(result.current.items).toEqual([{ survey_id: "s1" }]))
    expect(result.current.offline).toBe(false)
  })

  test("reload() fetches again and keeps the first items while it is in flight", async () => {
    let resolveSecond: (value: { items: unknown[] }) => void = () => {}
    mockFetchParcelSurveyHistory
      .mockResolvedValueOnce({ items: [{ survey_id: "s1" }] })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve
        }),
      )
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, TOKEN, "P1"))
    await waitFor(() => expect(result.current.items).toEqual([{ survey_id: "s1" }]))
    const firstReload = result.current.reload

    await act(async () => {
      result.current.reload()
    })
    expect(mockFetchParcelSurveyHistory).toHaveBeenCalledTimes(2)
    expect(result.current.loading).toBe(true)
    expect(result.current.items).toEqual([{ survey_id: "s1" }])
    expect(result.current.reload).toBe(firstReload)

    await act(async () => {
      resolveSecond({ items: [{ survey_id: "s1" }, { survey_id: "s2" }] })
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([{ survey_id: "s1" }, { survey_id: "s2" }])
  })

  test("a new refreshKey refetches, the same key does not", async () => {
    mockFetchParcelSurveyHistory.mockResolvedValue({ items: [{ survey_id: "s1" }] })
    const { result, rerender } = await renderHook(
      ({ refreshKey }: { refreshKey: string }) =>
        useParcelSurveyHistory(API_URL, TOKEN, "P1", false, refreshKey),
      { initialProps: { refreshKey: "draft" } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockFetchParcelSurveyHistory).toHaveBeenCalledTimes(1)

    await act(async () => {
      await rerender({ refreshKey: "draft" })
    })
    expect(mockFetchParcelSurveyHistory).toHaveBeenCalledTimes(1)

    await act(async () => {
      await rerender({ refreshKey: "submitted" })
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockFetchParcelSurveyHistory).toHaveBeenCalledTimes(2)
  })

  test("reload() while offline keeps the offline state and does not fetch", async () => {
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, TOKEN, "P1", true))

    await act(async () => {
      result.current.reload()
    })
    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
    expect(result.current.offline).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  test("reload() after a failure fetches again and clears the error", async () => {
    mockFetchParcelSurveyHistory
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ items: [{ survey_id: "s1" }] })
    const { result } = await renderHook(() => useParcelSurveyHistory(API_URL, TOKEN, "P1"))
    await waitFor(() => expect(result.current.error).toBe(true))

    await act(async () => {
      result.current.reload()
    })
    await waitFor(() => expect(result.current.items).toEqual([{ survey_id: "s1" }]))
    expect(result.current.error).toBe(false)
  })
})
