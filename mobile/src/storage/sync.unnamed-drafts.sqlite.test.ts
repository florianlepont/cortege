/**
 * OA-18 (owner acceptance, phase 12.1): a draft without a site name never blocks.
 *  - its upsert and photo rows stay on the phone, pending, until it is named
 *  - a draft an earlier drain blocked on "site_name is required" is unblocked, and queued
 *    again once it has a name
 *  - survey upserts go out before photo rows in a batch
 *
 * Real SQL against the global expo-sqlite mock, same approach as sync.engine.sqlite.test.ts.
 */

import { initLocalDb, getDb } from "./db"
import { syncPending } from "./sync"

const NOW = "2026-01-01T00:00:00.000Z"

type MockResponse = { ok: boolean; status: number; text: () => Promise<string> }

function jsonResponse(status: number, body: unknown): MockResponse {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }
}

function emptyChangesResponse(): MockResponse {
  return jsonResponse(200, {
    cursor_in: null,
    cursor_out: null,
    has_more: false,
    surveys: [],
    attachments: [],
  })
}

type SentOperation = { client_ref: string; entity: string; action: string; survey_id?: string }

/** Answers every /sync operation as synced and records what was sent. */
function mockServer(): SentOperation[][] {
  const batches: SentOperation[][] = []
  ;(global.fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes("/sync/changes")) return emptyChangesResponse()
    if (url.includes("/sync")) {
      const body = JSON.parse(String(init?.body)) as { operations: SentOperation[] }
      batches.push(body.operations)
      return jsonResponse(200, {
        results: body.operations.map((op) => ({
          client_ref: op.client_ref,
          entity: op.entity,
          action: op.action,
          status: "synced",
          attachment_id: op.entity === "attachment" ? `remote-${op.client_ref}` : undefined,
        })),
      })
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
  return batches
}

async function insertSurvey(
  id: string,
  overrides: {
    site_name?: string
    status?: string
    sync_blocked?: number
    last_sync_error?: string | null
  } = {},
): Promise<void> {
  const db = await getDb()
  const siteName = overrides.site_name ?? "Site"
  await db.runAsync(
    `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, last_sync_error, last_sync_error_code, last_sync_error_at, sync_blocked, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, 'private', 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      siteName,
      overrides.status ?? "draft",
      overrides.sync_blocked ? "failed" : "pending",
      overrides.last_sync_error ?? null,
      overrides.last_sync_error ? "bad_request" : null,
      overrides.last_sync_error ? NOW : null,
      overrides.sync_blocked ?? 0,
      JSON.stringify({ id, sync_version: 1, site_name: siteName, status: "draft" }),
      NOW,
      NOW,
    ],
  )
}

async function queueUpsert(surveyId: string, siteName: string): Promise<number> {
  const db = await getDb()
  const result = await db.runAsync(
    `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
     VALUES (?, 'survey_upsert', ?, 'pending', 0, NULL, ?, ?)`,
    [surveyId, JSON.stringify({ id: surveyId, sync_version: 1, site_name: siteName }), NOW, NOW],
  )
  return Number(result.lastInsertRowId)
}

async function queuePhoto(surveyId: string): Promise<number> {
  const db = await getDb()
  const payload = {
    kind: "attachment_upload",
    local_attachment_id: `photo-${surveyId}`,
    survey_id: surveyId,
    local_uri: "file:///photo.jpg",
    mime_type: "image/jpeg",
    size_bytes: 10,
    captured_at: NOW,
    metadata: {},
  }
  const result = await db.runAsync(
    `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
     VALUES (?, 'attachment_upload', ?, 'pending', 0, NULL, ?, ?)`,
    [surveyId, JSON.stringify(payload), NOW, NOW],
  )
  return Number(result.lastInsertRowId)
}

async function queueRows(surveyId: string): Promise<Array<{ op_type: string; status: string }>> {
  const db = await getDb()
  return db.getAllAsync(
    `SELECT op_type, status FROM sync_queue WHERE survey_id = ? ORDER BY id ASC`,
    [surveyId],
  )
}

async function surveyState(
  id: string,
): Promise<{ status: string; sync_state: string; sync_blocked: number } | null> {
  const db = await getDb()
  return db.getFirstAsync(
    `SELECT status, sync_state, sync_blocked FROM local_surveys WHERE id = ?`,
    [id],
  )
}

beforeAll(async () => {
  await initLocalDb()
})

beforeEach(async () => {
  const db = await getDb()
  await db.execAsync(`
    DELETE FROM local_surveys;
    DELETE FROM sync_queue;
    DELETE FROM local_attachments;
    DELETE FROM local_meta;
  `)
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe("OA-18: unnamed drafts stay on the phone", () => {
  test("an unnamed draft's upsert and photo are not sent and stay pending", async () => {
    await insertSurvey("unnamed", { site_name: "" })
    await queueUpsert("unnamed", "")
    await queuePhoto("unnamed")
    await insertSurvey("named")
    await queueUpsert("named", "Site")
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(batches.flat()).toEqual([
      expect.objectContaining({ entity: "survey", action: "upsert" }),
    ])
    expect(await queueRows("unnamed")).toEqual([
      { op_type: "survey_upsert", status: "pending" },
      { op_type: "attachment_upload", status: "pending" },
    ])
    expect(await surveyState("unnamed")).toMatchObject({ sync_blocked: 0, status: "draft" })
  })

  test("a whitespace-only name counts as unnamed", async () => {
    await insertSurvey("blank", { site_name: "   " })
    await queueUpsert("blank", "   ")
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(batches.flat()).toHaveLength(0)
    expect(await queueRows("blank")).toEqual([{ op_type: "survey_upsert", status: "pending" }])
  })
})

describe("OA-18: drafts blocked on a missing site name recover", () => {
  test("a blocked draft that is still unnamed is unblocked but not sent", async () => {
    await insertSurvey("still-unnamed", {
      site_name: "",
      status: "error",
      sync_blocked: 1,
      last_sync_error: "HTTP 400: site_name is required",
    })
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(await surveyState("still-unnamed")).toEqual({
      status: "draft",
      sync_state: "pending",
      sync_blocked: 0,
    })
    expect(await queueRows("still-unnamed")).toEqual([])
    expect(batches.flat()).toHaveLength(0)
  })

  test("a blocked draft named since then is queued again and sent", async () => {
    await insertSurvey("named-later", {
      site_name: "Bois du Nord",
      status: "error",
      sync_blocked: 1,
      last_sync_error: "HTTP 400: site_name is required",
    })
    const batches = mockServer()

    await syncPending("http://api", "token")

    const sent = batches.flat()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ entity: "survey", action: "upsert" })
    expect(await surveyState("named-later")).toMatchObject({
      sync_blocked: 0,
      sync_state: "synced",
    })
  })

  test("a draft blocked for another reason stays blocked", async () => {
    await insertSurvey("other-block", {
      status: "error",
      sync_blocked: 1,
      last_sync_error: "HTTP 409: version conflict",
    })
    mockServer()

    await syncPending("http://api", "token")

    expect(await surveyState("other-block")).toMatchObject({ sync_blocked: 1, status: "error" })
  })
})

describe("OA-18: survey upserts go first in a batch", () => {
  test("a photo queued before its survey's upsert is sent after it", async () => {
    await insertSurvey("photo-first")
    await queuePhoto("photo-first")
    await queueUpsert("photo-first", "Site")
    const batches = mockServer()

    await syncPending("http://api", "token")

    const sent = batches[0] ?? []
    expect(sent.map((op) => `${op.entity}:${op.action}`)).toEqual([
      "survey:upsert",
      "attachment:create",
    ])
  })
})
