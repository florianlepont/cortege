import "dotenv/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test, TestingModule } from "@nestjs/testing"
import request = require("supertest")
import { randomUUID } from "crypto"
import { canonicalSurveyRoute, validateSurveyRoute, type SurveyRoute } from "@cortege/ibp-domain"
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"
import { DatabaseService } from "../src/database/database.service"
import {
  getNextVersionNumber,
  resolveParcel,
  uniqueCoordSeed,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// Phase 30 plan 30-09: the recorded route ("Parcours utilise", D-08) at every survey write site, on
// both entry points (POST /v1/surveys and POST /v1/sync): round trip, the changes feed, a body
// without the key (an installed app) never clearing a stored route (spec section 8: a route is
// never deleted), identical replay at the same sync_version, the read-only rule after submit (D-09)
// and the nested validation. No request here sends the client marker header: making the route
// mandatory for the new client is plan 30-10.

// A canonical route, built through the package so the stored form is the one the phone sends.
const ROUTE: SurveyRoute = canonicalSurveyRoute({
  version: 1,
  method: "partial_strip",
  counting: "uncapped",
  uncapped_factors: ["E", "A", "B"],
  zone_surface_ha: 12.5,
  complement: { done: true, total_surface_ha: 14.25 },
  guide: {
    chosen_by: "guide",
    suggested: { method: "partial_strip", counting: "uncapped" },
    answers: {
      surface_ha: 12.5,
      homogeneity: "homogeneous",
      difficulty: false,
      narrow: true,
      experience: "regular",
      hours_available: 3.5,
      subdivided: false,
    },
  },
})

const OTHER_ROUTE: SurveyRoute = canonicalSurveyRoute({
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 2.5,
  guide: { chosen_by: "observer" },
})

describe("Recorded route (e2e)", () => {
  let app: NestExpressApplication
  let db: DatabaseService

  beforeAll(async () => {
    // Guard the fixtures themselves: a canonical route the package refuses would hide a real bug.
    expect(validateSurveyRoute(ROUTE)).toEqual([])
    expect(validateSurveyRoute(OTHER_ROUTE)).toEqual([])

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
      .send({ email: `e2e-route-${randomUUID()}@ibp.local` })
      .expect(201)
    return res.body.access_token as string
  }

  function draft(surveyId: string, overrides: Record<string, unknown> = {}) {
    return {
      id: surveyId,
      sync_version: 1,
      site_name: "Route forest",
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
      survey_route: Record<string, unknown> | null
    }>(`SELECT updated_at::text, sync_version, survey_route FROM surveys WHERE id = $1`, [surveyId])
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
    it("stores and returns the route from POST /v1/surveys", async () => {
      const token = await login()
      const surveyId = randomUUID()

      const res = await upsert(token, draft(surveyId, { survey_route: ROUTE })).expect(201)
      expect(res.body.server_status).toBe("synced")

      expect((await readRow(surveyId)).survey_route).toEqual(ROUTE)
      expect((await getSurvey(token, surveyId)).survey_route).toEqual(ROUTE)
    })

    it("stores and returns the route from POST /v1/sync, then through GET /v1/sync/changes", async () => {
      const token = await login()
      const surveyId = randomUUID()
      const bare = randomUUID()

      const results = await sync(token, [draft(surveyId, { survey_route: ROUTE }), draft(bare)])
      expect(results.map((result) => result.status)).toEqual(["synced", "synced"])

      expect((await getSurvey(token, surveyId)).survey_route).toEqual(ROUTE)

      const res = await request(app.getHttpServer())
        .get("/v1/sync/changes")
        .query({ limit: 50 })
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      const surveys = res.body.surveys as Array<{ id: string; survey_route: unknown }>
      expect(surveys.find((survey) => survey.id === surveyId)?.survey_route).toEqual(ROUTE)
      const empty = surveys.find((survey) => survey.id === bare)
      expect(empty).toBeDefined()
      // Never a missing key: a survey without a route reads null.
      expect(Object.keys(empty ?? {})).toContain("survey_route")
      expect(empty?.survey_route).toBeNull()
    })

    it("returns null for a survey that never had a route", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId)).expect(201)

      const survey = await getSurvey(token, surveyId)
      expect(Object.keys(survey)).toContain("survey_route")
      expect(survey.survey_route).toBeNull()
    })
  })

  describe("higher version of a draft (D-08)", () => {
    it("keeps the stored route when the key is absent or null, on both entry points", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId, { survey_route: ROUTE })).expect(201)

      // POST /v1/surveys (fast path update): key absent.
      await upsert(token, draft(surveyId, { sync_version: 2, site_name: "Older app" })).expect(201)
      expect((await readRow(surveyId)).survey_route).toEqual(ROUTE)

      // POST /v1/sync: explicit null never erases a route.
      const viaSync = await sync(token, [draft(surveyId, { sync_version: 3, survey_route: null })])
      expect(viaSync[0].status).toBe("synced")
      expect((await readRow(surveyId)).survey_route).toEqual(ROUTE)

      // POST /v1/surveys: explicit null.
      await upsert(token, draft(surveyId, { sync_version: 4, survey_route: null })).expect(201)
      const row = await readRow(surveyId)
      expect(row.sync_version).toBe(4)
      expect(row.survey_route).toEqual(ROUTE)
    })

    it("replaces the route of a draft on a new value, on both entry points", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId, { survey_route: ROUTE })).expect(201)

      await upsert(token, draft(surveyId, { sync_version: 2, survey_route: OTHER_ROUTE })).expect(
        201,
      )
      expect((await readRow(surveyId)).survey_route).toEqual(OTHER_ROUTE)

      const results = await sync(token, [draft(surveyId, { sync_version: 3, survey_route: ROUTE })])
      expect(results[0].status).toBe("synced")
      expect((await readRow(surveyId)).survey_route).toEqual(ROUTE)
    })

    it("adds a route to a draft that had none", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId)).expect(201)
      expect((await readRow(surveyId)).survey_route).toBeNull()

      await upsert(token, draft(surveyId, { sync_version: 2, survey_route: ROUTE })).expect(201)
      expect((await readRow(surveyId)).survey_route).toEqual(ROUTE)
    })
  })

  describe("same sync_version (D-08)", () => {
    const withRoute = (surveyId: string, overrides: Record<string, unknown> = {}) =>
      draft(surveyId, { survey_route: ROUTE, ...overrides })

    it("answers an identical replay synced with no write and no new event", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, withRoute(surveyId)).expect(201)
      const before = await readRow(surveyId)
      const events = await eventCount(surveyId)

      const viaSurveys = await upsert(token, withRoute(surveyId)).expect(201)
      expect(viaSurveys.body.server_status).toBe("synced")
      const viaSync = await sync(token, [withRoute(surveyId)])
      expect(viaSync[0].status).toBe("synced")

      expect((await readRow(surveyId)).updated_at).toBe(before.updated_at)
      expect(await eventCount(surveyId)).toBe(events)
    })

    it("answers an identical replay whatever the key order of the route", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, withRoute(surveyId)).expect(201)

      // The same record with every object's keys in the reverse order (jsonb stores its own order).
      const reorder = (value: unknown): unknown =>
        Array.isArray(value)
          ? value.map(reorder)
          : value !== null && typeof value === "object"
            ? Object.fromEntries(
                Object.entries(value as Record<string, unknown>)
                  .reverse()
                  .map(([key, entry]) => [key, reorder(entry)]),
              )
            : value
      const reordered = reorder(ROUTE)

      const viaSurveys = await upsert(token, withRoute(surveyId, { survey_route: reordered }))
      expect(viaSurveys.status).toBe(201)
      expect(viaSurveys.body.server_status).toBe("synced")
      const viaSync = await sync(token, [withRoute(surveyId, { survey_route: reordered })])
      expect(viaSync[0].status).toBe("synced")
    })

    it("answers 409 sync_version_conflict for a changed route on both entry points", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, withRoute(surveyId)).expect(201)

      const res = await upsert(token, withRoute(surveyId, { survey_route: OTHER_ROUTE })).expect(
        409,
      )
      expect(res.body.code).toBe("sync_version_conflict")

      const results = await sync(token, [withRoute(surveyId, { survey_route: OTHER_ROUTE })])
      expect(results[0].status).toBe("fatal_error")
      expect(results[0].error?.code).toBe("sync_version_conflict")
      expect((await readRow(surveyId)).survey_route).toEqual(ROUTE)
    })

    it("answers a replay without the key or with null synced, and keeps the route", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, withRoute(surveyId)).expect(201)
      const events = await eventCount(surveyId)

      const absent = await upsert(token, draft(surveyId)).expect(201)
      expect(absent.body.server_status).toBe("synced")
      const nulled = await sync(token, [draft(surveyId, { survey_route: null })])
      expect(nulled[0].status).toBe("synced")

      expect((await readRow(surveyId)).survey_route).toEqual(ROUTE)
      expect(await eventCount(surveyId)).toBe(events)
    })
  })

  describe("submitted survey (D-09)", () => {
    async function submittedSurvey(token: string, route: SurveyRoute | null) {
      const seed = uniqueCoordSeed()
      const lat = 48.7 + seed / 100000
      const lng = 2.2 + seed / 100000
      const parcelId = await resolveParcel(app, token, lat, lng)
      const surveyId = randomUUID()
      const payload: Record<string, unknown> = {
        id: surveyId,
        sync_version: 1,
        site_name: "Submitted route forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: await getNextVersionNumber(db, parcelId),
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        ...(route ? { survey_route: route } : {}),
      }
      await upsert(token, payload).expect(201)
      await request(app.getHttpServer())
        .post(`/v1/surveys/${surveyId}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
      return { surveyId, payload }
    }

    it("refuses a different route with the field listed, on both entry points", async () => {
      const token = await login()
      const { surveyId, payload } = await submittedSurvey(token, ROUTE)
      const next = { ...payload, sync_version: 2 }

      const res = await upsert(token, { ...next, survey_route: OTHER_ROUTE }).expect(409)
      expect(res.body.code).toBe("survey_submitted_read_only")
      expect(res.body.details.fields).toContain("survey_route")

      const results = await sync(token, [{ ...next, survey_route: OTHER_ROUTE }])
      expect(results[0].status).toBe("fatal_error")
      expect(results[0].error?.code).toBe("survey_submitted_read_only")
      expect(results[0].error?.details?.fields).toContain("survey_route")

      expect((await readRow(surveyId)).survey_route).toEqual(ROUTE)
    })

    it("accepts an identical resend, a resend without the key and a null, and keeps the route", async () => {
      const token = await login()
      const { surveyId, payload } = await submittedSurvey(token, ROUTE)

      const identical = await upsert(token, { ...payload, sync_version: 2, survey_route: ROUTE })
      expect(identical.status).toBe(201)
      expect(identical.body.server_status).toBe("synced")

      const absent = await upsert(token, { ...payload, sync_version: 3 }).expect(201)
      expect(absent.body.server_status).toBe("synced")

      const results = await sync(token, [{ ...payload, sync_version: 4, survey_route: null }])
      expect(results[0].status).toBe("synced")

      const row = await readRow(surveyId)
      expect(row.sync_version).toBe(4)
      // The restricted UPDATE never lists the column: the stored route is exactly what it was.
      expect(row.survey_route).toEqual(ROUTE)
      expect((await getSurvey(token, surveyId)).survey_route).toEqual(ROUTE)
    })

    it("refuses a route added to a legacy submitted survey that never had one", async () => {
      const token = await login()
      const { surveyId, payload } = await submittedSurvey(token, null)
      expect((await readRow(surveyId)).survey_route).toBeNull()

      const res = await upsert(token, { ...payload, sync_version: 2, survey_route: ROUTE }).expect(
        409,
      )
      expect(res.body.code).toBe("survey_submitted_read_only")
      expect(res.body.details.fields).toContain("survey_route")
      expect((await readRow(surveyId)).survey_route).toBeNull()
    })
  })

  describe("validation", () => {
    it("rejects an undeclared nested key on POST /v1/surveys with a 400", async () => {
      const token = await login()
      await upsert(
        token,
        draft(randomUUID(), { survey_route: { ...ROUTE, comment: "texte libre" } }),
      ).expect(400)
      await upsert(
        token,
        draft(randomUUID(), {
          survey_route: { ...ROUTE, guide: { ...ROUTE.guide, comment: "texte libre" } },
        }),
      ).expect(400)
    })

    it("strips an undeclared nested key on POST /v1/sync, like the weather", async () => {
      const token = await login()
      const surveyId = randomUUID()

      const results = await sync(token, [
        draft(surveyId, { survey_route: { ...ROUTE, comment: "texte libre" } }),
      ])
      expect(results[0].status).toBe("synced")

      const stored = (await readRow(surveyId)).survey_route
      expect(stored).toEqual(ROUTE)
      expect(JSON.stringify(stored)).not.toContain("texte libre")
    })

    it("refuses an invalid route on both entry points", async () => {
      const token = await login()
      const invalid = [
        { ...ROUTE, zone_surface_ha: 0 },
        { ...ROUTE, method: "diagonal" },
        { ...ROUTE, version: 2 },
        { ...ROUTE, uncapped_factors: ["H"] },
        { ...ROUTE, complement: { done: true, total_surface_ha: 1 } },
      ]

      for (const route of invalid) {
        await upsert(token, draft(randomUUID(), { survey_route: route })).expect(400)
      }
      const results = await sync(
        token,
        invalid.map((route) => draft(randomUUID(), { survey_route: route })),
      )
      expect(results).toHaveLength(invalid.length)
      for (const result of results) {
        expect(result.status).toBe("fatal_error")
        expect(result.error?.code).toBe("invalid_sync_operation")
      }
    })
  })

  describe("event journal", () => {
    it("never carries the route", async () => {
      const token = await login()
      const surveyId = randomUUID()
      await upsert(token, draft(surveyId, { survey_route: ROUTE })).expect(201)
      await upsert(token, draft(surveyId, { sync_version: 2, survey_route: OTHER_ROUTE })).expect(
        201,
      )

      const events = await db.query<{ payload: unknown }>(
        `SELECT payload FROM survey_events WHERE survey_id = $1`,
        [surveyId],
      )
      expect(events.rows.length).toBeGreaterThanOrEqual(2)
      const journal = JSON.stringify(events.rows.map((row) => row.payload))
      expect(journal).not.toContain("zone_surface_ha")
      expect(journal).not.toContain("partial_strip")
    })
  })
})
