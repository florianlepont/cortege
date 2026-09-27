import { createNodeSqliteDb } from "../../test/node-sqlite-db"

const mockDb = createNodeSqliteDb()

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}))

import { initLocalDb } from "./db"
import { DEFAULT_BASEMAP, loadBasemapPreference, saveBasemapPreference } from "./map-preference"

beforeAll(async () => {
  await initLocalDb()
})

beforeEach(async () => {
  await mockDb.execAsync(`DELETE FROM local_meta;`)
})

describe("basemap preference", () => {
  test("defaults to 'map' when nothing was ever saved", async () => {
    expect(await loadBasemapPreference()).toBe(DEFAULT_BASEMAP)
  })

  test("round-trips a saved preference", async () => {
    await saveBasemapPreference("satellite")
    expect(await loadBasemapPreference()).toBe("satellite")

    await saveBasemapPreference("map")
    expect(await loadBasemapPreference()).toBe("map")
  })

  test("falls back to the default for a corrupted stored value", async () => {
    const now = new Date().toISOString()
    await mockDb.runAsync(`INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?)`, [
      "map_basemap",
      "not-a-basemap",
      now,
    ])
    expect(await loadBasemapPreference()).toBe(DEFAULT_BASEMAP)
  })
})
