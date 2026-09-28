import { createNodeSqliteDb } from "../../test/node-sqlite-db"

const mockDb = createNodeSqliteDb()

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}))

import { initLocalDb } from "./db"
import {
  DEFAULT_THEME_MODE,
  loadThemeModePreference,
  saveThemeModePreference,
} from "./theme-preference"

beforeAll(async () => {
  await initLocalDb()
})

beforeEach(async () => {
  await mockDb.execAsync(`DELETE FROM local_meta;`)
})

describe("theme mode preference", () => {
  test("defaults to 'automatic' when nothing was ever saved", async () => {
    expect(await loadThemeModePreference()).toBe(DEFAULT_THEME_MODE)
  })

  test("round-trips a saved preference", async () => {
    await saveThemeModePreference("dark")
    expect(await loadThemeModePreference()).toBe("dark")

    await saveThemeModePreference("light")
    expect(await loadThemeModePreference()).toBe("light")

    await saveThemeModePreference("automatic")
    expect(await loadThemeModePreference()).toBe("automatic")
  })

  test("falls back to the default for a corrupted stored value", async () => {
    const now = new Date().toISOString()
    await mockDb.runAsync(`INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?)`, [
      "theme_mode",
      "not-a-mode",
      now,
    ])
    expect(await loadThemeModePreference()).toBe(DEFAULT_THEME_MODE)
  })
})
