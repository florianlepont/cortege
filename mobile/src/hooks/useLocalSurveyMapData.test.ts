jest.mock("react-native", () => ({}))

const mockListSources = jest.fn()
const mockGetCachedParcel = jest.fn()
const mockLogStatusDetail = jest.fn()
const mockFocus = { value: true }

jest.mock("../storage/surveys", () => ({
  listLocalSurveyMapSources: (...args: unknown[]) => mockListSources(...args),
}))
jest.mock("../storage/offline-map", () => ({
  getCachedParcelById: (...args: unknown[]) => mockGetCachedParcel(...args),
}))
jest.mock("../ui/useScreenFocus", () => ({ useScreenFocus: () => mockFocus.value }))
jest.mock("../i18n", () => ({
  logStatusDetail: (...args: unknown[]) => mockLogStatusDetail(...args),
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import type { LocalSurvey, LocalSurveyMapSource } from "../storage/types"
import { useLocalSurveyMapData } from "./useLocalSurveyMapData"

function source(id: string, parcelIds: unknown): LocalSurveyMapSource {
  return {
    id,
    status: "draft",
    created_at: "2026-10-01T10:00:00.000Z",
    updated_at: "2026-10-02T10:00:00.000Z",
    payload: { parcel_ids: parcelIds } as unknown as LocalSurveyMapSource["payload"],
  }
}

const parcel = (id: string) => ({ parcel_id: id })

const LIST_A: LocalSurvey[] = []
const LIST_B: LocalSurvey[] = []

beforeEach(() => {
  mockFocus.value = true
  mockListSources.mockReset().mockResolvedValue([])
  mockGetCachedParcel.mockReset().mockImplementation(async (id: string) => parcel(id))
  mockLogStatusDetail.mockReset()
})

afterEach(async () => {
  await cleanup()
})

describe("useLocalSurveyMapData", () => {
  test("returns empty data before the first load resolves", async () => {
    let resolve: (value: LocalSurveyMapSource[]) => void = () => {}
    mockListSources.mockReturnValue(
      new Promise<LocalSurveyMapSource[]>((r) => {
        resolve = r
      }),
    )
    const { result } = await renderHook(() => useLocalSurveyMapData(LIST_A, false))

    expect(result.current).toEqual({ sources: [], parcels: [] })
    await act(async () => {
      resolve([])
    })
  })

  test("loads the sources and the distinct cached parcels, dropping uncached ones", async () => {
    const sources = [
      source("s-1", ["p-1", " p-2 "]),
      source("s-2", ["P-1", "p-3"]),
      source("s-3", undefined),
    ]
    mockListSources.mockResolvedValue(sources)
    mockGetCachedParcel.mockImplementation(async (id: string) => (id === "P-3" ? null : parcel(id)))

    const { result } = await renderHook(() => useLocalSurveyMapData(LIST_A, false))

    await waitFor(() => expect(result.current.sources).toEqual(sources))
    expect(result.current.parcels).toEqual([parcel("P-1"), parcel("P-2")])
    expect(mockGetCachedParcel).toHaveBeenCalledTimes(3)
  })

  test("reloads on a new survey list or an offline flip, not on identical values", async () => {
    const { rerender } = await renderHook(
      (props: { list: LocalSurvey[]; offline: boolean }) =>
        useLocalSurveyMapData(props.list, props.offline),
      { initialProps: { list: LIST_A, offline: false } },
    )
    await waitFor(() => expect(mockListSources).toHaveBeenCalledTimes(1))

    await rerender({ list: LIST_A, offline: false })
    expect(mockListSources).toHaveBeenCalledTimes(1)

    await rerender({ list: LIST_B, offline: false })
    await waitFor(() => expect(mockListSources).toHaveBeenCalledTimes(2))

    await rerender({ list: LIST_B, offline: true })
    await waitFor(() => expect(mockListSources).toHaveBeenCalledTimes(3))
  })

  test("starts no load while not focused and reloads on regaining focus", async () => {
    mockFocus.value = false
    const { rerender } = await renderHook(() => useLocalSurveyMapData(LIST_A, false))
    await act(async () => {})
    expect(mockListSources).not.toHaveBeenCalled()

    mockFocus.value = true
    await rerender({})
    await waitFor(() => expect(mockListSources).toHaveBeenCalledTimes(1))
  })

  test("keeps the previous data and logs when a read rejects", async () => {
    const first = [source("s-1", ["p-1"])]
    mockListSources.mockResolvedValueOnce(first)
    const { result, rerender } = await renderHook(
      (props: { list: LocalSurvey[] }) => useLocalSurveyMapData(props.list, false),
      { initialProps: { list: LIST_A } },
    )
    await waitFor(() => expect(result.current.sources).toEqual(first))

    const failure = new Error("sqlite")
    mockListSources.mockRejectedValueOnce(failure)
    await rerender({ list: LIST_B })

    await waitFor(() =>
      expect(mockLogStatusDetail).toHaveBeenCalledWith("ownSurveyMap.load", failure),
    )
    expect(result.current.sources).toEqual(first)
  })

  test("sets no state for a load that finishes after unmount", async () => {
    let resolve: (value: LocalSurveyMapSource[]) => void = () => {}
    mockListSources.mockReturnValue(
      new Promise<LocalSurveyMapSource[]>((r) => {
        resolve = r
      }),
    )
    const { result, unmount } = await renderHook(() => useLocalSurveyMapData(LIST_A, false))

    await unmount()
    await act(async () => {
      resolve([source("s-1", ["p-1"])])
    })

    expect(result.current).toEqual({ sources: [], parcels: [] })
  })
})
