/**
 * Phase 25.1 (D-05): the PDF prints a survey's photos in the order they were taken. Real SQL
 * against the node:sqlite in-memory database (the global expo-sqlite mock).
 */

import { getDb, initLocalDb } from "./db"
import { listSurveyPhotosInCaptureOrder } from "./surveys"

async function insertAttachment(row: {
  id: string
  survey_id?: string
  mime_type?: string
  created_at: string
  updated_at?: string
}): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO local_attachments (id, survey_id, local_uri, mime_type, size_bytes, sync_state, remote_attachment_id, storage_key, upload_url, confirm_url, last_sync_error, last_sync_error_code, last_sync_error_at, created_at, updated_at, file_state)
     VALUES (?, ?, ?, ?, 1024, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, 'local')`,
    [
      row.id,
      row.survey_id ?? "S",
      `file:///mock/documents/attachments/${row.id}.jpg`,
      row.mime_type ?? "image/jpeg",
      row.created_at,
      row.updated_at ?? row.created_at,
    ],
  )
}

beforeAll(async () => {
  await initLocalDb()
})

beforeEach(async () => {
  const db = await getDb()
  await db.execAsync(`DELETE FROM local_attachments;`)
})

describe("listSurveyPhotosInCaptureOrder", () => {
  test("returns the photos by created_at ascending whatever the insert order and updated_at", async () => {
    await insertAttachment({
      id: "third",
      created_at: "2026-03-01T10:03:00.000Z",
      updated_at: "2026-03-01T10:00:00.000Z",
    })
    await insertAttachment({
      id: "first",
      created_at: "2026-03-01T10:01:00.000Z",
      updated_at: "2026-03-01T12:00:00.000Z",
    })
    await insertAttachment({
      id: "second",
      created_at: "2026-03-01T10:02:00.000Z",
      updated_at: "2026-03-01T11:00:00.000Z",
    })

    const photos = await listSurveyPhotosInCaptureOrder("S")

    expect(photos.map((photo) => photo.id)).toEqual(["first", "second", "third"])
    expect(photos[0]).toMatchObject({
      survey_id: "S",
      mime_type: "image/jpeg",
      file_state: "local",
      local_uri: "file:///mock/documents/attachments/first.jpg",
    })
  })

  test("leaves out a non image attachment and another survey's photos", async () => {
    await insertAttachment({ id: "photo", created_at: "2026-03-01T10:01:00.000Z" })
    await insertAttachment({
      id: "document",
      mime_type: "application/pdf",
      created_at: "2026-03-01T10:02:00.000Z",
    })
    await insertAttachment({
      id: "other",
      survey_id: "T",
      created_at: "2026-03-01T10:03:00.000Z",
    })

    const photos = await listSurveyPhotosInCaptureOrder("S")

    expect(photos.map((photo) => photo.id)).toEqual(["photo"])
  })

  test("orders two photos with the same created_at by id", async () => {
    const same = "2026-03-01T10:01:00.000Z"
    await insertAttachment({ id: "b", created_at: same })
    await insertAttachment({ id: "a", created_at: same })

    const photos = await listSurveyPhotosInCaptureOrder("S")

    expect(photos.map((photo) => photo.id)).toEqual(["a", "b"])
  })

  test("returns an empty list for a survey without photos", async () => {
    expect(await listSurveyPhotosInCaptureOrder("S")).toEqual([])
  })
})
