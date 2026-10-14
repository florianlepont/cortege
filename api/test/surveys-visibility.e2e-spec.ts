import "dotenv/config"
import { INestApplication } from "@nestjs/common"
import { Client, ClientConfig } from "pg"
import request = require("supertest")
import { DatabaseService } from "../src/database/database.service"
import {
  createE2eApp,
  createSubmittedSurvey,
  getNextVersionNumber,
  loginTestUser,
  resolveParcel,
  uniqueCoordSeed,
  uniqueId,
  validDirectFactors,
} from "./helpers/surveys-e2e"

// Phase 29: the visibility is chosen on the draft and frozen at submit (D-07). A draft changes
// it freely and each change writes one visibility_changed event (D-08); after submit every write
// channel refuses a different value with the documented per-channel code and the field name, and
// a replay of the stored value stays successful. The last two cases prove the race with submit
// has only two outcomes: the visibility write commits first, or it is refused with a 422.

type E2eEnvModule = { resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig }
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

type SurveyEvent = { event_type: string; payload?: { from?: string; to?: string } }

describe("Surveys visibility (e2e)", () => {
  let app: INestApplication
  let db: DatabaseService

  beforeAll(async () => {
    const context = await createE2eApp()
    app = context.app
    db = context.db
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  /** A draft complete enough to be submitted (parcel, year, version, A..J). */
  async function createCompleteDraft(accessToken: string, label: string): Promise<string> {
    const surveyId = uniqueId(label)
    const seed = uniqueCoordSeed()
    const lat = 48.75 + seed / 100000
    const lng = 1.95 + seed / 100000
    const parcelId = await resolveParcel(app, accessToken, lat, lng)
    const versionNumber = await getNextVersionNumber(db, parcelId)
    await request(app.getHttpServer())
      .post("/v1/surveys")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        id: surveyId,
        sync_version: 1,
        site_name: "Visibility Forest",
        status: "draft",
        visibility: "private",
        parcel_id: parcelId,
        observation_year: 2025,
        version_number: versionNumber,
        region_version: "ACA",
        vegetation_stage: "collineen",
        factors: validDirectFactors,
        location: { source: "gps", lat, lng },
      })
      .expect(201)
    return surveyId
  }

  async function storedVisibility(surveyId: string): Promise<string> {
    const result = await db.query<{ visibility: string }>(
      `SELECT visibility FROM surveys WHERE id = $1`,
      [surveyId],
    )
    return result.rows[0].visibility
  }

  async function visibilityEvents(accessToken: string, surveyId: string): Promise<SurveyEvent[]> {
    const events = await request(app.getHttpServer())
      .get(`/v1/surveys/${surveyId}/events`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200)
    return (events.body.items as SurveyEvent[]).filter(
      (event) => event.event_type === "visibility_changed",
    )
  }

  function patchVisibility(accessToken: string, surveyId: string, visibility: string) {
    return request(app.getHttpServer())
      .patch(`/v1/surveys/${surveyId}/visibility`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ visibility })
  }

  function syncVisibility(accessToken: string, surveyId: string, visibility: string) {
    return request(app.getHttpServer())
      .post("/v1/sync")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        operations: [
          {
            client_ref: "op-visibility",
            entity: "survey",
            action: "visibility_update",
            survey_id: surveyId,
            payload: { visibility },
          },
        ],
      })
      .expect(200)
  }

  it("(a) draft: PATCH /visibility applies and writes one visibility_changed event (D-08)", async () => {
    const accessToken = await loginTestUser(app, "e2e-vis-draft-patch")
    const surveyId = await createCompleteDraft(accessToken, "e2e-vis-draft-patch")

    const toggle = await patchVisibility(accessToken, surveyId, "public").expect(200)

    expect(toggle.body).toMatchObject({ id: surveyId, visibility: "public" })
    expect(typeof toggle.body.updated_at).toBe("string")
    expect(await storedVisibility(surveyId)).toBe("public")
    const events = await visibilityEvents(accessToken, surveyId)
    expect(events).toHaveLength(1)
    expect(events[0].payload).toMatchObject({ from: "private", to: "public" })
  })

  it("(b) submitted: PATCH /visibility with the other value is a 422 naming the field, nothing written", async () => {
    const accessToken = await loginTestUser(app, "e2e-vis-submitted-patch")
    const { surveyId } = await createSubmittedSurvey(app, db, accessToken, {
      visibility: "private",
    })

    const refused = await patchVisibility(accessToken, surveyId, "public").expect(422)

    expect(refused.body.code).toBe("submitted_read_only_fields")
    expect(refused.body.forbidden_fields).toEqual(["visibility"])
    expect(refused.body.details.fields).toEqual(["visibility"])
    expect(await storedVisibility(surveyId)).toBe("private")
    expect(await visibilityEvents(accessToken, surveyId)).toHaveLength(0)
  })

  it("(c) submitted: PATCH /visibility with the stored value answers 200 (idempotent replay)", async () => {
    const accessToken = await loginTestUser(app, "e2e-vis-submitted-replay")
    const { surveyId } = await createSubmittedSurvey(app, db, accessToken, {
      visibility: "public",
    })

    const replay = await patchVisibility(accessToken, surveyId, "public").expect(200)

    expect(replay.body).toMatchObject({ id: surveyId, visibility: "public" })
    expect(await storedVisibility(surveyId)).toBe("public")
    expect(await visibilityEvents(accessToken, surveyId)).toHaveLength(0)
  })

  it("(d) submitted: sync visibility_update with the other value is a 422 fatal_error, the stored value syncs", async () => {
    const accessToken = await loginTestUser(app, "e2e-vis-submitted-sync")
    const { surveyId } = await createSubmittedSurvey(app, db, accessToken, {
      visibility: "private",
    })

    const refused = await syncVisibility(accessToken, surveyId, "public")
    expect(refused.body.results).toHaveLength(1)
    expect(refused.body.results[0]).toMatchObject({
      client_ref: "op-visibility",
      entity: "survey",
      action: "visibility_update",
      status: "fatal_error",
      error: {
        code: "submitted_read_only_fields",
        http_status: 422,
        details: { survey_id: surveyId, fields: ["visibility"] },
      },
    })
    expect(await storedVisibility(surveyId)).toBe("private")

    const replay = await syncVisibility(accessToken, surveyId, "private")
    expect(replay.body.results[0]).toMatchObject({ status: "synced" })
    expect(replay.body.results[0].data.visibility).toBe("private")
    expect(await visibilityEvents(accessToken, surveyId)).toHaveLength(0)
  })

  it("(e) draft: sync visibility_update applies and writes the event", async () => {
    const accessToken = await loginTestUser(app, "e2e-vis-draft-sync")
    const surveyId = await createCompleteDraft(accessToken, "e2e-vis-draft-sync")

    const sync = await syncVisibility(accessToken, surveyId, "public")

    expect(sync.body.results[0]).toMatchObject({
      client_ref: "op-visibility",
      status: "synced",
    })
    expect(sync.body.results[0].data.visibility).toBe("public")
    expect(await storedVisibility(surveyId)).toBe("public")
    const events = await visibilityEvents(accessToken, surveyId)
    expect(events).toHaveLength(1)
    expect(events[0].payload).toMatchObject({ from: "private", to: "public" })
  })

  // (f) Deterministic race: a raw connection holds the row lock (as POST /submit does), the
  // visibility write is proven to wait on it, then the holder submits and commits. The write must
  // see the submitted row and answer 422; before phase 29 it had no lock and no status guard and
  // would have overwritten the visibility of the submitted survey.
  describe.each([
    {
      route: "PATCH /v1/surveys/:id/visibility",
      send: (token: string, id: string) => patchVisibility(token, id, "public"),
    },
    {
      route: "PATCH /v1/surveys/:id",
      send: (token: string, id: string) =>
        request(app.getHttpServer())
          .patch(`/v1/surveys/${id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ visibility: "public" }),
    },
  ])("(f) $route racing a submit that holds the row lock", ({ send }) => {
    async function waitForLockWaiter(client: Client): Promise<void> {
      const deadline = Date.now() + 5000
      while (Date.now() < deadline) {
        const waiting = await client.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM pg_stat_activity
           WHERE datname = current_database()
             AND wait_event_type = 'Lock'
             AND pid <> pg_backend_pid()`,
        )
        if (Number(waiting.rows[0].count) > 0) {
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
      throw new Error("the visibility write never waited on the row lock")
    }

    async function raceAgainstLock(
      outcome: "submit" | "release",
    ): Promise<{ status: number; body: Record<string, unknown>; surveyId: string }> {
      const accessToken = await loginTestUser(app, "e2e-vis-race-lock")
      const surveyId = await createCompleteDraft(accessToken, "e2e-vis-race-lock")
      const client = new Client(resolveDbConfig(process.env))
      await client.connect()
      try {
        await client.query("BEGIN")
        await client.query(`SELECT id FROM surveys WHERE id = $1 FOR UPDATE`, [surveyId])

        let settled = false
        const pending = send(accessToken, surveyId).then((response) => {
          settled = true
          return response
        })

        await waitForLockWaiter(client)
        await new Promise((resolve) => setTimeout(resolve, 300))
        expect(settled).toBe(false)

        if (outcome === "submit") {
          await client.query(
            `UPDATE surveys SET status = 'submitted', submitted_at = NOW() WHERE id = $1`,
            [surveyId],
          )
        }
        await client.query("COMMIT")

        const response = await pending
        return { status: response.status, body: response.body, surveyId }
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined)
        throw error
      } finally {
        await client.end()
      }
    }

    it("answers 422 when the submit commits first, and the visibility is unchanged", async () => {
      const { status, body, surveyId } = await raceAgainstLock("submit")

      expect(status).toBe(422)
      expect(body.code).toBe("submitted_read_only_fields")
      expect((body.details as { fields: string[] }).fields).toContain("visibility")
      expect(await storedVisibility(surveyId)).toBe("private")
    })

    it("applies the change when the lock is released without a submit", async () => {
      const { status, surveyId } = await raceAgainstLock("release")

      expect(status).toBe(200)
      expect(await storedVisibility(surveyId)).toBe("public")
    })
  })

  it("(g) concurrent submit and PATCH /visibility: the stored value is the PATCH value iff it answered 200", async () => {
    const accessToken = await loginTestUser(app, "e2e-vis-race-concurrent")
    const statuses = new Set<number>()

    for (let round = 0; round < 6; round += 1) {
      const surveyId = await createCompleteDraft(accessToken, "e2e-vis-race-concurrent")

      const [submit, patch] = await Promise.all([
        request(app.getHttpServer())
          .post(`/v1/surveys/${surveyId}/submit`)
          .set("Authorization", `Bearer ${accessToken}`),
        patchVisibility(accessToken, surveyId, "public"),
      ])

      expect(submit.status).toBe(201)
      expect([200, 422]).toContain(patch.status)
      statuses.add(patch.status)
      const visibility = await storedVisibility(surveyId)
      expect(visibility === "public").toBe(patch.status === 200)
      if (patch.status === 422) {
        expect(patch.body.code).toBe("submitted_read_only_fields")
        expect(await visibilityEvents(accessToken, surveyId)).toHaveLength(0)
      } else {
        expect(await visibilityEvents(accessToken, surveyId)).toHaveLength(1)
      }
    }

    // Either order may win each round; only the two outcomes above are allowed.
    expect([...statuses].every((status) => status === 200 || status === 422)).toBe(true)
  })
})
