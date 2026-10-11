import { initLocalDb, getDb } from "./db"
import { clearLocalIbpData } from "./surveys"
import {
  WEATHER_POINT_KEY_PREFIX,
  listWeatherCandidates,
  loadWeatherPoint,
  saveWeatherPoint,
} from "./weather"

const NOW = "2026-10-11T08:00:00.000Z"

async function putMeta(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(`INSERT INTO local_meta (key, value, updated_at) VALUES (?, ?, ?)`, [
    key,
    value,
    NOW,
  ])
}

async function countKeys(key: string): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM local_meta WHERE key = ?`,
    [key],
  )
  return Number(row?.n ?? 0)
}

async function insertSurvey(id: string, status: string, payload: unknown | string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, sync_blocked, payload_json, payload_completion, created_at, updated_at)
     VALUES (?, ?, ?, 'private', 1, 'pending', 0, ?, 0, ?, ?)`,
    [id, id, status, typeof payload === "string" ? payload : JSON.stringify(payload), NOW, NOW],
  )
}

const survey = (id: string, extra: Record<string, unknown>) => ({
  id,
  sync_version: 1,
  site_name: id,
  parcel_ids: ["P1"],
  factors: {},
  ...extra,
})

beforeAll(async () => {
  await initLocalDb()
})

beforeEach(async () => {
  const db = await getDb()
  await db.execAsync(`
    DELETE FROM local_surveys;
    DELETE FROM sync_queue;
    DELETE FROM local_attachments;
    DELETE FROM local_meta;
  `)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe("weather point store", () => {
  test("the key prefix is weather_point:", () => {
    expect(WEATHER_POINT_KEY_PREFIX).toBe("weather_point:")
  })

  test("saves rounded to 4 decimals then loads, a second save replacing the first", async () => {
    await saveWeatherPoint("S1", { lat: 48.400049, lng: 2.70001 })
    expect(await loadWeatherPoint("S1")).toEqual({ lat: 48.4, lng: 2.7 })

    await saveWeatherPoint("S1", { lat: 45.12346, lng: -1.98764 })
    expect(await loadWeatherPoint("S1")).toEqual({ lat: 45.1235, lng: -1.9876 })
    expect(await countKeys("weather_point:S1")).toBe(1)
  })

  test("an unknown survey reads null", async () => {
    expect(await loadWeatherPoint("S2")).toBeNull()
  })

  test("a corrupt stored value reads null", async () => {
    await putMeta("weather_point:bad-json", "{nope")
    await putMeta("weather_point:array", "[1,2]")
    await putMeta("weather_point:null", "null")
    await putMeta("weather_point:text", JSON.stringify({ lat: "48", lng: 2 }))
    await putMeta("weather_point:nan", JSON.stringify({ lat: null, lng: 2 }))
    await putMeta("weather_point:inf", '{"lat":1e999,"lng":2}')
    await putMeta("weather_point:empty", "")

    for (const id of ["bad-json", "array", "null", "text", "nan", "inf", "empty"]) {
      expect(await loadWeatherPoint(id)).toBeNull()
    }
  })

  test("a database failure is caught: load reads null, save resolves", async () => {
    const db = await getDb()
    jest.spyOn(db, "getFirstAsync").mockRejectedValue(new Error("disk"))
    jest.spyOn(db, "runAsync").mockRejectedValue(new Error("disk"))
    expect(await loadWeatherPoint("S1")).toBeNull()
    await expect(saveWeatherPoint("S1", { lat: 1, lng: 2 })).resolves.toBeUndefined()
  })

  test("clearLocalIbpData deletes every weather point and keeps unrelated keys", async () => {
    await saveWeatherPoint("S1", { lat: 48.4, lng: 2.7 })
    await saveWeatherPoint("S2", { lat: 45, lng: 1 })
    await putMeta("weatherXpoint:1", "keep")
    await putMeta("map_preference", "keep")

    await clearLocalIbpData()

    expect(await loadWeatherPoint("S1")).toBeNull()
    expect(await loadWeatherPoint("S2")).toBeNull()
    expect(await countKeys("weatherXpoint:1")).toBe(1)
    expect(await countKeys("map_preference")).toBe(1)
  })
})

describe("listWeatherCandidates (D-11)", () => {
  test("returns the drafts that carry a survey time, with parcels and weather", async () => {
    const weather = { requested_at: NOW, source: null }
    await insertSurvey("waiting", "draft", survey("waiting", { parcel_ids: ["p1", "P2"], weather }))

    expect(await listWeatherCandidates()).toEqual([
      { id: "waiting", parcel_ids: ["P1", "P2"], weather },
    ])
  })

  test("skips submitted rows, drafts without a survey time and invalid JSON", async () => {
    await insertSurvey(
      "submitted",
      "submitted",
      survey("submitted", { weather: { requested_at: NOW } }),
    )
    await insertSurvey("no-weather", "draft", survey("no-weather", {}))
    await insertSurvey("no-time", "draft", survey("no-time", { weather: { sky: "clear" } }))
    await insertSurvey(
      "null-time",
      "draft",
      survey("null-time", { weather: { requested_at: null } }),
    )
    await insertSurvey(
      "number-time",
      "draft",
      survey("number-time", { weather: { requested_at: 4 } }),
    )
    await insertSurvey("broken", "draft", "{not json")
    await insertSurvey("not-a-survey", "draft", { weather: { requested_at: NOW } })
    await insertSurvey("ok", "draft", survey("ok", { weather: { requested_at: NOW } }))

    expect((await listWeatherCandidates()).map((candidate) => candidate.id)).toEqual(["ok"])
  })
})
