import "dotenv/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test, TestingModule } from "@nestjs/testing"
import request = require("supertest")
import { randomUUID } from "crypto"
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"
import { DatabaseService } from "../src/database/database.service"
import {
  getNextVersionNumber,
  resolveParcel,
  uniqueCoordSeed,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// Phase 27 plan 27-11: the survey note, the weather snapshot and the factor annotations at every
// survey write site, on both entry points (POST /v1/surveys and POST /v1/sync). D-01 storage,
// D-03 submitted read-only, D-04 absent keeps / null clears / same-version compare, and the
// research pitfalls 1 (annotation-only factors), 2 (nested weather through /v1/sync) and 3/4
// (bounds, no text in the event journal).

const NOTE_HEAD =
  "Placette humide au nord, chênaie claire.\nLisière dense et très ouverte à l'est. "
const NOTE = NOTE_HEAD + "é".repeat(1000 - NOTE_HEAD.length)

const WEATHER = {
  sky: "cloudy",
  temperature_c: 8.5,
  wind_kmh: 12,
  rain_24h_mm: 2.4,
  observed_at: "2026-10-11T07:00:00.000Z",
  requested_at: "2026-10-11T07:05:00.000Z",
  source: "meteo_france",
  edited: ["sky"],
}

const ANNOTATIONS = { A: { doubt: true, note: "Chêne sessile ou pédonculé ?" } }

describe("Survey note, weather and annotations (e2e)", () => {
  let app: NestExpressApplication
  let db: DatabaseService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication<NestExpressApplication>()
    configureApp(app)
    await app.init()
    db = moduleFixture.get(DatabaseService)
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  async function login(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post("/v1/debug/test-token")
      .send({ email: `e2e-note-weather-${randomUUID()}@ibp.local` })
      .expect(201)
    return res.body.access_token as string
  }

  function draft(surveyId: string, overrides: Record<string, unknown> = {}) {
    return {
      id: surveyId,
      sync_version: 1,
      site_name: "Note and weather forest",
      status: "draft",
      visibility: "private",
      region_version: "ACA",
      vegetation_stage: "collineen",
      factors: { A: 1, B: 2, C: 1 },
      scores: {},
      ...overrides,
    }
  }

  function upsert(token: string, payload: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${token}`)
      .send(payload)
  }

  async function sync(token: string, payloads: Array<Record<string, unknown>>) {
    const res = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${token}`)
      .send({
        operations: payloads.map((payload, index) => ({
          client_ref: `op-${index}`,
          entity: "survey",
          action: "upsert",
          payload,
        })),
      })
      .expect(200)
    return res.body.results as Array<{
      status: string
      error?: { code: string; http_status: number; details?: { fields?: string[] } }
    }>
  }

  async function getSurvey(token: string, surveyId: string) {
    const res = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
    return res.body
  }

  async function readRow(surveyId: string) {
    const result = await db.query<{
      updated_at: string
      sync_version: number
      survey_note: string | null
      weather: Record<string, unknown> | null
    }>(`SELECT updated_at::text, sync_version, survey_note, weather FROM surveys WHERE id = $1`, [
      surveyId,
    ])
    return result.rows[0]
  }

  async function eventCount(surveyId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM survey_events WHERE survey_id = $1`,
      [surveyId],
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  describe("round trip", () => {
    it("stores and returns the note, the weather and the annotations from POST /v1/surveys", async () => {
      const token = await login()
      const surveyId = randomUUID()
      const factors = { A: 1, B: 2, C: 1, annotations: ANNOTATIONS }

      const res = await upsert(
        token,
        draft(surveyId, { survey_note: NOTE, weather: WEATHER, factors }),
      ).expect(201)
      expect(res.body.server_status).toBe("synced")

      const survey = await getSurvey(token, surveyId)
      expect(survey.survey_note).toBe(NOTE)
      expect(survey.weather).toEqual(WEATHER)
      expect(survey.factors.annotations).toEqual(ANNOTATIONS)
    })

    it("accepts a nested weather through POST /v1/sync (research Pitfall 2)", async () => {
      const token = await login()
      const surveyId = randomUUID()

      const results = await sync(token, [
        draft(surveyId, {
          survey_note: NOTE,
          weather: WEATHER,
          factors: { A: 1, B: 2, C: 1, annotations: ANNOTATIONS },
        }),
      ])
      expect(results[0].status).toBe("synced")

      const survey = await getSurvey(token, surveyId)
      expect(survey.survey_note).toBe(NOTE)
      expect(survey.weather).toEqual(WEATHER)
      expect(survey.factors.annotations).toEqual(ANNOTATIONS)
    })

    it("returns null for both fields of a survey that never had them", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId)).expect(201)

      const survey = await getSurvey(token, surveyId)
      expect(survey.survey_note).toBeNull()
      expect(survey.weather).toBeNull()
    })

    it("accepts a draft whose factors hold only annotations (research Pitfall 1)", async () => {
      const token = await login()
      const surveyId = randomUUID()

      await upsert(
        token,
        draft(surveyId, { factors: { annotations: { B: { doubt: true } } } }),
      ).expect(201)

      const survey = await getSurvey(token, surveyId)
      expect(survey.factors).toEqual({ annotations: { B: { doubt: true } } })
    })
  })

  describe("higher version of a draft (D-04)", () => {
    it("keeps the stored note and weather when the keys are absent, on both entry points", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId, { survey_note: NOTE, weather: WEATHER })).expect(201)

      // POST /v1/surveys (fast path update), then POST /v1/sync (fast path update).
      await upsert(token, draft(surveyId, { sync_version: 2, site_name: "Older app" })).expect(201)
      expect(await readRow(surveyId)).toMatchObject({ survey_note: NOTE, weather: WEATHER })

      const results = await sync(token, [draft(surveyId, { sync_version: 3 })])
      expect(results[0].status).toBe("synced")
      expect(await readRow(surveyId)).toMatchObject({ survey_note: NOTE, weather: WEATHER })
    })

    it("clears the note and the weather on an explicit null", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId, { survey_note: NOTE, weather: WEATHER })).expect(201)

      await upsert(
        token,
        draft(surveyId, { sync_version: 2, survey_note: null, weather: null }),
      ).expect(201)

      expect(await readRow(surveyId)).toMatchObject({ survey_note: null, weather: null })
    })

    it("replaces the note and the weather on a new value", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId, { survey_note: "Avant", weather: WEATHER })).expect(201)

      const warmer = { ...WEATHER, temperature_c: 14, edited: ["sky", "temperature_c"] }
      const results = await sync(token, [
        draft(surveyId, { sync_version: 2, survey_note: "Après", weather: warmer }),
      ])
      expect(results[0].status).toBe("synced")

      expect(await readRow(surveyId)).toMatchObject({ survey_note: "Après", weather: warmer })
    })
  })

  describe("same sync_version (D-04)", () => {
    const withAll = (surveyId: string, overrides: Record<string, unknown> = {}) =>
      draft(surveyId, {
        survey_note: NOTE,
        weather: WEATHER,
        factors: { A: 1, B: 2, C: 1, annotations: ANNOTATIONS },
        ...overrides,
      })

    it("answers an identical replay synced with no write and no new event", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, withAll(surveyId)).expect(201)
      const before = await readRow(surveyId)
      const events = await eventCount(surveyId)

      const viaSurveys = await upsert(token, withAll(surveyId)).expect(201)
      expect(viaSurveys.body.server_status).toBe("synced")
      const viaSync = await sync(token, [withAll(surveyId)])
      expect(viaSync[0].status).toBe("synced")

      expect((await readRow(surveyId)).updated_at).toBe(before.updated_at)
      expect(await eventCount(surveyId)).toBe(events)
    })

    it("answers 409 sync_version_conflict for a changed note", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, withAll(surveyId)).expect(201)

      const res = await upsert(token, withAll(surveyId, { survey_note: "Autre note" })).expect(409)
      expect(res.body.code).toBe("sync_version_conflict")

      const results = await sync(token, [withAll(surveyId, { survey_note: "Autre note" })])
      expect(results[0].status).toBe("fatal_error")
      expect(results[0].error?.code).toBe("sync_version_conflict")
      expect((await readRow(surveyId)).survey_note).toBe(NOTE)
    })

    it("answers 409 sync_version_conflict for a changed weather temperature", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, withAll(surveyId)).expect(201)

      const changed = { ...WEATHER, temperature_c: 9 }
      const res = await upsert(token, withAll(surveyId, { weather: changed })).expect(409)
      expect(res.body.code).toBe("sync_version_conflict")

      const results = await sync(token, [withAll(surveyId, { weather: changed })])
      expect(results[0].error?.code).toBe("sync_version_conflict")
      expect((await readRow(surveyId)).weather).toEqual(WEATHER)
    })

    it("answers 409 sync_version_conflict for an added doubt in the annotations", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, withAll(surveyId)).expect(201)

      const factors = {
        A: 1,
        B: 2,
        C: 1,
        annotations: { ...ANNOTATIONS, C: { doubt: true } },
      }
      const res = await upsert(token, withAll(surveyId, { factors })).expect(409)
      expect(res.body.code).toBe("sync_version_conflict")

      const results = await sync(token, [withAll(surveyId, { factors })])
      expect(results[0].error?.code).toBe("sync_version_conflict")
    })
  })

  describe("installed app (no new keys)", () => {
    it("never conflicts when the body carries none of the new keys and the row has them", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId, { survey_note: NOTE, weather: WEATHER })).expect(201)

      const res = await upsert(token, draft(surveyId)).expect(201)
      expect(res.body.server_status).toBe("synced")
      const results = await sync(token, [draft(surveyId)])
      expect(results[0].status).toBe("synced")

      expect(await readRow(surveyId)).toMatchObject({ survey_note: NOTE, weather: WEATHER })
    })
  })

  describe("submitted survey (D-03)", () => {
    async function submittedSurvey(token: string) {
      const seed = uniqueCoordSeed()
      const lat = 48.6 + seed / 100000
      const lng = 2.1 + seed / 100000
      const parcelId = await resolveParcel(app, token, lat, lng)
      const surveyId = randomUUID()
      const payload = {
        id: surveyId,
        sync_version: 1,
        site_name: "Submitted note forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: await getNextVersionNumber(db, parcelId),
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: { ...validDirectFactors, annotations: ANNOTATIONS },
        survey_note: NOTE,
        weather: WEATHER,
      }
      await upsert(token, payload).expect(201)
      await request(app.getHttpServer())
        .post(`/v1/surveys/${surveyId}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
      return { surveyId, payload }
    }

    it("refuses a changed note, weather or annotation with the field listed", async () => {
      const token = await login()
      const { surveyId, payload } = await submittedSurvey(token)
      const next = { ...payload, sync_version: 2 }

      const note = await upsert(token, { ...next, survey_note: "Changée" }).expect(409)
      expect(note.body.code).toBe("survey_submitted_read_only")
      expect(note.body.details.fields).toContain("survey_note")

      const weather = await upsert(token, {
        ...next,
        weather: { ...WEATHER, wind_kmh: 40 },
      }).expect(409)
      expect(weather.body.code).toBe("survey_submitted_read_only")
      expect(weather.body.details.fields).toContain("weather")

      const factors = await upsert(token, {
        ...next,
        factors: { ...validDirectFactors, annotations: { A: { doubt: true } } },
      }).expect(409)
      expect(factors.body.code).toBe("survey_submitted_read_only")
      expect(factors.body.details.fields).toContain("factors")

      expect(await readRow(surveyId)).toMatchObject({ survey_note: NOTE, weather: WEATHER })
    })

    it("accepts an identical resend", async () => {
      const token = await login()
      const { surveyId, payload } = await submittedSurvey(token)

      const res = await upsert(token, { ...payload, sync_version: 2 }).expect(201)
      expect(res.body.server_status).toBe("synced")
      expect(await readRow(surveyId)).toMatchObject({
        sync_version: 2,
        survey_note: NOTE,
        weather: WEATHER,
      })
    })
  })

  describe("validation", () => {
    it("fails each out-of-bounds operation of a sync batch with invalid_sync_operation", async () => {
      const token = await login()
      const results = await sync(token, [
        draft(randomUUID(), { survey_note: "x".repeat(1001) }),
        draft(randomUUID(), { weather: { ...WEATHER, sky: "sunny" } }),
        draft(randomUUID(), { weather: { ...WEATHER, temperature_c: 99 } }),
        draft(randomUUID(), { factors: { A: 1, annotations: { K: { doubt: true } } } }),
        draft(randomUUID(), {
          factors: { A: 1, annotations: { A: { note: "n".repeat(301) } } },
        }),
      ])

      expect(results).toHaveLength(5)
      for (const result of results) {
        expect(result.status).toBe("fatal_error")
        expect(result.error?.code).toBe("invalid_sync_operation")
      }
    })

    it("rejects an undeclared weather key on POST /v1/surveys with a 400", async () => {
      const token = await login()
      await upsert(
        token,
        draft(randomUUID(), { weather: { ...WEATHER, station: "07005" } }),
      ).expect(400)
    })

    it("rejects an over-long note on POST /v1/surveys with a 400", async () => {
      const token = await login()
      await upsert(token, draft(randomUUID(), { survey_note: "x".repeat(1001) })).expect(400)
    })
  })

  describe("event journal", () => {
    it("never carries the note or a factor note text", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(
        token,
        draft(surveyId, {
          survey_note: NOTE,
          weather: WEATHER,
          factors: { A: 1, B: 2, C: 1, annotations: ANNOTATIONS },
        }),
      ).expect(201)
      await upsert(
        token,
        draft(surveyId, { sync_version: 2, survey_note: `${NOTE.slice(0, 900)} (suite)` }),
      ).expect(201)

      const events = await db.query<{ payload: unknown }>(
        `SELECT payload FROM survey_events WHERE survey_id = $1`,
        [surveyId],
      )
      expect(events.rows.length).toBeGreaterThanOrEqual(2)
      const journal = JSON.stringify(events.rows.map((row) => row.payload))
      expect(journal).not.toContain("Placette humide")
      expect(journal).not.toContain("Chêne sessile")
      expect(journal).not.toContain("temperature_c")
    })
  })
})
