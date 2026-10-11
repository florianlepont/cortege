import { createNodeSqliteDb } from "../../test/node-sqlite-db"

const mockDb = createNodeSqliteDb()

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}))

import { initLocalDb } from "./db"
import {
  DEFAULT_OFFLINE_LAYERS_POLICY,
  OFFLINE_LAYERS_POLICY_KEY,
  isOfflineLayersPolicy,
  loadOfflineLayersPolicy,
  saveOfflineLayersPolicy,
} from "./offline-layers-policy"
import { clearLocalIbpData } from "./surveys"

beforeAll(async () => {
  await initLocalDb()
})

beforeEach(async () => {
  await mockDb.execAsync(`DELETE FROM local_meta;`)
})

async function storeRaw(value: string) {
  await mockDb.runAsync(`INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?)`, [
    OFFLINE_LAYERS_POLICY_KEY,
    value,
    new Date().toISOString(),
  ])
}

describe("offline layers policy", () => {
  test("uses the documented key and defaults to all layers", () => {
    expect(OFFLINE_LAYERS_POLICY_KEY).toBe("offline_layers_policy")
    expect(DEFAULT_OFFLINE_LAYERS_POLICY).toBe("all")
  })

  test("reads 'all' when nothing was ever saved", async () => {
    expect(await loadOfflineLayersPolicy()).toBe("all")
  })

  test("round-trips a saved policy", async () => {
    await saveOfflineLayersPolicy("base")
    expect(await loadOfflineLayersPolicy()).toBe("base")

    await saveOfflineLayersPolicy("all")
    expect(await loadOfflineLayersPolicy()).toBe("all")
  })

  test("a second save updates the same row", async () => {
    await saveOfflineLayersPolicy("base")
    const first = await mockDb.getFirstAsync<{ updated_at: string }>(
      `SELECT updated_at FROM local_meta WHERE key = ?`,
      [OFFLINE_LAYERS_POLICY_KEY],
    )
    await new Promise((resolve) => setTimeout(resolve, 5))
    await saveOfflineLayersPolicy("all")

    const rows = await mockDb.getAllAsync<{ value: string; updated_at: string }>(
      `SELECT value, updated_at FROM local_meta WHERE key = ?`,
      [OFFLINE_LAYERS_POLICY_KEY],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe("all")
    expect(rows[0].updated_at).not.toBe(first?.updated_at)
  })

  test("reads an unknown stored value as 'all'", async () => {
    await storeRaw("everything")
    expect(await loadOfflineLayersPolicy()).toBe("all")
  })

  test("survives clearLocalIbpData, like the basemap choice", async () => {
    await saveOfflineLayersPolicy("base")
    await clearLocalIbpData()
    expect(await loadOfflineLayersPolicy()).toBe("base")
  })

  test("isOfflineLayersPolicy accepts only 'base' and 'all'", () => {
    expect(isOfflineLayersPolicy("base")).toBe(true)
    expect(isOfflineLayersPolicy("all")).toBe(true)
    expect(isOfflineLayersPolicy("")).toBe(false)
    expect(isOfflineLayersPolicy(null)).toBe(false)
    expect(isOfflineLayersPolicy("Base")).toBe(false)
    expect(isOfflineLayersPolicy(undefined)).toBe(false)
  })
})
