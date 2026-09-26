import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import {
  createE2eApp,
  getNextVersionNumber,
  loginTestUser,
  uniqueCoordSeed,
  uniqueId,
} from "./helpers/surveys-e2e"

// Phase 01.8 D-12: split out of the former catch-all surveys-idempotency suite. This file covers
// parcel resolution from coordinates and the parcel survey history.

describe("Parcel history (e2e)", () => {
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

  it("resolves a parcel from coordinates and returns parcel history entries", async () => {
    const runSeed = uniqueCoordSeed()
    const baseLat = 48.703 + runSeed / 100000
    const baseLng = 2.191 + runSeed / 100000
    const accessToken = await loginTestUser(app, "e2e-parcel-history")
    const validFactors = {
      A: 1,
      B: 1,
      C: 1,
      D: 1,
      E: 1,
      F: 1,
      G: 1,
      H: 1,
      I: 2,
      J: 2,
    }

    const resolved = await request(app.getHttpServer())
      .get("/v1/parcels/resolve")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ lat: String(baseLat), lng: String(baseLng) })
      .expect(200)

    const parcelId = resolved.body.parcel?.parcel_id as string
    expect(parcelId).toBeTruthy()
    expect(typeof resolved.body.parcel?.commune_code).toBe("string")
    const surveyIdV1VersionNumber = await getNextVersionNumber(db, parcelId)

    const surveyIdV1 = uniqueId("e2e-parcel-history-v1")
    const surveyIdV2 = uniqueId("e2e-parcel-history-v2")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyIdV1,
        sync_version: 1,
        site_name: "Parcel History Forest V1",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: surveyIdV1VersionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validFactors,
        location: { source: "gps", lat: baseLat, lng: baseLng },
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyIdV1}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    const secondVersionNumber = await getNextVersionNumber(db, parcelId, surveyIdV2)

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyIdV2,
        sync_version: 1,
        site_name: "Parcel History Forest V2",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2026,
        version_number: secondVersionNumber,
        previous_survey_id: surveyIdV1,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validFactors,
        location: { source: "gps", lat: baseLat + 0.0001, lng: baseLng + 0.0001 },
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyIdV2}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    const history = await request(app.getHttpServer())
      .get(`/v1/parcels/${encodeURIComponent(parcelId)}/surveys/history`)
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ limit: 10 })
      .expect(200)

    expect(history.body.parcel_id).toBe(parcelId)
    const items = history.body.items as Array<{
      survey_id: string
      observation_year: number
      version_number: number
    }>
    expect(items.some((item) => item.survey_id === surveyIdV1)).toBe(true)
    expect(items.some((item) => item.survey_id === surveyIdV2)).toBe(true)
  })
})
