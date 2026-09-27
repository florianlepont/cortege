/**
 * cacheSurveyCanonicalFields (phase 10, D-01), real SQL.
 *
 * The mobile app never writes observation_year/version_number itself — the server assigns them.
 * Caching them into payload_json whenever the canonical detail loads is what lets a later PDF
 * export (REQ-C-pdf-export) read them with no API call, including after an app restart offline.
 */

import { initLocalDb, getDb } from "./db"
import { cacheSurveyCanonicalFields, createLocalDraft } from "./surveys"
import type { SurveyQueuePayload } from "./types"

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

async function storedPayload(id: string): Promise<SurveyQueuePayload> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_json: string }>(
    `SELECT payload_json FROM local_surveys WHERE id = ?`,
    [id],
  )
  return JSON.parse(String(row?.payload_json)) as SurveyQueuePayload
}

async function storedCompletion(id: string): Promise<number | undefined> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ payload_completion: number }>(
    `SELECT payload_completion FROM local_surveys WHERE id = ?`,
    [id],
  )
  return row?.payload_completion
}

test("caches the observation year and version into payload_json, keeping the rest untouched", async () => {
  const survey = await createLocalDraft({
    site_name: "Bois",
    region_version: "ACA",
    vegetation_stage: "mature",
    parcel_ids: ["ab1"],
    factors: { A: { count: 3 } },
  })
  const completionBefore = await storedCompletion(survey.id)

  await cacheSurveyCanonicalFields(survey.id, { observation_year: 2026, version_number: 1 })

  const payload = await storedPayload(survey.id)
  expect(payload).toMatchObject({
    observation_year: 2026,
    version_number: 1,
    site_name: "Bois",
    parcel_ids: ["AB1"],
  })
  expect(await storedCompletion(survey.id)).toBe(completionBefore)
})

test("only writes the fields it is given", async () => {
  const survey = await createLocalDraft({
    site_name: "Bois",
    region_version: "ACA",
    vegetation_stage: "mature",
    parcel_ids: [],
    factors: {},
  })

  await cacheSurveyCanonicalFields(survey.id, { observation_year: 2025, version_number: null })

  const payload = await storedPayload(survey.id)
  expect(payload.observation_year).toBe(2025)
  expect(payload).not.toHaveProperty("version_number")
})

test("is a no-op for a survey id that does not exist locally", async () => {
  await expect(
    cacheSurveyCanonicalFields("does-not-exist", { observation_year: 2026, version_number: 1 }),
  ).resolves.toBeUndefined()
})
