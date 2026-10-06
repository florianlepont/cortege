jest.mock("react-native", () => ({}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { useOfflineAreasSummary } from "./useOfflineAreasSummary"

const mockListOfflineAreas = jest.fn()
jest.mock("../storage/offline-map", () => ({
  listOfflineAreas: () => mockListOfflineAreas(),
}))

const area = (status: string, estimatedBytes: number) => ({ status, estimatedBytes })

beforeEach(() => mockListOfflineAreas.mockReset())
afterEach(() => cleanup())

describe("useOfflineAreasSummary", () => {
  test("starts empty", async () => {
    const { result } = await renderHook(() => useOfflineAreasSummary())
    expect(result.current.summary).toEqual({ count: 0, bytes: 0 })
  })

  test("counts the ready zones and sums their size, ignoring downloads and failures", async () => {
    mockListOfflineAreas.mockResolvedValue([
      area("ready", 20_000_000),
      area("ready", 18_000_000),
      area("downloading", 5_000_000),
      area("failed", 9_000_000),
    ])
    const { result } = await renderHook(() => useOfflineAreasSummary())
    await act(async () => {
      await result.current.refresh()
    })
    expect(result.current.summary).toEqual({ count: 2, bytes: 38_000_000 })
  })

  test("keeps the previous value when the database read fails", async () => {
    mockListOfflineAreas.mockResolvedValueOnce([area("ready", 1_000_000)])
    const { result } = await renderHook(() => useOfflineAreasSummary())
    await act(async () => {
      await result.current.refresh()
    })
    mockListOfflineAreas.mockRejectedValueOnce(new Error("db"))
    await act(async () => {
      await result.current.refresh()
    })
    expect(result.current.summary).toEqual({ count: 1, bytes: 1_000_000 })
  })
})
