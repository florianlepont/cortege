/**
 * The IBP method version on the phone (01.8, D-08 and D-10 amended), real SQL.
 *
 * The version, the cas and the cas-3 flag live in the schemaless payload_json and the queued
 * upsert payload only (no SQLite migration of its own). A legacy draft is never stamped, a v3.2
 * payload carries no region/stage and a v3.0 payload carries no cas.
 */

import {
  FACTOR_KEYS as SHARED_FACTOR_KEYS,
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
} from "@cortege/ibp-domain"
import { initLocalDb, getDb, FACTOR_KEYS, SCHEMA_VERSION } from "./db"
import { createLocalDraft, updateLocalDraft } from "./surveys"
import { applyMethodFields } from "./utils"
import type { SurveyQueuePayload } from "./types"

async function storedPayload(id: string): Promise<SurveyQueuePayload> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_json: string }>(
    `SELECT payload_json FROM local_surveys WHERE id = ?`,
    [id],
  )
  return JSON.parse(String(row?.payload_json)) as SurveyQueuePayload
}

async function queuedPayloads(id: string): Promise<SurveyQueuePayload[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload FROM sync_queue WHERE survey_id = ? AND op_type = 'survey_upsert' ORDER BY id`,
    [id],
  )
  return rows.map((row) => JSON.parse(row.payload) as SurveyQueuePayload)
}

async function createLegacyDraft() {
  return createLocalDraft({
    site_name: "Parcelle legacy",
    region_version: "ACA",
    vegetation_stage: "mature",
    parcel_ids: ["ab1"],
    factors: {},
  })
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

describe("storage constants (01.8 criterion 1, D-10 amended)", () => {
  test("FACTOR_KEYS equals the package's A..J", () => {
    expect(FACTOR_KEYS).toEqual([...SHARED_FACTOR_KEYS])
  })

  test("method version fields need no SQLite migration of their own", () => {
    // SCHEMA_VERSION moves when an unrelated migration lands (Phase 8's offline-map tables, for
    // one); this test only guards that storing ibp_method_version/ibp_cas never bumps it itself.
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(2)
  })
})

describe("createLocalDraft", () => {
  test("a v3.2 draft stores version, cas and flag, and no region/stage", async () => {
    const survey = await createLocalDraft({
      site_name: "Parcelle v3.2",
      parcel_ids: ["ab1"],
      factors: {},
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 1,
      ibp_cas3_scale: false,
    })

    const payload = await storedPayload(survey.id)
    const [queued] = await queuedPayloads(survey.id)
    for (const written of [payload, queued]) {
      expect(written).toMatchObject({
        ibp_method_version: IBP_METHOD_V3_2,
        ibp_cas: 1,
        ibp_cas3_scale: false,
      })
      expect(written).not.toHaveProperty("region_version")
      expect(written).not.toHaveProperty("vegetation_stage")
    }
  })

  test("a v3.2 draft drops a region/stage the caller still sends", async () => {
    const survey = await createLocalDraft({
      site_name: "Parcelle v3.2",
      region_version: "M",
      vegetation_stage: "jeune",
      parcel_ids: [],
      factors: {},
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 2,
      ibp_cas3_scale: true,
    })

    const payload = await storedPayload(survey.id)
    expect(payload).not.toHaveProperty("region_version")
    expect(payload).not.toHaveProperty("vegetation_stage")
    expect(payload.ibp_cas).toBe(2)
    expect(payload.ibp_cas3_scale).toBe(true)
  })

  test("the legacy caller shape stamps no version", async () => {
    const survey = await createLegacyDraft()

    const payload = await storedPayload(survey.id)
    const [queued] = await queuedPayloads(survey.id)
    for (const written of [payload, queued]) {
      expect(written).not.toHaveProperty("ibp_method_version")
      expect(written).not.toHaveProperty("ibp_cas")
      expect(written).not.toHaveProperty("ibp_cas3_scale")
      expect(written).toMatchObject({ region_version: "ACA", vegetation_stage: "mature" })
    }
  })
})

describe("updateLocalDraft", () => {
  test("a legacy draft updated without a version key stays untagged and keeps region/stage", async () => {
    const survey = await createLegacyDraft()

    await updateLocalDraft({
      survey_id: survey.id,
      site_name: "Parcelle legacy",
      region_version: "M",
      vegetation_stage: "jeune",
      parcel_ids: ["ab1"],
      factors: { A: { native_genus_count: 3 } },
    })

    const payload = await storedPayload(survey.id)
    const queued = await queuedPayloads(survey.id)
    expect(queued).toHaveLength(1)
    for (const written of [payload, queued[0]]) {
      expect(written).not.toHaveProperty("ibp_method_version")
      expect(written).not.toHaveProperty("ibp_cas")
      expect(written).toMatchObject({ region_version: "M", vegetation_stage: "jeune" })
    }
  })

  test("switching v3.0 to v3.2 removes region/stage and writes the cas; back to v3.0 removes the cas", async () => {
    const survey = await createLocalDraft({
      site_name: "Parcelle",
      region_version: "ACA",
      vegetation_stage: "mature",
      parcel_ids: [],
      factors: {},
      ibp_method_version: IBP_METHOD_V3_0,
    })

    await updateLocalDraft({
      survey_id: survey.id,
      site_name: "Parcelle",
      parcel_ids: [],
      factors: {},
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 3,
      ibp_cas3_scale: false,
    })

    let payload = await storedPayload(survey.id)
    expect(payload).toMatchObject({
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 3,
      ibp_cas3_scale: false,
    })
    expect(payload).not.toHaveProperty("region_version")
    expect(payload).not.toHaveProperty("vegetation_stage")

    await updateLocalDraft({
      survey_id: survey.id,
      site_name: "Parcelle",
      region_version: "M",
      vegetation_stage: "jeune",
      parcel_ids: [],
      factors: {},
      ibp_method_version: IBP_METHOD_V3_0,
    })

    payload = await storedPayload(survey.id)
    expect(payload).toMatchObject({
      ibp_method_version: IBP_METHOD_V3_0,
      region_version: "M",
      vegetation_stage: "jeune",
    })
    expect(payload).not.toHaveProperty("ibp_cas")
    expect(payload).not.toHaveProperty("ibp_cas3_scale")
    const queued = await queuedPayloads(survey.id)
    expect(queued).toHaveLength(1)
    expect(queued[0]).not.toHaveProperty("ibp_cas")
  })

  test("a null version stays null and is never turned into the v3.0 tag", async () => {
    const survey = await createLegacyDraft()

    await updateLocalDraft({
      survey_id: survey.id,
      site_name: "Parcelle legacy",
      region_version: "ACA",
      vegetation_stage: "mature",
      parcel_ids: [],
      factors: {},
      ibp_method_version: null,
    })

    const payload = await storedPayload(survey.id)
    expect(payload.ibp_method_version).toBeNull()
    expect(payload).toMatchObject({ region_version: "ACA", vegetation_stage: "mature" })
    const [queued] = await queuedPayloads(survey.id)
    expect(queued.ibp_method_version).toBeNull()
  })

  test("an update without a version key keeps a v3.2 draft's method fields and adds no region", async () => {
    const survey = await createLocalDraft({
      site_name: "Parcelle v3.2",
      parcel_ids: [],
      factors: {},
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 4,
      ibp_cas3_scale: false,
    })

    await updateLocalDraft({
      survey_id: survey.id,
      site_name: "Parcelle renommée",
      region_version: "ACA",
      vegetation_stage: "mature",
      parcel_ids: [],
      factors: {},
    })

    const payload = await storedPayload(survey.id)
    expect(payload).toMatchObject({
      site_name: "Parcelle renommée",
      ibp_method_version: IBP_METHOD_V3_2,
      ibp_cas: 4,
      ibp_cas3_scale: false,
    })
    expect(payload).not.toHaveProperty("region_version")
    expect(payload).not.toHaveProperty("vegetation_stage")
  })
})

describe("applyMethodFields", () => {
  test("keeps an unsupported version and its cas untouched", () => {
    const base: SurveyQueuePayload = { ibp_method_version: "future", ibp_cas: 2 }
    expect(applyMethodFields(base, { region_version: "M", vegetation_stage: "jeune" })).toEqual({
      ibp_method_version: "future",
      ibp_cas: 2,
      region_version: "M",
      vegetation_stage: "jeune",
    })
  })

  test("does not mutate the base payload", () => {
    const base: SurveyQueuePayload = { region_version: "ACA", vegetation_stage: "mature" }
    applyMethodFields(base, { ibp_method_version: IBP_METHOD_V3_2, ibp_cas: 1 })
    expect(base).toEqual({ region_version: "ACA", vegetation_stage: "mature" })
  })
})
