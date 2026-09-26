import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import {
  createE2eApp,
  getNextVersionNumber,
  loginTestUser,
  resolveParcel,
  uniqueCoordSeed,
  uniqueId,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// Phase 01.8 D-12: split out of the former catch-all surveys-idempotency suite. This file covers
// submit validation (incomplete factors, missing parcel, expiry), computed scores, the
// read-only rule after submit and canonical factor_results.

describe("Surveys submit (e2e)", () => {
  let app: INestApplication
  let db: DatabaseService

  beforeAll(async () => {
    const context = await createE2eApp()
    app = context.app
    db = context.db
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  it("rejects submit when IBP factors are incomplete", async () => {
    const accessToken = await loginTestUser(app, "e2e-submit-invalid")
    const surveyId = uniqueId("e2e-submit-invalid")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Incomplete Forest",
        status: "draft",
        visibility: "private",
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: { A: 1, I: 2 },
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const submit = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(422)

    expect(Array.isArray(submit.body.errors)).toBe(true)
    expect(submit.body.errors.join(" ")).toContain("factor B is required")
  })

  it("rejects submit when parcel linkage is missing", async () => {
    const accessToken = await loginTestUser(app, "e2e-submit-no-parcel")
    const surveyId = uniqueId("e2e-submit-no-parcel")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "No Location Forest",
        status: "draft",
        visibility: "private",
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: {},
      })
      .expect(201)

    const submit = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(422)

    expect(Array.isArray(submit.body.errors)).toBe(true)
    expect(submit.body.errors.join(" ")).toContain("parcel_ids is required for submit")
  })

  it("marks survey as expired when submit is attempted after deadline", async () => {
    const accessToken = await loginTestUser(app, "e2e-submit-expired")
    const surveyId = uniqueId("e2e-submit-expired")
    const expiredAt = new Date(Date.now() - 60_000).toISOString()

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Expired Forest",
        status: "draft",
        visibility: "private",
        region_version: "ACA",
        vegetation_stage: "collineen",
        expires_at: expiredAt,
        factors: validDirectFactors,
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    // D-03: expires_at is computed server-side and never moved by an upsert;
    // set it directly to force the expired path for this test.
    await db.query("UPDATE surveys SET expires_at = $2 WHERE id = $1", [surveyId, expiredAt])

    const submit = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(422)

    expect(Array.isArray(submit.body.errors)).toBe(true)
    expect(submit.body.errors.join(" ")).toContain("survey is expired")

    const detail = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)

    expect(detail.body.status).toBe("expired")
  })

  it("submits valid IBP survey and returns computed scores", async () => {
    const accessToken = await loginTestUser(app, "e2e-submit-valid")
    const surveyId = uniqueId("e2e-submit-valid")
    const seed = uniqueCoordSeed()
    const lat = 48.643 + seed / 100000
    const lng = 1.829 + seed / 100000

    const parcelId = await resolveParcel(app, accessToken, lat, lng)
    const versionNumber = await getNextVersionNumber(db, parcelId)

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Valid Forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat, lng },
      })
      .expect(201)

    const submit = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    expect(submit.body.status).toBe("submitted")
    expect(submit.body.scores).toEqual({
      ibp_peuplement_gestion: 8,
      ibp_contexte: 6,
      ibp_total: 14,
    })
  })

  it("rejects non-visibility PATCH fields after submit", async () => {
    const accessToken = await loginTestUser(app, "e2e-submit-readonly")
    const surveyId = uniqueId("e2e-submit-readonly")
    const seed = uniqueCoordSeed()
    const lat = 48.7 + seed / 100000
    const lng = 1.9 + seed / 100000

    const parcelId = await resolveParcel(app, accessToken, lat, lng)
    const versionNumber = await getNextVersionNumber(db, parcelId)

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Read-only Forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat, lng },
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    const patch = await request(app.getHttpServer())
      .patch(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        factors: { A: 5 },
      })
      .expect(422)

    expect(patch.body.code).toBe("submitted_read_only_fields")
    expect(patch.body.forbidden_fields).toContain("factors")
  })

  it("submits a full raw-observation payload A..J and computes exact scores", async () => {
    const accessToken = await loginTestUser(app, "e2e-raw-full")
    const surveyId = uniqueId("e2e-raw-full")

    const seed = uniqueCoordSeed()
    const lat = 48.85 + seed / 100000
    const lng = 2.05 + seed / 100000

    const parcelId = await resolveParcel(app, accessToken, lat, lng)
    const versionNumber = await getNextVersionNumber(db, parcelId)

    const upsert = await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Raw Full Forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: {
          A: { native_genus_count: 2 },
          B: { strata_count: 3, covered_autochthonous_percent: 40 },
          C: { bmg_count: 0, bmm_count: 2, surface_ha: 1 },
          D: { bmg_count: 4, bmm_count: 0, surface_ha: 1 },
          E: { tgb_count: 0, gb_count: 2, surface_ha: 1 },
          F: { trees_per_ha: 8 },
          G: { open_flowering_percent: 2 },
          H: { class_score: 5 },
          I: { type_count: 2 },
          J: { type_count: 1 },
        },
        location: { source: "gps", lat, lng },
      })
      .expect(201)

    expect(Array.isArray(upsert.body.warnings)).toBe(true)

    const submit = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    expect(submit.body.scores).toEqual({
      ibp_peuplement_gestion: 20,
      ibp_contexte: 12,
      ibp_total: 32,
    })
  })

  it("exposes canonical factor_results on survey detail endpoint", async () => {
    const accessToken = await loginTestUser(app, "e2e-canonical")
    const surveyId = uniqueId("e2e-canonical")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Canonical Forest",
        status: "draft",
        visibility: "private",
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: {
          A: { native_genus_count: 4 },
          B: { strata_count: 2, covered_autochthonous_percent: 100 },
          C: { bmg_count: 0, bmm_count: 0, surface_ha: 1 },
          D: { bmg_count: 0, bmm_count: 0, surface_ha: 1 },
          E: { tgb_count: 0, gb_count: 0, surface_ha: 1 },
          F: { trees_per_ha: 1 },
          G: { open_flowering_percent: 0.5 },
          H: { class_score: 2 },
          I: { type_count: 1 },
          J: { type_count: 0 },
        },
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const detail = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)

    expect(detail.body.id).toBe(surveyId)
    expect(detail.body.factor_results).toBeTruthy()
    expect(detail.body.factor_results.A).toMatchObject({
      factor_id: "factor_a",
      selected_class: "S2",
      score_points: 2,
    })
    expect(detail.body.factor_results.G).toMatchObject({
      factor_id: "factor_g",
      selected_class: "S2",
      score_points: 2,
    })
  })
})
