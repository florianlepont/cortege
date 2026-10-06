import { __resetMockFileSystem } from "../../test/expo-file-system-legacy.mock"
import { OfflineManager, offlineMocks } from "../../test/maplibre.mock"
import { deleteAreaPacks, downloadAreaPacks, listPackAreaIds } from "./offline-packs"

const DOCS = "file:///mock/documents/"
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

const flush = () => new Promise((resolve) => setImmediate(resolve))

describe("downloadAreaPacks", () => {
  test("creates one pack per basemap and resolves when both are complete", async () => {
    const onProgress = jest.fn()
    const done = downloadAreaPacks({
      documentDirectory: DOCS,
      areaId: "area-1",
      bounds: BOUNDS,
      basemaps: ["map", "satellite"],
      onProgress,
    })
    await flush()
    expect(offlineMocks.packs.map((pack) => pack.metadata)).toEqual([
      { areaId: "area-1", basemap: "map" },
      { areaId: "area-1", basemap: "satellite" },
    ])
    const [first, second] = offlineMocks.packs
    offlineMocks.listeners.get(first.id)!.progress(first, {
      percentage: 100,
      completedTileCount: 40,
      state: "complete",
    })
    expect(onProgress).toHaveBeenLastCalledWith({
      percentage: 50,
      completedTileCount: 40,
      complete: false,
    })
    offlineMocks.listeners.get(second.id)!.progress(second, {
      percentage: 100,
      completedTileCount: 60,
      state: "complete",
    })
    await expect(done).resolves.toEqual({
      percentage: 100,
      completedTileCount: 100,
      complete: true,
    })
  })

  test("zoom bounds are 13 to 17 and bounds go west, south, east, north", async () => {
    void downloadAreaPacks({
      documentDirectory: DOCS,
      areaId: "a",
      bounds: BOUNDS,
      basemaps: ["map"],
      onProgress: jest.fn(),
    })
    await flush()
    const options = (OfflineManager.createPack.mock.calls[0] as unknown[])[0]
    expect(options).toMatchObject({ minZoom: 13, maxZoom: 17, bounds: [1, 46, 1.02, 46.02] })
  })

  test("a pack that stops before it is complete rejects with the last native error", async () => {
    const done = downloadAreaPacks({
      documentDirectory: DOCS,
      areaId: "a",
      bounds: BOUNDS,
      basemaps: ["map"],
      onProgress: jest.fn(),
    })
    await flush()
    const [pack] = offlineMocks.packs
    const listeners = offlineMocks.listeners.get(pack.id)!
    listeners.progress(pack, { percentage: 10, completedTileCount: 4, state: "active" })
    listeners.error(pack, { id: pack.id, message: "network down" })
    listeners.progress(pack, { percentage: 10, completedTileCount: 4, state: "inactive" })
    await expect(done).rejects.toThrow("network down")
  })

  test("a stopped pack without any reported error still rejects", async () => {
    const done = downloadAreaPacks({
      documentDirectory: DOCS,
      areaId: "a",
      bounds: BOUNDS,
      basemaps: ["map"],
      onProgress: jest.fn(),
    })
    await flush()
    const [pack] = offlineMocks.packs
    const listeners = offlineMocks.listeners.get(pack.id)!
    listeners.progress(pack, { percentage: 0, completedTileCount: 0, state: "active" })
    listeners.progress(pack, { percentage: 0, completedTileCount: 0, state: "inactive" })
    await expect(done).rejects.toThrow("stopped before it was complete")
  })

  test("a missing resource is not fatal: the download goes on and completes (IGN @2x sprite 404)", async () => {
    const done = downloadAreaPacks({
      documentDirectory: DOCS,
      areaId: "a",
      bounds: BOUNDS,
      basemaps: ["map"],
      onProgress: jest.fn(),
    })
    await flush()
    const [pack] = offlineMocks.packs
    const listeners = offlineMocks.listeners.get(pack.id)!
    listeners.progress(pack, { percentage: 0, completedTileCount: 0, state: "inactive" })
    listeners.progress(pack, { percentage: 5, completedTileCount: 2, state: "active" })
    listeners.error(pack, { id: pack.id, message: "HTTP status code 404" })
    listeners.progress(pack, { percentage: 100, completedTileCount: 40, state: "complete" })
    await expect(done).resolves.toMatchObject({ complete: true, completedTileCount: 40 })
  })
})

describe("failures", () => {
  test("a style that cannot be written rejects, even when it is not an Error", async () => {
    const { writeOfflineStyle } = jest.requireMock("./offline-styles") as {
      writeOfflineStyle: jest.Mock
    }
    writeOfflineStyle.mockRejectedValueOnce("disk full")
    await expect(
      downloadAreaPacks({
        documentDirectory: DOCS,
        areaId: "a",
        bounds: BOUNDS,
        basemaps: ["map"],
        onProgress: jest.fn(),
      }),
    ).rejects.toThrow("disk full")
  })

  test("a second pack stopping after the first one failed is ignored", async () => {
    const done = downloadAreaPacks({
      documentDirectory: DOCS,
      areaId: "a",
      bounds: BOUNDS,
      basemaps: ["map", "satellite"],
      onProgress: jest.fn(),
    })
    await flush()
    const [first, second] = offlineMocks.packs
    for (const pack of [first, second]) {
      const listeners = offlineMocks.listeners.get(pack.id)!
      listeners.progress(pack, { percentage: 3, completedTileCount: 1, state: "active" })
      listeners.progress(pack, { percentage: 3, completedTileCount: 1, state: "inactive" })
    }
    await expect(done).rejects.toThrow("stopped before it was complete")
  })
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
