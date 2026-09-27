jest.mock("react-native", () => ({}))

const mockFetchParcelSurveyHistory = jest.fn()
const mockListPendingParcelDownloads = jest.fn()
const mockRemovePendingParcelDownload = jest.fn()

jest.mock("../api/ibp-api", () => ({
  fetchParcelSurveyHistory: (...args: unknown[]) => mockFetchParcelSurveyHistory(...args),
}))

jest.mock("../storage/offline-map", () => ({
  listPendingParcelDownloads: (...args: unknown[]) => mockListPendingParcelDownloads(...args),
  removePendingParcelDownload: (...args: unknown[]) => mockRemovePendingParcelDownload(...args),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import {
  drainPendingParcelDownloads,
  useOfflinePendingParcelDrain,
} from "./useOfflinePendingParcelDrain"

const API_URL = "http://localhost:3000"
const TOKEN = "access-token"

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(async () => {
  await cleanup()
})

describe("drainPendingParcelDownloads", () => {
  test("fetches and clears every pending parcel that succeeds", async () => {
    mockListPendingParcelDownloads.mockResolvedValue(["P1", "P2"])
    mockFetchParcelSurveyHistory.mockResolvedValue({ items: [] })

    await drainPendingParcelDownloads(API_URL, TOKEN)

    expect(mockFetchParcelSurveyHistory).toHaveBeenCalledWith(API_URL, TOKEN, "P1")
    expect(mockFetchParcelSurveyHistory).toHaveBeenCalledWith(API_URL, TOKEN, "P2")
    expect(mockRemovePendingParcelDownload).toHaveBeenCalledWith("P1")
    expect(mockRemovePendingParcelDownload).toHaveBeenCalledWith("P2")
  })

  test("leaves a still-failing parcel pending instead of throwing", async () => {
    mockListPendingParcelDownloads.mockResolvedValue(["P1"])
    mockFetchParcelSurveyHistory.mockRejectedValue(new Error("still offline"))

    await expect(drainPendingParcelDownloads(API_URL, TOKEN)).resolves.toBeUndefined()
    expect(mockRemovePendingParcelDownload).not.toHaveBeenCalled()
  })

  test("does nothing when the queue is empty", async () => {
    mockListPendingParcelDownloads.mockResolvedValue([])

    await drainPendingParcelDownloads(API_URL, TOKEN)

    expect(mockFetchParcelSurveyHistory).not.toHaveBeenCalled()
  })
})

describe("useOfflinePendingParcelDrain", () => {
  test("does nothing on mount while already online", async () => {
    mockListPendingParcelDownloads.mockResolvedValue(["P1"])
    await renderHook(() => useOfflinePendingParcelDrain(API_URL, TOKEN, false))

    expect(mockListPendingParcelDownloads).not.toHaveBeenCalled()
  })

  test("does nothing while it stays offline", async () => {
    mockListPendingParcelDownloads.mockResolvedValue(["P1"])
    const { rerender } = await renderHook(
      ({ isOffline }: { isOffline: boolean }) =>
        useOfflinePendingParcelDrain(API_URL, TOKEN, isOffline),
      { initialProps: { isOffline: true } },
    )

    await act(async () => {
      await rerender({ isOffline: true })
    })
    expect(mockListPendingParcelDownloads).not.toHaveBeenCalled()
  })

  test("drains the queue on the offline -> online transition", async () => {
    mockListPendingParcelDownloads.mockResolvedValue(["P1"])
    mockFetchParcelSurveyHistory.mockResolvedValue({ items: [] })
    const { rerender } = await renderHook(
      ({ isOffline }: { isOffline: boolean }) =>
        useOfflinePendingParcelDrain(API_URL, TOKEN, isOffline),
      { initialProps: { isOffline: true } },
    )

    await act(async () => {
      await rerender({ isOffline: false })
    })

    expect(mockListPendingParcelDownloads).toHaveBeenCalledTimes(1)
    expect(mockRemovePendingParcelDownload).toHaveBeenCalledWith("P1")
  })

  test("does not drain on reconnect without an access token", async () => {
    const { rerender } = await renderHook(
      ({ isOffline }: { isOffline: boolean }) =>
        useOfflinePendingParcelDrain(API_URL, null, isOffline),
      { initialProps: { isOffline: true } },
    )

    await act(async () => {
      await rerender({ isOffline: false })
    })
    expect(mockListPendingParcelDownloads).not.toHaveBeenCalled()
  })
})
