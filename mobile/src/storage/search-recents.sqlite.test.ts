import { createNodeSqliteDb } from "../../test/node-sqlite-db"

const mockDb = createNodeSqliteDb()

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}))

import { initLocalDb } from "./db"
import {
  SEARCH_RECENTS_KEY,
  SEARCH_RECENTS_MAX,
  clearSearchRecents,
  loadSearchRecents,
  removeSearchRecent,
  saveSearchRecent,
} from "./search-recents"
import { clearLocalIbpData } from "./surveys"

async function putRaw(value: string): Promise<void> {
  await mockDb.runAsync(`INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?)`, [
    SEARCH_RECENTS_KEY,
    value,
    new Date().toISOString(),
  ])
}

async function rowCount(): Promise<number> {
  const row = await mockDb.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM local_meta WHERE key = ?`,
    [SEARCH_RECENTS_KEY],
  )
  return Number(row?.n ?? 0)
}

beforeAll(async () => {
  await initLocalDb()
})

beforeEach(async () => {
  await mockDb.execAsync(`DELETE FROM local_meta;`)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe("recent searches", () => {
  test("constants", () => {
    expect(SEARCH_RECENTS_KEY).toBe("search_recents")
    expect(SEARCH_RECENTS_MAX).toBe(8)
  })

  test("reads as an empty list on a fresh database", async () => {
    expect(await loadSearchRecents()).toEqual([])
  })

  test("reads as an empty list when the stored value is not valid JSON", async () => {
    await putRaw("{not json")
    expect(await loadSearchRecents()).toEqual([])
  })

  test("reads as an empty list when the stored value is not an array", async () => {
    await putRaw(JSON.stringify({ a: 1 }))
    expect(await loadSearchRecents()).toEqual([])
  })

  test("drops non-string entries of a stored array", async () => {
    await putRaw(JSON.stringify(["marie", 3, null, "forêt"]))
    expect(await loadSearchRecents()).toEqual(["marie", "forêt"])
  })

  test("saves a trimmed query with inner whitespace collapsed", async () => {
    expect(await saveSearchRecent("  Forêt  de Rambouillet ")).toEqual(["Forêt de Rambouillet"])
    expect(await loadSearchRecents()).toEqual(["Forêt de Rambouillet"])
  })

  test("de-duplicates ignoring case, the newest casing and position winning", async () => {
    await saveSearchRecent("marie")
    await saveSearchRecent("Fontainebleau")
    expect(await saveSearchRecent("MARIE")).toEqual(["MARIE", "Fontainebleau"])
    expect(await loadSearchRecents()).toEqual(["MARIE", "Fontainebleau"])
  })

  test("ignores a one character or blank query", async () => {
    await saveSearchRecent("marie")
    expect(await saveSearchRecent("a")).toEqual(["marie"])
    expect(await saveSearchRecent("   ")).toEqual(["marie"])
    expect(await saveSearchRecent(" b ")).toEqual(["marie"])
    expect(await loadSearchRecents()).toEqual(["marie"])
  })

  test("keeps at most 8 entries, dropping the oldest", async () => {
    for (let i = 1; i <= 9; i += 1) await saveSearchRecent(`query ${i}`)
    const recents = await loadSearchRecents()
    expect(recents).toHaveLength(SEARCH_RECENTS_MAX)
    expect(recents[0]).toBe("query 9")
    expect(recents[7]).toBe("query 2")
    expect(recents).not.toContain("query 1")
  })

  test("removes one entry ignoring case", async () => {
    await saveSearchRecent("marie")
    await saveSearchRecent("Fontainebleau")
    expect(await removeSearchRecent("fontainebleau")).toEqual(["marie"])
    expect(await loadSearchRecents()).toEqual(["marie"])
  })

  test("clearSearchRecents empties the list", async () => {
    await saveSearchRecent("marie")
    await clearSearchRecents()
    expect(await loadSearchRecents()).toEqual([])
  })

  test("clearLocalIbpData deletes the recents with the other local data", async () => {
    await saveSearchRecent("marie")
    expect(await rowCount()).toBe(1)
    await clearLocalIbpData()
    expect(await rowCount()).toBe(0)
    expect(await loadSearchRecents()).toEqual([])
  })

  test("a storage failure is caught: load reads empty, writers resolve", async () => {
    jest.spyOn(mockDb, "getFirstAsync").mockRejectedValue(new Error("disk"))
    jest.spyOn(mockDb, "runAsync").mockRejectedValue(new Error("disk"))
    expect(await loadSearchRecents()).toEqual([])
    expect(await saveSearchRecent("marie")).toEqual([])
    expect(await removeSearchRecent("marie")).toEqual([])
    await expect(clearSearchRecents()).resolves.toBeUndefined()
  })
})
