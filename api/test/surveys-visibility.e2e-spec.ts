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
} from "./helpers/surveys-e2e"

// Phase 01.8 D-12: split out of the former catch-all surveys-idempotency suite. This file covers
// visibility changes after submit, through PATCH and through a sync visibility_update.

describe("Surveys visibility (e2e)", () => {
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

  it("toggles visibility after submit via PATCH /v1/surveys/:id/visibility and writes visibility_changed event", async () => {
    const accessToken = await loginTestUser(app, "e2e-submit-visibility")
    const surveyId = uniqueId("e2e-submit-visibility")
    const seed = uniqueCoordSeed()
    const lat = 48.75 + seed / 100000
    const lng = 1.95 + seed / 100000

    const parcelId = await resolveParcel(app, accessToken, lat, lng)
    const versionNumber = await getNextVersionNumber(db, parcelId)

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Visibility Forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: {
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
        },
        location: { source: "gps", lat, lng },
      })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/submit`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201)

    const toggle = await request(app.getHttpServer())
      .patch(`/v1/surveys/${surveyId}/visibility`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ visibility: "public" })
      .expect(200)

    expect(toggle.body.id).toBe(surveyId)
    expect(toggle.body.visibility).toBe("public")
    expect(typeof toggle.body.updated_at).toBe("string")

    const detail = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    expect(detail.body.visibility).toBe("public")

    const events = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}/events`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)

    const visibilityEvent = (
      events.body.items as Array<{ event_type: string; payload?: { from?: string; to?: string } }>
    ).find(
      (event) =>
        event.event_type === "visibility_changed" &&
        event.payload?.from === "private" &&
        event.payload?.to === "public",
    )
    expect(visibilityEvent).toBeTruthy()
  })

  it("processes survey visibility_update operation via POST /v1/sync", async () => {
    const accessToken = await loginTestUser(app, "e2e-sync-visibility")
    const surveyId = uniqueId("e2e-sync-visibility")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Sync Visibility Forest",
        status: "draft",
        visibility: "private",
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: {
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
        },
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const sync = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [
          {
            client_ref: "op-visibility",
            entity: "survey",
            action: "visibility_update",
            survey_id: surveyId,
            payload: {
              visibility: "public",
            },
          },
        ],
      })
      .expect(200)

    expect(sync.body.results).toHaveLength(1)
    expect(sync.body.results[0]).toMatchObject({
      client_ref: "op-visibility",
      entity: "survey",
      action: "visibility_update",
      status: "synced",
    })
    expect(sync.body.results[0].data.visibility).toBe("public")

    const detail = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    expect(detail.body.visibility).toBe("public")
  })
})
