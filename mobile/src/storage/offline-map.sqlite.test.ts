import { createNodeSqliteDb } from "../../test/node-sqlite-db"

const mockDb = createNodeSqliteDb()

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}))

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///mock/documents/",
  deleteAsync: jest.fn(async () => undefined),
}))

import * as FileSystem from "expo-file-system/legacy"
import { initLocalDb } from "./db"
import {
  addPendingParcelDownload,
  basemapsForDownload,
  deleteOfflineArea,
  finalizeOfflineArea,
  findReadyOfflineAreaForPoint,
  getCachedParcelById,
  getCachedParcelsForBounds,
  getOfflineArea,
  getOfflineDocumentDirectory,
  insertOfflineArea,
  listOfflineAreas,
  listPendingParcelDownloads,
  removePendingParcelDownload,
  saveOfflineAreaParcels,
  tryGetOfflineDocumentDirectory,
  updateOfflineAreaProgress,
} from "./offline-map"

test("basemapsForDownload always downloads both basemaps (08-CONTEXT D-03)", () => {
  expect(basemapsForDownload()).toEqual(["map", "satellite"])
})

const BOUNDS = { minLat: 46.0, minLng: 1.0, maxLat: 46.1, maxLng: 1.1 }

beforeAll(async () => {
  await initLocalDb()
})

beforeEach(async () => {
  await mockDb.execAsync(`
    DELETE FROM offline_areas;
    DELETE FROM offline_area_parcels;
    DELETE FROM offline_pending_parcels;
  `)
  jest.clearAllMocks()
})

describe("offline areas", () => {
  test("insert then list returns the area with parsed bounds and downloading status", async () => {
    await insertOfflineArea({
      id: "area-1",
      name: "Bois du Nord",
      bounds: BOUNDS,
      minZoom: 13,
      maxZoom: 17,
      totalTiles: 200,
      estimatedBytes: 4_000_000,
    })

    const areas = await listOfflineAreas()
    expect(areas).toHaveLength(1)
    expect(areas[0]).toMatchObject({
      id: "area-1",
      name: "Bois du Nord",
      bounds: BOUNDS,
      status: "downloading",
      totalTiles: 200,
      downloadedTiles: 0,
      failedTiles: 0,
    })
  })

  test("getOfflineArea returns null for an unknown id", async () => {
    expect(await getOfflineArea("missing")).toBeNull()
  })

  test("updateOfflineAreaProgress updates the counts without changing status", async () => {
    await insertOfflineArea({
      id: "area-1",
      name: "Zone",
      bounds: BOUNDS,
      minZoom: 13,
      maxZoom: 17,
      totalTiles: 10,
      estimatedBytes: 1000,
    })

    await updateOfflineAreaProgress("area-1", { downloadedTiles: 4, failedTiles: 1 })

    const area = await getOfflineArea("area-1")
    expect(area).toMatchObject({ status: "downloading", downloadedTiles: 4, failedTiles: 1 })
  })

  test("finalizeOfflineArea sets the final status and counts", async () => {
    await insertOfflineArea({
      id: "area-1",
      name: "Zone",
      bounds: BOUNDS,
      minZoom: 13,
      maxZoom: 17,
      totalTiles: 10,
      estimatedBytes: 1000,
    })

    await finalizeOfflineArea("area-1", "ready", { downloadedTiles: 9, failedTiles: 1 })

    const area = await getOfflineArea("area-1")
    expect(area).toMatchObject({ status: "ready", downloadedTiles: 9, failedTiles: 1 })
  })

  test("findReadyOfflineAreaForPoint only matches a ready area covering the point", async () => {
    await insertOfflineArea({
      id: "area-1",
      name: "Zone",
      bounds: BOUNDS,
      minZoom: 13,
      maxZoom: 17,
      totalTiles: 10,
      estimatedBytes: 1000,
    })

    expect(await findReadyOfflineAreaForPoint(46.05, 1.05)).toBeNull()

    await finalizeOfflineArea("area-1", "ready", { downloadedTiles: 10, failedTiles: 0 })

    expect(await findReadyOfflineAreaForPoint(46.05, 1.05)).toMatchObject({ id: "area-1" })
    expect(await findReadyOfflineAreaForPoint(50, 50)).toBeNull()
  })

  test("deleteOfflineArea removes the directory and every row", async () => {
    await insertOfflineArea({
      id: "area-1",
      name: "Zone",
      bounds: BOUNDS,
      minZoom: 13,
      maxZoom: 17,
      totalTiles: 10,
      estimatedBytes: 1000,
    })
    await saveOfflineAreaParcels("area-1", [{ parcel_id: "P1" }])

    await deleteOfflineArea("area-1")

    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///mock/documents/offline-tiles/area-1/",
      { idempotent: true },
    )
    expect(await getOfflineArea("area-1")).toBeNull()
    expect(await getCachedParcelById("P1")).toBeNull()
  })

  test("getOfflineDocumentDirectory throws when documentDirectory is null", () => {
    // The namespace import in offline-map.ts (`import * as FileSystem from "..."`) forwards to
    // this same module object through a getter, so mutating it here is visible there too.
    const rawMock = jest.requireMock<{ documentDirectory: string | null }>(
      "expo-file-system/legacy",
    )
    const original = rawMock.documentDirectory
    rawMock.documentDirectory = null

    expect(() => getOfflineDocumentDirectory()).toThrow(
      "offline-map: FileSystem.documentDirectory is null",
    )

    rawMock.documentDirectory = original
  })

  test("tryGetOfflineDocumentDirectory returns the directory when it is set", () => {
    expect(tryGetOfflineDocumentDirectory()).toBe("file:///mock/documents/")
  })

  test("tryGetOfflineDocumentDirectory returns null instead of throwing when unset", () => {
    const rawMock = jest.requireMock<{ documentDirectory: string | null }>(
      "expo-file-system/legacy",
    )
    const original = rawMock.documentDirectory
    rawMock.documentDirectory = null

    expect(tryGetOfflineDocumentDirectory()).toBeNull()

    rawMock.documentDirectory = original
  })
})

describe("offline area parcels", () => {
  test("saveOfflineAreaParcels then getCachedParcelsForBounds returns them, deduplicated by upsert", async () => {
    await insertOfflineArea({
      id: "area-1",
      name: "Zone",
      bounds: BOUNDS,
      minZoom: 13,
      maxZoom: 17,
      totalTiles: 10,
      estimatedBytes: 1000,
    })
    await saveOfflineAreaParcels("area-1", [
      { parcel_id: "P1", study_status: "studied" },
      { parcel_id: "P2", study_status: "not_studied" },
    ])
    // Re-saving the same parcel updates the payload instead of duplicating the row.
    await saveOfflineAreaParcels("area-1", [{ parcel_id: "P1", study_status: "not_studied" }])

    const parcels = await getCachedParcelsForBounds<{ parcel_id: string; study_status: string }>(
      BOUNDS,
    )
    expect(parcels).toHaveLength(2)
    const p1 = parcels.find((parcel) => parcel.parcel_id === "P1")
    expect(p1?.study_status).toBe("not_studied")
  })

  test("getCachedParcelsForBounds returns nothing for a bbox no downloaded area covers", async () => {
    await insertOfflineArea({
      id: "area-1",
      name: "Zone",
      bounds: BOUNDS,
      minZoom: 13,
      maxZoom: 17,
      totalTiles: 10,
      estimatedBytes: 1000,
    })
    await saveOfflineAreaParcels("area-1", [{ parcel_id: "P1" }])

    const parcels = await getCachedParcelsForBounds({
      minLat: 10,
      minLng: 10,
      maxLat: 11,
      maxLng: 11,
    })
    expect(parcels).toEqual([])
  })

  test("getCachedParcelById returns null for an unknown parcel", async () => {
    expect(await getCachedParcelById("nope")).toBeNull()
  })

  test("getCachedParcelById returns the cached payload for a known parcel", async () => {
    await insertOfflineArea({
      id: "area-1",
      name: "Zone",
      bounds: BOUNDS,
      minZoom: 13,
      maxZoom: 17,
      totalTiles: 10,
      estimatedBytes: 1000,
    })
    await saveOfflineAreaParcels("area-1", [{ parcel_id: "P1", study_status: "studied" }])

    expect(await getCachedParcelById<{ parcel_id: string; study_status: string }>("P1")).toEqual({
      parcel_id: "P1",
      study_status: "studied",
    })
  })
})

describe("pending parcel downloads", () => {
  test("add, list and remove a pending parcel", async () => {
    await addPendingParcelDownload("P1")
    expect(await listPendingParcelDownloads()).toEqual(["P1"])

    // Adding the same parcel twice does not duplicate it.
    await addPendingParcelDownload("P1")
    expect(await listPendingParcelDownloads()).toEqual(["P1"])

    await removePendingParcelDownload("P1")
    expect(await listPendingParcelDownloads()).toEqual([])
  })
})
