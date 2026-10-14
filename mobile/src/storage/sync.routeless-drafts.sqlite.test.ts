/**
 * Phase 30 (O-19, open point P-1), on the model of OA-18 (sync.unnamed-drafts.sqlite.test.ts): a
 * draft without a valid route never leaves the phone.
 *  - its upsert and photo rows stay pending, untouched (no request, no retry count), until the
 *    route is written; its delete row still goes out
 *  - once `patchLocalSurveyRoute` wrote a route, the next drain sends the upsert carrying it
 *  - a draft the server blocked with route_required is unblocked once it has a route
 *  - a 422 route_required on submit is stored as the survey's error code
 *
 * Real SQL against the global expo-sqlite mock, same approach as sync.engine.sqlite.test.ts.
 */

import type { SurveyRoute } from "@cortege/ibp-domain"
import { initLocalDb, getDb } from "./db"
import { syncPending, submitSurvey } from "./sync"
import { patchLocalSurveyRoute } from "./surveys"

const ROUTE: SurveyRoute = {
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 2.5,
  guide: { chosen_by: "observer" },
}

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

type SentOperation = {
  client_ref: string
  entity: string
  action: string
  survey_id?: string
  payload?: { survey_route?: unknown }
}

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
    last_sync_error_code?: string
    route?: SurveyRoute | null
  } = {},
): Promise<void> {
  const db = await getDb()
  const siteName = overrides.site_name ?? "Site"
  const route = overrides.route === undefined ? ROUTE : overrides.route
  await db.runAsync(
    `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, last_sync_error, last_sync_error_code, last_sync_error_at, sync_blocked, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, 'private', 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      siteName,
      overrides.status ?? "draft",
      overrides.sync_blocked ? "failed" : "pending",
      overrides.last_sync_error ?? null,
      overrides.last_sync_error ? (overrides.last_sync_error_code ?? "bad_request") : null,
      overrides.last_sync_error ? NOW : null,
      overrides.sync_blocked ?? 0,
      JSON.stringify({
        id,
        sync_version: 1,
        site_name: siteName,
        status: "draft",
        ...(route ? { survey_route: route } : {}),
      }),
      NOW,
      NOW,
    ],
  )
}

async function queueUpsert(
  surveyId: string,
  siteName: string,
  route: SurveyRoute | null = ROUTE,
): Promise<number> {
  const db = await getDb()
  const result = await db.runAsync(
    `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
     VALUES (?, 'survey_upsert', ?, 'pending', 0, NULL, ?, ?)`,
    [
      surveyId,
      JSON.stringify({
        id: surveyId,
        sync_version: 1,
        site_name: siteName,
        ...(route ? { survey_route: route } : {}),
      }),
      NOW,
      NOW,
    ],
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

async function queueRows(
  surveyId: string,
): Promise<Array<{ op_type: string; status: string; retry_count: number }>> {
  const db = await getDb()
  return db.getAllAsync(
    `SELECT op_type, status, retry_count FROM sync_queue WHERE survey_id = ? ORDER BY id ASC`,
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

describe("phase 30: routeless drafts stay on the phone", () => {
  test("a draft without route keeps its upsert and photo pending and untouched", async () => {
    await insertSurvey("routeless", { route: null })
    await queueUpsert("routeless", "Site", null)
    await queuePhoto("routeless")
    await insertSurvey("routed")
    await queueUpsert("routed", "Site")
    const batches = mockServer()

    await syncPending("http://api", "token")

    const sent = batches.flat()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ entity: "survey", action: "upsert" })
    expect(await queueRows("routeless")).toEqual([
      { op_type: "survey_upsert", status: "pending", retry_count: 0 },
      { op_type: "attachment_upload", status: "pending", retry_count: 0 },
    ])
    expect(await surveyState("routeless")).toMatchObject({ sync_blocked: 0, status: "draft" })
  })

  test("an invalid route counts as no route", async () => {
    await insertSurvey("broken", { route: { ...ROUTE, method: "other" } as unknown as SurveyRoute })
    await queueUpsert("broken", "Site")
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(batches.flat()).toHaveLength(0)
    expect(await queueRows("broken")).toHaveLength(1)
  })

  test("a draft whose payload cannot be read counts as no route", async () => {
    await insertSurvey("garbled")
    const db = await getDb()
    await db.runAsync(`UPDATE local_surveys SET payload_json = 'not json' WHERE id = 'garbled'`)
    await queueUpsert("garbled", "Site")
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(batches.flat()).toHaveLength(0)
    expect(await queueRows("garbled")).toHaveLength(1)
  })

  test("the delete of a routeless draft still goes out", async () => {
    await insertSurvey("gone", { route: null })
    const db = await getDb()
    await db.runAsync(
      `INSERT INTO sync_queue (survey_id, op_type, payload, status, retry_count, next_retry_at, created_at, updated_at)
       VALUES ('gone', 'survey_delete', ?, 'pending', 0, NULL, ?, ?)`,
      [JSON.stringify({ kind: "survey_delete", survey_id: "gone" }), NOW, NOW],
    )
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(batches.flat()).toEqual([
      expect.objectContaining({ entity: "survey", action: "delete" }),
    ])
  })

  test("a draft is sent with its route on the first drain after the route is written", async () => {
    await insertSurvey("later", { route: null })
    await queueUpsert("later", "Site", null)
    await queuePhoto("later")
    const batches = mockServer()

    await syncPending("http://api", "token")
    expect(batches.flat()).toHaveLength(0)

    const written = await patchLocalSurveyRoute({ survey_id: "later", survey_route: ROUTE })
    expect(written).not.toBeNull()
    await syncPending("http://api", "token")

    const sent = batches.flat()
    expect(sent.map((op) => `${op.entity}:${op.action}`)).toEqual([
      "survey:upsert",
      "attachment:create",
    ])
    expect(sent[0]?.payload?.survey_route).toMatchObject({ method: "full", counting: "capped" })
    expect(await queueRows("later")).toEqual([])
  })

  test("a submitted survey without route is never held", async () => {
    await insertSurvey("old-submitted", { status: "submitted", route: null })
    await queueUpsert("old-submitted", "Site", null)
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(batches.flat()).toHaveLength(1)
  })
})

describe("phase 30: drafts blocked on route_required recover", () => {
  test("a blocked draft that has a route is unblocked, queued again and sent", async () => {
    await insertSurvey("blocked-routed", {
      status: "error",
      sync_blocked: 1,
      last_sync_error: "survey_route is required",
      last_sync_error_code: "route_required",
    })
    const batches = mockServer()

    await syncPending("http://api", "token")

    const sent = batches.flat()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ entity: "survey", action: "upsert" })
    expect(sent[0]?.payload?.survey_route).toMatchObject({ method: "full" })
    expect(await surveyState("blocked-routed")).toMatchObject({
      sync_blocked: 0,
      sync_state: "synced",
    })
  })

  test("a blocked draft that is still without route stays blocked", async () => {
    await insertSurvey("blocked-routeless", {
      status: "error",
      sync_blocked: 1,
      route: null,
      last_sync_error: "survey_route is required",
      last_sync_error_code: "route_required",
    })
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(batches.flat()).toHaveLength(0)
    expect(await surveyState("blocked-routeless")).toMatchObject({
      sync_blocked: 1,
      status: "error",
    })
  })

  test("a draft blocked for another reason stays blocked even with a route", async () => {
    await insertSurvey("other-block", {
      status: "error",
      sync_blocked: 1,
      last_sync_error: "HTTP 409: version conflict",
    })
    mockServer()

    await syncPending("http://api", "token")

    expect(await surveyState("other-block")).toMatchObject({ sync_blocked: 1, status: "error" })
  })

  test("a draft with a pending upsert is not queued twice", async () => {
    await insertSurvey("already-queued", {
      status: "error",
      sync_blocked: 1,
      last_sync_error: "survey_route is required",
      last_sync_error_code: "route_required",
    })
    await queueUpsert("already-queued", "Site")
    const batches = mockServer()

    await syncPending("http://api", "token")

    expect(batches.flat().filter((op) => op.entity === "survey")).toHaveLength(1)
  })
})

describe("phase 30: a refusal on submit names the route", () => {
  async function storedError(id: string): Promise<{ status: string; code: string | null } | null> {
    const db = await getDb()
    return db.getFirstAsync(
      `SELECT status, last_sync_error_code AS code FROM local_surveys WHERE id = ?`,
      [id],
    )
  }

  test("a 422 route_required is stored as route_required", async () => {
    await insertSurvey("submit-route")
    ;(global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(422, { code: "route_required", message: "survey_route is required" }),
    )

    const result = await submitSurvey("http://api", "token", "submit-route")

    expect(result).toEqual({ ok: false, message: "survey_route is required" })
    expect(await storedError("submit-route")).toEqual({ status: "draft", code: "route_required" })
    expect(await surveyState("submit-route")).toMatchObject({ sync_blocked: 0 })
  })

  test("another 422 stays a submit validation error", async () => {
    await insertSurvey("submit-other")
    ;(global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(422, { message: "invalid", errors: ["A is missing"] }),
    )

    await submitSurvey("http://api", "token", "submit-other")

    expect(await storedError("submit-other")).toEqual({
      status: "draft",
      code: "submit_validation",
    })
  })
})
