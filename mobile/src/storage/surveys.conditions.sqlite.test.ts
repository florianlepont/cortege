/**
 * Phase 27 on the phone, real SQL: the survey note and the weather live in the draft payload
 * (D-02), the survey time is stamped once by the first write that gives a draft its parcels
 * (D-10, D-11), the Conditions write refuses a submitted survey (D-03, Pitfall 11), the form
 * autosave keeps both fields (Pitfall 5), the completion counters ignore them (Pitfall 10) and the
 * own-note reader feeds the search (D-07).
 */

import type { SurveyWeather } from "@cortege/ibp-domain"
import { initLocalDb, getDb, SCHEMA_VERSION } from "./db"
import {
  createLocalDraft,
  getLocalSurveyDraft,
  patchLocalSurveyConditions,
  updateLocalDraft,
} from "./surveys"
import { computePayloadCompletion, computePayloadFactorsFilled, stampWeatherRequest } from "./utils"
import type { SurveyQueuePayload } from "./types"

const SIX_FACTORS = {
  A: { native_genus_count: 5 },
  B: { strata_count: 3, covered_autochthonous_percent: 60 },
  C: { bmg_count: 2, bmm_count: 2, surface_ha: 1 },
}

const BASE_INPUT = {
  site_name: "Lisière de la Marne",
  region_version: "ACA" as const,
  vegetation_stage: "collineen",
  factors: SIX_FACTORS,
}

async function storedPayload(id: string): Promise<SurveyQueuePayload> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_json: string }>(
    `SELECT payload_json FROM local_surveys WHERE id = ?`,
    [id],
  )
  return JSON.parse(String(row?.payload_json)) as SurveyQueuePayload
}

async function storedCounters(id: string): Promise<{ completion: number; filled: number }> {
  const db = await getDb()
  const row = await db.getFirstAsync<{
    payload_completion: number
    payload_factors_filled: number
  }>(`SELECT payload_completion, payload_factors_filled FROM local_surveys WHERE id = ?`, [id])
  return {
    completion: Number(row?.payload_completion),
    filled: Number(row?.payload_factors_filled),
  }
}

async function queuedUpserts(id: string): Promise<SurveyQueuePayload[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload FROM sync_queue WHERE survey_id = ? AND op_type = 'survey_upsert'`,
    [id],
  )
  return rows.map((row) => JSON.parse(row.payload) as SurveyQueuePayload)
}

async function setStatus(id: string, status: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(`UPDATE local_surveys SET status = ? WHERE id = ?`, [status, id])
}

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

describe("stampWeatherRequest", () => {
  const NOW = "2026-10-11T08:00:00.000Z"

  test("stamps once when the parcels go from none to some", () => {
    expect(stampWeatherRequest([], ["P1"], undefined, NOW)).toEqual({ requested_at: NOW })
    expect(stampWeatherRequest([], ["P1"], null, NOW)).toEqual({ requested_at: NOW })
    expect(stampWeatherRequest([], ["P1"], { temperature_c: 9 }, NOW)).toEqual({
      temperature_c: 9,
      requested_at: NOW,
    })
  })

  test("never moves an existing requested_at", () => {
    const current: SurveyWeather = { requested_at: "2026-10-10T00:00:00.000Z" }
    expect(stampWeatherRequest([], ["P1"], current, NOW)).toBe(current)
  })

  test("returns the current value untouched for any other write", () => {
    expect(stampWeatherRequest([], [], undefined, NOW)).toBeUndefined()
    expect(stampWeatherRequest(["P1"], ["P2"], undefined, NOW)).toBeUndefined()
    expect(stampWeatherRequest(["P1"], [], null, NOW)).toBeNull()
    const current: SurveyWeather = { sky: "clear" }
    expect(stampWeatherRequest(["P1"], ["P1", "P2"], current, NOW)).toBe(current)
  })
})

describe("the survey time of the weather (D-10, D-11)", () => {
  test("createLocalDraft with parcels stamps requested_at with the write time", async () => {
    const before = Date.now()
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    const after = Date.now()

    const payload = await storedPayload(survey.id)
    const requestedAt = Date.parse(String(payload.weather?.requested_at))
    expect(requestedAt).toBeGreaterThanOrEqual(before)
    expect(requestedAt).toBeLessThanOrEqual(after)
    expect(new Date(requestedAt).toISOString()).toBe(payload.weather?.requested_at)
    expect((await queuedUpserts(survey.id))[0].weather).toEqual(payload.weather)
  })

  test("createLocalDraft without a parcel stores no weather key", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: [] })
    expect(await storedPayload(survey.id)).not.toHaveProperty("weather")
  })

  test("updateLocalDraft stamps on the first parcels and keeps the stamp afterwards", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: [] })
    expect(await storedPayload(survey.id)).not.toHaveProperty("weather")

    await updateLocalDraft({ survey_id: survey.id, ...BASE_INPUT, parcel_ids: ["P1"] })
    const first = (await storedPayload(survey.id)).weather?.requested_at
    expect(typeof first).toBe("string")

    await new Promise((resolve) => setTimeout(resolve, 5))
    await updateLocalDraft({ survey_id: survey.id, ...BASE_INPUT, parcel_ids: ["P2"] })
    expect((await storedPayload(survey.id)).weather?.requested_at).toBe(first)

    await updateLocalDraft({ survey_id: survey.id, ...BASE_INPUT, parcel_ids: [] })
    await updateLocalDraft({ survey_id: survey.id, ...BASE_INPUT, parcel_ids: ["P3"] })
    expect((await storedPayload(survey.id)).weather?.requested_at).toBe(first)
  })

  test("a draft without parcels keeps no weather across autosaves", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: [] })
    await updateLocalDraft({ survey_id: survey.id, ...BASE_INPUT, parcel_ids: [] })
    expect(await storedPayload(survey.id)).not.toHaveProperty("weather")
  })

  test("the form autosave keeps the stored note and weather untouched (Pitfall 5)", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    const weather: SurveyWeather = {
      requested_at: "2026-10-11T07:00:00.000Z",
      temperature_c: 12,
      source: "meteo_france",
      edited: [],
    }
    await patchLocalSurveyConditions({ survey_id: survey.id, survey_note: "x", weather })

    await updateLocalDraft({ survey_id: survey.id, ...BASE_INPUT, parcel_ids: ["P2"] })

    const payload = await storedPayload(survey.id)
    expect(payload.survey_note).toBe("x")
    expect(payload.weather).toEqual(weather)
    expect((await queuedUpserts(survey.id))[0]).toMatchObject({ survey_note: "x", weather })
  })
})

describe("patchLocalSurveyConditions (D-03)", () => {
  test("stores a note, bumps sync_version, leaves the weather and keeps one queued upsert", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    const weatherBefore = (await storedPayload(survey.id)).weather

    const patched = await patchLocalSurveyConditions({ survey_id: survey.id, survey_note: "note" })

    expect(patched).toMatchObject({
      id: survey.id,
      status: "draft",
      sync_version: survey.sync_version + 1,
      sync_state: "pending",
      site_name: BASE_INPUT.site_name,
    })
    const payload = await storedPayload(survey.id)
    expect(payload.survey_note).toBe("note")
    expect(payload.weather).toEqual(weatherBefore)
    expect(payload.sync_version).toBe(survey.sync_version + 1)
    const queued = await queuedUpserts(survey.id)
    expect(queued).toHaveLength(1)
    expect(queued[0].survey_note).toBe("note")
    expect(queued[0].sync_version).toBe(survey.sync_version + 1)
  })

  test("a weather function receives the stored weather, or null, and its result is stored", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: [] })
    const seen: Array<SurveyWeather | null> = []

    await patchLocalSurveyConditions({
      survey_id: survey.id,
      weather: (current) => {
        seen.push(current)
        return { ...current, temperature_c: 12 }
      },
    })
    await patchLocalSurveyConditions({
      survey_id: survey.id,
      weather: (current) => {
        seen.push(current)
        return { ...current, wind_kmh: 20 }
      },
    })

    expect(seen).toEqual([null, { temperature_c: 12 }])
    expect((await storedPayload(survey.id)).weather).toEqual({ temperature_c: 12, wind_kmh: 20 })
  })

  test("null clears the note and the weather, undefined keeps them", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: [] })
    await patchLocalSurveyConditions({
      survey_id: survey.id,
      survey_note: "keep me",
      weather: { sky: "fog" },
    })

    await patchLocalSurveyConditions({ survey_id: survey.id })
    let payload = await storedPayload(survey.id)
    expect(payload.survey_note).toBe("keep me")
    expect(payload.weather).toEqual({ sky: "fog" })

    await patchLocalSurveyConditions({ survey_id: survey.id, survey_note: null, weather: null })
    payload = await storedPayload(survey.id)
    expect(payload.survey_note).toBeNull()
    expect(payload.weather).toBeNull()
  })

  test("a submitted survey is refused: null, no queue row, same sync_version", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    const db = await getDb()
    await db.execAsync(`DELETE FROM sync_queue;`)
    await setStatus(survey.id, "submitted")
    const before = await storedPayload(survey.id)

    const result = await patchLocalSurveyConditions({
      survey_id: survey.id,
      survey_note: "too late",
      weather: { temperature_c: 3 },
    })

    expect(result).toBeNull()
    expect(await queuedUpserts(survey.id)).toHaveLength(0)
    expect(await storedPayload(survey.id)).toEqual(before)
    const row = await db.getFirstAsync<{ sync_version: number; status: string }>(
      `SELECT sync_version, status FROM local_surveys WHERE id = ?`,
      [survey.id],
    )
    expect(row).toEqual({ sync_version: survey.sync_version, status: "submitted" })
  })

  test("an unknown survey returns null", async () => {
    expect(await patchLocalSurveyConditions({ survey_id: "nope", survey_note: "x" })).toBeNull()
  })

  test("a row without a usable payload is rebuilt from the row columns", async () => {
    const db = await getDb()
    await db.runAsync(
      `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, sync_blocked, payload_json, created_at, updated_at)
       VALUES ('bare', 'Bare', 'draft', 'public', 4, 'synced', 0, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
    )

    const patched = await patchLocalSurveyConditions({ survey_id: "bare", survey_note: "n" })

    expect(patched).toMatchObject({ id: "bare", sync_version: 5, visibility: "public" })
    expect((await getLocalSurveyDraft("bare"))?.survey_note).toBe("n")
  })
})

describe("completion counters ignore the note, the weather and the annotations (Pitfall 10)", () => {
  const ANNOTATIONS = { annotations: { A: { doubt: true, note: "Je ne suis pas sûr" } } }

  test("computePayloadCompletion and computePayloadFactorsFilled are identical with and without", () => {
    const plain: SurveyQueuePayload = {
      id: "p",
      sync_version: 1,
      site_name: "Parcelle",
      region_version: "ACA",
      vegetation_stage: "mature",
      parcel_ids: ["P1"],
      factors: SIX_FACTORS,
    }
    const decorated: SurveyQueuePayload = {
      ...plain,
      survey_note: "Une note",
      weather: { sky: "clear", temperature_c: 9, requested_at: "2026-10-11T08:00:00.000Z" },
      factors: { ...SIX_FACTORS, ...ANNOTATIONS },
    }

    expect(computePayloadCompletion(decorated)).toBe(computePayloadCompletion(plain))
    expect(computePayloadFactorsFilled(decorated)).toBe(computePayloadFactorsFilled(plain))
  })

  test("the stored counters match a twin draft at create, update and conditions write", async () => {
    const twin = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    const survey = await createLocalDraft({
      ...BASE_INPUT,
      parcel_ids: ["P1"],
      factors: { ...SIX_FACTORS, ...ANNOTATIONS },
    })
    expect(await storedCounters(survey.id)).toEqual(await storedCounters(twin.id))

    await updateLocalDraft({
      survey_id: survey.id,
      ...BASE_INPUT,
      parcel_ids: ["P1"],
      factors: { ...SIX_FACTORS, ...ANNOTATIONS },
    })
    await updateLocalDraft({ survey_id: twin.id, ...BASE_INPUT, parcel_ids: ["P1"] })
    expect(await storedCounters(survey.id)).toEqual(await storedCounters(twin.id))

    await patchLocalSurveyConditions({
      survey_id: survey.id,
      survey_note: "Une note",
      weather: { sky: "rain", temperature_c: 7 },
    })
    expect(await storedCounters(survey.id)).toEqual(await storedCounters(twin.id))
  })
})

test("the SQLite schema stays at version 5 (D-02)", () => {
  expect(SCHEMA_VERSION).toBe(5)
})
