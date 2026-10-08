import "dotenv/config"
import { randomUUID } from "crypto"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { Client, ClientConfig } from "pg"

// Migration 019 (OA-41): no submission deadline. globalSetup migrates an empty schema, so the
// status conversion never meets existing rows there. This spec builds the pre-019 shape in a
// scratch schema (migrations 001-018), seeds surveys, one of them marked `expired` by the old rule,
// then lets the real runner (scripts/migrate.js) apply 019 only.
type MigrateModule = { runMigrations: (config: ClientConfig) => Promise<void> }
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig & { database: string }
}

const { runMigrations } = jest.requireActual<MigrateModule>("../scripts/migrate")
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const SCRATCH_SCHEMA = "mig019_scratch"
const MIGRATIONS_DIR = join(__dirname, "..", "migrations")
const MIGRATION_019 = "019_no_submission_deadline.sql"

const readMigration = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8")

const scratchRunnerConfig = (): ClientConfig => ({
  ...resolveDbConfig(process.env),
  options: `-c search_path=${SCRATCH_SCHEMA}`,
})

describe("migration 019: no submission deadline (e2e)", () => {
  let client: Client
  const userId = randomUUID()
  const expiredSurveyId = randomUUID()
  const draftSurveyId = randomUUID()
  const submittedSurveyId = randomUUID()
  let logSpy: jest.SpyInstance

  // Before 019 the column is NOT NULL.
  const insertBefore = (id: string, status: string) =>
    client.query(
      `INSERT INTO surveys (id, user_id, site_name, status, created_at, updated_at, expires_at,
                             sync_version)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW() - interval '30 days', 1)`,
      [id, userId, `site ${id}`, status],
    )

  const insertAfter = (id: string, status: string) =>
    client.query(
      `INSERT INTO surveys (id, user_id, site_name, status, created_at, updated_at, sync_version)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), 1)`,
      [id, userId, `site ${id}`, status],
    )

  const appliedMigrations = async (): Promise<string[]> => {
    const result = await client.query<{ filename: string }>(
      `SELECT filename FROM schema_migrations ORDER BY filename`,
    )
    return result.rows.map((row) => row.filename)
  }

  beforeAll(async () => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined)
    client = new Client(resolveDbConfig(process.env))
    await client.connect()
    await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH_SCHEMA} CASCADE`)
    await client.query(`CREATE SCHEMA ${SCRATCH_SCHEMA}`)
    await client.query(`SET search_path TO ${SCRATCH_SCHEMA}`)
    await client.query(`
      CREATE TABLE schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const preMigrations = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql") && file < MIGRATION_019)
      .sort()
    expect(preMigrations[0]).toBe("001_init.sql")
    expect(preMigrations[preMigrations.length - 1]).toBe("018_factor_a_genus_list.sql")
    for (const file of preMigrations) {
      await client.query("BEGIN")
      await client.query(readMigration(file))
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
    }

    await client.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
      userId,
      `mig019-${userId}@example.test`,
    ])
    await insertBefore(expiredSurveyId, "expired")
    await insertBefore(draftSurveyId, "draft")
    await insertBefore(submittedSurveyId, "submitted")

    await runMigrations(scratchRunnerConfig())
  })

  afterAll(async () => {
    logSpy.mockRestore()
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined)
      await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH_SCHEMA} CASCADE`)
      await client.end()
    }
  })

  it("was applied by the runner, which recorded it after 018", async () => {
    const applied = await appliedMigrations()
    // The runner also applies whatever comes after 019; only the 018 -> 019 order matters here.
    expect(applied.indexOf(MIGRATION_019)).toBe(applied.indexOf("018_factor_a_genus_list.sql") + 1)
    expect(applied).toContain("018_factor_a_genus_list.sql")
    expect(logSpy).toHaveBeenCalledWith(`Applied migration: ${MIGRATION_019}`)
  })

  it("puts a survey the old rule had marked expired back to draft, and touches no other", async () => {
    const result = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM surveys WHERE user_id = $1`,
      [userId],
    )
    const byId = new Map(result.rows.map((row) => [row.id, row.status]))
    expect(byId.get(expiredSurveyId)).toBe("draft")
    expect(byId.get(draftSurveyId)).toBe("draft")
    expect(byId.get(submittedSurveyId)).toBe("submitted")
  })

  it("drops the expires_at column of surveys", async () => {
    const surveys = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'surveys' AND column_name = 'expires_at'`,
      [SCRATCH_SCHEMA],
    )
    expect(surveys.rows).toEqual([])
  })

  it("accepts the four remaining statuses and rejects expired", async () => {
    for (const status of ["draft", "submitted", "synced", "error"]) {
      await expect(insertAfter(randomUUID(), status)).resolves.toBeDefined()
    }
    await expect(insertAfter(randomUUID(), "expired")).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_status",
    })
  })

  it("is a no-op when the runner runs again", async () => {
    const before = await appliedMigrations()
    logSpy.mockClear()
    await expect(runMigrations(scratchRunnerConfig())).resolves.toBeUndefined()
    expect(await appliedMigrations()).toEqual(before)
    expect(logSpy).not.toHaveBeenCalledWith(`Applied migration: ${MIGRATION_019}`)
    expect(logSpy).toHaveBeenCalledWith("Migrations are up to date.")
  })

  it("can be executed a second time inside BEGIN/COMMIT", async () => {
    await client.query("BEGIN")
    await client.query(readMigration(MIGRATION_019))
    await client.query("COMMIT")
    await expect(insertAfter(randomUUID(), "draft")).resolves.toBeDefined()
  })

  it("was applied to the public schema by globalSetup", async () => {
    await expect(
      client.query(`SELECT expires_at FROM public.surveys LIMIT 0`),
    ).rejects.toMatchObject({
      code: "42703",
    })
  })
})
