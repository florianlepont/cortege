/**
 * Completion precomputed at write time (01.9 D-03), real SQL.
 *
 * Every write of payload_json stores local_surveys.payload_completion, and
 * listLocalSurveys reads completion from SQL (submitted = 100) without
 * selecting or parsing payload_json, so a 500-survey list costs no JSON.parse.
 */

import { IBP_METHOD_V3_0, IBP_METHOD_V3_2 } from "@cortege/ibp-domain"
import { evaluateSubmitReadinessFromDraft } from "../app/ibp-scoring"
import { initLocalDb, getDb } from "./db"
import {
  createLocalDraft,
  getLocalSurveyDraft,
  listLocalSurveys,
  updateLocalDraft,
} from "./surveys"
import { pullRemoteChanges } from "./sync"
import {
  computeCompletionRate,
  computePayloadCompletion,
  computePayloadFactorsFilled,
} from "./utils"
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

async function storedFactorsFilled(id: string): Promise<number | undefined> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_factors_filled: number }>(
    `SELECT payload_factors_filled FROM local_surveys WHERE id = ?`,
    [id],
  )
  return row?.payload_factors_filled
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
    // 12.2-14: the payload is only reached through json_extract, never selected.
    expect(sql).not.toMatch(/SELECT\s+payload_json|,\s*payload_json\s*,/)
    expect(sql).toContain("payload_completion END AS completion_rate")
    expect(sql).toContain("json_extract(payload_json, '$.scores.ibp_total')")
  })
})

describe("listLocalSurveys reads the submitted total from the payload (12.2-14)", () => {
  async function insertRow(id: string, status: string, payloadJson: string | null) {
    const db = await getDb()
    await db.runAsync(
      `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, sync_blocked, payload_json, payload_completion, created_at, updated_at)
       VALUES (?, ?, ?, 'private', 1, 'synced', 0, ?, 50, ?, ?)`,
      [id, id, status, payloadJson, NOW, NOW],
    )
  }

  async function totals(): Promise<Record<string, number | null | undefined>> {
    const surveys = await listLocalSurveys()
    return Object.fromEntries(surveys.map((survey) => [survey.id, survey.ibp_total]))
  }

  test("a submitted survey carries scores.ibp_total, as pulled from the server", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      changesResponse([
        {
          id: "remote-scored",
          site_name: "Notée",
          status: "submitted",
          sync_version: 3,
          scores: { ibp_total: 37, ibp_peuplement_gestion: 25, ibp_contexte: 12 },
        },
      ]),
    )
    await pullRemoteChanges("http://api", "token")

    expect((await totals())["remote-scored"]).toBe(37)
  })

  test("a total of 0 is kept (a real score, not a missing one)", async () => {
    await insertRow("zero", "submitted", JSON.stringify({ scores: { ibp_total: 0 } }))
    expect((await totals()).zero).toBe(0)
  })

  test("a submitted survey without a usable total reads null", async () => {
    await insertRow("no-scores", "submitted", JSON.stringify({ scores: {} }))
    await insertRow("no-key", "submitted", JSON.stringify({ site_name: "x" }))
    await insertRow("text", "submitted", JSON.stringify({ scores: { ibp_total: "37" } }))
    await insertRow("null-total", "submitted", JSON.stringify({ scores: { ibp_total: null } }))
    await insertRow("no-payload", "submitted", null)
    await insertRow("broken", "submitted", "{not json")

    expect(await totals()).toEqual({
      "no-scores": null,
      "no-key": null,
      text: null,
      "null-total": null,
      "no-payload": null,
      broken: null,
    })
  })

  test("a draft never carries a total, even when its payload holds an old one", async () => {
    await insertRow("draft", "draft", JSON.stringify({ scores: { ibp_total: 41 } }))
    expect((await totals()).draft).toBeNull()
  })

  test("the list still makes no JSON.parse call and returns no payload", async () => {
    await insertRow("scored", "submitted", JSON.stringify({ scores: { ibp_total: 22 } }))
    const parseSpy = jest.spyOn(JSON, "parse")

    const surveys = await listLocalSurveys()

    expect(parseSpy).not.toHaveBeenCalled()
    parseSpy.mockRestore()
    expect(surveys[0]).toMatchObject({ id: "scored", ibp_total: 22 })
    expect(surveys[0]).not.toHaveProperty("payload_json")
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

// 12.2-14: Accueil's resume card read "7/10 factors" for a draft whose detail said "6 sur 10". The
// card divided payload_completion (a percentage of 14 slots: name, method, parcel and the ten
// factors) by ten, so four filled context slots added three tenths. These tests rebuild that draft.
describe("factors filled, one definition for the list and the detail (12.2-14)", () => {
  // Name, region, stage, parcel (4 context slots) and the six factors A to F: 10 of 14 slots.
  const SIX_FACTORS = {
    A: { native_genus_count: 5 },
    B: { strata_count: 3, covered_autochthonous_percent: 60 },
    C: { bmg_count: 2, bmm_count: 2, surface_ha: 1 },
    D: { bmg_count: 0, bmm_count: 2, surface_ha: 1 },
    E: { tgb_count: 6, gb_count: 0, surface_ha: 1 },
    F: { trees_per_ha: 9 },
  }
  const MISMATCH_INPUT = {
    site_name: "Lisière de la Marne",
    region_version: "ACA" as const,
    vegetation_stage: "collineen",
    parcel_ids: ["ab1"],
    factors: SIX_FACTORS,
  }

  /** What the survey detail shows: ten minus the readiness missing factors of the live draft. */
  async function detailFilledCount(id: string): Promise<number> {
    const draft = await getLocalSurveyDraft(id)
    return (
      10 -
      evaluateSubmitReadinessFromDraft({ ...draft, factors: draft?.factors }).missing_factors.length
    )
  }

  test("reproduces the bug: the old reading, completion_rate / 10, gives 7 for six factors", async () => {
    const survey = await createLocalDraft(MISMATCH_INPUT)

    expect(survey.completion_rate).toBe(71)
    expect(Math.round(survey.completion_rate / 10)).toBe(7)
    expect(await detailFilledCount(survey.id)).toBe(6)
  })

  test("createLocalDraft stores and returns factors_filled, 6, matching the detail", async () => {
    const survey = await createLocalDraft(MISMATCH_INPUT)

    expect(survey.factors_filled).toBe(6)
    expect(await storedFactorsFilled(survey.id)).toBe(6)
    expect(await storedFactorsFilled(survey.id)).toBe(await detailFilledCount(survey.id))
    const [listed] = await listLocalSurveys()
    expect(listed.factors_filled).toBe(6)
    expect(listed.completion_rate).toBe(71)
  })

  test("updateLocalDraft recomputes it, and a partly filled factor does not count", async () => {
    const survey = await createLocalDraft({ ...MISMATCH_INPUT, factors: {} })
    expect(await storedFactorsFilled(survey.id)).toBe(0)

    const updated = await updateLocalDraft({
      survey_id: survey.id,
      ...MISMATCH_INPUT,
      // G holds a value the package does not score (no percentage), so it is not filled.
      factors: { ...SIX_FACTORS, G: { open_flowering_percent: "" }, H: { class_score: "x" } },
    })

    expect(updated.factors_filled).toBe(6)
    expect(await storedFactorsFilled(survey.id)).toBe(await detailFilledCount(survey.id))
    // completion_rate counts H as filled (it holds a value), the factor count does not: this is
    // the second way the two readings could differ.
    expect(computePayloadCompletion(await storedPayload(survey.id))).toBe(79)
    expect(updated.factors_filled).not.toBe(Math.round(updated.completion_rate / 10))
  })

  test("a factor equal to a legacy default counts as filled when the package scores it", async () => {
    const survey = await createLocalDraft({
      ...MISMATCH_INPUT,
      factors: { G: { open_flowering_percent: 2 } },
    })
    // completion_rate skips the legacy default, the factor count follows the package.
    expect(survey.factors_filled).toBe(await detailFilledCount(survey.id))
    expect(survey.factors_filled).toBe(1)
  })

  test("a pull stores the factor count on insert and on update", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      changesResponse([
        { id: "remote-1", site_name: "Distante", status: "draft", sync_version: 1 },
      ]),
    )
    await pullRemoteChanges("http://api", "token")
    expect(await storedFactorsFilled("remote-1")).toBe(0)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      changesResponse([
        {
          id: "remote-1",
          site_name: "Distante",
          status: "draft",
          sync_version: 2,
          region_version: "ACA",
          vegetation_stage: "collineen",
          parcel_ids: ["ef3"],
          factors: SIX_FACTORS,
        },
      ]),
    )
    await pullRemoteChanges("http://api", "token")

    expect(await storedFactorsFilled("remote-1")).toBe(6)
    expect(await storedFactorsFilled("remote-1")).toBe(await detailFilledCount("remote-1"))
    const listed = (await listLocalSurveys()).find((survey) => survey.id === "remote-1")
    expect(listed?.factors_filled).toBe(6)
  })

  test("the list and the detail agree on every payload, v3.0 and v3.2", async () => {
    const inputs = [
      MISMATCH_INPUT,
      { ...MISMATCH_INPUT, factors: {} },
      { ...MISMATCH_INPUT, factors: { A: { native_genus_count: 5 }, B: { strata_count: "abc" } } },
      {
        site_name: "Version 3.2",
        parcel_ids: ["ab1"],
        factors: SIX_FACTORS,
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 2,
        ibp_cas3_scale: false,
      },
      {
        site_name: "Version 3.2 sans cas",
        parcel_ids: [],
        factors: SIX_FACTORS,
        ibp_method_version: IBP_METHOD_V3_2,
      },
    ]
    for (const input of inputs) {
      const survey = await createLocalDraft(input)
      expect(survey.factors_filled).toBe(await detailFilledCount(survey.id))
    }
    for (const survey of await listLocalSurveys()) {
      expect(survey.factors_filled).toBe(await detailFilledCount(survey.id))
    }
  })

  test("the list selects the stored column without parsing or selecting the payload", async () => {
    await createLocalDraft(MISMATCH_INPUT)
    const db = await getDb()
    const getAllSpy = jest.spyOn(db, "getAllAsync")
    const parseSpy = jest.spyOn(JSON, "parse")

    await listLocalSurveys()

    expect(parseSpy).not.toHaveBeenCalled()
    parseSpy.mockRestore()
    expect(String(getAllSpy.mock.calls[0]?.[0])).toContain(
      "payload_factors_filled AS factors_filled",
    )
  })

  test("computePayloadFactorsFilled of no payload is 0", () => {
    expect(computePayloadFactorsFilled(null)).toBe(0)
  })
})
