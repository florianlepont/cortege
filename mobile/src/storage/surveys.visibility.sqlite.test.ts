/**
 * Real-SQL proofs of the visibility rules of the draft storage (phase 29):
 * a new draft is shared by default (D-04), the draft write path keeps the
 * stored value so the finish choice survives a late autosave (D-05), and a
 * submitted survey's visibility cannot be queued (D-07, client side).
 */

import { initLocalDb, getDb } from "./db"
import { createLocalDraft, getLocalSurveyDraft, updateLocalDraft } from "./surveys"
import { updateSurveyVisibility } from "./sync"

const NOW = "2026-01-01T00:00:00.000Z"

const DRAFT_INPUT = {
  site_name: "Test site",
  region_version: "ACA" as const,
  vegetation_stage: "adult",
  parcel_ids: ["AB001"],
  factors: { A: { native_genus_count: 5 } },
}

type QueueRow = { op_type: string; payload: string }

async function getSurveyRow(
  id: string,
): Promise<{ visibility: string; sync_state: string; payload_json: string | null } | null> {
  const db = await getDb()
  return db.getFirstAsync(
    `SELECT visibility, sync_state, payload_json FROM local_surveys WHERE id = ?`,
    [id],
  )
}

async function getQueueRows(id: string): Promise<QueueRow[]> {
  const db = await getDb()
  return db.getAllAsync<QueueRow>(
    `SELECT op_type, payload FROM sync_queue WHERE survey_id = ? ORDER BY id`,
    [id],
  )
}

function payloadVisibility(payloadJson: string | null): unknown {
  return (JSON.parse(payloadJson ?? "{}") as { visibility?: unknown }).visibility
}

async function insertSubmittedRow(id: string, visibility: "private" | "public"): Promise<void> {
  const db = await getDb()
  const payload = JSON.stringify({
    id,
    sync_version: 4,
    site_name: "Submitted site",
    status: "submitted",
    visibility,
    parcel_ids: ["AB001"],
    factors: {},
  })
  await db.runAsync(
    `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, last_sync_error, last_sync_error_code, last_sync_error_at, sync_blocked, payload_json, created_at, updated_at)
     VALUES (?, ?, 'submitted', ?, 4, 'synced', NULL, NULL, NULL, 0, ?, ?, ?)`,
    [id, "Submitted site", visibility, payload, NOW, NOW],
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
})

describe("new draft default (D-04)", () => {
  test("createLocalDraft stores public in the column, the payload and the returned survey", async () => {
    const created = await createLocalDraft(DRAFT_INPUT)

    expect(created.visibility).toBe("public")
    const row = await getSurveyRow(created.id)
    expect(row?.visibility).toBe("public")
    expect(payloadVisibility(row?.payload_json ?? null)).toBe("public")

    const queue = await getQueueRows(created.id)
    expect(queue).toHaveLength(1)
    expect(payloadVisibility(queue[0].payload)).toBe("public")
  })
})

describe("the draft write path keeps the stored visibility (D-05)", () => {
  test("updateLocalDraft without visibility keeps a stored private draft private", async () => {
    const created = await createLocalDraft(DRAFT_INPUT)
    await updateSurveyVisibility("http://api", "", created.id, "private")

    const updated = await updateLocalDraft({
      ...DRAFT_INPUT,
      survey_id: created.id,
      site_name: "Renamed",
    })

    expect(updated.visibility).toBe("private")
    const row = await getSurveyRow(created.id)
    expect(row?.visibility).toBe("private")
    expect(payloadVisibility(row?.payload_json ?? null)).toBe("private")
  })

  test("updateLocalDraft without visibility keeps a stored public draft public", async () => {
    const created = await createLocalDraft(DRAFT_INPUT)

    const updated = await updateLocalDraft({
      ...DRAFT_INPUT,
      survey_id: created.id,
      site_name: "Renamed",
    })

    expect(updated.visibility).toBe("public")
    const row = await getSurveyRow(created.id)
    expect(row?.visibility).toBe("public")
    expect(payloadVisibility(row?.payload_json ?? null)).toBe("public")
  })

  test("a choice followed by a late autosave leaves private in the column, the payload and the pending upsert", async () => {
    const created = await createLocalDraft(DRAFT_INPUT)

    const choice = await updateSurveyVisibility("http://api", "", created.id, "private")
    expect(choice).toMatchObject({ ok: true, queued: true, synced: false, frozen: false })

    await updateLocalDraft({ ...DRAFT_INPUT, survey_id: created.id, site_name: "Late autosave" })

    const row = await getSurveyRow(created.id)
    expect(row?.visibility).toBe("private")
    expect(payloadVisibility(row?.payload_json ?? null)).toBe("private")
    const draft = await getLocalSurveyDraft(created.id)
    expect(draft?.visibility).toBe("private")

    const queue = await getQueueRows(created.id)
    const upserts = queue.filter((q) => q.op_type === "survey_upsert")
    expect(upserts.length).toBeGreaterThan(0)
    for (const upsert of upserts) {
      expect(payloadVisibility(upsert.payload)).toBe("private")
    }
  })
})

describe("updateSurveyVisibility on a draft", () => {
  test("queues one survey_visibility row when no upsert is pending", async () => {
    const created = await createLocalDraft(DRAFT_INPUT)
    const db = await getDb()
    await db.runAsync(`DELETE FROM sync_queue WHERE survey_id = ?`, [created.id])

    const result = await updateSurveyVisibility("http://api", "", created.id, "private")

    expect(result).toMatchObject({ ok: true, queued: true, synced: false, frozen: false })
    const queue = await getQueueRows(created.id)
    expect(queue).toHaveLength(1)
    expect(queue[0].op_type).toBe("survey_visibility")
    expect(JSON.parse(queue[0].payload)).toMatchObject({
      kind: "survey_visibility_update",
      visibility: "private",
    })
    expect((await getSurveyRow(created.id))?.visibility).toBe("private")
  })

  test("rewrites the pending upsert instead of queueing a second row", async () => {
    const created = await createLocalDraft(DRAFT_INPUT)

    const result = await updateSurveyVisibility("http://api", "", created.id, "private")

    expect(result).toMatchObject({ queued: true, frozen: false })
    const queue = await getQueueRows(created.id)
    expect(queue.map((q) => q.op_type)).toEqual(["survey_upsert"])
    expect(payloadVisibility(queue[0].payload)).toBe("private")
  })

  test("an equal value writes nothing", async () => {
    const created = await createLocalDraft(DRAFT_INPUT)
    const before = await getQueueRows(created.id)

    const result = await updateSurveyVisibility("http://api", "", created.id, "public")

    expect(result).toMatchObject({ ok: true, queued: false, synced: false, frozen: false })
    expect(await getQueueRows(created.id)).toEqual(before)
  })
})

describe("a submitted survey is frozen (D-07 client guard)", () => {
  test("a change is refused before any write and reported as frozen", async () => {
    await insertSubmittedRow("submitted-private", "private")
    const before = await getSurveyRow("submitted-private")

    const result = await updateSurveyVisibility("http://api", "", "submitted-private", "public")

    expect(result).toMatchObject({ ok: true, queued: false, synced: false, frozen: true })
    expect(await getQueueRows("submitted-private")).toEqual([])
    expect(await getSurveyRow("submitted-private")).toEqual(before)
  })

  test("an equal value on a submitted survey is also reported as frozen, with nothing queued", async () => {
    await insertSubmittedRow("submitted-public", "public")

    const result = await updateSurveyVisibility("http://api", "", "submitted-public", "public")

    expect(result).toMatchObject({ queued: false, frozen: true })
    expect(await getQueueRows("submitted-public")).toEqual([])
  })
})
