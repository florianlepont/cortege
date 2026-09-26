import "dotenv/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test, TestingModule } from "@nestjs/testing"
import request = require("supertest")
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"
import { DatabaseService } from "../src/database/database.service"
import {
  loginTestUser,
  resolveParcel,
  uniqueCoordSeed,
  uniqueId,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// Phase 01.8 criterion 6 (D-02, D-08 and D-10 amended; RESEARCH §4.2 rules 1-6): every survey
// carries its IBP method version (NULL = v3.0) and, for v3.2, its cas. The server validates and
// scores with the survey's effective version, stores only the chosen method's station fields,
// keeps the version and cas fixed after submit, and returns them in the detail and the changes
// feed. The app runs through configureApp, so REST validation is the production pipe.
// Named "method-version", never "*-cas*": CAS means compare-and-swap in this suite (Pitfall 8).

const V3_0 = "cnpf_ibp_fr_v3_0_2023-03-23"
const V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"
// MAT-VER-01: C scores 0 under v3.0 and 1 under v3.2 (matrix v2, dispatch cases).
const C_BMG1_BMM1_2HA = { bmg_count: 1, bmm_count: 1, surface_ha: 2 }

type MethodRow = {
  ibp_method_version: string | null
  ibp_cas: number | null
  ibp_cas3_scale: boolean | null
  region_version: string | null
  vegetation_stage: string | null
  status: string
  scores: Record<string, number>
  factor_results: Record<string, { score_points: number }>
  sync_version: number
}

describe("Survey IBP method version (e2e)", () => {
  let app: NestExpressApplication
  let db: DatabaseService
  let accessToken: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication<NestExpressApplication>()
    configureApp(app)
    db = moduleFixture.get(DatabaseService)
    await app.init()
    accessToken = await loginTestUser(app, "e2e-method-version")
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  const server = () => app.getHttpServer()

  function draft(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      sync_version: 1,
      site_name: "Method version forest",
      status: "draft",
      visibility: "private",
      factors: validDirectFactors,
      ...overrides,
    }
  }

  function post(payload: Record<string, unknown>) {
    return request(server())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload)
  }

  async function sync(payload: Record<string, unknown>) {
    const response = await request(server())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [{ client_ref: "op-1", entity: "survey", action: "upsert", payload }],
      })
      .expect(200)
    return response.body.results[0] as {
      status: string
      data?: { factor_results?: Record<string, { score_points: number }>; warnings?: string[] }
      error?: { code: string; http_status: number; details?: { fields?: string[] } }
    }
  }

  function submit(id: string) {
    return request(server())
      .post(`/v1/surveys/${id}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
  }

  async function stored(id: string): Promise<MethodRow> {
    const result = await db.query<MethodRow>(
      `SELECT ibp_method_version, ibp_cas, ibp_cas3_scale, region_version, vegetation_stage,
              status, scores, factor_results, sync_version
       FROM surveys WHERE id = $1`,
      [id],
    )
    expect(result.rows).toHaveLength(1)
    return result.rows[0]
  }

  async function freshParcel(): Promise<string> {
    const seed = uniqueCoordSeed()
    return resolveParcel(app, accessToken, 46.21 + seed / 100000, 3.41 + seed / 100000)
  }

  // A submitted survey with a parcel; `extra` carries the method fields.
  async function submitted(label: string, extra: Record<string, unknown>): Promise<string> {
    const id = uniqueId(label)
    const parcelId = await freshParcel()
    await post(draft(id, { parcel_ids: [parcelId], ...extra })).expect(201)
    await submit(id).expect(201)
    return id
  }

  describe("storage (rules 1-2, Pitfall 3)", () => {
    it("stores a v3.2 survey created via POST with its cas and without region or stage", async () => {
      const id = uniqueId("e2e-mv-post32")
      await post(
        draft(id, {
          ibp_method_version: V3_2,
          ibp_cas: 2,
          ibp_cas3_scale: true,
          region_version: "ACA",
          vegetation_stage: "subalpin",
        }),
      ).expect(201)

      expect(await stored(id)).toMatchObject({
        ibp_method_version: V3_2,
        ibp_cas: 2,
        ibp_cas3_scale: true,
        region_version: null,
        vegetation_stage: null,
      })
    })

    it("stores a v3.2 survey created via /v1/sync (the DTO keeps the fields)", async () => {
      const id = uniqueId("e2e-mv-sync32")
      const result = await sync(
        draft(id, {
          ibp_method_version: V3_2,
          ibp_cas: 3,
          region_version: "M",
          vegetation_stage: "montagnard",
        }),
      )

      expect(result.status).toBe("synced")
      expect(await stored(id)).toMatchObject({
        ibp_method_version: V3_2,
        ibp_cas: 3,
        ibp_cas3_scale: null,
        region_version: null,
        vegetation_stage: null,
      })
    })

    it("stores no cas for a v3.0 survey", async () => {
      const id = uniqueId("e2e-mv-post30")
      await post(
        draft(id, {
          ibp_method_version: V3_0,
          ibp_cas: 2,
          ibp_cas3_scale: true,
          region_version: "ACA",
          vegetation_stage: "collineen",
        }),
      ).expect(201)

      expect(await stored(id)).toMatchObject({
        ibp_method_version: V3_0,
        ibp_cas: null,
        ibp_cas3_scale: null,
        region_version: "ACA",
        vegetation_stage: "collineen",
      })
    })

    it("PATCH sets the cas of a v3.2 draft and a switch to v3.0 clears it", async () => {
      const id = uniqueId("e2e-mv-patch")
      await post(draft(id, { ibp_method_version: V3_2, ibp_cas: 1 })).expect(201)

      await request(server())
        .patch(`/v1/surveys/${id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ ibp_cas: 4, ibp_cas3_scale: true })
        .expect(200)
      expect(await stored(id)).toMatchObject({
        ibp_method_version: V3_2,
        ibp_cas: 4,
        ibp_cas3_scale: true,
      })

      await request(server())
        .patch(`/v1/surveys/${id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ ibp_method_version: V3_0, region_version: "ACA", vegetation_stage: "collineen" })
        .expect(200)
      expect(await stored(id)).toMatchObject({
        ibp_method_version: V3_0,
        ibp_cas: null,
        ibp_cas3_scale: null,
        region_version: "ACA",
        vegetation_stage: "collineen",
      })
    })
  })

  describe("validation and scoring per version (rule 4, CH-6)", () => {
    it("scores MAT-VER-01's C as 0 untagged, 0 under v3.0 and 1 under v3.2", async () => {
      const cases: Array<[Record<string, unknown>, number]> = [
        [{}, 0],
        [{ ibp_method_version: V3_0 }, 0],
        [{ ibp_method_version: V3_2, ibp_cas: 1 }, 1],
      ]
      for (const [method, expected] of cases) {
        const id = uniqueId("e2e-mv-matver01")
        const response = await post(
          draft(id, { factors: { C: C_BMG1_BMM1_2HA }, ...method }),
        ).expect(201)
        expect(response.body.factor_results.C.score_points).toBe(expected)
        expect((await stored(id)).factor_results.C.score_points).toBe(expected)
      }
    })

    it("accepts a v3.2 draft without a cas with A and G unscored, then refuses its submit", async () => {
      const id = uniqueId("e2e-mv-nocas")
      const parcelId = await freshParcel()
      const response = await post(
        draft(id, {
          parcel_ids: [parcelId],
          ibp_method_version: V3_2,
          factors: {
            ...validDirectFactors,
            A: { native_genus_count: 5, native_cover_percent: 60 },
            G: { open_flowering_percent: 2 },
          },
        }),
      ).expect(201)

      expect(response.body.factor_results.A).toBeUndefined()
      expect(response.body.factor_results.G).toBeUndefined()
      expect(response.body.factor_results.B.score_points).toBe(1)
      expect(response.body.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("factor A is incomplete"),
          expect.stringContaining("factor G is incomplete"),
        ]),
      )

      const refused = await submit(id).expect(422)
      expect(refused.body.errors).toEqual(
        expect.arrayContaining(["ibp_cas is required and must be 1, 2, 3 or 4"]),
      )
      expect((await stored(id)).status).toBe("draft")
    })

    it("submits a v3.0 survey tagged or untagged with the v3.0 scores", async () => {
      const tagged = await submitted("e2e-mv-sub30", {
        ibp_method_version: V3_0,
        region_version: "ACA",
        vegetation_stage: "collineen",
      })
      const untagged = await submitted("e2e-mv-sub-untagged", {
        region_version: "ACA",
        vegetation_stage: "collineen",
      })

      const expectedScores = { ibp_peuplement_gestion: 8, ibp_contexte: 6, ibp_total: 14 }
      expect(await stored(tagged)).toMatchObject({
        status: "submitted",
        ibp_method_version: V3_0,
        scores: expectedScores,
      })
      expect(await stored(untagged)).toMatchObject({
        status: "submitted",
        ibp_method_version: null,
        scores: expectedScores,
      })
    })

    it("submits a v3.2 survey with its cas", async () => {
      const id = await submitted("e2e-mv-sub32", { ibp_method_version: V3_2, ibp_cas: 1 })
      expect(await stored(id)).toMatchObject({
        status: "submitted",
        ibp_method_version: V3_2,
        ibp_cas: 1,
        scores: { ibp_total: 14 },
      })
    })

    it("rejects an unknown version or cas via REST with 400", async () => {
      const unknownVersion = await post(
        draft(uniqueId("e2e-mv-v9"), { ibp_method_version: "cnpf_ibp_fr_v9" }),
      ).expect(400)
      expect(JSON.stringify(unknownVersion.body.message)).toContain("ibp_method_version")

      const badCas = await post(
        draft(uniqueId("e2e-mv-cas7"), { ibp_method_version: V3_2, ibp_cas: 7 }),
      ).expect(400)
      expect(JSON.stringify(badCas.body.message)).toContain("ibp_cas")

      await post(draft(uniqueId("e2e-mv-flag"), { ibp_cas3_scale: "yes" })).expect(400)
    })

    it("rejects an unknown version via /v1/sync as a validation error result", async () => {
      const id = uniqueId("e2e-mv-sync-v9")
      const result = await sync(draft(id, { ibp_method_version: "v9", ibp_cas: 7 }))

      expect(result.status).toBe("fatal_error")
      expect(result.error).toMatchObject({ code: "invalid_sync_operation", http_status: 400 })
      expect(result.error?.details?.fields).toEqual(["ibp_method_version", "ibp_cas"])
      const row = await db.query(`SELECT 1 FROM surveys WHERE id = $1`, [id])
      expect(row.rowCount).toBe(0)
    })
  })

  describe("fixed after submit (rule 3, T-01.8-23)", () => {
    it("refuses a replay that changes the method version or the cas with a 409", async () => {
      const id = await submitted("e2e-mv-fixed", { ibp_method_version: V3_2, ibp_cas: 1 })
      const base = draft(id, { ibp_method_version: V3_2, ibp_cas: 1 })

      const changedVersion = await sync({
        ...base,
        sync_version: 2,
        ibp_method_version: V3_0,
        region_version: "ACA",
        vegetation_stage: "collineen",
      })
      expect(changedVersion.status).toBe("fatal_error")
      expect(changedVersion.error).toMatchObject({
        code: "survey_submitted_read_only",
        http_status: 409,
      })
      expect(changedVersion.error?.details?.fields).toContain("ibp_method_version")

      const changedCas = await sync({ ...base, sync_version: 2, ibp_cas: 2 })
      expect(changedCas.error).toMatchObject({
        code: "survey_submitted_read_only",
        http_status: 409,
      })
      expect(changedCas.error?.details?.fields).toEqual(["ibp_cas"])

      const changedFlag = await sync({ ...base, sync_version: 2, ibp_cas3_scale: true })
      expect(changedFlag.error?.details?.fields).toEqual(["ibp_cas3_scale"])

      // Same sync_version with a different cas: a same-version content conflict.
      const sameVersion = await sync({ ...base, ibp_cas: 3 })
      expect(sameVersion.error).toMatchObject({ code: "sync_version_conflict", http_status: 409 })

      // An identical replay is still accepted.
      expect((await sync({ ...base, sync_version: 2 })).status).toBe("synced")
      expect(await stored(id)).toMatchObject({
        ibp_method_version: V3_2,
        ibp_cas: 1,
        ibp_cas3_scale: null,
        sync_version: 2,
      })
    })

    it("refuses a PATCH of the method fields after submit (submitted_read_only_fields)", async () => {
      const id = await submitted("e2e-mv-fixed-patch", { ibp_method_version: V3_2, ibp_cas: 1 })

      const patch = await request(server())
        .patch(`/v1/surveys/${id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ ibp_cas: 2 })
        .expect(422)
      expect(patch.body.code).toBe("submitted_read_only_fields")
      expect(patch.body.forbidden_fields).toEqual(["ibp_cas"])
      expect((await stored(id)).ibp_cas).toBe(1)
    })

    it("accepts the explicit v3.0 tag replayed for an untagged submitted survey", async () => {
      const id = await submitted("e2e-mv-legacy-tag", {
        region_version: "ACA",
        vegetation_stage: "collineen",
      })
      const before = await stored(id)
      const base = draft(id, {
        region_version: "ACA",
        vegetation_stage: "collineen",
        ibp_method_version: V3_0,
      })

      expect((await sync(base)).status).toBe("synced")
      expect((await sync({ ...base, sync_version: 2 })).status).toBe("synced")

      const after = await stored(id)
      expect(after.ibp_method_version).toBeNull()
      expect(after.scores).toEqual(before.scores)
      expect(after.factor_results).toEqual(before.factor_results)
    })
  })

  describe("old apps (RESEARCH §4.4, T-01.8-26)", () => {
    it("keeps a stored v3.2 draft v3.2 when an untagged edit arrives, and scores it as v3.2", async () => {
      const id = uniqueId("e2e-mv-oldapp")
      await post(
        draft(id, {
          ibp_method_version: V3_2,
          ibp_cas: 1,
          factors: { C: C_BMG1_BMM1_2HA },
        }),
      ).expect(201)

      // An installed app that pulled the survey dropped the method fields and sends region/stage.
      const result = await sync(
        draft(id, {
          sync_version: 2,
          region_version: "ACA",
          vegetation_stage: "collineen",
          factors: { C: C_BMG1_BMM1_2HA },
        }),
      )

      expect(result.status).toBe("synced")
      expect(result.data?.factor_results?.C.score_points).toBe(1)
      const row = await stored(id)
      expect(row).toMatchObject({
        ibp_method_version: V3_2,
        ibp_cas: 1,
        region_version: null,
        vegetation_stage: null,
        sync_version: 2,
      })
      expect(row.factor_results.C.score_points).toBe(1)
    })

    it("keeps an untagged survey untagged across edits (never stamped)", async () => {
      const id = uniqueId("e2e-mv-untagged")
      const first = await sync(draft(id, { region_version: "ACA", vegetation_stage: "collineen" }))
      expect(first.status).toBe("synced")
      const second = await sync(
        draft(id, { sync_version: 2, region_version: "M", vegetation_stage: "montagnard" }),
      )
      expect(second.status).toBe("synced")
      expect(await stored(id)).toMatchObject({
        ibp_method_version: null,
        ibp_cas: null,
        region_version: "M",
        vegetation_stage: "montagnard",
      })
    })
  })

  describe("responses (rule 6)", () => {
    it("returns the three fields in the survey detail and the changes feed", async () => {
      const tagged = uniqueId("e2e-mv-resp32")
      const legacy = uniqueId("e2e-mv-resp30")
      await post(
        draft(tagged, { ibp_method_version: V3_2, ibp_cas: 3, ibp_cas3_scale: false }),
      ).expect(201)
      await post(draft(legacy, { region_version: "ACA", vegetation_stage: "collineen" })).expect(
        201,
      )

      const detail = await request(server())
        .get(`/v1/surveys/${tagged}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)
      expect(detail.body).toMatchObject({
        ibp_method_version: V3_2,
        ibp_cas: 3,
        ibp_cas3_scale: false,
        region_version: null,
      })

      const legacyDetail = await request(server())
        .get(`/v1/surveys/${legacy}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)
      expect(legacyDetail.body).toMatchObject({
        ibp_method_version: null,
        ibp_cas: null,
        ibp_cas3_scale: null,
      })

      const changes = await request(server())
        .get("/v1/sync/changes")
        .set("Authorization", `Bearer ${accessToken}`)
        .query({ limit: 200 })
        .expect(200)
      const surveys = changes.body.surveys as Array<Record<string, unknown>>
      expect(surveys.find((survey) => survey.id === tagged)).toMatchObject({
        ibp_method_version: V3_2,
        ibp_cas: 3,
        ibp_cas3_scale: false,
      })
      const legacyFeed = surveys.find((survey) => survey.id === legacy)
      expect(legacyFeed).toMatchObject({
        ibp_method_version: null,
        ibp_cas: null,
        ibp_cas3_scale: null,
      })
    })
  })
})
