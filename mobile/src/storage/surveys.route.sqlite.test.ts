/**
 * Phase 30 on the phone, real SQL: the recorded route lives in the draft payload as `survey_route`
 * (D-08, no SQLite column), is written only to a draft in its canonical form and never cleared
 * (D-09, spec section 8), survives the form autosave, and does not move the completion counters
 * (a route is not a factor).
 */

import { canonicalSurveyRoute } from "@cortege/ibp-domain"
import type { SurveyRoute } from "@cortege/ibp-domain"
import { initLocalDb, getDb, SCHEMA_VERSION } from "./db"
import {
  createLocalDraft,
  getLocalSurveyDraft,
  patchLocalSurveyRoute,
  updateLocalDraft,
} from "./surveys"
import type { SurveyQueuePayload } from "./types"

const SIX_FACTORS = {
  A: { native_genus_count: 5 },
  B: { strata_count: 3, covered_autochthonous_percent: 60 },
  C: { bmg_count: 2, bmm_count: 2, surface_ha: 1 },
}

const BASE_INPUT = {
  site_name: "Lisière de la Marne",
  region_version: "ACA" as const,
  vegetation_stage: "collineen",
  factors: SIX_FACTORS,
}

const FULL_ROUTE: SurveyRoute = {
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 2.5,
  guide: { chosen_by: "observer" },
}

const PARTIAL_ROUTE: SurveyRoute = {
  version: 1,
  method: "partial_strip",
  counting: "uncapped",
  uncapped_factors: ["A", "C"],
  zone_surface_ha: 12,
  complement: { done: true, total_surface_ha: 14.5 },
  guide: {
    chosen_by: "guide",
    suggested: { method: "partial_strip", counting: "uncapped" },
    answers: { surface_ha: 12, homogeneity: "homogeneous" },
  },
}

async function storedPayload(id: string): Promise<SurveyQueuePayload> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_json: string }>(
    `SELECT payload_json FROM local_surveys WHERE id = ?`,
    [id],
  )
  return JSON.parse(String(row?.payload_json)) as SurveyQueuePayload
}

async function storedCounters(id: string): Promise<{ completion: number; filled: number }> {
  const db = await getDb()
  const row = await db.getFirstAsync<{
    payload_completion: number
    payload_factors_filled: number
  }>(`SELECT payload_completion, payload_factors_filled FROM local_surveys WHERE id = ?`, [id])
  return {
    completion: Number(row?.payload_completion),
    filled: Number(row?.payload_factors_filled),
  }
}

async function queuedUpserts(id: string): Promise<SurveyQueuePayload[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload FROM sync_queue WHERE survey_id = ? AND op_type = 'survey_upsert'`,
    [id],
  )
  return rows.map((row) => JSON.parse(row.payload) as SurveyQueuePayload)
}

async function setStatus(id: string, status: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(`UPDATE local_surveys SET status = ? WHERE id = ?`, [status, id])
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

describe("patchLocalSurveyRoute (D-08, D-09)", () => {
  test("stores the route, bumps sync_version and keeps one queued upsert carrying it", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    expect(await storedPayload(survey.id)).not.toHaveProperty("survey_route")

    const patched = await patchLocalSurveyRoute({
      survey_id: survey.id,
      survey_route: PARTIAL_ROUTE,
    })

    expect(patched).toMatchObject({
      id: survey.id,
      status: "draft",
      sync_version: survey.sync_version + 1,
      sync_state: "pending",
      site_name: BASE_INPUT.site_name,
    })
    const payload = await storedPayload(survey.id)
    expect(payload.survey_route).toEqual(PARTIAL_ROUTE)
    expect(payload.sync_version).toBe(survey.sync_version + 1)
    const queued = await queuedUpserts(survey.id)
    expect(queued).toHaveLength(1)
    expect(queued[0].survey_route).toEqual(PARTIAL_ROUTE)
    expect(queued[0].sync_version).toBe(survey.sync_version + 1)
    expect((await getLocalSurveyDraft(survey.id))?.survey_route).toEqual(PARTIAL_ROUTE)
  })

  test("a second write replaces the route and still leaves one queued upsert", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: PARTIAL_ROUTE })
    await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: FULL_ROUTE })

    expect((await storedPayload(survey.id)).survey_route).toEqual(FULL_ROUTE)
    const queued = await queuedUpserts(survey.id)
    expect(queued).toHaveLength(1)
    expect(queued[0].survey_route).toEqual(FULL_ROUTE)
    expect(queued[0].sync_version).toBe(survey.sync_version + 2)
  })

  test("stores the canonical form of the record (dropped keys, sorted factors)", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    // Canonical already (valid) but with an unknown extra key and a capped-only field absent.
    const withExtra = { ...FULL_ROUTE, phase_31_room: { x: 1 } } as unknown as SurveyRoute

    const patched = await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: withExtra })

    expect(patched).not.toBeNull()
    const stored = (await storedPayload(survey.id)).survey_route
    expect(stored).toEqual(canonicalSurveyRoute(withExtra))
    expect(stored).not.toHaveProperty("phase_31_room")
  })

  test("a submitted survey is refused: null, no queue row, same payload and sync_version", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    const db = await getDb()
    await db.execAsync(`DELETE FROM sync_queue;`)
    await setStatus(survey.id, "submitted")
    const before = await storedPayload(survey.id)

    const result = await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: FULL_ROUTE })

    expect(result).toBeNull()
    expect(await queuedUpserts(survey.id)).toHaveLength(0)
    expect(await storedPayload(survey.id)).toEqual(before)
    const row = await db.getFirstAsync<{ sync_version: number; status: string }>(
      `SELECT sync_version, status FROM local_surveys WHERE id = ?`,
      [survey.id],
    )
    expect(row).toEqual({ sync_version: survey.sync_version, status: "submitted" })
  })

  test("a synced-submitted survey is refused too", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    await setStatus(survey.id, "synced_submitted")

    expect(
      await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: FULL_ROUTE }),
    ).toBeNull()
    expect(await storedPayload(survey.id)).not.toHaveProperty("survey_route")
  })

  test("an unknown survey returns null", async () => {
    expect(await patchLocalSurveyRoute({ survey_id: "nope", survey_route: FULL_ROUTE })).toBeNull()
  })

  test("a record the package validator refuses returns null and writes nothing", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: FULL_ROUTE })
    const before = await storedPayload(survey.id)
    const queuedBefore = await queuedUpserts(survey.id)

    const broken = { ...FULL_ROUTE, zone_surface_ha: -3 } as SurveyRoute
    const partialWithoutComplement = {
      ...FULL_ROUTE,
      method: "partial_plot",
    } as SurveyRoute

    expect(await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: broken })).toBeNull()
    expect(
      await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: partialWithoutComplement }),
    ).toBeNull()
    expect(
      await patchLocalSurveyRoute({
        survey_id: survey.id,
        survey_route: null as unknown as SurveyRoute,
      }),
    ).toBeNull()

    expect(await storedPayload(survey.id)).toEqual(before)
    expect(await queuedUpserts(survey.id)).toEqual(queuedBefore)
  })

  test("there is no way to clear a route: a null record never removes the stored one", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: FULL_ROUTE })

    await patchLocalSurveyRoute({
      survey_id: survey.id,
      survey_route: null as unknown as SurveyRoute,
    })

    expect((await storedPayload(survey.id)).survey_route).toEqual(FULL_ROUTE)
  })

  test("a row without a usable payload is rebuilt from the row columns", async () => {
    const db = await getDb()
    await db.runAsync(
      `INSERT INTO local_surveys (id, site_name, status, visibility, sync_version, sync_state, sync_blocked, payload_json, created_at, updated_at)
       VALUES ('bare', 'Bare', 'draft', 'public', 4, 'synced', 0, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
    )

    const patched = await patchLocalSurveyRoute({ survey_id: "bare", survey_route: FULL_ROUTE })

    expect(patched).toMatchObject({ id: "bare", sync_version: 5, visibility: "public" })
    expect((await getLocalSurveyDraft("bare"))?.survey_route).toEqual(FULL_ROUTE)
  })
})

describe("the route survives the form autosave and leaves the counters alone", () => {
  test("updateLocalDraft keeps survey_route in the payload and in the queued upsert", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: PARTIAL_ROUTE })

    await updateLocalDraft({
      survey_id: survey.id,
      ...BASE_INPUT,
      parcel_ids: ["P2"],
      factors: { ...SIX_FACTORS, D: { bmg_count: 1 } },
    })

    expect((await storedPayload(survey.id)).survey_route).toEqual(PARTIAL_ROUTE)
    expect((await queuedUpserts(survey.id))[0].survey_route).toEqual(PARTIAL_ROUTE)
  })

  test("payload_completion and payload_factors_filled do not move when a route is written", async () => {
    const survey = await createLocalDraft({ ...BASE_INPUT, parcel_ids: ["P1"] })
    const before = await storedCounters(survey.id)

    await patchLocalSurveyRoute({ survey_id: survey.id, survey_route: PARTIAL_ROUTE })

    expect(await storedCounters(survey.id)).toEqual(before)
  })
})

test("the SQLite schema stays at version 5 (D-09)", () => {
  expect(SCHEMA_VERSION).toBe(5)
})
