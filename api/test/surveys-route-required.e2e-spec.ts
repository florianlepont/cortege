import "dotenv/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test, TestingModule } from "@nestjs/testing"
import request = require("supertest")
import { randomUUID } from "crypto"
import {
  canonicalSurveyRoute,
  CLIENT_FEATURES_HEADER,
  SURVEY_ROUTE_CLIENT_FEATURE,
  validateSurveyRoute,
  type SurveyRoute,
} from "@cortege/ibp-domain"
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"
import { DatabaseService } from "../src/database/database.service"
import {
  getNextVersionNumber,
  resolveParcel,
  uniqueCoordSeed,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// Phase 30 plan 30-10 (O-07, O-19, spec section 8, open point P-2): the route is mandatory on the
// server for the new client only, recognised by the header X-Cortege-Features: survey_route.
// Creating a survey without a route and submitting one without a route answer the 422
// route_required; a request without the header behaves exactly as before. The score never depends
// on the route.

const ROUTE: SurveyRoute = canonicalSurveyRoute({
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 2.5,
  guide: { chosen_by: "observer" },
})

describe("Mandatory route for the new client (e2e)", () => {
  let app: NestExpressApplication
  let db: DatabaseService

  beforeAll(async () => {
    expect(validateSurveyRoute(ROUTE)).toEqual([])
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
      .send({ email: `e2e-route-required-${randomUUID()}@ibp.local` })
      .expect(201)
    return res.body.access_token as string
  }

  function draft(surveyId: string, overrides: Record<string, unknown> = {}) {
    return {
      id: surveyId,
      sync_version: 1,
      site_name: "Mandatory route forest",
      status: "draft",
      visibility: "private",
      region_version: "ACA",
      vegetation_stage: "collineen",
      factors: { A: 1, B: 2, C: 1 },
      scores: {},
      ...overrides,
    }
  }

  // The new client sends the marker; the old one does not.
  function upsert(token: string, payload: Record<string, unknown>, newClient: boolean) {
    const req = request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${token}`)
    if (newClient) req.set(CLIENT_FEATURES_HEADER, SURVEY_ROUTE_CLIENT_FEATURE)
    return req.send(payload)
  }

  function submit(token: string, surveyId: string, newClient: boolean) {
    const req = request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${token}`)
    if (newClient) req.set(CLIENT_FEATURES_HEADER, SURVEY_ROUTE_CLIENT_FEATURE)
    return req
  }

  async function sync(token: string, payloads: Array<Record<string, unknown>>, newClient: boolean) {
    const req = request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${token}`)
    if (newClient) req.set(CLIENT_FEATURES_HEADER, SURVEY_ROUTE_CLIENT_FEATURE)
    const res = await req
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
      error?: { code: string; http_status: number }
    }>
  }

  async function rowCount(surveyId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM surveys WHERE id = $1`,
      [surveyId],
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  async function submitPayload(token: string, extra: Record<string, unknown> = {}) {
    const seed = uniqueCoordSeed()
    const parcelId = await resolveParcel(app, token, 48.9 + seed / 100000, 2.4 + seed / 100000)
    const surveyId = randomUUID()
    return {
      surveyId,
      payload: {
        id: surveyId,
        sync_version: 1,
        site_name: "Mandatory route submit forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: await getNextVersionNumber(db, parcelId),
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        ...extra,
      } as Record<string, unknown>,
    }
  }

  describe("create from the new client", () => {
    it("refuses POST /v1/surveys without a route with 422 route_required and stores nothing", async () => {
      const token = await login()
      const surveyId = randomUUID()

      const res = await upsert(token, draft(surveyId), true).expect(422)
      expect(res.body.code).toBe("route_required")
      expect(res.body.message).toBe("survey_route is required")
      expect(await rowCount(surveyId)).toBe(0)

      const nulled = await upsert(token, draft(surveyId, { survey_route: null }), true).expect(422)
      expect(nulled.body.code).toBe("route_required")
      expect(await rowCount(surveyId)).toBe(0)
    })

    it("creates the same body once it carries a canonical route", async () => {
      const token = await login()
      const surveyId = randomUUID()

      await upsert(token, draft(surveyId, { survey_route: ROUTE }), true).expect(201)
      expect(await rowCount(surveyId)).toBe(1)
    })

    it("reports a refused create of a sync batch as an operation error, not a failed batch", async () => {
      const token = await login()
      const refused = randomUUID()
      const accepted = randomUUID()

      const results = await sync(
        token,
        [draft(refused), draft(accepted, { survey_route: ROUTE })],
        true,
      )

      expect(results[0].status).toBe("fatal_error")
      expect(results[0].error?.code).toBe("route_required")
      expect(results[0].error?.http_status).toBe(422)
      expect(results[1].status).toBe("synced")
      expect(await rowCount(refused)).toBe(0)
      expect(await rowCount(accepted)).toBe(1)
    })
  })

  describe("draft stored before the phase", () => {
    it("accepts an update without the key from the new client, refuses its submission, then submits once it has a route", async () => {
      const token = await login()
      const { surveyId, payload } = await submitPayload(token)
      // Inserted the old way, without the header and without a route.
      await upsert(token, payload, false).expect(201)

      await upsert(token, { ...payload, sync_version: 2, site_name: "Renamed" }, true).expect(201)

      const refused = await submit(token, surveyId, true).expect(422)
      expect(refused.body.code).toBe("route_required")
      const stored = await db.query<{ status: string }>(
        `SELECT status FROM surveys WHERE id = $1`,
        [surveyId],
      )
      expect(stored.rows[0].status).toBe("draft")

      await upsert(token, { ...payload, sync_version: 3, survey_route: ROUTE }, true).expect(201)
      await submit(token, surveyId, true).expect(201)
    })
  })

  describe("submit from the new client", () => {
    it("submits a complete survey with a route, with the score of the same survey without the header", async () => {
      const token = await login()
      const withRoute = await submitPayload(token)
      await upsert(token, { ...withRoute.payload, survey_route: ROUTE }, true).expect(201)
      const newScores = (await submit(token, withRoute.surveyId, true).expect(201)).body.scores

      const oldClient = await submitPayload(token)
      await upsert(token, oldClient.payload, false).expect(201)
      const oldScores = (await submit(token, oldClient.surveyId, false).expect(201)).body.scores

      expect(newScores).toEqual(oldScores)
    })

    it("checks the route before the IBP validation", async () => {
      const token = await login()
      const surveyId = randomUUID()
      // An incomplete survey without a route, created the old way: the route code comes first.
      await upsert(token, draft(surveyId), false).expect(201)

      const res = await submit(token, surveyId, true).expect(422)
      expect(res.body.code).toBe("route_required")
      expect(res.body.errors).toBeUndefined()
    })
  })

  describe("request without the header (installed older build, existing tests)", () => {
    it("creates, updates and submits without a route exactly as before", async () => {
      const token = await login()
      const { surveyId, payload } = await submitPayload(token)

      await upsert(token, payload, false).expect(201)
      await upsert(token, { ...payload, sync_version: 2, site_name: "Renamed" }, false).expect(201)
      const results = await sync(token, [draft(randomUUID())], false)
      expect(results[0].status).toBe("synced")
      await submit(token, surveyId, false).expect(201)
    })

    it("ignores a header that does not list the route feature", async () => {
      const token = await login()
      const surveyId = randomUUID()

      await request(app.getHttpServer())
        .post("/v1/surveys")
        .set("Authorization", `Bearer ${token}`)
        .set(CLIENT_FEATURES_HEADER, "something_else")
        .send(draft(surveyId))
        .expect(201)
    })
  })
})
