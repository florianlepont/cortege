import { __resetMockFileSystem } from "../../test/expo-file-system-legacy.mock"
import { OfflineManager, offlineMocks } from "../../test/maplibre.mock"
import type { AreaPackProgress } from "./offline-packs"
import {
  STALL_ACCEPT_PERCENT,
  STALL_TIMEOUT_MS,
  deleteAreaPacks,
  downloadAreaLayerPacks,
  listAreaLayers,
  listPackAreaIds,
  packStyleFor,
  weightedPercentage,
} from "./offline-packs"
import type { MapLayerKey } from "./layers"

const DOCS = "file:///mock/documents/"
const API = "https://api.example.test/v1"
const BOUNDS = { minLat: 46, minLng: 1, maxLat: 46.02, maxLng: 1.02 }

jest.mock("./offline-styles", () => ({
  writeOfflineStyle: jest.fn(
    async (_dir: string, basemap: string) => `file:///style/${basemap}.json`,
  ),
}))

beforeEach(() => {
  __resetMockFileSystem()
  offlineMocks.reset()
})

describe("packs of an area", () => {
  test("lists the areas that own a pack and deletes only the packs of one area", async () => {
    offlineMocks.packs = [
      { id: "p1", metadata: { areaId: "a", basemap: "map" }, bounds: [] },
      { id: "p2", metadata: { areaId: "a", basemap: "satellite" }, bounds: [] },
      { id: "p3", metadata: { areaId: "b", basemap: "map" }, bounds: [] },
      { id: "p4", metadata: {}, bounds: [] },
    ]
    expect([...(await listPackAreaIds())].sort()).toEqual(["a", "b"])
    await deleteAreaPacks("a")
    expect(offlineMocks.packs.map((pack) => pack.id)).toEqual(["p3", "p4"])
  })
})

describe("packStyleFor", () => {
  test("iOS keeps the composite style file", () => {
    expect(packStyleFor("ios", API, "map", "file:///docs/offline-styles/map.json")).toBe(
      "file:///docs/offline-styles/map.json",
    )
  })

  test("Android uses the style the API publishes (no file:// for a pack)", () => {
    expect(packStyleFor("android", API, "map", "file:///docs/offline-styles/map.json")).toBe(
      "https://api.example.test/v1/map-styles/map.json",
    )
    expect(packStyleFor("android", `${API}/`, "satellite", "file:///x.json")).toBe(
      "https://api.example.test/v1/map-styles/satellite.json",
    )
  })
})

describe("packs of earlier builds and of layers", () => {
  const pack = (id: string, metadata: Record<string, unknown>) => ({ id, metadata, bounds: [] })

  test("both metadata shapes are listed, deleted and mapped to their layers", async () => {
    offlineMocks.packs = [
      pack("p1", { areaId: "a", basemap: "satellite" }),
      pack("p2", { areaId: "a", layer: "photos-1950" }),
      pack("p3", { areaId: "b", layer: "map" }),
      pack("p4", { areaId: "b", layer: "types-foret" }),
    ]
    expect([...(await listPackAreaIds())].sort()).toEqual(["a", "b"])
    const layers = await listAreaLayers()
    expect([...layers.keys()].sort()).toEqual(["a", "b"])
    expect([...(layers.get("a") as Set<string>)].sort()).toEqual(["photos-1950", "satellite"])
    expect([...(layers.get("b") as Set<string>)].sort()).toEqual(["map", "types-foret"])
    await deleteAreaPacks("a")
    expect(offlineMocks.packs.map((entry) => entry.id)).toEqual(["p3", "p4"])
  })

  test("invalid metadata is ignored everywhere", async () => {
    offlineMocks.packs = [
      pack("p1", {}),
      pack("p2", { areaId: 7, layer: "map" }),
      pack("p3", { areaId: "a", layer: "unknown-layer" }),
      pack("p4", { areaId: "a", basemap: "etat-major" }),
      pack("p5", { areaId: "a" }),
      pack("p6", { areaId: "a", layer: 3 }),
    ]
    expect((await listPackAreaIds()).size).toBe(0)
    expect((await listAreaLayers()).size).toBe(0)
    await deleteAreaPacks("a")
    expect(offlineMocks.packs).toHaveLength(6)
  })

  test("packStyleFor builds the style name from the layer", () => {
    expect(packStyleFor("android", API, "photos-1950", "file:///s.json")).toBe(
      "https://api.example.test/v1/map-styles/photos-1950.json",
    )
    expect(packStyleFor("ios", API, "photos-1950", "file:///s.json")).toBe("file:///s.json")
  })
})

describe("weightedPercentage", () => {
  test("weights the layers by their estimated bytes", () => {
    expect(
      weightedPercentage([
        { weight: 1, percentage: 100 },
        { weight: 99, percentage: 0 },
      ]),
    ).toBe(1)
    expect(
      weightedPercentage([
        { weight: 50, percentage: 50 },
        { weight: 50, percentage: 100 },
      ]),
    ).toBe(75)
  })

  test("no weight gives 0, not NaN", () => {
    expect(weightedPercentage([])).toBe(0)
    expect(
      weightedPercentage([
        { weight: 0, percentage: 100 },
        { weight: 0, percentage: 20 },
      ]),
    ).toBe(0)
  })
})

describe("downloadAreaLayerPacks", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  const settle = () => jest.advanceTimersByTimeAsync(0)

  function status(overrides: Record<string, unknown>) {
    return {
      id: "x",
      state: "active",
      percentage: 0,
      completedResourceCount: 0,
      completedResourceSize: 0,
      completedTileCount: 0,
      requiredResourceCount: 100,
      ...overrides,
    }
  }

  function emit(index: number, overrides: Record<string, unknown>) {
    const pack = offlineMocks.packs[index]
    offlineMocks.listeners.get(pack.id)!.progress(pack, status(overrides))
  }

  function fail(index: number, message: string) {
    const pack = offlineMocks.packs[index]
    offlineMocks.listeners.get(pack.id)!.error(pack, { id: pack.id, message })
  }

  function start(
    layers: { key: MapLayerKey; weight: number }[],
    onProgress: (progress: AreaPackProgress) => void = jest.fn(),
    os = "ios",
  ) {
    const done = downloadAreaLayerPacks({
      documentDirectory: DOCS,
      os,
      apiUrl: API,
      areaId: "area-1",
      bounds: BOUNDS,
      layers,
      onProgress,
    })
    // A rejection is asserted by the test; this keeps an early one from being reported unhandled.
    done.catch(() => undefined)
    return done
  }

  const complete = (size: number, tiles = 10) =>
    ({
      state: "complete",
      percentage: 100,
      completedResourceCount: 50,
      completedResourceSize: size,
      completedTileCount: tiles,
    }) as Record<string, unknown>

  test("creates the packs one after the other, each with its layer, zooms 13 to 17", async () => {
    const onProgress = jest.fn()
    const done = start(
      [
        { key: "map", weight: 50 },
        { key: "satellite", weight: 30 },
        { key: "etat-major", weight: 1 },
      ],
      onProgress,
    )
    await settle()
    expect(OfflineManager.createPack).toHaveBeenCalledTimes(1)
    expect(offlineMocks.packs[0].metadata).toEqual({ areaId: "area-1", layer: "map" })
    emit(0, { percentage: 40, completedResourceCount: 4, completedTileCount: 4 })
    await settle()
    expect(OfflineManager.createPack).toHaveBeenCalledTimes(1)
    expect(onProgress).toHaveBeenLastCalledWith({
      percentage: (50 * 40) / 81,
      completedTileCount: 4,
      currentLayer: "map",
      complete: false,
    })

    emit(0, complete(1000, 40))
    await settle()
    expect(OfflineManager.createPack).toHaveBeenCalledTimes(2)
    expect(offlineMocks.packs[1].metadata).toEqual({ areaId: "area-1", layer: "satellite" })
    emit(1, complete(2000, 60))
    await settle()
    expect(offlineMocks.packs[2].metadata).toEqual({ areaId: "area-1", layer: "etat-major" })
    emit(2, complete(30, 5))

    const result = await done
    for (const call of OfflineManager.createPack.mock.calls) {
      expect(call[0]).toMatchObject({
        minZoom: 13,
        maxZoom: 17,
        bounds: [1, 46, 1.02, 46.02],
        mapStyle: expect.stringMatching(/^file:\/\/\/style\//),
      })
    }
    expect(result).toEqual({
      percentage: 100,
      layers: [
        { key: "map", outcome: "complete", completedResourceSize: 1000 },
        { key: "satellite", outcome: "complete", completedResourceSize: 2000 },
        { key: "etat-major", outcome: "complete", completedResourceSize: 30 },
      ],
      failedLayers: [],
      totalBytes: 3030,
    })
    expect(onProgress).toHaveBeenLastCalledWith({
      percentage: 100,
      completedTileCount: 105,
      currentLayer: "etat-major",
      complete: true,
    })
  })

  test("the weighted percentage follows the byte weights", async () => {
    const onProgress = jest.fn()
    const done = start(
      [
        { key: "map", weight: 1 },
        { key: "satellite", weight: 99 },
      ],
      onProgress,
    )
    await settle()
    emit(0, complete(10))
    await settle()
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ percentage: 1, currentLayer: "map", complete: false }),
    )
    emit(1, { percentage: 50, completedResourceCount: 3 })
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ percentage: 50.5, currentLayer: "satellite" }),
    )
    emit(1, complete(20))
    await expect(done).resolves.toMatchObject({ percentage: 100 })
  })

  test("Android pack styles come from the API, one per layer", async () => {
    const done = start(
      [
        { key: "map", weight: 1 },
        { key: "photos-1950", weight: 1 },
      ],
      jest.fn(),
      "android",
    )
    await settle()
    emit(0, complete(1))
    await settle()
    emit(1, complete(1))
    await done
    expect(OfflineManager.createPack.mock.calls.map((call) => call[0].mapStyle)).toEqual([
      "https://api.example.test/v1/map-styles/map.json",
      "https://api.example.test/v1/map-styles/photos-1950.json",
    ])
  })

  test("an extra that stops after it was active is deleted, the next layer starts", async () => {
    const done = start([
      { key: "map", weight: 1 },
      { key: "satellite", weight: 1 },
      { key: "etat-major", weight: 1 },
      { key: "carte-1950", weight: 1 },
    ])
    await settle()
    emit(0, complete(100))
    await settle()
    emit(1, complete(200))
    await settle()
    emit(2, { state: "active", percentage: 5, completedResourceCount: 1 })
    fail(2, "HTTP status code 400")
    emit(2, { state: "inactive", percentage: 5, completedResourceCount: 1 })
    await settle()
    expect(OfflineManager.deletePack).toHaveBeenCalledWith("pack-3")
    expect(offlineMocks.packs.map((pack) => pack.metadata.layer)).toEqual([
      "map",
      "satellite",
      "carte-1950",
    ])
    emit(2, complete(40))
    const result = await done
    expect(result.failedLayers).toEqual(["etat-major"])
    expect(result.layers[2]).toEqual({
      key: "etat-major",
      outcome: "failed",
      completedResourceSize: 0,
    })
    expect(result.totalBytes).toBe(340)
    expect(result.percentage).toBe(100)
  })

  test("a base pack that stops rejects with the last native error", async () => {
    const done = start([{ key: "map", weight: 1 }])
    await settle()
    emit(0, { state: "active", percentage: 10, completedResourceCount: 2 })
    fail(0, "network down")
    emit(0, { state: "inactive", percentage: 10, completedResourceCount: 2 })
    await expect(done).rejects.toThrow("network down")
    expect(OfflineManager.deletePack).not.toHaveBeenCalled()
  })

  test("a base pack that stops without any error still rejects", async () => {
    const done = start([{ key: "satellite", weight: 1 }])
    await settle()
    emit(0, { state: "active" })
    emit(0, { state: "inactive" })
    await expect(done).rejects.toThrow("stopped before it was complete")
  })

  test("a missing resource is not fatal and an early inactive state is only progress", async () => {
    const onProgress = jest.fn()
    const done = start([{ key: "map", weight: 1 }], onProgress)
    await settle()
    emit(0, { state: "inactive" })
    emit(0, { state: "active", percentage: 5, completedResourceCount: 2 })
    fail(0, "HTTP status code 404")
    emit(0, complete(500, 40))
    emit(0, { state: "inactive", percentage: 100, completedResourceCount: 60 })
    await expect(done).resolves.toMatchObject({ failedLayers: [], totalBytes: 500 })
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ percentage: 100, completedTileCount: 40, complete: false }),
    )
  })

  describe("stall watchdog", () => {
    test("exposes the 45 s and 90 % thresholds", () => {
      expect(STALL_TIMEOUT_MS).toBe(45_000)
      expect(STALL_ACCEPT_PERCENT).toBe(90)
    })

    test("a pack stuck at 95 % is accepted and paused, the next layer starts", async () => {
      const done = start([
        { key: "map", weight: 1 },
        { key: "satellite", weight: 1 },
        { key: "types-foret", weight: 1 },
      ])
      await settle()
      emit(0, complete(100))
      await settle()
      emit(1, complete(200))
      await settle()
      emit(2, { percentage: 95, completedResourceCount: 90, completedResourceSize: 77 })
      await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS - 1)
      expect(offlineMocks.packs[2].pause).not.toHaveBeenCalled()
      await jest.advanceTimersByTimeAsync(1)
      expect(offlineMocks.packs[2].pause).toHaveBeenCalledTimes(1)
      const result = await done
      expect(result.layers[2]).toEqual({
        key: "types-foret",
        outcome: "accepted",
        completedResourceSize: 77,
      })
      expect(result.failedLayers).toEqual([])
      expect(result.totalBytes).toBe(377)
      expect(OfflineManager.deletePack).not.toHaveBeenCalled()
    })

    test("a pause that rejects does not break the accepted pack", async () => {
      const done = start([{ key: "map", weight: 1 }])
      await settle()
      offlineMocks.packs[0].pause!.mockRejectedValueOnce(new Error("native"))
      emit(0, { percentage: 90, completedResourceCount: 9 })
      await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS)
      await expect(done).resolves.toMatchObject({
        layers: [{ key: "map", outcome: "accepted" }],
      })
    })

    test("a stalled extra below 90 % is deleted and listed, the area still completes", async () => {
      const done = start([
        { key: "map", weight: 1 },
        { key: "satellite", weight: 1 },
        { key: "photos-1950", weight: 1 },
      ])
      await settle()
      emit(0, complete(100))
      await settle()
      emit(1, complete(200))
      await settle()
      emit(2, { percentage: 40, completedResourceCount: 20 })
      await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS)
      const result = await done
      expect(OfflineManager.deletePack).toHaveBeenCalledWith("pack-3")
      expect(result.failedLayers).toEqual(["photos-1950"])
      expect(result.totalBytes).toBe(300)
      expect(result.percentage).toBe(100)
    })

    test("a stalled base below 90 % rejects", async () => {
      const done = start([{ key: "map", weight: 1 }])
      await settle()
      emit(0, { percentage: 40, completedResourceCount: 20 })
      await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS)
      await expect(done).rejects.toThrow("stalled")
    })

    test("a pack that never reports anything stalls too", async () => {
      const done = start([{ key: "satellite", weight: 1 }])
      await settle()
      await jest.advanceTimersByTimeAsync(STALL_TIMEOUT_MS)
      await expect(done).rejects.toThrow("stalled")
    })

    test("a progress event that raises the resource count restarts the timer", async () => {
      const done = start([{ key: "map", weight: 1 }])
      await settle()
      emit(0, { percentage: 95, completedResourceCount: 90 })
      await jest.advanceTimersByTimeAsync(40_000)
      emit(0, { percentage: 96, completedResourceCount: 91 })
      await jest.advanceTimersByTimeAsync(40_000)
      // Same count: no restart, the timer of the last growth runs on.
      emit(0, { percentage: 96, completedResourceCount: 91 })
      expect(offlineMocks.packs[0].pause).not.toHaveBeenCalled()
      await jest.advanceTimersByTimeAsync(5_000)
      expect(offlineMocks.packs[0].pause).toHaveBeenCalledTimes(1)
      await expect(done).resolves.toMatchObject({ layers: [{ outcome: "accepted" }] })
    })

    test("the timer is cleared once the pack completes, and late events are ignored", async () => {
      const done = start([{ key: "map", weight: 1 }])
      await settle()
      emit(0, complete(10))
      await done
      emit(0, { state: "inactive", percentage: 0, completedResourceCount: 999 })
      expect(jest.getTimerCount()).toBe(0)
    })
  })

  describe("failures outside the download itself", () => {
    const styles = () =>
      (
        jest.requireMock("./offline-styles") as {
          writeOfflineStyle: jest.Mock
        }
      ).writeOfflineStyle

    test("a base style that cannot be written rejects, even when it is not an Error", async () => {
      styles().mockRejectedValueOnce("disk full")
      await expect(start([{ key: "map", weight: 1 }])).rejects.toThrow("disk full")
      expect(OfflineManager.createPack).not.toHaveBeenCalled()
    })

    test("an Error thrown for a base is kept as is", async () => {
      const error = new Error("fetch failed")
      styles().mockRejectedValueOnce(error)
      await expect(start([{ key: "map", weight: 1 }])).rejects.toBe(error)
    })

    test("an extra whose style cannot be written fails alone, nothing to delete", async () => {
      const done = start([
        { key: "map", weight: 1 },
        { key: "etat-major", weight: 1 },
      ])
      await settle()
      styles().mockRejectedValueOnce(new Error("disk full"))
      emit(0, complete(5))
      const result = await done
      expect(result.failedLayers).toEqual(["etat-major"])
      expect(OfflineManager.deletePack).not.toHaveBeenCalled()
    })

    test("an extra whose pack cannot be created (older API, 404) fails alone", async () => {
      const done = start([
        { key: "map", weight: 1 },
        { key: "carte-1950", weight: 1 },
        { key: "types-foret", weight: 1 },
      ])
      await settle()
      OfflineManager.createPack.mockRejectedValueOnce(new Error("style 404"))
      emit(0, complete(5))
      await settle()
      emit(1, complete(7))
      const result = await done
      expect(result.failedLayers).toEqual(["carte-1950"])
      expect(result.layers.map((entry) => entry.outcome)).toEqual([
        "complete",
        "failed",
        "complete",
      ])
    })

    test("a failed delete of an extra pack does not fail the area", async () => {
      const done = start([
        { key: "map", weight: 1 },
        { key: "etat-major", weight: 1 },
      ])
      await settle()
      emit(0, complete(5))
      await settle()
      OfflineManager.deletePack.mockRejectedValueOnce(new Error("native"))
      emit(1, { state: "active", completedResourceCount: 1 })
      emit(1, { state: "inactive", completedResourceCount: 1 })
      await expect(done).resolves.toMatchObject({ failedLayers: ["etat-major"] })
    })
  })

  test("no layer: the area is done at once", async () => {
    const onProgress = jest.fn()
    await expect(start([], onProgress)).resolves.toEqual({
      percentage: 0,
      layers: [],
      failedLayers: [],
      totalBytes: 0,
    })
    expect(onProgress).toHaveBeenCalledWith({
      percentage: 0,
      completedTileCount: 0,
      currentLayer: null,
      complete: true,
    })
  })
})
