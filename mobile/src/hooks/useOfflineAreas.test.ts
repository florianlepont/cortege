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

const mockDownloadAreaPacks = jest.fn()
const mockDeleteAreaPacks = jest.fn()

jest.mock("../map/offline-packs", () => ({
  downloadAreaPacks: (...args: unknown[]) => mockDownloadAreaPacks(...args),
  deleteAreaPacks: (...args: unknown[]) => mockDeleteAreaPacks(...args),
}))

const mockFetchPublicParcelStatuses = jest.fn()

jest.mock("../api/ibp-api", () => ({
  fetchPublicParcelStatuses: (...args: unknown[]) => mockFetchPublicParcelStatuses(...args),
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import type { MapRegion as Region } from "../app/map-viewport"
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
  mockDeleteAreaPacks.mockResolvedValue(undefined)
  mockDownloadAreaPacks.mockImplementation(async ({ onProgress }) => {
    const done = { percentage: 100, completedTileCount: 10, complete: true }
    onProgress(done)
    return done
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
    expect(mockDownloadAreaPacks).toHaveBeenCalledWith(
      expect.objectContaining({ basemaps: ["map", "satellite"] }),
    )
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
      expect.objectContaining({ downloadedTiles: expect.any(Number) }),
    )
    expect(result.current.downloadingAreaId).toBeNull()
  })

  test("startDownload finalizes as failed and removes the packs when the download errors", async () => {
    mockDownloadAreaPacks.mockRejectedValue(new Error("network down"))
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    let outcome: Awaited<ReturnType<typeof result.current.startDownload>> | undefined
    await act(async () => {
      outcome = await result.current.startDownload(REGION, "Zone")
    })

    expect(outcome).toEqual({ ok: false, reason: "failed" })
    expect(mockDeleteAreaPacks).toHaveBeenCalledTimes(1)
    expect(mockFinalizeOfflineArea).toHaveBeenCalledWith(
      expect.any(String),
      "failed",
      expect.objectContaining({ downloadedTiles: 0 }),
    )
    expect(result.current.downloadingAreaId).toBeNull()
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

    expect(mockDeleteAreaPacks).toHaveBeenCalledWith("area-1")
    expect(mockDeleteOfflineArea).toHaveBeenCalledWith("area-1")
    expect(result.current.areas).toHaveLength(0)
  })

  describe("download status for the panel's progress bar (12.2-19 third round)", () => {
    type Progress = { percentage: number; completedTileCount: number; complete: boolean }

    async function startControlled() {
      let report: (progress: Progress) => void = () => undefined
      let settle: { resolve: (p: Progress) => void; reject: (e: Error) => void } | undefined
      mockDownloadAreaPacks.mockImplementation(
        ({ onProgress }: { onProgress: (progress: Progress) => void }) =>
          new Promise<Progress>((resolve, reject) => {
            report = onProgress
            settle = { resolve, reject }
          }),
      )
      const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
      await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())
      let pending!: ReturnType<typeof result.current.startDownload>
      await act(async () => {
        pending = result.current.startDownload(REGION, "Bois du Nord")
      })
      return { result, pending, report: (p: Progress) => report(p), settle: () => settle! }
    }

    test("running from the start at 0, then the real pack percentage and tiles", async () => {
      const { result, report, settle, pending } = await startControlled()
      const total = result.current.estimateForRegion(REGION).totalTileCount
      expect(result.current.downloadStatus).toMatchObject({
        phase: "running",
        name: "Bois du Nord",
        percentage: 0,
        downloadedTiles: 0,
        totalTiles: total,
      })
      await act(async () => report({ percentage: 42, completedTileCount: 5, complete: false }))
      expect(result.current.downloadStatus).toMatchObject({
        phase: "running",
        percentage: 42,
        downloadedTiles: Math.round(0.42 * total),
      })
      // A basemap starting late would pull the average back: the bar holds where it was.
      await act(async () => report({ percentage: 30, completedTileCount: 6, complete: false }))
      expect(result.current.downloadStatus).toMatchObject({ percentage: 42 })

      // Closing the panel mid-download keeps the running status.
      await act(async () => result.current.clearDownloadStatus())
      expect(result.current.downloadStatus?.phase).toBe("running")

      await act(async () => {
        settle().resolve({ percentage: 100, completedTileCount: 10, complete: true })
        await pending
      })
      expect(result.current.downloadStatus).toMatchObject({
        phase: "done",
        name: "Bois du Nord",
        percentage: 100,
        downloadedTiles: total,
      })
      expect(result.current.downloadingAreaId).toBeNull()

      // A late report of another pack never takes the panel back from its outcome.
      await act(async () => report({ percentage: 80, completedTileCount: 9, complete: false }))
      expect(result.current.downloadStatus?.phase).toBe("done")

      await act(async () => result.current.clearDownloadStatus())
      expect(result.current.downloadStatus).toBeNull()
    })

    test("a failed download ends on the failed status, which clears", async () => {
      const { result, report, settle, pending } = await startControlled()
      await act(async () => report({ percentage: 20, completedTileCount: 2, complete: false }))
      await act(async () => {
        settle().reject(new Error("network down"))
        await pending
      })
      expect(result.current.downloadStatus).toEqual({
        phase: "failed",
        areaId: expect.any(String),
        name: "Bois du Nord",
      })
      expect(result.current.downloadingAreaId).toBeNull()
      await act(async () => result.current.clearDownloadStatus())
      expect(result.current.downloadStatus).toBeNull()
    })

    test("a storage failure before the download also ends on the failed status", async () => {
      mockInsertOfflineArea.mockRejectedValue(new Error("disk full"))
      // Marking the area failed may fail too: the panel still leaves its running state.
      mockFinalizeOfflineArea.mockRejectedValue(new Error("disk full"))
      const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
      await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())
      let outcome: Awaited<ReturnType<typeof result.current.startDownload>> | undefined
      await act(async () => {
        outcome = await result.current.startDownload(REGION, "Zone")
      })
      expect(outcome).toEqual({ ok: false, reason: "failed" })
      expect(mockDownloadAreaPacks).not.toHaveBeenCalled()
      expect(result.current.downloadStatus?.phase).toBe("failed")
      expect(result.current.downloadingAreaId).toBeNull()
    })

    test("a refused area never shows a status", async () => {
      const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
      await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())
      const huge: Region = { ...REGION, latitudeDelta: 2, longitudeDelta: 2 }
      await act(async () => {
        await result.current.startDownload(huge, "Zone")
      })
      expect(result.current.downloadStatus).toBeNull()
    })
  })
})
