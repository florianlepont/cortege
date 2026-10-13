import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import {
  createE2eApp,
  createSubmittedSurvey,
  getNextVersionNumber,
  loginTestUser,
  uniqueCoordSeed,
  uniqueId,
  validDirectFactors,
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
        factors: validDirectFactors,
        survey_note: "Premier passage, sol tres sec",
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
        factors: validDirectFactors,
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
      ibp_method_version: string | null
      survey_note: string | null
    }>
    expect(items.some((item) => item.survey_id === surveyIdV1)).toBe(true)
    expect(items.some((item) => item.survey_id === surveyIdV2)).toBe(true)
    // Phase 27 (D-06): the note of a submitted survey is on its history item, null when it has none.
    expect(items.find((item) => item.survey_id === surveyIdV1)?.survey_note).toBe(
      "Premier passage, sol tres sec",
    )
    expect(items.find((item) => item.survey_id === surveyIdV2)?.survey_note).toBeNull()
    for (const item of items) {
      expect(item).toHaveProperty("survey_note")
      expect(item).toHaveProperty("ibp_method_version")
      expect(item.ibp_method_version === null || typeof item.ibp_method_version === "string").toBe(
        true,
      )
    }
  })

  describe("Phase 29 visibility (D-10)", () => {
    it("shows each caller their own private surveys and the shared ones, never another member's private survey", async () => {
      const seed = uniqueCoordSeed()
      const at = { lat: 48.903 + seed / 100000, lng: 2.391 + seed / 100000 }
      const tokenA = await loginTestUser(app, "e2e-history-vis-a")
      const tokenB = await loginTestUser(app, "e2e-history-vis-b")

      const aPrivate = await createSubmittedSurvey(app, db, tokenA, { visibility: "private", at })
      const aShared = await createSubmittedSurvey(app, db, tokenA, { visibility: "public", at })
      const bShared = await createSubmittedSurvey(app, db, tokenB, { visibility: "public", at })
      const bPrivate = await createSubmittedSurvey(app, db, tokenB, { visibility: "private", at })
      const parcelId = aPrivate.parcelId
      expect(new Set([aShared, bShared, bPrivate].map((s) => s.parcelId))).toEqual(
        new Set([parcelId]),
      )

      const historyIds = async (token: string): Promise<string[]> => {
        const res = await request(app.getHttpServer())
          .get(`/v1/parcels/${encodeURIComponent(parcelId)}/surveys/history`)
          .set("Authorization", `Bearer ${token}`)
          .query({ limit: 10 })
          .expect(200)
        return (res.body.items as Array<{ survey_id: string }>).map((item) => item.survey_id)
      }

      const idsA = await historyIds(tokenA)
      expect(idsA).toEqual([aPrivate.surveyId, aShared.surveyId, bShared.surveyId])
      expect(idsA).not.toContain(bPrivate.surveyId)

      const idsB = await historyIds(tokenB)
      expect(idsB).toEqual([aShared.surveyId, bShared.surveyId, bPrivate.surveyId])
      expect(idsB).not.toContain(aPrivate.surveyId)

      await request(app.getHttpServer())
        .get(`/v1/parcels/${encodeURIComponent(parcelId)}/surveys/history`)
        .expect(401)
    })
  })
})
