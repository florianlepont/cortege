/**
 * The Explorer's local markers read every own survey the phone holds (phase 26, D-01), real SQL.
 *
 * `listLocalSurveyMapSources` parses payloads in JS (the map scores drafts from their factors), skips
 * a row whose payload is not a survey payload, and adds no schema change.
 */

import { initLocalDb, getDb, SCHEMA_VERSION } from "./db"
import { createLocalDraft, listLocalSurveyMapSources } from "./surveys"
import { pullRemoteChanges } from "./sync"

function changesResponse(surveys: Array<Record<string, unknown>>) {
  return {
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        cursor_in: null,
        cursor_out: null,
        has_more: false,
        surveys,
        attachments: [],
      }),
  }
}

async function insertRawRow(id: string, payloadJson: string, updatedAt: string) {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, sync_blocked, payload_json, payload_completion, created_at, updated_at)
     VALUES (?, ?, 'draft', 'private', 1, 'pending', 0, ?, 0, ?, ?)`,
    [id, id, payloadJson, updatedAt, updatedAt],
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

describe("listLocalSurveyMapSources (29-04, D-01)", () => {
  test("returns every own survey, draft or submitted, with its parsed payload", async () => {
    const first = await createLocalDraft({
      site_name: "Brouillon A",
      region_version: "ACA",
      vegetation_stage: "jeune",
      parcel_ids: ["ab1"],
      factors: { A: { native_genus_count: 4 } },
    })
    const second = await createLocalDraft({
      site_name: "Brouillon B",
      region_version: "M",
      vegetation_stage: "mature",
      parcel_ids: ["cd2", "ef3"],
      factors: {},
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      changesResponse([
        {
          id: "remote-1",
          site_name: "Distante",
          status: "submitted",
          sync_version: 3,
          parcel_ids: ["gh4"],
          factors: { A: { native_genus_count: 6 } },
          scores: { ibp_total: 31 },
        },
      ]),
    )
    await pullRemoteChanges("http://api", "token")

    const sources = await listLocalSurveyMapSources()

    expect(sources).toHaveLength(3)
    expect(sources.map((source) => source.id).sort()).toEqual(
      [first.id, second.id, "remote-1"].sort(),
    )
    const updated = sources.map((source) => source.updated_at)
    expect(updated).toEqual([...updated].sort().reverse())

    const byId = new Map(sources.map((source) => [source.id, source]))
    const draft = byId.get(first.id)
    expect(draft).toMatchObject({ status: "draft" })
    expect(draft?.created_at).toEqual(expect.any(String))
    expect(draft?.updated_at).toEqual(expect.any(String))
    expect(draft?.payload.parcel_ids).toEqual(["AB1"])
    expect(draft?.payload.factors).toEqual({ A: { native_genus_count: 4 } })

    const pulled = byId.get("remote-1")
    expect(pulled?.status).toBe("submitted")
    expect(pulled?.payload.scores?.ibp_total).toBe(31)
    expect(pulled?.payload.parcel_ids).toEqual(["GH4"])
  })

  test("skips a row whose payload_json is not a survey payload", async () => {
    await insertRawRow("broken-text", "not json", "2026-01-01T00:00:00.000Z")
    await insertRawRow("broken-array", "[1,2]", "2026-01-02T00:00:00.000Z")
    await insertRawRow("broken-shape", JSON.stringify({ id: "x" }), "2026-01-03T00:00:00.000Z")
    await insertRawRow(
      "good",
      JSON.stringify({ id: "good", sync_version: 1, site_name: "Bonne", parcel_ids: [] }),
      "2026-01-04T00:00:00.000Z",
    )

    const sources = await listLocalSurveyMapSources()

    expect(sources.map((source) => source.id)).toEqual(["good"])
  })

  test("an empty table gives an empty list", async () => {
    expect(await listLocalSurveyMapSources()).toEqual([])
  })

  test("adds no schema version and writes no local_meta row", async () => {
    await createLocalDraft({
      site_name: "Brouillon",
      region_version: "ACA",
      vegetation_stage: "jeune",
      parcel_ids: [],
      factors: {},
    })
    const db = await getDb()
    const metaBefore = await db.getAllAsync(`SELECT key FROM local_meta`)

    await listLocalSurveyMapSources()

    expect(SCHEMA_VERSION).toBe(5)
    expect(await db.getAllAsync(`SELECT key FROM local_meta`)).toEqual(metaBefore)
  })
})
