import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import { createE2eApp, loginTestUser, uniqueId } from "./helpers/surveys-e2e"

// Phase 01.8 D-12: split out of the former catch-all surveys-idempotency suite. This file covers
// the replay and sync operations that fit none of the feature files (same-version
// replay, survey delete, mixed /v1/sync batches, sync_version conflicts, the /v1/sync/changes
// cursor).

describe("Surveys idempotency (e2e)", () => {
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

  it("accepts same id+sync_version replay and rejects older sync_version", async () => {
    const accessToken = await loginTestUser(app, "e2e")
    expect(accessToken).toBeTruthy()

    const surveyId = uniqueId("e2e-survey")
    const payload = {
      id: surveyId,
      sync_version: 1,
      site_name: "Test Forest",
      status: "draft",
      visibility: "private",
      factors: {},
      scores: {},
      location: { source: "gps", lat: 48.643, lng: 1.829 },
    }

    const first = await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload)
      .expect(201)

    const replay = await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload)
      .expect(201)

    expect(first.body.id).toBe(surveyId)
    expect(replay.body.id).toBe(surveyId)
    expect(replay.body.server_status).toBe("synced")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...payload, sync_version: 0 })
      .expect(409)
  })

  it("soft-deletes survey via DELETE /v1/surveys/:id and records deleted event", async () => {
    const accessToken = await loginTestUser(app, "e2e-survey-delete")
    const surveyId = uniqueId("e2e-survey-delete")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Delete Forest",
        status: "draft",
        visibility: "private",
        factors: {},
        scores: {},
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    await request(app.getHttpServer())
      .delete(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204)

    await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404)

    const listed = await request(app.getHttpServer())
      .get("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    expect(
      (listed.body.items as Array<{ id: string }>).some((survey) => survey.id === surveyId),
    ).toBe(false)

    const changes = await request(app.getHttpServer())
      .get("/v1/sync/changes")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ limit: 100 })
      .expect(200)

    const deletedEvent = (
      changes.body.events as Array<{ survey_id: string; event_type: string }>
    ).find((event) => event.survey_id === surveyId && event.event_type === "deleted")
    expect(deletedEvent).toBeTruthy()

    const deletedSurvey = (
      changes.body.surveys as Array<{ id: string; deleted_at: string | null }>
    ).find((survey) => survey.id === surveyId)
    expect(deletedSurvey?.deleted_at).toBeTruthy()
  })

  it("processes mixed operations via POST /v1/sync", async () => {
    const accessToken = await loginTestUser(app, "e2e-sync-batch")
    const validSurveyId = uniqueId("e2e-sync-batch-valid")

    const response = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [
          {
            client_ref: "op-valid-survey",
            entity: "survey",
            action: "upsert",
            payload: {
              id: validSurveyId,
              sync_version: 1,
              site_name: "Batch Forest",
              status: "draft",
              visibility: "private",
              factors: {},
              scores: {},
              location: { source: "gps", lat: 48.643, lng: 1.829 },
            },
          },
          {
            client_ref: "op-invalid-survey",
            entity: "survey",
            action: "upsert",
            payload: {
              id: uniqueId("e2e-sync-batch-invalid"),
              sync_version: 1,
              status: "draft",
              visibility: "private",
              factors: {},
              scores: {},
              location: { source: "gps", lat: 48.643, lng: 1.829 },
            },
          },
        ],
      })
      .expect(200)

    expect(Array.isArray(response.body.results)).toBe(true)
    expect(response.body.results).toHaveLength(2)
    expect(response.body.results[0]).toMatchObject({
      client_ref: "op-valid-survey",
      entity: "survey",
      action: "upsert",
      status: "synced",
    })
    expect(response.body.results[0].data.id).toBe(validSurveyId)

    expect(response.body.results[1]).toMatchObject({
      client_ref: "op-invalid-survey",
      entity: "survey",
      action: "upsert",
      status: "fatal_error",
    })
    expect(response.body.results[1].error.http_status).toBe(400)
  })

  it("processes survey delete operation via POST /v1/sync", async () => {
    const accessToken = await loginTestUser(app, "e2e-sync-delete")
    const surveyId = uniqueId("e2e-sync-delete")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Sync Delete Forest",
        status: "draft",
        visibility: "private",
        factors: {},
        scores: {},
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const response = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [
          {
            client_ref: "op-delete-survey",
            entity: "survey",
            action: "delete",
            survey_id: surveyId,
            payload: { id: surveyId },
          },
        ],
      })
      .expect(200)

    expect(response.body.results).toHaveLength(1)
    expect(response.body.results[0]).toMatchObject({
      client_ref: "op-delete-survey",
      entity: "survey",
      action: "delete",
      status: "synced",
    })
    expect(response.body.results[0].data.id).toBe(surveyId)
    expect(response.body.results[0].data.deleted_at).toBeTruthy()

    await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404)
  })

  it("returns sync_version_conflict details in POST /v1/sync result", async () => {
    const accessToken = await loginTestUser(app, "e2e-sync-conflict")
    const surveyId = uniqueId("e2e-sync-conflict-survey")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 2,
        site_name: "Conflict Forest",
        status: "draft",
        visibility: "private",
        factors: {},
        scores: {},
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const conflict = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [
          {
            client_ref: "op-conflict",
            entity: "survey",
            action: "upsert",
            payload: {
              id: surveyId,
              sync_version: 1,
              site_name: "Conflict Forest - stale",
              status: "draft",
              visibility: "private",
              factors: {},
              scores: {},
              location: { source: "gps", lat: 48.643, lng: 1.829 },
            },
          },
        ],
      })
      .expect(200)

    expect(conflict.body.results).toHaveLength(1)
    expect(conflict.body.results[0]).toMatchObject({
      client_ref: "op-conflict",
      entity: "survey",
      action: "upsert",
      status: "fatal_error",
    })
    expect(conflict.body.results[0].error.code).toBe("sync_version_conflict")
    expect(conflict.body.results[0].error.http_status).toBe(409)
    expect(conflict.body.results[0].error.details).toMatchObject({
      survey_id: surveyId,
      server_sync_version: 2,
      client_sync_version: 1,
    })
  })

  it("returns incremental changes via GET /v1/sync/changes with cursor", async () => {
    const accessToken = await loginTestUser(app, "e2e-sync-changes")
    const surveyId = uniqueId("e2e-sync-changes-survey")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Changes Forest",
        status: "draft",
        visibility: "private",
        factors: {},
        scores: {},
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const firstChanges = await request(app.getHttpServer())
      .get("/v1/sync/changes")
      .query({ limit: 20 })
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)

    expect(Array.isArray(firstChanges.body.events)).toBe(true)
    expect(firstChanges.body.events.length).toBeGreaterThan(0)
    expect(Array.isArray(firstChanges.body.surveys)).toBe(true)
    expect(firstChanges.body.surveys.some((survey: { id: string }) => survey.id === surveyId)).toBe(
      true,
    )
    expect(typeof firstChanges.body.cursor_out).toBe("string")

    const cursorOut = firstChanges.body.cursor_out as string

    await request(app.getHttpServer())
      .patch(`/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ site_name: "Changes Forest Updated" })
      .expect(200)

    const createdAttachment = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/attachments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        mime_type: "image/jpeg",
        size_bytes: 1024,
      })
      .expect(201)

    const deltaChanges = await request(app.getHttpServer())
      .get("/v1/sync/changes")
      .query({ cursor: cursorOut, limit: 20 })
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)

    const eventTypes = (deltaChanges.body.events as Array<{ event_type: string }>).map(
      (event) => event.event_type,
    )
    expect(eventTypes).toContain("updated")
    expect(eventTypes).toContain("attachment_created")
    expect(
      deltaChanges.body.surveys.some(
        (survey: { id: string; site_name: string }) =>
          survey.id === surveyId && survey.site_name === "Changes Forest Updated",
      ),
    ).toBe(true)
    expect(
      deltaChanges.body.attachments.some(
        (attachment: { id: string }) => attachment.id === createdAttachment.body.attachment_id,
      ),
    ).toBe(true)
    expect(typeof deltaChanges.body.cursor_out).toBe("string")
    expect(deltaChanges.body.cursor_out).not.toBe(cursorOut)
  })

  it("does not re-send event-less surveys on every poll", async () => {
    // Migration 014 gave every existing event-less survey one synthetic event, so the feed no
    // longer needs the fallback that re-sent them on every poll (D-03, D-16). A row written
    // behind the API's back without an event is simply not part of the feed.
    const accessToken = await loginTestUser(app, "e2e-sync-changes-no-event")
    const me = await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    const userId = me.body.id as string

    const eventSurveyId = uniqueId("e2e-sync-cursor-anchor")
    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: eventSurveyId,
        sync_version: 1,
        site_name: "Cursor Anchor",
        status: "draft",
        visibility: "private",
        factors: {},
        scores: {},
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const surveyId = uniqueId("e2e-sync-no-event")
    const nowIso = new Date().toISOString()
    const payloadLocation = JSON.stringify({ source: "gps", lat: 48.643, lng: 1.829 })

    await db.query(
      `INSERT INTO surveys (
         id, user_id, site_name, status, visibility, region_version, vegetation_stage,
         factors, factor_results, scores, location, created_at, updated_at, submitted_at, expires_at, sync_version
       ) VALUES (
         $1, $2, $3, 'submitted', 'public', 'ACA', 'collineen',
         '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, $4::jsonb, $5::timestamptz, $5::timestamptz, $5::timestamptz, ($5::timestamptz + INTERVAL '365 days'), 1
       )`,
      [surveyId, userId, "No Event Forest", payloadLocation, nowIso],
    )

    const seenSurveyIds: string[] = []
    const seenEventSurveyIds: string[] = []
    let cursor: string | null = null
    for (let poll = 0; poll < 3; poll += 1) {
      const changes = await request(app.getHttpServer())
        .get("/v1/sync/changes")
        .query(cursor ? { cursor, limit: 20 } : { limit: 20 })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)

      seenSurveyIds.push(...(changes.body.surveys as Array<{ id: string }>).map((s) => s.id))
      seenEventSurveyIds.push(
        ...(changes.body.events as Array<{ survey_id: string }>).map((e) => e.survey_id),
      )
      if (poll > 0) {
        expect(changes.body.events).toHaveLength(0)
        expect(changes.body.surveys).toHaveLength(0)
        expect(changes.body.cursor_out).toBe(cursor)
      }
      expect(typeof changes.body.cursor_out).toBe("string")
      cursor = changes.body.cursor_out as string
    }

    expect(seenSurveyIds).toContain(eventSurveyId)
    expect(seenSurveyIds).not.toContain(surveyId)
    expect(seenEventSurveyIds).not.toContain(surveyId)
  })
})
