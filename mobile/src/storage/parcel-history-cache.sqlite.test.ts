import { createNodeSqliteDb } from "../../test/node-sqlite-db"

const mockDb = createNodeSqliteDb()

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}))

import type { ParcelSurveyHistoryItem } from "../app/types"
import { initLocalDb } from "./db"
import {
  PARCEL_HISTORY_KEY_PREFIX,
  PARCEL_HISTORY_MAX_ITEMS,
  loadParcelHistoryCache,
  parcelHistoryKey,
  saveParcelHistoryCache,
} from "./parcel-history-cache"
import { clearLocalIbpData } from "./surveys"

const FETCHED_AT = "2026-10-10T08:00:00.000Z"

function item(id: string): ParcelSurveyHistoryItem {
  return {
    survey_id: id,
    observation_year: 2026,
    version_number: 1,
    ibp_method_version: "3.2",
    scores: {} as ParcelSurveyHistoryItem["scores"],
    factor_results: {},
    submitted_at: FETCHED_AT,
  }
}

async function putRaw(key: string, value: string): Promise<void> {
  await mockDb.runAsync(`INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?)`, [
    key,
    value,
    FETCHED_AT,
  ])
}

async function countKeys(key: string): Promise<number> {
  const row = await mockDb.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM local_meta WHERE key = ?`,
    [key],
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

describe("parcel history cache", () => {
  test("constants and key", () => {
    expect(PARCEL_HISTORY_KEY_PREFIX).toBe("parcel_history:")
    expect(PARCEL_HISTORY_MAX_ITEMS).toBe(50)
    expect(parcelHistoryKey(" 77186000ab0123 ")).toBe("parcel_history:77186000AB0123")
  })

  test("reads as null on a fresh database", async () => {
    expect(await loadParcelHistoryCache("X")).toBeNull()
  })

  test("saves then loads the items with the fetch date, a second save replacing the first", async () => {
    const items = [item("s1"), item("s2")]
    await saveParcelHistoryCache("x", items, FETCHED_AT)
    expect(await loadParcelHistoryCache("X")).toEqual({ fetched_at: FETCHED_AT, items })

    await saveParcelHistoryCache("X", [item("s3")], "2026-10-11T08:00:00.000Z")
    expect(await loadParcelHistoryCache("X")).toEqual({
      fetched_at: "2026-10-11T08:00:00.000Z",
      items: [item("s3")],
    })
    expect(await countKeys(parcelHistoryKey("X"))).toBe(1)
  })

  test("defaults the fetch date to now", async () => {
    await saveParcelHistoryCache("X", [item("s1")])
    const cached = await loadParcelHistoryCache("X")
    expect(Number.isNaN(Date.parse(cached?.fetched_at ?? ""))).toBe(false)
  })

  test("keeps the last 50 items, the API order being oldest first", async () => {
    const items = Array.from({ length: 53 }, (_, i) => item(`s${i + 1}`))
    await saveParcelHistoryCache("X", items, FETCHED_AT)
    const cached = await loadParcelHistoryCache("X")
    expect(cached?.items).toHaveLength(PARCEL_HISTORY_MAX_ITEMS)
    expect(cached?.items[0].survey_id).toBe("s4")
    expect(cached?.items[49].survey_id).toBe("s53")
  })

  test("reads as null when the stored value is not JSON, not an object or has no items", async () => {
    const key = parcelHistoryKey("X")
    await putRaw(key, "{not json")
    expect(await loadParcelHistoryCache("X")).toBeNull()
    await mockDb.execAsync(`DELETE FROM local_meta;`)
    await putRaw(key, JSON.stringify([1, 2]))
    expect(await loadParcelHistoryCache("X")).toBeNull()
    await mockDb.execAsync(`DELETE FROM local_meta;`)
    await putRaw(key, JSON.stringify(null))
    expect(await loadParcelHistoryCache("X")).toBeNull()
    await mockDb.execAsync(`DELETE FROM local_meta;`)
    await putRaw(key, JSON.stringify({ fetched_at: FETCHED_AT, items: "nope" }))
    expect(await loadParcelHistoryCache("X")).toBeNull()
    await mockDb.execAsync(`DELETE FROM local_meta;`)
    await putRaw(key, JSON.stringify({ fetched_at: 3, items: [] }))
    expect(await loadParcelHistoryCache("X")).toBeNull()
  })

  test("drops item entries without a string survey_id", async () => {
    await putRaw(
      parcelHistoryKey("X"),
      JSON.stringify({
        fetched_at: FETCHED_AT,
        items: [item("s1"), { survey_id: 4 }, null, "str", {}],
      }),
    )
    const cached = await loadParcelHistoryCache("X")
    expect(cached?.items).toEqual([item("s1")])
  })

  test("clearLocalIbpData deletes the history rows only, matching the prefix exactly", async () => {
    await saveParcelHistoryCache("A", [item("s1")], FETCHED_AT)
    await saveParcelHistoryCache("B", [item("s2")], FETCHED_AT)
    await putRaw("parcelXhistory:1", "keep")
    await putRaw("map_preference", "keep")
    await clearLocalIbpData()
    expect(await loadParcelHistoryCache("A")).toBeNull()
    expect(await loadParcelHistoryCache("B")).toBeNull()
    expect(await countKeys("parcelXhistory:1")).toBe(1)
    expect(await countKeys("map_preference")).toBe(1)
  })

  test("a database failure is caught: load reads null, save resolves", async () => {
    jest.spyOn(mockDb, "getFirstAsync").mockRejectedValue(new Error("disk"))
    jest.spyOn(mockDb, "runAsync").mockRejectedValue(new Error("disk"))
    expect(await loadParcelHistoryCache("X")).toBeNull()
    await expect(saveParcelHistoryCache("X", [item("s1")])).resolves.toBeUndefined()
  })
})
