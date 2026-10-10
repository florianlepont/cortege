import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import {
  createE2eApp,
  loginTestUser,
  resolveParcel,
  uniqueCoordSeed,
  uniqueId,
} from "./helpers/surveys-e2e"

// Phase 25.1 D-12: the factor detail arrays (B.strata, F.dmh_groups, H.evidence, I.types,
// J.types) travel inside the existing `factors` JSONB. This spec proves the server keeps them
// verbatim with no API change: POST /v1/sync accepts them, the row stores them, GET
// /v1/sync/changes returns them, a replay creates no duplicate, and they are never scored
// (the scores equal those of the same counts without the arrays).

const V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"

const DETAIL_ARRAYS = {
  B: { strata_count: 2, strata: ["low", "high"] },
  F: { trees_per_ha: 4, dmh_groups: ["dmh_01", "dmh_12"] },
  H: { class_score: 5, evidence: ["etat_major_map", "field_signs"] },
  I: { type_count: 1, types: ["pool"] },
  J: { type_count: 2, types: ["slab", "cave"] },
}

const COUNTS_ONLY = {
  B: { strata_count: 2 },
  F: { trees_per_ha: 4 },
  H: { class_score: 5 },
  I: { type_count: 1 },
  J: { type_count: 2 },
}

const RAW_FACTORS = {
  A: { genera: ["Fagus", "Quercus_deciduae", "Quercus_sempervirens"], native_cover_percent: 60 },
  C: { bmg_count: 0, bmm_count: 2, surface_ha: 1 },
  D: { bmg_count: 4, bmm_count: 0, surface_ha: 1 },
  E: { tgb_count: 0, gb_count: 2, surface_ha: 1 },
  G: { open_flowering_percent: 2 },
}

type SyncResult = {
  status: string
  data?: { factor_results?: Record<string, { score_points: number }> }
  error?: { code: string; http_status: number }
}

describe("Survey factor detail arrays (e2e)", () => {
  let app: INestApplication
  let db: DatabaseService
  let accessToken: string

  beforeAll(async () => {
    const context = await createE2eApp()
    app = context.app
    db = context.db
    accessToken = await loginTestUser(app, "e2e-factor-details")
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  function payload(id: string, details: Record<string, unknown>, extra = {}) {
    return {
      id,
      sync_version: 1,
      site_name: "Factor details forest",
      status: "draft",
      visibility: "private",
      ibp_method_version: V3_2,
      ibp_cas: 1,
      factors: { ...RAW_FACTORS, ...details },
      ...extra,
    }
  }

  function pointsOf(result: SyncResult) {
    return Object.fromEntries(
      Object.entries(result.data?.factor_results ?? {}).map(([key, value]) => [
        key,
        value.score_points,
      ]),
    )
  }

  async function sync(body: Record<string, unknown>): Promise<SyncResult> {
    const response = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [{ client_ref: "op-1", entity: "survey", action: "upsert", payload: body }],
      })
      .expect(200)
    return response.body.results[0] as SyncResult
  }

  async function storedRow(id: string) {
    const result = await db.query<{
      factors: Record<string, unknown>
      scores: Record<string, number>
      status: string
    }>(`SELECT factors, scores, status FROM surveys WHERE id = $1`, [id])
    return result.rows[0]
  }

  async function changesFor(id: string) {
    const changes = await request(app.getHttpServer())
      .get("/v1/sync/changes")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ limit: 100 })
      .expect(200)
    return (changes.body.surveys as Array<{ id: string; factors: Record<string, unknown> }>).find(
      (survey) => survey.id === id,
    )
  }

  it("keeps the detail arrays in the row and returns them from GET /v1/sync/changes", async () => {
    const id = uniqueId("e2e-details-roundtrip")
    const result = await sync(payload(id, DETAIL_ARRAYS))
    expect(result.status).toBe("synced")

    const row = await storedRow(id)
    expect(row.factors).toEqual({ ...RAW_FACTORS, ...DETAIL_ARRAYS })

    const pulled = await changesFor(id)
    expect(pulled?.factors).toEqual({ ...RAW_FACTORS, ...DETAIL_ARRAYS })
  })

  it("scores the same with and without the detail arrays", async () => {
    const withId = uniqueId("e2e-details-with")
    const withoutId = uniqueId("e2e-details-without")
    const withDetails = await sync(payload(withId, DETAIL_ARRAYS))
    const withoutDetails = await sync(payload(withoutId, COUNTS_ONLY))
    expect(withDetails.status).toBe("synced")
    expect(withoutDetails.status).toBe("synced")

    // factor_results echoes the input per factor, so compare the points, never the whole object.
    expect(pointsOf(withDetails)).toEqual(pointsOf(withoutDetails))
    expect((await storedRow(withId)).scores).toEqual((await storedRow(withoutId)).scores)
    expect((await storedRow(withoutId)).factors).toEqual({ ...RAW_FACTORS, ...COUNTS_ONLY })
  })

  it("replays the same payload without a duplicate and without a score change", async () => {
    const id = uniqueId("e2e-details-replay")
    const body = payload(id, DETAIL_ARRAYS)

    const first = await sync(body)
    const second = await sync(body)
    expect(first.status).toBe("synced")
    expect(second.status).toBe("synced")
    expect(pointsOf(second)).toEqual(pointsOf(first))

    const rows = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM surveys WHERE id = $1`,
      [id],
    )
    expect(rows.rows[0].count).toBe("1")
    const events = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM survey_events WHERE survey_id = $1`,
      [id],
    )
    expect(events.rows[0].count).toBe("1")
    expect((await storedRow(id)).factors).toEqual({ ...RAW_FACTORS, ...DETAIL_ARRAYS })
  })

  it("still returns the arrays once the survey is submitted", async () => {
    const id = uniqueId("e2e-details-submitted")
    const seed = uniqueCoordSeed()
    const parcelId = await resolveParcel(
      app,
      accessToken,
      46.21 + seed / 100000,
      3.41 + seed / 100000,
    )

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload(id, DETAIL_ARRAYS, { parcel_ids: [parcelId] }))
      .expect(201)
    const submit = await request(app.getHttpServer())
      .post(`/v1/surveys/${id}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)
    expect(submit.body.status).toBe("submitted")

    const row = await storedRow(id)
    expect(row.status).toBe("submitted")
    expect(row.factors).toEqual({ ...RAW_FACTORS, ...DETAIL_ARRAYS })

    const detail = await request(app.getHttpServer())
      .get(`/v1/surveys/${id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    expect(detail.body.factors).toEqual({ ...RAW_FACTORS, ...DETAIL_ARRAYS })

    const pulled = await changesFor(id)
    expect(pulled?.factors).toEqual({ ...RAW_FACTORS, ...DETAIL_ARRAYS })
  })
})
