/**
 * Completion precomputed at write time (01.9 D-03), real SQL.
 *
 * Every write of payload_json stores local_surveys.payload_completion, and
 * listLocalSurveys reads completion from SQL (submitted = 100) without
 * selecting or parsing payload_json, so a 500-survey list costs no JSON.parse.
 */

import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { initLocalDb, getDb } from "./db"
import { createLocalDraft, listLocalSurveys, updateLocalDraft } from "./surveys"
import { pullRemoteChanges } from "./sync"
import { computeCompletionRate, computePayloadCompletion } from "./utils"
import type { SurveyQueuePayload } from "./types"

const NOW = "2026-01-01T00:00:00.000Z"

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

async function storedCompletion(id: string): Promise<number | undefined> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_completion: number }>(
    `SELECT payload_completion FROM local_surveys WHERE id = ?`,
    [id],
  )
  return row?.payload_completion
}

async function storedPayload(id: string): Promise<SurveyQueuePayload> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_json: string }>(
    `SELECT payload_json FROM local_surveys WHERE id = ?`,
    [id],
  )
  return JSON.parse(String(row?.payload_json)) as SurveyQueuePayload
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

describe("write sites store payload_completion (01.9 D-03)", () => {
  test("createLocalDraft stores computePayloadCompletion(payload)", async () => {
    const survey = await createLocalDraft({
      site_name: "Parcelle A",
      region_version: "ACA",
      vegetation_stage: "jeune",
      parcel_ids: ["ab1"],
      factors: { A: { native_genus_count: 4 } },
    })

    const stored = await storedCompletion(survey.id)
    expect(stored).toBe(computePayloadCompletion(await storedPayload(survey.id)))
    // site, region, stage, parcel and factor A: 5 of 14.
    expect(stored).toBe(36)
    expect(survey.completion_rate).toBe(36)
  })

  test("updateLocalDraft stores the recomputed completion", async () => {
    const survey = await createLocalDraft({
      site_name: "Parcelle B",
      region_version: "M",
      vegetation_stage: "",
      parcel_ids: [],
      factors: {},
    })
    expect(await storedCompletion(survey.id)).toBe(14)

    const updated = await updateLocalDraft({
      survey_id: survey.id,
      site_name: "Parcelle B",
      region_version: "M",
      vegetation_stage: "mature",
      parcel_ids: ["cd2"],
      factors: { A: { native_genus_count: 3 }, J: { type_count: 2 } },
    })

    const stored = await storedCompletion(survey.id)
    expect(stored).toBe(computePayloadCompletion(await storedPayload(survey.id)))
    expect(stored).toBe(43)
    expect(updated.completion_rate).toBe(43)
  })

  test("applyRemoteChanges insert and update store payload_completion", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      changesResponse([
        { id: "remote-1", site_name: "Distante", status: "draft", sync_version: 1 },
      ]),
    )
    await pullRemoteChanges("http://api", "token")

    const inserted = await storedCompletion("remote-1")
    expect(inserted).toBe(computePayloadCompletion(await storedPayload("remote-1")))
    expect(inserted).toBe(7)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      changesResponse([
        {
          id: "remote-1",
          site_name: "Distante",
          status: "draft",
          sync_version: 2,
          region_version: "ACA",
          vegetation_stage: "adulte",
          parcel_ids: ["ef3"],
          factors: { B: { strata_count: 4, covered_autochthonous_percent: 10 } },
        },
      ]),
    )
    await pullRemoteChanges("http://api", "token")

    const updated = await storedCompletion("remote-1")
    expect(updated).toBe(computePayloadCompletion(await storedPayload("remote-1")))
    expect(updated).toBe(36)
  })
})

describe("listLocalSurveys reads completion from SQL (01.9 D-03)", () => {
  async function seedSurveys(count: number): Promise<Map<string, number>> {
    const db = await getDb()
    const expected = new Map<string, number>()
    for (let index = 0; index < count; index += 1) {
      const id = `survey-${String(index).padStart(3, "0")}`
      const status = index % 5 === 0 ? "submitted" : "draft"
      const siteName = `Parcelle ${index}`
      const payload: SurveyQueuePayload = {
        id,
        sync_version: 1,
        site_name: siteName,
        region_version: index % 2 === 0 ? "ACA" : undefined,
        vegetation_stage: index % 3 === 0 ? "mature" : undefined,
        parcel_ids: index % 4 === 0 ? ["gh4"] : [],
        factors: index % 7 === 0 ? { C: { bmg_count: 3, bmm_count: 1, surface_ha: 2 } } : {},
      }
      await db.runAsync(
        `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, sync_blocked, payload_json, payload_completion, created_at, updated_at)
         VALUES (?, ?, ?, 'private', 1, 'synced', 0, ?, ?, ?, ?)`,
        [
          id,
          siteName,
          status,
          JSON.stringify(payload),
          computePayloadCompletion(payload),
          NOW,
          NOW,
        ],
      )
      // The pre-change list result for the same row.
      expected.set(id, computeCompletionRate(status, payload))
    }
    return expected
  }

  test("submitted rows read 100 and others their stored payload_completion", async () => {
    const expected = await seedSurveys(10)

    const surveys = await listLocalSurveys()

    expect(surveys).toHaveLength(10)
    for (const survey of surveys) {
      expect(survey.completion_rate).toBe(expected.get(survey.id))
      if (survey.status === "submitted") {
        expect(survey.completion_rate).toBe(100)
      }
      expect(survey).not.toHaveProperty("payload_json")
      expect(survey).not.toHaveProperty("payload_completion")
    }
  })

  test("500 surveys list without a single JSON.parse and without reading payload_json", async () => {
    const expected = await seedSurveys(500)
    const db = await getDb()
    const getAllSpy = jest.spyOn(db, "getAllAsync")
    const parseSpy = jest.spyOn(JSON, "parse")

    const surveys = await listLocalSurveys()

    expect(parseSpy).not.toHaveBeenCalled()
    parseSpy.mockRestore()
    expect(surveys).toHaveLength(500)
    expect(surveys.map((survey) => survey.completion_rate)).toEqual(
      surveys.map((survey) => expected.get(survey.id)),
    )
    expect(getAllSpy).toHaveBeenCalledTimes(1)
    const sql = String(getAllSpy.mock.calls[0]?.[0])
    expect(sql).not.toContain("payload_json")
    expect(sql).toContain("payload_completion END AS completion_rate")
  })
})

describe("completion for v3.2 surveys (01.8): version + cas replace region + stage", () => {
  const v30: SurveyQueuePayload = {
    site_name: "Parcelle",
    region_version: "ACA",
    vegetation_stage: "mature",
    parcel_ids: ["ab1"],
    factors: {},
  }

  test("a v3.2 payload with site, cas and parcels counts as a v3.0 one with site, region, stage and parcels", () => {
    const v32: SurveyQueuePayload = {
      site_name: "Parcelle",
      parcel_ids: ["ab1"],
      factors: {},
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
      ibp_cas3_scale: false,
    }
    expect(computePayloadCompletion(v32)).toBe(computePayloadCompletion(v30))
    // site, region/version, stage/cas, parcels: 4 of 14.
    expect(computePayloadCompletion(v32)).toBe(29)
  })

  test("a v3.2 payload counts only the version when the cas is missing or out of range", () => {
    const base: SurveyQueuePayload = {
      site_name: "Parcelle",
      parcel_ids: ["ab1"],
      factors: {},
      ibp_method_version: IBP_METHOD_V3_2,
    }
    expect(computePayloadCompletion(base)).toBe(21)
    expect(computePayloadCompletion({ ...base, ibp_cas: 0 })).toBe(21)
    expect(computePayloadCompletion({ ...base, ibp_cas: 5 })).toBe(21)
    expect(computePayloadCompletion({ ...base, ibp_cas: 4 })).toBe(29)
  })

  test("a v3.2 payload ignores a stray region/stage; v3.0 is unchanged by a tag", () => {
    const strayRegion: SurveyQueuePayload = {
      ...v30,
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
    }
    expect(computePayloadCompletion(strayRegion)).toBe(29)
    expect(computePayloadCompletion({ ...v30, ibp_method_version: IBP_METHOD_V3_0 })).toBe(
      computePayloadCompletion(v30),
    )
    expect(computePayloadCompletion({ ...v30, ibp_method_version: null })).toBe(
      computePayloadCompletion(v30),
    )
  })

  test("createLocalDraft stores the v3.2 completion", async () => {
    const survey = await createLocalDraft({
      site_name: "Parcelle",
      parcel_ids: ["ab1"],
      factors: { A: { native_genus_count: 4 } },
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 2,
      ibp_cas3_scale: false,
    })

    // site, version, cas, parcel and factor A: 5 of 14, as the v3.0 draft above.
    expect(await storedCompletion(survey.id)).toBe(36)
    expect(survey.completion_rate).toBe(36)
  })
})
