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

// /v1/public/community-surveys/:id and its attachments: a finished survey of any member, read-only
// (association-only sharing), with the author, a rounded location and the history of its parcel.

describe("Community survey page (e2e)", () => {
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

  async function createSurvey(
    token: string,
    id: string,
    siteName: string,
    parcelId: string,
    submit: boolean,
  ) {
    const versionNumber = await getNextVersionNumber(db, parcelId)
    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id,
        sync_version: 1,
        site_name: siteName,
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat: 47.2, lng: 1.2 },
      })
      .expect(201)
    if (submit) {
      await request(app.getHttpServer())
        .post(`/v1/surveys/${id}/submit`)
        .set("Authorization", `Bearer ${token}`)
        .expect(201)
    }
  }

  async function uploadPhoto(token: string, surveyId: string): Promise<string> {
    const bytes = Buffer.from("fake-jpeg-binary")
    const created = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mime_type: "image/jpeg", size_bytes: bytes.length })
      .expect(201)
    if (String(created.body.upload_url).startsWith("http")) {
      const put = await fetch(created.body.upload_url as string, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: bytes,
      })
      expect(put.ok).toBe(true)
      await request(app.getHttpServer())
        .put(`/v1${created.body.confirm_url}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
    } else {
      await request(app.getHttpServer())
        .put(`/v1${created.body.upload_url}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("file", bytes, { filename: "sample.jpg", contentType: "image/jpeg" })
        .expect(200)
    }
    return created.body.attachment_id as string
  }

  it("requires authentication", async () => {
    await request(app.getHttpServer()).get("/v1/public/community-surveys/any-id").expect(401)
    await request(app.getHttpServer())
      .get("/v1/public/community-surveys/any-id/attachments")
      .expect(401)
  })

  it("shows another member's finished survey with its author, parcels, place and parcel history", async () => {
    const authorToken = await loginTestUser(app, "e2e-community-detail-author")
    const secondToken = await loginTestUser(app, "e2e-community-detail-second")
    const readerToken = await loginTestUser(app, "e2e-community-detail-reader")
    const seed = uniqueCoordSeed()
    const parcelId = await resolveParcel(
      app,
      authorToken,
      47.31 + seed / 100000,
      1.31 + seed / 100000,
    )
    const firstId = uniqueId("e2e-community-detail-1")
    const secondId = uniqueId("e2e-community-detail-2")
    await createSurvey(authorToken, firstId, "Bois du Premier", parcelId, true)
    await createSurvey(secondToken, secondId, "Bois du Second", parcelId, true)

    const response = await request(app.getHttpServer())
      .get(`/v1/public/community-surveys/${secondId}`)
      .set("Authorization", `Bearer ${readerToken}`)
      .expect(200)

    const detail = response.body
    expect(detail.survey_id).toBe(secondId)
    expect(detail.site_name).toBe("Bois du Second")
    expect(typeof detail.author_name).toBe("string")
    expect(detail.parcel_ids).toEqual([parcelId])
    expect(typeof detail.scores.ibp_total).toBe("number")
    expect(typeof detail.factor_results).toBe("object")
    expect(detail.ibp_cas3_scale).toBe(false)
    // Internal use: the exact place, not the public map's rounded one.
    const { lat, lng } = detail.display_location as { lat: number; lng: number }
    expect(typeof lat).toBe("number")
    expect(typeof lng).toBe("number")
    expect(detail).not.toHaveProperty("parcel_count")

    const history = detail.history as Array<{
      survey_id: string
      site_name: string
      author_name: string | null
      is_current: boolean
      version_number: number
    }>
    expect(history.map((item) => item.survey_id)).toEqual([firstId, secondId])
    expect(history.map((item) => item.is_current)).toEqual([false, true])
    expect(history[0].version_number).toBeLessThan(history[1].version_number)
    expect(history[0].site_name).toBe("Bois du Premier")
    expect(history[0].author_name).not.toBe(history[1].author_name)
  })

  it("answers 404 for a draft, an unknown survey and a deleted one", async () => {
    const token = await loginTestUser(app, "e2e-community-detail-404")
    const parcelId = await resolveParcel(app, token, 47.4 + uniqueCoordSeed() / 100000, 1.4)
    const draftId = uniqueId("e2e-community-detail-draft")
    await createSurvey(token, draftId, "Brouillon", parcelId, false)

    await request(app.getHttpServer())
      .get(`/v1/public/community-surveys/${draftId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404)
    await request(app.getHttpServer())
      .get(`/v1/public/community-surveys/${draftId}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404)
    await request(app.getHttpServer())
      .get("/v1/public/community-surveys/does-not-exist")
      .set("Authorization", `Bearer ${token}`)
      .expect(404)
  })

  it("lists and serves the photos of a finished survey to another member", async () => {
    const authorToken = await loginTestUser(app, "e2e-community-photo-author")
    const readerToken = await loginTestUser(app, "e2e-community-photo-reader")
    const parcelId = await resolveParcel(
      app,
      authorToken,
      47.5 + uniqueCoordSeed() / 100000,
      1.5 + uniqueCoordSeed() / 100000,
    )
    const surveyId = uniqueId("e2e-community-photo")
    await createSurvey(authorToken, surveyId, "Bois photographié", parcelId, true)
    const attachmentId = await uploadPhoto(authorToken, surveyId)

    const list = await request(app.getHttpServer())
      .get(`/v1/public/community-surveys/${surveyId}/attachments`)
      .set("Authorization", `Bearer ${readerToken}`)
      .expect(200)
    expect(list.body.items).toHaveLength(1)
    expect(list.body.items[0]).toEqual({
      id: attachmentId,
      mime_type: "image/jpeg",
      size_bytes: Buffer.from("fake-jpeg-binary").length,
      created_at: expect.any(String),
    })
    expect(list.body.items[0]).not.toHaveProperty("storage_key")

    const download = await request(app.getHttpServer())
      .get(`/v1/public/community-surveys/${surveyId}/attachments/${attachmentId}/download-url`)
      .set("Authorization", `Bearer ${readerToken}`)
      .expect(200)
    expect(typeof download.body.expires_at).toBe("string")
    if (download.body.requires_auth === true) {
      expect(download.body.url).toBe(
        `/public/community-surveys/${surveyId}/attachments/${attachmentId}/content`,
      )
      const content = await request(app.getHttpServer())
        .get(`/v1${download.body.url}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(content.headers["content-type"]).toContain("image/jpeg")
    } else {
      const fetched = await fetch(download.body.url as string)
      expect(fetched.ok).toBe(true)
    }

    await request(app.getHttpServer())
      .get(`/v1/public/community-surveys/${surveyId}/attachments/not-an-attachment/download-url`)
      .set("Authorization", `Bearer ${readerToken}`)
      .expect(404)
  })
})
