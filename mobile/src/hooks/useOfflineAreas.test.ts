jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))

const mockListOfflineAreas = jest.fn()
const mockInsertOfflineArea = jest.fn()
const mockUpdateOfflineAreaProgress = jest.fn()
const mockFinalizeOfflineArea = jest.fn()
const mockDeleteOfflineArea = jest.fn()
const mockGetOfflineDocumentDirectory = jest.fn()
const mockSaveOfflineAreaParcels = jest.fn()

jest.mock("../storage/offline-map", () => ({
  listOfflineAreas: (...args: unknown[]) => mockListOfflineAreas(...args),
  insertOfflineArea: (...args: unknown[]) => mockInsertOfflineArea(...args),
  updateOfflineAreaProgress: (...args: unknown[]) => mockUpdateOfflineAreaProgress(...args),
  finalizeOfflineArea: (...args: unknown[]) => mockFinalizeOfflineArea(...args),
  deleteOfflineArea: (...args: unknown[]) => mockDeleteOfflineArea(...args),
  getOfflineDocumentDirectory: (...args: unknown[]) => mockGetOfflineDocumentDirectory(...args),
  saveOfflineAreaParcels: (...args: unknown[]) => mockSaveOfflineAreaParcels(...args),
}))

const mockPolicy: { value: "base" | "all" } = { value: "all" }
const mockLoadPolicy = jest.fn()
jest.mock("../storage/offline-layers-policy", () => ({
  loadOfflineLayersPolicy: (...args: unknown[]) => mockLoadPolicy(...args),
}))
jest.mock("./useOfflineLayersPolicy", () => ({
  useOfflineLayersPolicy: () => ({ policy: mockPolicy.value }),
}))

const mockLogStatusDetail = jest.fn()
jest.mock("../i18n/status", () => ({
  logStatusDetail: (...args: unknown[]) => mockLogStatusDetail(...args),
}))

const mockDownloadAreaLayerPacks = jest.fn()
const mockDeleteAreaPacks = jest.fn()

jest.mock("../map/offline-packs", () => ({
  downloadAreaLayerPacks: (...args: unknown[]) => mockDownloadAreaLayerPacks(...args),
  deleteAreaPacks: (...args: unknown[]) => mockDeleteAreaPacks(...args),
}))

const mockFetchPublicParcelStatuses = jest.fn()

jest.mock("../api/ibp-api", () => ({
  fetchPublicParcelStatuses: (...args: unknown[]) => mockFetchPublicParcelStatuses(...args),
}))

import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native/pure"
import type { MapRegion as Region } from "../app/map-viewport"
import { PACK_ORDER } from "../map/layers"
import { estimateAreaLayers } from "../map/offline-estimate"
import { useOfflineAreas } from "./useOfflineAreas"

type PackProgress = {
  percentage: number
  completedTileCount: number
  currentLayer: string | null
  complete: boolean
}
type PackResult = {
  percentage: number
  layers: { key: string; outcome: string; completedResourceSize: number }[]
  failedLayers: string[]
  totalBytes: number
}

const doneResult = (overrides: Partial<PackResult> = {}): PackResult => ({
  percentage: 100,
  layers: [
    { key: "map", outcome: "complete", completedResourceSize: 40_000_000 },
    { key: "satellite", outcome: "complete", completedResourceSize: 12_400_000 },
  ],
  failedLayers: [],
  totalBytes: 52_400_000,
  ...overrides,
})

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
  mockPolicy.value = "all"
  mockLoadPolicy.mockResolvedValue("all")
  mockDeleteAreaPacks.mockResolvedValue(undefined)
  mockDownloadAreaLayerPacks.mockImplementation(
    async ({ onProgress }: { onProgress: (progress: PackProgress) => void }) => {
      onProgress({ percentage: 100, completedTileCount: 10, currentLayer: "map", complete: true })
      return doneResult()
    },
  )
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

  test("estimateForRegion is the covering-zoom estimate of the current policy", async () => {
    const { result, rerender } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    const all = result.current.estimateForRegion(REGION)
    expect(all.policy).toBe("all")
    expect(all.layers.map((layer) => layer.key)).toEqual([...PACK_ORDER])
    expect(all.totalTileCount).toBeGreaterThan(0)

    mockPolicy.value = "base"
    await rerender({})
    const base = result.current.estimateForRegion(REGION)
    expect(base.policy).toBe("base")
    expect(base.layers.map((layer) => layer.key)).toEqual(["map", "satellite"])
    expect(base.estimatedBytes).toBeLessThan(all.estimatedBytes)
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
    expect(mockLoadPolicy).toHaveBeenCalledTimes(1)
    const call = mockDownloadAreaLayerPacks.mock.calls[0][0]
    expect(call.layers.map((layer: { key: string }) => layer.key)).toEqual([...PACK_ORDER])
    expect(call.layers.every((layer: { weight: number }) => layer.weight > 0)).toBe(true)
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
      52_400_000,
    )
    expect(result.current.downloadingAreaId).toBeNull()
  })

  test("startDownload reads the stored policy when it starts, not the hook's", async () => {
    mockLoadPolicy.mockResolvedValue("base")
    mockPolicy.value = "all"
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    await act(async () => {
      await result.current.startDownload(REGION, "Zone")
    })

    const call = mockDownloadAreaLayerPacks.mock.calls[0][0]
    expect(call.layers.map((layer: { key: string }) => layer.key)).toEqual(["map", "satellite"])
    const expected = estimateAreaLayers(
      { minLat: 45.99, minLng: 0.99, maxLat: 46.01, maxLng: 1.01 },
      "base",
    )
    expect(mockInsertOfflineArea).toHaveBeenCalledWith(
      expect.objectContaining({ totalTiles: expected.totalTileCount }),
    )
  })

  test("startDownload falls back to the hook's policy when the stored one cannot be read", async () => {
    mockLoadPolicy.mockRejectedValue(new Error("db closed"))
    mockPolicy.value = "base"
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    await act(async () => {
      await result.current.startDownload(REGION, "Zone")
    })

    const call = mockDownloadAreaLayerPacks.mock.calls[0][0]
    expect(call.layers.map((layer: { key: string }) => layer.key)).toEqual(["map", "satellite"])
  })

  test("a failed extra layer leaves the area ready, listed in the done status", async () => {
    mockDownloadAreaLayerPacks.mockResolvedValue(
      doneResult({
        failedLayers: ["photos-1950"],
        layers: [
          { key: "map", outcome: "complete", completedResourceSize: 40_000_000 },
          { key: "photos-1950", outcome: "failed", completedResourceSize: 0 },
        ],
        totalBytes: 40_000_000,
      }),
    )
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    let outcome: Awaited<ReturnType<typeof result.current.startDownload>> | undefined
    await act(async () => {
      outcome = await result.current.startDownload(REGION, "Zone")
    })

    expect(outcome).toMatchObject({ ok: true })
    expect(mockDeleteAreaPacks).not.toHaveBeenCalled()
    expect(mockFinalizeOfflineArea).toHaveBeenCalledWith(
      expect.any(String),
      "ready",
      expect.anything(),
      40_000_000,
    )
    expect(result.current.downloadStatus).toMatchObject({
      phase: "done",
      failedLayers: ["photos-1950"],
    })
  })

  test("a download that measured nothing keeps the estimate", async () => {
    mockDownloadAreaLayerPacks.mockResolvedValue(doneResult({ totalBytes: 0 }))
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    await act(async () => {
      await result.current.startDownload(REGION, "Zone")
    })

    expect(mockFinalizeOfflineArea).toHaveBeenCalledWith(
      expect.any(String),
      "ready",
      expect.anything(),
      undefined,
    )
  })

  test("logs one line per finished layer with its key, bytes and outcome only", async () => {
    const { result } = await renderHook(() => useOfflineAreas(API_URL, TOKEN))
    await waitFor(() => expect(mockListOfflineAreas).toHaveBeenCalled())

    await act(async () => {
      await result.current.startDownload(REGION, "Zone")
    })

    expect(mockLogStatusDetail).toHaveBeenCalledTimes(2)
    expect(mockLogStatusDetail).toHaveBeenCalledWith("offline.layer-size", {
      layer: "map",
      bytes: 40_000_000,
      outcome: "complete",
    })
    expect(mockLogStatusDetail).toHaveBeenCalledWith("offline.layer-size", {
      layer: "satellite",
      bytes: 12_400_000,
      outcome: "complete",
    })
  })

  test("startDownload finalizes as failed and removes the packs when the download errors", async () => {
    mockDownloadAreaLayerPacks.mockRejectedValue(new Error("network down"))
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
    type Progress = PackProgress
    const step = (percentage: number, completedTileCount = 1): Progress => ({
      percentage,
      completedTileCount,
      currentLayer: "map",
      complete: false,
    })

    async function startControlled() {
      let report: (progress: Progress) => void = () => undefined
      let settle: { resolve: (p: PackResult) => void; reject: (e: Error) => void } | undefined
      mockDownloadAreaLayerPacks.mockImplementation(
        ({ onProgress }: { onProgress: (progress: Progress) => void }) =>
          new Promise<PackResult>((resolve, reject) => {
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
      await act(async () => report(step(42, 5)))
      expect(result.current.downloadStatus).toMatchObject({
        phase: "running",
        percentage: 42,
        downloadedTiles: Math.round(0.42 * total),
      })
      // A layer starting late would pull the weighted mean back: the bar holds where it was.
      await act(async () => report(step(30, 6)))
      expect(result.current.downloadStatus).toMatchObject({ percentage: 42 })

      // Closing the panel mid-download keeps the running status.
      await act(async () => result.current.clearDownloadStatus())
      expect(result.current.downloadStatus?.phase).toBe("running")

      await act(async () => {
        settle().resolve(doneResult())
        await pending
      })
      expect(result.current.downloadStatus).toMatchObject({
        phase: "done",
        name: "Bois du Nord",
        percentage: 100,
        downloadedTiles: total,
        failedLayers: [],
      })
      expect(result.current.downloadingAreaId).toBeNull()

      // A late report of another pack never takes the panel back from its outcome.
      await act(async () => report(step(80, 9)))
      expect(result.current.downloadStatus?.phase).toBe("done")

      await act(async () => result.current.clearDownloadStatus())
      expect(result.current.downloadStatus).toBeNull()
    })

    test("a failed download ends on the failed status, which clears", async () => {
      const { result, report, settle, pending } = await startControlled()
      await act(async () => report(step(20, 2)))
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
      expect(mockDownloadAreaLayerPacks).not.toHaveBeenCalled()
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
