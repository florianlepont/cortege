import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import request = require("supertest")
import { createE2eApp, loginTestUser, uniqueId } from "./helpers/surveys-e2e"

// Phase 01.8 D-12: split out of the former catch-all surveys-idempotency suite. This file covers
// attachment create, upload, list and soft-delete, directly and through /v1/sync.

describe("Surveys attachments (e2e)", () => {
  let app: INestApplication

  beforeAll(async () => {
    app = (await createE2eApp()).app
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  it("creates and soft-deletes a survey attachment", async () => {
    const accessToken = await loginTestUser(app, "e2e-attachment")
    const surveyId = uniqueId("e2e-attachment-survey")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Attachment Forest",
        status: "draft",
        visibility: "private",
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: {
          A: 1,
        },
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const uploadBytes = Buffer.from("fake-jpeg-binary")
    const created = await request(app.getHttpServer())
      .post(`/v1/surveys/${surveyId}/attachments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        mime_type: "image/jpeg",
        size_bytes: uploadBytes.length,
      })
      .expect(201)

    expect(typeof created.body.attachment_id).toBe("string")
    expect(created.body.storage_key).toContain(`surveys/${surveyId}/`)
    expect(created.body.storage_key).toContain(".jpg")
    expect(created.body.confirm_url).toContain(
      `/surveys/${surveyId}/attachments/${created.body.attachment_id}/upload?token=`,
    )
    expect(typeof created.body.upload_url).toBe("string")

    if (String(created.body.upload_url).startsWith("http")) {
      const presignedUpload = await fetch(created.body.upload_url as string, {
        method: "PUT",
        headers: {
          "Content-Type": "image/jpeg",
        },
        body: uploadBytes,
      })
      expect(presignedUpload.ok).toBe(true)

      const confirm = await request(app.getHttpServer())
        .put(`/v1${created.body.confirm_url}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)

      expect(confirm.body.attachment_id).toBe(created.body.attachment_id)
      expect(typeof confirm.body.uploaded_at).toBe("string")
    } else {
      expect(created.body.upload_url).toContain(
        `/surveys/${surveyId}/attachments/${created.body.attachment_id}/upload?token=`,
      )

      const uploaded = await request(app.getHttpServer())
        .put(`/v1${created.body.upload_url}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("file", uploadBytes, {
          filename: "sample.jpg",
          contentType: "image/jpeg",
        })
        .expect(200)

      expect(uploaded.body.attachment_id).toBe(created.body.attachment_id)
      expect(typeof uploaded.body.uploaded_at).toBe("string")
    }

    const listedBeforeDelete = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}/attachments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)

    expect(Array.isArray(listedBeforeDelete.body.items)).toBe(true)
    expect(listedBeforeDelete.body.items).toHaveLength(1)
    expect(listedBeforeDelete.body.items[0].id).toBe(created.body.attachment_id)
    expect(typeof listedBeforeDelete.body.items[0].uploaded_at).toBe("string")

    await request(app.getHttpServer())
      .delete(`/v1/surveys/${surveyId}/attachments/${created.body.attachment_id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204)

    await request(app.getHttpServer())
      .delete(`/v1/surveys/${surveyId}/attachments/${created.body.attachment_id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404)

    const listedAfterDelete = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}/attachments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    expect(listedAfterDelete.body.items).toHaveLength(0)

    const events = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}/events`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)

    const eventTypes = (events.body.items as Array<{ event_type: string }>).map((e) => e.event_type)
    expect(eventTypes).toContain("attachment_created")
    expect(eventTypes).toContain("attachment_uploaded")
    expect(eventTypes).toContain("attachment_deleted")
  })

  it("processes attachment delete operation via POST /v1/sync", async () => {
    const accessToken = await loginTestUser(app, "e2e-sync-attachment-delete")
    const surveyId = uniqueId("e2e-sync-attachment-delete")

    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Sync Attachment Delete Forest",
        status: "draft",
        visibility: "private",
        factors: {},
        scores: {},
        location: { source: "gps", lat: 48.643, lng: 1.829 },
      })
      .expect(201)

    const uploadBytes = Buffer.from("fake-jpeg-binary")
    const created = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [
          {
            client_ref: "op-create-attachment",
            entity: "attachment",
            action: "create",
            survey_id: surveyId,
            payload: {
              mime_type: "image/jpeg",
              size_bytes: uploadBytes.length,
            },
          },
        ],
      })
      .expect(200)

    expect(created.body.results).toHaveLength(1)
    expect(created.body.results[0].status).toBe("synced")
    const attachmentId = created.body.results[0].data.attachment_id as string
    const uploadUrl = created.body.results[0].data.upload_url as string
    const confirmUrl = created.body.results[0].data.confirm_url as string

    if (uploadUrl.startsWith("http")) {
      const presignedUpload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "image/jpeg",
        },
        body: uploadBytes,
      })
      expect(presignedUpload.ok).toBe(true)

      await request(app.getHttpServer())
        .put(`/v1${confirmUrl}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)
    } else {
      await request(app.getHttpServer())
        .put(`/v1${uploadUrl}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .attach("file", uploadBytes, {
          filename: "sample.jpg",
          contentType: "image/jpeg",
        })
        .expect(200)
    }

    const deleted = await request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [
          {
            client_ref: "op-delete-attachment",
            entity: "attachment",
            action: "delete",
            survey_id: surveyId,
            payload: {
              attachment_id: attachmentId,
            },
          },
        ],
      })
      .expect(200)

    expect(deleted.body.results).toHaveLength(1)
    expect(deleted.body.results[0]).toMatchObject({
      client_ref: "op-delete-attachment",
      entity: "attachment",
      action: "delete",
      status: "synced",
    })
    expect(deleted.body.results[0].data.attachment_id).toBe(attachmentId)

    const listedAfterDelete = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}/attachments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    expect(Array.isArray(listedAfterDelete.body.items)).toBe(true)
    expect(listedAfterDelete.body.items).toHaveLength(0)
  })
})
