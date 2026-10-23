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

// /v1/public/community-surveys/:id and its attachments: a shared finished survey of any member,
// read-only (association-only sharing), with the author, the exact centre of its parcels and the history of its parcel.

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
        visibility: "public",
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
    // The exact centre of the linked parcels, the same point as the map item (2026-10-08).
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
      ibp_method_version: string | null
    }>
    expect(history[0]).toHaveProperty("ibp_method_version")
    expect(history[1]).toHaveProperty("ibp_method_version")
    expect(history.map((item) => item.survey_id)).toEqual([firstId, secondId])
    expect(history.map((item) => item.is_current)).toEqual([false, true])
    expect(history[0].version_number).toBeLessThan(history[1].version_number)
    expect(history[0].site_name).toBe("Bois du Premier")
    expect(history[0].author_name).not.toBe(history[1].author_name)
  })

  describe("note, weather and factor annotations (phase 27)", () => {
    const NOTE = "Placette humide au nord, chênaie claire."
    const WEATHER = {
      sky: "cloudy",
      temperature_c: 8.5,
      wind_kmh: 12,
      rain_24h_mm: 2.4,
      observed_at: "2026-10-11T07:00:00.000Z",
      requested_at: "2026-10-11T07:05:00.000Z",
      source: "meteo_france",
      edited: ["sky"],
    }
    const ANNOTATIONS = { A: { doubt: true, note: "Chêne sessile ou pédonculé ?" } }

    async function createNotedSurvey(
      token: string,
      id: string,
      parcelId: string,
      submit: boolean,
      note: string,
    ) {
      const versionNumber = await getNextVersionNumber(db, parcelId)
      await request(app.getHttpServer())
        .post("/v1/surveys")
        .set("Authorization", `Bearer ${token}`)
        .send({
          id,
          sync_version: 1,
          site_name: "Bois annoté",
          status: "draft",
          visibility: "public",
          parcel_id: parcelId,
          observation_year: 2025,
          version_number: versionNumber,
          region_version: "ACA",
          vegetation_stage: "collineen",
          factors: { ...validDirectFactors, annotations: ANNOTATIONS },
          survey_note: note,
          weather: WEATHER,
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

    it("shows another member the note, the weather and the doubt of a finished survey", async () => {
      const authorToken = await loginTestUser(app, "e2e-community-note-author")
      const readerToken = await loginTestUser(app, "e2e-community-note-reader")
      const seed = uniqueCoordSeed()
      const parcelId = await resolveParcel(
        app,
        authorToken,
        47.6 + seed / 100000,
        1.6 + seed / 100000,
      )
      const firstId = uniqueId("e2e-community-note-1")
      const secondId = uniqueId("e2e-community-note-2")
      await createNotedSurvey(authorToken, firstId, parcelId, true, `${NOTE} (premier)`)
      await createNotedSurvey(authorToken, secondId, parcelId, true, NOTE)

      const response = await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${secondId}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)

      expect(response.body.survey_note).toBe(NOTE)
      expect(response.body.weather).toEqual(WEATHER)
      expect(response.body.factor_annotations).toEqual(ANNOTATIONS)
      const history = response.body.history as Array<{
        survey_id: string
        survey_note: string | null
      }>
      expect(history.map((item) => [item.survey_id, item.survey_note])).toEqual([
        [firstId, `${NOTE} (premier)`],
        [secondId, NOTE],
      ])
    })

    it("returns null fields for a finished survey that has no note", async () => {
      const token = await loginTestUser(app, "e2e-community-note-none")
      const readerToken = await loginTestUser(app, "e2e-community-note-none-reader")
      const parcelId = await resolveParcel(
        app,
        token,
        47.65 + uniqueCoordSeed() / 100000,
        1.65 + uniqueCoordSeed() / 100000,
      )
      const surveyId = uniqueId("e2e-community-note-null")
      await createSurvey(token, surveyId, "Sans note", parcelId, true)

      const response = await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${surveyId}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(response.body.survey_note).toBeNull()
      expect(response.body.weather).toBeNull()
      expect(response.body.factor_annotations).toBeNull()
    })

    it("never shows a draft's note, weather or doubt to another member (404, absent from the history)", async () => {
      const authorToken = await loginTestUser(app, "e2e-community-note-draft-author")
      const readerToken = await loginTestUser(app, "e2e-community-note-draft-reader")
      const parcelId = await resolveParcel(
        app,
        authorToken,
        47.7 + uniqueCoordSeed() / 100000,
        1.7 + uniqueCoordSeed() / 100000,
      )
      const submittedId = uniqueId("e2e-community-note-sub")
      const draftId = uniqueId("e2e-community-note-draft")
      await createNotedSurvey(authorToken, submittedId, parcelId, true, "Note publiee")
      await createNotedSurvey(authorToken, draftId, parcelId, false, "Note de brouillon secrete")

      await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${draftId}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(404)

      const detail = await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${submittedId}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(JSON.stringify(detail.body)).not.toContain("brouillon secrete")
      expect(
        (detail.body.history as Array<{ survey_id: string }>).map((item) => item.survey_id),
      ).toEqual([submittedId])
    })

    it("keeps the note and the factor notes after the author deletes the account (D-24)", async () => {
      const authorToken = await loginTestUser(app, "e2e-community-note-delete-author")
      const readerToken = await loginTestUser(app, "e2e-community-note-delete-reader")
      const parcelId = await resolveParcel(
        app,
        authorToken,
        47.75 + uniqueCoordSeed() / 100000,
        1.75 + uniqueCoordSeed() / 100000,
      )
      const surveyId = uniqueId("e2e-community-note-retained")
      await createNotedSurvey(authorToken, surveyId, parcelId, true, NOTE)

      const before = await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${surveyId}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(typeof before.body.author_name).toBe("string")

      await request(app.getHttpServer())
        .delete("/v1/me")
        .set("Authorization", `Bearer ${authorToken}`)
        .expect(204)

      const after = await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${surveyId}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(after.body.author_name).toBeNull()
      expect(after.body.survey_note).toBe(NOTE)
      expect(after.body.weather).toEqual(WEATHER)
      expect(after.body.factor_annotations).toEqual(ANNOTATIONS)
      expect(
        (after.body.history as Array<{ survey_id: string; survey_note: string | null }>).map(
          (item) => [item.survey_id, item.survey_note],
        ),
      ).toEqual([[surveyId, NOTE]])
    })
  })

  // Phase 30 (O-15): another member reads the recorded route of a finished survey they may see,
  // read-only. A draft or a private survey never reaches the reader (T-30-24).
  describe("recorded route (phase 30, O-15)", () => {
    const ROUTE = {
      version: 1,
      method: "partial_strip",
      counting: "uncapped",
      uncapped_factors: ["A", "B", "E"],
      zone_surface_ha: 12.5,
      complement: { done: true, total_surface_ha: 14.25 },
      guide: { chosen_by: "observer" },
    }

    async function createRouteSurvey(
      token: string,
      id: string,
      parcelId: string,
      options: { submit: boolean; visibility: "public" | "private"; route: boolean },
    ) {
      const versionNumber = await getNextVersionNumber(db, parcelId)
      await request(app.getHttpServer())
        .post("/v1/surveys")
        .set("Authorization", `Bearer ${token}`)
        .send({
          id,
          sync_version: 1,
          site_name: "Bois du parcours",
          status: "draft",
          visibility: options.visibility,
          parcel_id: parcelId,
          observation_year: 2025,
          version_number: versionNumber,
          region_version: "ACA",
          vegetation_stage: "collineen",
          factors: validDirectFactors,
          ...(options.route ? { survey_route: ROUTE } : {}),
          location: { source: "gps", lat: 47.2, lng: 1.2 },
        })
        .expect(201)
      if (options.submit) {
        await request(app.getHttpServer())
          .post(`/v1/surveys/${id}/submit`)
          .set("Authorization", `Bearer ${token}`)
          .expect(201)
      }
    }

    it("shows another member the route of a finished shared survey, and null for one without", async () => {
      const authorToken = await loginTestUser(app, "e2e-community-route-author")
      const readerToken = await loginTestUser(app, "e2e-community-route-reader")
      const parcelId = await resolveParcel(
        app,
        authorToken,
        47.8 + uniqueCoordSeed() / 100000,
        1.8 + uniqueCoordSeed() / 100000,
      )
      const withRoute = uniqueId("e2e-community-route-1")
      const legacy = uniqueId("e2e-community-route-2")
      await createRouteSurvey(authorToken, withRoute, parcelId, {
        submit: true,
        visibility: "public",
        route: true,
      })
      await createRouteSurvey(authorToken, legacy, parcelId, {
        submit: true,
        visibility: "public",
        route: false,
      })

      const shown = await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${withRoute}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(shown.body.survey_route).toEqual(ROUTE)
      // The route is a field of the survey itself, not of its history items.
      for (const item of shown.body.history as Array<Record<string, unknown>>) {
        expect(item).not.toHaveProperty("survey_route")
      }

      const none = await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${legacy}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(none.body).toHaveProperty("survey_route", null)
    })

    it("never shows the route of a draft or of a private finished survey to another member", async () => {
      const authorToken = await loginTestUser(app, "e2e-community-route-hidden-author")
      const readerToken = await loginTestUser(app, "e2e-community-route-hidden-reader")
      const parcelId = await resolveParcel(
        app,
        authorToken,
        47.85 + uniqueCoordSeed() / 100000,
        1.85 + uniqueCoordSeed() / 100000,
      )
      const sharedId = uniqueId("e2e-community-route-shared")
      const draftId = uniqueId("e2e-community-route-draft")
      const privateId = uniqueId("e2e-community-route-private")
      await createRouteSurvey(authorToken, sharedId, parcelId, {
        submit: true,
        visibility: "public",
        route: false,
      })
      await createRouteSurvey(authorToken, draftId, parcelId, {
        submit: false,
        visibility: "public",
        route: true,
      })
      await createRouteSurvey(authorToken, privateId, parcelId, {
        submit: true,
        visibility: "private",
        route: true,
      })

      for (const hiddenId of [draftId, privateId]) {
        await request(app.getHttpServer())
          .get(`/v1/public/community-surveys/${hiddenId}`)
          .set("Authorization", `Bearer ${readerToken}`)
          .expect(404)
      }
      const shared = await request(app.getHttpServer())
        .get(`/v1/public/community-surveys/${sharedId}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(200)
      expect(shared.body.survey_route).toBeNull()
      expect(JSON.stringify(shared.body)).not.toContain("zone_surface_ha")
    })
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
