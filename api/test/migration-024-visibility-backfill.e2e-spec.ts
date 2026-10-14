import "dotenv/config"
import { randomUUID } from "crypto"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { Client, ClientConfig } from "pg"

// Migration 024 (phase 29, D-06): globalSetup migrates an empty schema, so the backfill never meets
// existing rows there. This spec builds the pre-024 shape in a scratch schema (migrations 001-023,
// recorded in the scratch schema_migrations as the runner would have), seeds a user and six
// surveys, then lets the real runner (scripts/migrate.js, advisory lock, one BEGIN/COMMIT per file)
// apply 024 only. It checks that every submitted survey is shared, that drafts keep their value,
// that one 'backfilled' event exists per backfilled survey that still has an author, that the
// partial index carries the visibility clause again, and that a second execution changes nothing.
type MigrateModule = { runMigrations: (config: ClientConfig) => Promise<void> }
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig & { database: string }
}

const { runMigrations } = jest.requireActual<MigrateModule>("../scripts/migrate")
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const SCRATCH_SCHEMA = "mig024_scratch"
const MIGRATIONS_DIR = join(__dirname, "..", "migrations")
const MIGRATION_024 = "024_private_or_public_visibility.sql"

const readMigration = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8")

// The runner's connection, pinned to the scratch schema: schema_migrations and every table the
// migration touches resolve there, never in the public schema globalSetup migrated.
const scratchRunnerConfig = (): ClientConfig => ({
  ...resolveDbConfig(process.env),
  options: `-c search_path=${SCRATCH_SCHEMA}`,
})

describe("migration 024: private or public backfill (e2e)", () => {
  let client: Client
  const userId = randomUUID()
  const SUB_PRIV_OWNED = randomUUID()
  const SUB_PRIV_ANON = randomUUID()
  const SUB_PUB = randomUUID()
  const DRAFT_PRIV = randomUUID()
  const DRAFT_PUB = randomUUID()
  const SUB_PRIV_DELETED = randomUUID()
  const ALL_IDS = [SUB_PRIV_OWNED, SUB_PRIV_ANON, SUB_PUB, DRAFT_PRIV, DRAFT_PUB, SUB_PRIV_DELETED]
  let ownedUpdatedAtBefore: string
  let logSpy: jest.SpyInstance

  const insertSurvey = async (opts: {
    id: string
    status: string
    visibility: string
    owned?: boolean
    deleted?: boolean
  }) => {
    // OA-41: migration 019 drops surveys.expires_at, so no expiry column is seeded here.
    await client.query(
      `INSERT INTO surveys
         (id, user_id, site_name, status, visibility, created_at, updated_at, submitted_at,
          deleted_at, sync_version)
       VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day',
               CASE WHEN $4 = 'submitted' THEN NOW() - INTERVAL '1 day' ELSE NULL END,
               CASE WHEN $6::boolean THEN NOW() ELSE NULL END, 1)`,
      [
        opts.id,
        opts.owned === false ? null : userId,
        `site ${opts.id}`,
        opts.status,
        opts.visibility,
        opts.deleted === true,
      ],
    )
  }

  const appliedMigrations = async (): Promise<string[]> => {
    const result = await client.query<{ filename: string }>(
      `SELECT filename FROM schema_migrations ORDER BY filename`,
    )
    return result.rows.map((row) => row.filename)
  }

  const visibilitySnapshot = async (): Promise<Record<string, string>> => {
    const result = await client.query<{ id: string; visibility: string }>(
      `SELECT id, visibility FROM surveys WHERE id = ANY($1::text[])`,
      [ALL_IDS],
    )
    return Object.fromEntries(result.rows.map((row) => [row.id, row.visibility]))
  }

  const backfilledEvents = async (surveyId?: string) => {
    const result = await client.query<{
      survey_id: string
      actor_id: string | null
      payload: unknown
    }>(
      `SELECT survey_id, actor_id, payload FROM survey_events
       WHERE event_type = 'backfilled' AND payload->>'reason' = 'migration_024'
         AND ($1::text IS NULL OR survey_id = $1)`,
      [surveyId ?? null],
    )
    return result.rows
  }

  const eventCount = async (): Promise<number> => {
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM survey_events`,
    )
    return Number(result.rows[0].count)
  }

  beforeAll(async () => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined)
    client = new Client(resolveDbConfig(process.env))
    await client.connect()
    await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH_SCHEMA} CASCADE`)
    await client.query(`CREATE SCHEMA ${SCRATCH_SCHEMA}`)
    await client.query(`SET search_path TO ${SCRATCH_SCHEMA}, public`)
    await client.query(`
      CREATE TABLE schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const preMigrations = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql") && file < MIGRATION_024)
      .sort()
    expect(preMigrations[0]).toBe("001_init.sql")
    expect(preMigrations[preMigrations.length - 1]).toBe("023_survey_note_weather.sql")
    for (const file of preMigrations) {
      await client.query("BEGIN")
      await client.query(readMigration(file))
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
    }

    await client.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
      userId,
      `mig024-${userId}@example.test`,
    ])
    await insertSurvey({ id: SUB_PRIV_OWNED, status: "submitted", visibility: "private" })
    // Retained after account deletion (migration 012 allows a NULL author).
    await insertSurvey({
      id: SUB_PRIV_ANON,
      status: "submitted",
      visibility: "private",
      owned: false,
    })
    await insertSurvey({ id: SUB_PUB, status: "submitted", visibility: "public" })
    await insertSurvey({ id: DRAFT_PRIV, status: "draft", visibility: "private" })
    await insertSurvey({ id: DRAFT_PUB, status: "draft", visibility: "public" })
    await insertSurvey({
      id: SUB_PRIV_DELETED,
      status: "submitted",
      visibility: "private",
      deleted: true,
    })

    const before = await client.query<{ updated_at: string }>(
      `SELECT updated_at::text AS updated_at FROM surveys WHERE id = $1`,
      [SUB_PRIV_OWNED],
    )
    ownedUpdatedAtBefore = before.rows[0].updated_at

    const started = Date.now()
    await runMigrations(scratchRunnerConfig())
    console.warn(`Migration 024 on seeded scratch schema took ${Date.now() - started} ms`)
  })

  afterAll(async () => {
    logSpy.mockRestore()
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined)
      await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH_SCHEMA} CASCADE`)
      await client.end()
    }
  })

  it("was applied by the runner, which recorded it right after 023", async () => {
    const applied = await appliedMigrations()
    expect(applied.indexOf(MIGRATION_024)).toBe(applied.indexOf("023_survey_note_weather.sql") + 1)
    expect(logSpy).toHaveBeenCalledWith(`Applied migration: ${MIGRATION_024}`)
  })

  it("sets every submitted survey to public, anonymised and deleted ones included", async () => {
    const snapshot = await visibilitySnapshot()
    expect(snapshot[SUB_PRIV_OWNED]).toBe("public")
    expect(snapshot[SUB_PRIV_ANON]).toBe("public")
    expect(snapshot[SUB_PUB]).toBe("public")
    expect(snapshot[SUB_PRIV_DELETED]).toBe("public")
  })

  it("leaves drafts with the visibility they had", async () => {
    const snapshot = await visibilitySnapshot()
    expect(snapshot[DRAFT_PRIV]).toBe("private")
    expect(snapshot[DRAFT_PUB]).toBe("public")
  })

  it("writes one backfilled event for a backfilled survey that has an author", async () => {
    const events = await backfilledEvents(SUB_PRIV_OWNED)
    expect(events).toHaveLength(1)
    expect(events[0].actor_id).toBeNull()
    expect(events[0].payload).toEqual({ reason: "migration_024", visibility: "public" })
    // The deleted private survey still had an author, so it gets its event too (D-06 literal).
    expect(await backfilledEvents(SUB_PRIV_DELETED)).toHaveLength(1)
  })

  it("writes no event for a retained survey without an author, a shared one or a draft", async () => {
    expect(await backfilledEvents(SUB_PRIV_ANON)).toHaveLength(0)
    expect(await backfilledEvents(SUB_PUB)).toHaveLength(0)
    expect(await backfilledEvents(DRAFT_PRIV)).toHaveLength(0)
    expect(await backfilledEvents(DRAFT_PUB)).toHaveLength(0)
    expect(await backfilledEvents()).toHaveLength(2)
  })

  it("does not touch updated_at of a backfilled survey", async () => {
    const after = await client.query<{ updated_at: string }>(
      `SELECT updated_at::text AS updated_at FROM surveys WHERE id = $1`,
      [SUB_PRIV_OWNED],
    )
    expect(after.rows[0].updated_at).toBe(ownedUpdatedAtBefore)
  })

  it("recreates idx_surveys_public_submitted with the visibility clause", async () => {
    const result = await client.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes
       WHERE schemaname = $1 AND indexname = 'idx_surveys_public_submitted'`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows).toHaveLength(1)
    const { indexdef } = result.rows[0]
    expect(indexdef).toContain("submitted_at DESC")
    expect(indexdef).toContain("status = 'submitted'")
    expect(indexdef).toContain("visibility = 'public'")
    expect(indexdef).toContain("deleted_at IS NULL")
  })

  it("is a no-op when the runner runs again", async () => {
    const before = await appliedMigrations()
    logSpy.mockClear()
    await expect(runMigrations(scratchRunnerConfig())).resolves.toBeUndefined()
    expect(await appliedMigrations()).toEqual(before)
    expect(logSpy).not.toHaveBeenCalledWith(`Applied migration: ${MIGRATION_024}`)
    expect(logSpy).toHaveBeenCalledWith("Migrations are up to date.")
  })

  it("can be executed a second time without changing a row or adding an event", async () => {
    const snapshotBefore = await visibilitySnapshot()
    const eventsBefore = await eventCount()
    await client.query("BEGIN")
    await client.query(readMigration(MIGRATION_024))
    await client.query("COMMIT")
    expect(await visibilitySnapshot()).toEqual(snapshotBefore)
    expect(await eventCount()).toBe(eventsBefore)
    const index = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM pg_indexes
       WHERE schemaname = $1 AND indexname = 'idx_surveys_public_submitted'`,
      [SCRATCH_SCHEMA],
    )
    expect(index.rows[0].count).toBe("1")
  })

  it("was applied to the public schema by globalSetup", async () => {
    const result = await client.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes
       WHERE schemaname = 'public' AND indexname = 'idx_surveys_public_submitted'`,
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].indexdef).toContain("visibility = 'public'")
  })
})
