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
// /v1/public/map-items inclusion rules and /v1/public/parcels/status.

describe("Public map items (e2e)", () => {
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

  it("exposes submitted+public surveys on /v1/public/map-items and removes them after public -> private", async () => {
    const accessToken = await loginTestUser(app, "e2e-public-map")
    const submittedPublicId = uniqueId("e2e-public-map-pub")
    const submittedPrivateId = uniqueId("e2e-public-map-prv")
    const draftPublicId = uniqueId("e2e-public-map-draft")
    const seed = uniqueCoordSeed()

    const parcelPubId = await resolveParcel(
      app,
      accessToken,
      48.9 + seed / 100000,
      2.1 + seed / 100000,
    )
    const submittedPublicVersionNumber = await getNextVersionNumber(db, parcelPubId)

    const parcelPrvId = await resolveParcel(
      app,
      accessToken,
      48.91 + seed / 100000,
      2.11 + seed / 100000,
    )
    const submittedPrivateVersionNumber = await getNextVersionNumber(db, parcelPrvId)

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: submittedPublicId,
        sync_version: 1,
        site_name: "Public Submitted Forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelPubId,
        observation_year: 2025,
        version_number: submittedPublicVersionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat: 48.9 + seed / 100000, lng: 2.1 + seed / 100000 },
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/v1/surveys/${submittedPublicId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    await request(app.getHttpServer())
      .patch(`/v1/surveys/${submittedPublicId}/visibility`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ visibility: "public" })
      .expect(200)

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: submittedPrivateId,
        sync_version: 1,
        site_name: "Private Submitted Forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelPrvId,
        observation_year: 2025,
        version_number: submittedPrivateVersionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat: 48.91 + seed / 100000, lng: 2.11 + seed / 100000 },
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/v1/surveys/${submittedPrivateId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: draftPublicId,
        sync_version: 1,
        site_name: "Public Draft Forest",
        status: "draft",
        visibility: "public",
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat: 48.649, lng: 1.827 },
      })
      .expect(201)

    const mapBeforeHide = await request(app.getHttpServer())
      .get("/v1/public/map-items")
      .query({ region: "ACA" })
      .expect(200)

    const beforeItems = mapBeforeHide.body.items as Array<{
      survey_id: string
      region_code: string
      ibp_total: number
    }>
    expect(beforeItems.some((item) => item.survey_id === submittedPublicId)).toBe(true)
    expect(beforeItems.some((item) => item.survey_id === submittedPrivateId)).toBe(false)
    expect(beforeItems.some((item) => item.survey_id === draftPublicId)).toBe(false)

    const included = beforeItems.find((item) => item.survey_id === submittedPublicId)
    expect(included?.region_code).toBe("ACA")
    expect(typeof included?.ibp_total).toBe("number")

    await request(app.getHttpServer())
      .patch(`/v1/surveys/${submittedPublicId}/visibility`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ visibility: "private" })
      .expect(200)

    const mapAfterHide = await request(app.getHttpServer())
      .get("/v1/public/map-items")
      .query({ region: "ACA" })
      .expect(200)

    const afterItems = mapAfterHide.body.items as Array<{ survey_id: string }>
    expect(afterItems.some((item) => item.survey_id === submittedPublicId)).toBe(false)
  })

  it("exposes parcel study status on /v1/public/parcels/status", async () => {
    const runSeed = uniqueCoordSeed()
    const baseLat = 43.6045 + (runSeed % 80000) / 10000000
    const baseLng = 1.444 + (runSeed % 80000) / 10000000
    const accessToken = await loginTestUser(app, "e2e-parcel-status")
    const surveyId = uniqueId("e2e-parcel-status")

    const parcelId = await resolveParcel(app, accessToken, baseLat, baseLng)
    const versionNumber = await getNextVersionNumber(db, parcelId)

    const upsert = await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Parcel Status Forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2026,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat: baseLat, lng: baseLng },
      })
      .expect(201)

    expect(upsert.body.id).toBe(surveyId)

    await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    await request(app.getHttpServer())
      .patch(`/v1/surveys/${surveyId}/visibility`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ visibility: "public" })
      .expect(200)

    const statuses = await request(app.getHttpServer())
      .get("/v1/public/parcels/status")
      .query({ bbox: "1.0,43.0,2.0,44.0", zoom: 16, year: 2026 })
      .expect(200)

    const items = statuses.body.items as Array<{
      parcel_id: string
      study_status: string
      latest_observation_year: number
    }>
    const parcelItem = items.find((item) => item.parcel_id === parcelId)
    expect(parcelItem).toBeTruthy()
    expect(parcelItem?.study_status).toBe("studied")
    expect(parcelItem?.latest_observation_year).toBe(2026)

    const lowZoom = await request(app.getHttpServer())
      .get("/v1/public/parcels/status")
      .query({ bbox: "1.0,43.0,2.0,44.0", zoom: 14 })
      .expect(200)
    expect(lowZoom.body.items).toEqual([])
  })
})
