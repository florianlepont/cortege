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
//
// Phase 29 (private or public before submission): both routes require an authenticated member and
// show the shared submitted surveys (visibility "public", chosen before submit) to every member,
// never a private survey or a draft. A parcel whose only survey is private is not studied.

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

  it("requires authentication on both public routes", async () => {
    await request(app.getHttpServer()).get("/v1/public/map-items").expect(401)
    await request(app.getHttpServer())
      .get("/v1/public/parcels/status")
      .query({ bbox: "1.0,43.0,2.0,44.0", zoom: 16 })
      .expect(401)
  })

  it("exposes shared submitted surveys to any member, never a private one or a draft", async () => {
    const accessToken = await loginTestUser(app, "e2e-public-map")
    const otherMemberToken = await loginTestUser(app, "e2e-public-map-other")
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
        visibility: "public",
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

    // A different member than the one who submitted the surveys: they see the shared one and
    // never the private one.
    const mapForOtherMember = await request(app.getHttpServer())
      .get("/v1/public/map-items")
      .set("Authorization", `Bearer ${otherMemberToken}`)
      .query({ region: "ACA" })
      .expect(200)

    const items = mapForOtherMember.body.items as Array<{
      survey_id: string
      region_code: string
      ibp_total: number
    }>
    expect(items.some((item) => item.survey_id === submittedPublicId)).toBe(true)
    expect(items.some((item) => item.survey_id === submittedPrivateId)).toBe(false)
    expect(items.some((item) => item.survey_id === draftPublicId)).toBe(false)

    const included = items.find((item) => item.survey_id === submittedPublicId)
    expect(included?.region_code).toBe("ACA")
    expect(typeof included?.ibp_total).toBe("number")
  })

  it("a parcel whose only survey is private shows as not studied to another member", async () => {
    const runSeed = uniqueCoordSeed()
    const baseLat = 43.6045 + (runSeed % 80000) / 10000000
    const baseLng = 1.444 + (runSeed % 80000) / 10000000
    const accessToken = await loginTestUser(app, "e2e-parcel-status")
    const otherMemberToken = await loginTestUser(app, "e2e-parcel-status-other")

    const createAndSubmit = async (
      label: string,
      visibility: "private" | "public",
      lat: number,
      lng: number,
    ) => {
      const surveyId = uniqueId(label)
      const parcelId = await resolveParcel(app, accessToken, lat, lng)
      const versionNumber = await getNextVersionNumber(db, parcelId)
      const upsert = await request(app.getHttpServer())
        .post("/v1/surveys")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          id: surveyId,
          sync_version: 1,
          site_name: "Parcel Status Forest",
          status: "draft",
          visibility,
          parcel_id: parcelId,
          observation_year: 2026,
          version_number: versionNumber,
          region_version: "ACA",
          vegetation_stage: "collineen",
          factors: validDirectFactors,
          location: { source: "gps", lat, lng },
        })
        .expect(201)
      expect(upsert.body.id).toBe(surveyId)

      await request(app.getHttpServer())
        .post(`/v1/surveys/${surveyId}/submit`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201)
      return parcelId
    }

    const sharedParcelId = await createAndSubmit(
      "e2e-parcel-status-shared",
      "public",
      baseLat,
      baseLng,
    )
    const privateParcelId = await createAndSubmit(
      "e2e-parcel-status-private",
      "private",
      baseLat + 0.002,
      baseLng + 0.002,
    )
    expect(privateParcelId).not.toBe(sharedParcelId)

    const statuses = await request(app.getHttpServer())
      .get("/v1/public/parcels/status")
      .set("Authorization", `Bearer ${otherMemberToken}`)
      .query({ bbox: "1.0,43.0,2.0,44.0", zoom: 16, year: 2026 })
      .expect(200)

    const items = statuses.body.items as Array<{
      parcel_id: string
      study_status: string
      latest_observation_year: number
    }>
    const sharedItem = items.find((item) => item.parcel_id === sharedParcelId)
    expect(sharedItem).toBeTruthy()
    expect(sharedItem?.study_status).toBe("studied")
    expect(sharedItem?.latest_observation_year).toBe(2026)
    // D-11: a parcel with only private surveys is not studied for another member.
    const privateItem = items.find((item) => item.parcel_id === privateParcelId)
    expect(privateItem?.study_status ?? "not_studied").not.toBe("studied")

    // From zoom 12 to 15 only the studied parcels come back (database path, no IGN call), so a
    // forest of large parcels shows its coloured parcels without zooming right in.
    const midZoom = await request(app.getHttpServer())
      .get("/v1/public/parcels/status")
      .set("Authorization", `Bearer ${otherMemberToken}`)
      .query({ bbox: "1.0,43.0,2.0,44.0", zoom: 14 })
      .expect(200)
    const midItems = midZoom.body.items as Array<{ parcel_id: string; study_status: string }>
    expect(midItems.find((item) => item.parcel_id === sharedParcelId)?.study_status).toBe("studied")
    expect(midItems.find((item) => item.parcel_id === privateParcelId)).toBeUndefined()
    expect(midItems.every((item) => item.study_status === "studied")).toBe(true)

    // Below zoom 12 no parcel is drawn: the route answers empty without a query.
    const farZoom = await request(app.getHttpServer())
      .get("/v1/public/parcels/status")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ bbox: "1.0,43.0,2.0,44.0", zoom: 11 })
      .expect(200)
    expect(farZoom.body.items).toEqual([])
  })
})
