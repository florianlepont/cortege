jest.mock("react-native", () => ({}))

const mockListOfflineAreas = jest.fn()
const mockInsertOfflineArea = jest.fn()
const mockUpdateOfflineAreaProgress = jest.fn()
const mockFinalizeOfflineArea = jest.fn()
const mockDeleteOfflineArea = jest.fn()
const mockGetOfflineDocumentDirectory = jest.fn()
const mockSaveOfflineAreaParcels = jest.fn()
const mockBasemapsForDownload = jest.fn()

jest.mock("../storage/offline-map", () => ({
  listOfflineAreas: (...args: unknown[]) => mockListOfflineAreas(...args),
  insertOfflineArea: (...args: unknown[]) => mockInsertOfflineArea(...args),
  updateOfflineAreaProgress: (...args: unknown[]) => mockUpdateOfflineAreaProgress(...args),
  finalizeOfflineArea: (...args: unknown[]) => mockFinalizeOfflineArea(...args),
  deleteOfflineArea: (...args: unknown[]) => mockDeleteOfflineArea(...args),
  getOfflineDocumentDirectory: (...args: unknown[]) => mockGetOfflineDocumentDirectory(...args),
  saveOfflineAreaParcels: (...args: unknown[]) => mockSaveOfflineAreaParcels(...args),
  basemapsForDownload: (...args: unknown[]) => mockBasemapsForDownload(...args),
}))

const mockBuildDownloadJobs = jest.fn()
const mockDownloadAreaTiles = jest.fn()

jest.mock("../map/offline-download", () => ({
  buildDownloadJobs: (...args: unknown[]) => mockBuildDownloadJobs(...args),
  downloadAreaTiles: (...args: unknown[]) => mockDownloadAreaTiles(...args),
}))

const mockFetchPublicParcelStatuses = jest.fn()

jest.mock("../api/ibp-api", () => ({
  fetchPublicParcelStatuses: (...args: unknown[]) => mockFetchPublicParcelStatuses(...args),
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import type { Region } from "react-native-maps"
import { useOfflineAreas } from "./useOfflineAreas"

const REGION: Region = { latitude: 46.0, longitude: 1.0, latitudeDelta: 0.02, longitudeDelta: 0.02 }
const API_URL = "https://api.example.test/v1"
const TOKEN = "token-123"

function areaSummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "area-1",
    name: "Zone",
    bounds: { minLat: 45.99, minLng: 0.99, maxLat: 46.01, maxLng: 1.01 },
    minZoom: 13,
    maxZoom: 17,
    status: "ready",
    totalTiles: 10,
    downloadedTiles: 10,
    failedTiles: 0,
    estimatedBytes: 100,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockListOfflineAreas.mockResolvedValue([])
  mockInsertOfflineArea.mockResolvedValue(undefined)
  mockUpdateOfflineAreaProgress.mockResolvedValue(undefined)
  mockFinalizeOfflineArea.mockResolvedValue(undefined)
  mockDeleteOfflineArea.mockResolvedValue(undefined)
  mockGetOfflineDocumentDirectory.mockReturnValue("file:///mock/documents/")
  mockSaveOfflineAreaParcels.mockResolvedValue(undefined)
  mockBasemapsForDownload.mockReturnValue(["map", "satellite"])
  mockBuildDownloadJobs.mockReturnValue([{ basemap: "map", tile: { z: 15, x: 1, y: 1 } }])
  mockDownloadAreaTiles.mockImplementation(async (_dir, _id, jobs, onProgress) => {
    await onProgress({ downloadedTiles: jobs.length, failedTiles: 0, totalTiles: jobs.length })
    return { downloadedTiles: jobs.length, failedTiles: 0, totalTiles: jobs.length }
  })
  mockFetchPublicParcelStatuses.mockResolvedValue({ items: [{ parcel_id: "P1" }] })
})

afterEach(async () => {
  await cleanup()
})

describe("useOfflineAreas", () => {
  test("loads the area list on mount", async () => {
    mockListOfflineAreas.mockResolvedValue([areaSummary()])
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))

    await waitFor(() => expect(result.current.areas).toHaveLength(1))
    expect(result.current.areas[0].id).toBe("area-1")
  })

  test("estimateForRegion returns an estimate for a region", async () => {
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    const estimate = result.current.estimateForRegion(REGION)
    expect(estimate.totalTileCount).toBeGreaterThan(0)
  })

  test("startDownload inserts the area, downloads tiles, caches parcels and finalizes as ready", async () => {
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    let outcome: Awaited<ReturnType<typeof result.current.startDownload>> | undefined
    await act(async () => {
      outcome = await result.current.startDownload(REGION, "Bois du Nord")
    })

    expect(outcome).toMatchObject({ ok: true })
    expect(mockInsertOfflineArea).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bois du Nord" }),
    )
    expect(mockDownloadAreaTiles).toHaveBeenCalled()
    expect(mockUpdateOfflineAreaProgress).toHaveBeenCalled()
    expect(mockFetchPublicParcelStatuses).toHaveBeenCalledWith(
      API_URL,
      TOKEN,
      expect.objectContaining({ zoom: 16 }),
    )
    expect(mockSaveOfflineAreaParcels).toHaveBeenCalledWith(expect.any(String), [
      { parcel_id: "P1" },
    ])
    expect(mockFinalizeOfflineArea).toHaveBeenCalledWith(
      expect.any(String),
      "ready",
      expect.objectContaining({ downloadedTiles: 1 }),
    )
    expect(result.current.downloadingAreaId).toBeNull()
  })

  test("startDownload finalizes as failed when nothing downloaded", async () => {
    mockDownloadAreaTiles.mockResolvedValue({ downloadedTiles: 0, failedTiles: 1, totalTiles: 1 })
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    await act(async () => {
      await result.current.startDownload(REGION, "Zone")
    })

    expect(mockFinalizeOfflineArea).toHaveBeenCalledWith(
      expect.any(String),
      "failed",
      expect.objectContaining({ downloadedTiles: 0 }),
    )
  })

  test("startDownload skips the parcel cache without an access token", async () => {
    const { result } = await renderHook(() => useOfflineAreas(API_URL, null))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    await act(async () => {
      await result.current.startDownload(REGION, "Zone")
    })

    expect(mockFetchPublicParcelStatuses).not.toHaveBeenCalled()
    expect(mockSaveOfflineAreaParcels).not.toHaveBeenCalled()
    expect(mockFinalizeOfflineArea).toHaveBeenCalled()
  })

  test("startDownload still finalizes the area when the parcel cache fetch fails", async () => {
    mockFetchPublicParcelStatuses.mockRejectedValue(new Error("offline"))
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    await act(async () => {
      const outcome = await result.current.startDownload(REGION, "Zone")
      expect(outcome).toMatchObject({ ok: true })
    })

    expect(mockSaveOfflineAreaParcels).not.toHaveBeenCalled()
    expect(mockFinalizeOfflineArea).toHaveBeenCalledWith(
      expect.any(String),
      "ready",
      expect.anything(),
    )
  })

  test("startDownload rejects a viewport over the tile cap without touching storage", async () => {
    const hugeRegion: Region = {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 170,
      longitudeDelta: 170,
    }
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    let outcome: Awaited<ReturnType<typeof result.current.startDownload>> | undefined
    await act(async () => {
      outcome = await result.current.startDownload(hugeRegion, "Trop grand")
    })

    expect(outcome).toEqual({ ok: false, reason: "too_large" })
    expect(mockInsertOfflineArea).not.toHaveBeenCalled()
  })

  test("deleteArea removes the area and refreshes the list", async () => {
    mockListOfflineAreas.mockResolvedValueOnce([areaSummary()]).mockResolvedValueOnce([])
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(result.current.areas).toHaveLength(1))

    await act(async () => {
      await result.current.deleteArea("area-1")
    })

    expect(mockDeleteOfflineArea).toHaveBeenCalledWith("area-1")
    expect(result.current.areas).toHaveLength(0)
  })
})
