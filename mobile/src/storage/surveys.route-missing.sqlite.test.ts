/**
 * Phase 30 (O-19, P-1): `listLocalSurveys` says in SQL (json_type, no JS parse, no column) which
 * pending drafts have no route, so the list shows "Parcours à choisir" instead of "Sync en
 * attente" and the "à envoyer" counters leave them out. It clears once the route is written.
 */

import type { SurveyRoute } from "@cortege/ibp-domain"
import { computeSurveyStats, resolveSurveyUiStatus } from "../app/survey-logic"
import { initLocalDb, getDb, SCHEMA_VERSION } from "./db"
import { createLocalDraft, listLocalSurveys, patchLocalSurveyRoute } from "./surveys"

const ROUTE: SurveyRoute = {
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 2.5,
  guide: { chosen_by: "observer" },
}

const INPUT = {
  site_name: "Lisière de la Marne",
  region_version: "ACA" as const,
  vegetation_stage: "collineen",
  parcel_ids: [] as string[],
  factors: {},
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

describe("route_missing in the survey list", () => {
  test("a pending draft without route reads route_pending and is not counted as to send", async () => {
    const draft = await createLocalDraft(INPUT)
    const [row] = await listLocalSurveys()
    expect(row.id).toBe(draft.id)
    expect(row.sync_state).toBe("pending")
    expect(row.route_missing).toBe(1)
    expect(resolveSurveyUiStatus(row)).toBe("route_pending")
    const stats = computeSurveyStats([row])
    expect(stats.pending).toBe(0)
    expect(stats.draft).toBe(1)
  })

  test("it clears as soon as the route is written and the draft shows its sync state", async () => {
    const draft = await createLocalDraft(INPUT)
    await patchLocalSurveyRoute({ survey_id: draft.id, survey_route: ROUTE })
    const [row] = await listLocalSurveys()
    expect(row.route_missing).toBe(0)
    expect(resolveSurveyUiStatus(row)).toBe("sync_pending")
    expect(computeSurveyStats([row]).pending).toBe(1)
  })

  test("a synced or submitted survey is never route_pending, and the schema stays at 5", async () => {
    const draft = await createLocalDraft(INPUT)
    const db = await getDb()
    await db.runAsync(`UPDATE local_surveys SET sync_state = 'synced' WHERE id = ?`, [draft.id])
    const [synced] = await listLocalSurveys()
    expect(synced.route_missing).toBe(0)
    await db.runAsync(
      `UPDATE local_surveys SET sync_state = 'pending', status = 'submitted' WHERE id = ?`,
      [draft.id],
    )
    const [submitted] = await listLocalSurveys()
    expect(submitted.route_missing).toBe(0)
    expect(SCHEMA_VERSION).toBe(5)
  })
})
