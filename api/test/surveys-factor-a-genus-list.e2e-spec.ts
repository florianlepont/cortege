import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import { createE2eApp, loginTestUser, uniqueId, validDirectFactors } from "./helpers/surveys-e2e"

// Phase 5 (ADR-002 D-15, ADR-003 CH-12): Factor A carries a list of observed native genera
// instead of a bare count. This spec proves the shape round-trips through POST /v1/sync (success
// criterion 5): the same payload, replayed twice, is not duplicated — one survey row, one
// survey_events row, the derived score unchanged on the second call. It also proves the genus
// list is validated against the CNPF list with a blocking, standard-shaped error.

const V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"

describe("Survey Factor A genus list (e2e)", () => {
  let app: INestApplication
  let db: DatabaseService
  let accessToken: string

  beforeAll(async () => {
    const context = await createE2eApp()
    app = context.app
    db = context.db
    accessToken = await loginTestUser(app, "e2e-genus-list")
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  function genusListPayload(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      sync_version: 1,
      site_name: "Genus list forest",
      status: "draft",
      visibility: "private",
      ibp_method_version: V3_2,
      ibp_cas: 1,
      factors: {
        ...validDirectFactors,
        A: {
          genera: ["Fagus", "Quercus_deciduae", "Quercus_sempervirens"],
          native_cover_percent: 60,
        },
      },
      ...overrides,
    }
  }

  async function sync(payload: Record<string, unknown>) {
    const response = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [{ client_ref: "op-1", entity: "survey", action: "upsert", payload }],
      })
      .expect(200)
    return response.body.results[0] as {
      status: string
      data?: { factor_results?: Record<string, { score_points: number }> }
      error?: { code: string; http_status: number }
    }
  }

  async function storedFactorsAndEvents(id: string) {
    const survey = await db.query<{ factors: { A?: { genera?: string[] } } }>(
      `SELECT factors FROM surveys WHERE id = $1`,
      [id],
    )
    const events = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM survey_events WHERE survey_id = $1`,
      [id],
    )
    return { factors: survey.rows[0]?.factors, eventCount: events.rows[0]?.count }
  }

  it("round-trips the genus list through POST /v1/sync, replayed twice, without duplication", async () => {
    const id = uniqueId("e2e-genus-roundtrip")
    const payload = genusListPayload(id)

    const first = await sync(payload)
    expect(first.status).toBe("synced")
    // 3 distinct genera (Quercus split counts twice as separate classes): scoreGenusCount(3) = 2.
    expect(first.data?.factor_results?.A.score_points).toBe(2)

    const second = await sync(payload)
    expect(second.status).toBe("synced")
    expect(second.data?.factor_results?.A.score_points).toBe(2)

    const { factors, eventCount } = await storedFactorsAndEvents(id)
    expect(factors?.A?.genera).toEqual(["Fagus", "Quercus_deciduae", "Quercus_sempervirens"])
    expect(eventCount).toBe("1")

    const surveyRows = await db.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM surveys WHERE id = $1`,
      [id],
    )
    expect(surveyRows.rows[0].count).toBe("1")
  })

  it("deduplicates a repeated genus and excludes a supplementary genus outside its cas", async () => {
    const id = uniqueId("e2e-genus-dedup")
    const result = await sync(
      genusListPayload(id, {
        factors: {
          ...validDirectFactors,
          A: { genera: ["Fagus", "Fagus", "Pistacia"], native_cover_percent: 60 },
        },
      }),
    )
    expect(result.status).toBe("synced")
    // Fagus deduplicated to 1; Pistacia (supplementary) excluded under cas 1: count 1 -> score 0.
    expect(result.data?.factor_results?.A.score_points).toBe(0)
  })

  it("rejects a genus not on the CNPF regional list, fatal (never retried) through /v1/sync", async () => {
    const id = uniqueId("e2e-genus-invalid-sync")
    const result = await sync(
      genusListPayload(id, {
        factors: { ...validDirectFactors, A: { genera: ["Ficus"], native_cover_percent: 60 } },
      }),
    )
    expect(result.status).toBe("fatal_error")
    expect(result.error?.http_status).toBe(422)
  })

  it("rejects a genus not on the CNPF regional list with the standard blocking issue code and message", async () => {
    const id = uniqueId("e2e-genus-invalid-post")
    const response = await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(
        genusListPayload(id, {
          factors: { ...validDirectFactors, A: { genera: ["Ficus"], native_cover_percent: 60 } },
        }),
      )
      .expect(422)
    expect(Array.isArray(response.body.errors)).toBe(true)
    expect(response.body.errors.join(" ")).toContain(
      "factor A genera must each be one of the CNPF regional list's classes",
    )
  })

  it("legacy bare native_genus_count still scores, unchanged, through the same endpoint", async () => {
    const id = uniqueId("e2e-genus-legacy")
    const result = await sync(
      genusListPayload(id, {
        ibp_method_version: undefined,
        ibp_cas: undefined,
        factors: {
          ...validDirectFactors,
          A: { native_genus_count: 5, native_cover_below_50: false },
        },
      }),
    )
    expect(result.status).toBe("synced")
    expect(result.data?.factor_results?.A.score_points).toBe(5)
  })
})
