jest.mock("react-native", () => ({}))

const mockEnabled = { value: true }
jest.mock("../app/feature-flags", () => ({ isOfflineMapsEnabled: () => mockEnabled.value }))
const mockOffline = { value: false }
jest.mock("./useIsOffline", () => ({ useIsOffline: () => mockOffline.value }))

const mockAreas: { value: unknown[] } = { value: [] }
const mockDownloading: { value: string | null } = { value: null }
const mockStartDownload = jest.fn()
jest.mock("./useOfflineAreas", () => ({
  useOfflineAreas: () => ({
    areas: mockAreas.value,
    downloadingAreaId: mockDownloading.value,
    estimateForRegion: () => ({
      totalTileCount: 100,
      estimatedBytes: 24_000_000,
      exceedsCap: false,
    }),
    startDownload: (...args: unknown[]) => mockStartDownload(...args),
  }),
}))

import { act, cleanup, renderHook } from "@testing-library/react-native/pure"
import { useOfflineMapPrompt } from "./useOfflineMapPrompt"

const POINT = { lat: 46.5, lng: 1.5 }

function readyArea(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    status: "ready",
    createdAt: "2026-10-05T10:00:00.000Z",
    bounds: { minLat: 46, minLng: 1, maxLat: 47, maxLng: 2 },
    totalTiles: 100,
    downloadedTiles: 100,
    ...overrides,
  }
}

beforeEach(() => {
  mockEnabled.value = true
  mockOffline.value = false
  mockAreas.value = []
  mockDownloading.value = null
  mockStartDownload.mockReset().mockResolvedValue({ ok: true, areaId: "a1" })
})
afterEach(async () => {
  await cleanup()
})

const run = (point: { lat: number; lng: number } | null = POINT) =>
  renderHook(() => useOfflineMapPrompt({ apiUrl: "u", accessToken: "t", point }))

describe("useOfflineMapPrompt", () => {
  test("online and not covered: missing, with the size of the 2 km area", async () => {
    const { result } = await run()
    expect(result.current.state).toBe("missing")
    expect(result.current.megabytes).toBe("24.0")
  })

  test("covered by a ready area: covered", async () => {
    mockAreas.value = [readyArea()]
    const { result } = await run()
    expect(result.current.state).toBe("covered")
  })

  test("a ready area elsewhere does not cover the point", async () => {
    mockAreas.value = [readyArea({ bounds: { minLat: 10, minLng: 10, maxLat: 11, maxLng: 11 } })]
    const { result } = await run()
    expect(result.current.state).toBe("missing")
  })

  test("hidden without a position, with the feature off, or offline and not covered", async () => {
    expect((await run(null)).result.current.state).toBe("hidden")
    mockEnabled.value = false
    expect((await run()).result.current.state).toBe("hidden")
    mockEnabled.value = true
    mockOffline.value = true
    expect((await run()).result.current.state).toBe("hidden")
  })

  test("offline but covered still says covered", async () => {
    mockOffline.value = true
    mockAreas.value = [readyArea()]
    expect((await run()).result.current.state).toBe("covered")
  })

  test("download starts the 2 km region and reports progress, then settles", async () => {
    let finish: (value: unknown) => void = () => undefined
    mockStartDownload.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    mockAreas.value = [readyArea({ id: "a2", status: "downloading", downloadedTiles: 40 })]
    mockDownloading.value = "a2"
    const { result } = await run()

    await act(async () => {
      result.current.download("Autour de Bois")
    })
    expect(mockStartDownload).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 46.5, longitude: 1.5 }),
      "Autour de Bois",
    )
    expect(result.current.state).toBe("downloading")
    expect(result.current.percent).toBe(40)

    mockDownloading.value = null
    await act(async () => {
      finish({ ok: true, areaId: "a2" })
    })
    expect(result.current.state).toBe("missing")
  })

  test("download without a position does nothing", async () => {
    const { result } = await run(null)
    await act(async () => {
      result.current.download("x")
    })
    expect(mockStartDownload).not.toHaveBeenCalled()
  })

  test("progress is zero while the area has no tile count yet", async () => {
    mockAreas.value = [readyArea({ id: "a3", status: "downloading", totalTiles: 0 })]
    mockDownloading.value = "a3"
    const { result } = await run()
    await act(async () => {
      result.current.download("x")
    })
    expect(result.current.percent).toBe(0)
  })
})
