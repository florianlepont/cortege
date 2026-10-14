import "dotenv/config"
import { randomUUID } from "crypto"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { Client, ClientConfig } from "pg"

// Migration 025 (phase 30, D-09): globalSetup migrates an empty schema, so the new column and
// constraints never meet existing rows there. This spec builds the pre-025 shape in a scratch
// schema (migrations 001-024, recorded in the scratch schema_migrations as the runner would have),
// seeds a user and two surveys, then lets the real runner (scripts/migrate.js, advisory lock, one
// BEGIN/COMMIT per file) apply 025 only. It then checks that the column is a nullable jsonb with
// existing rows NULL (no backfill), that the constraints bound the route, and that the runner and
// a raw second execution of the file are both no-ops.
type MigrateModule = { runMigrations: (config: ClientConfig) => Promise<void> }
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig & { database: string }
}

const { runMigrations } = jest.requireActual<MigrateModule>("../scripts/migrate")
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const SCRATCH_SCHEMA = "mig025_scratch"
const MIGRATIONS_DIR = join(__dirname, "..", "migrations")
const MIGRATION_025 = "025_survey_route.sql"
const CONSTRAINTS = ["chk_surveys_survey_route_object", "chk_surveys_survey_route_size"]

const readMigration = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8")

// The runner's connection, pinned to the scratch schema: schema_migrations and every table the
// migration touches resolve there, never in the public schema globalSetup migrated.
const scratchRunnerConfig = (): ClientConfig => ({
  ...resolveDbConfig(process.env),
  options: `-c search_path=${SCRATCH_SCHEMA}`,
})

describe("migration 025: survey_route column (e2e)", () => {
  let client: Client
  const userId = randomUUID()
  const draftId = randomUUID()
  const submittedId = randomUUID()
  let logSpy: jest.SpyInstance

  const insertSurvey = async (id: string, status: string) => {
    // OA-41: migration 019 drops surveys.expires_at, so no expiry column is seeded here.
    await client.query(
      `INSERT INTO surveys (id, user_id, site_name, status, created_at, updated_at, sync_version)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), 1)`,
      [id, userId, `site ${id}`, status],
    )
  }

  const appliedMigrations = async (): Promise<string[]> => {
    const result = await client.query<{ filename: string }>(
      `SELECT filename FROM schema_migrations ORDER BY filename`,
    )
    return result.rows.map((row) => row.filename)
  }

  const setRoute = (route: string | null) =>
    client.query(`UPDATE surveys SET survey_route = $2::jsonb WHERE id = $1`, [draftId, route])

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
      .filter((file) => file.endsWith(".sql") && file < MIGRATION_025)
      .sort()
    expect(preMigrations[0]).toBe("001_init.sql")
    expect(preMigrations[preMigrations.length - 1]).toBe("024_private_or_public_visibility.sql")
    for (const file of preMigrations) {
      await client.query("BEGIN")
      await client.query(readMigration(file))
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
    }

    await client.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
      userId,
      `mig025-${userId}@example.test`,
    ])
    await insertSurvey(draftId, "draft")
    await insertSurvey(submittedId, "submitted")

    const started = Date.now()
    await runMigrations(scratchRunnerConfig())
    console.warn(`Migration 025 on seeded scratch schema took ${Date.now() - started} ms`)
  })

  afterAll(async () => {
    logSpy.mockRestore()
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined)
      await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH_SCHEMA} CASCADE`)
      await client.end()
    }
  })

  it("was applied by the runner, which recorded it right after 024", async () => {
    const applied = await appliedMigrations()
    expect(applied.indexOf(MIGRATION_025)).toBe(
      applied.indexOf("024_private_or_public_visibility.sql") + 1,
    )
    expect(logSpy).toHaveBeenCalledWith(`Applied migration: ${MIGRATION_025}`)
  })

  it("adds one nullable jsonb column with no default", async () => {
    const result = await client.query<{
      column_name: string
      data_type: string
      is_nullable: string
      column_default: string | null
    }>(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'surveys' AND column_name = 'survey_route'`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows).toEqual([
      {
        column_name: "survey_route",
        data_type: "jsonb",
        is_nullable: "YES",
        column_default: null,
      },
    ])
  })

  it("leaves every existing survey NULL (no backfill)", async () => {
    const result = await client.query<{ status: string; survey_route: unknown }>(
      `SELECT status, survey_route FROM surveys WHERE user_id = $1`,
      [userId],
    )
    expect(result.rows).toHaveLength(2)
    expect(result.rows.map((row) => row.status).sort()).toEqual(["draft", "submitted"])
    for (const row of result.rows) {
      expect(row.survey_route).toBeNull()
    }
  })

  it("creates the two constraints and leaves them validated", async () => {
    const result = await client.query<{ conname: string; convalidated: boolean }>(
      `SELECT c.conname, c.convalidated
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = $1 AND c.conname = ANY($2::text[])
       ORDER BY c.conname`,
      [SCRATCH_SCHEMA, CONSTRAINTS],
    )
    expect(result.rows).toEqual(
      [...CONSTRAINTS].sort().map((conname) => ({ conname, convalidated: true })),
    )
  })

  it("accepts null and a small JSON object as the route", async () => {
    await expect(setRoute(null)).resolves.toBeDefined()
    await expect(setRoute('{"version":1,"method":"full"}')).resolves.toBeDefined()
  })

  it("rejects a JSON array or string as the route", async () => {
    await expect(setRoute("[]")).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_survey_route_object",
    })
    await expect(setRoute('"full"')).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_survey_route_object",
    })
  })

  it("rejects a route above 4096 bytes", async () => {
    await expect(setRoute(JSON.stringify({ pad: "x".repeat(4200) }))).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_survey_route_size",
    })
  })

  it("is a no-op when the runner runs again", async () => {
    const before = await appliedMigrations()
    logSpy.mockClear()
    await expect(runMigrations(scratchRunnerConfig())).resolves.toBeUndefined()
    expect(await appliedMigrations()).toEqual(before)
    expect(logSpy).not.toHaveBeenCalledWith(`Applied migration: ${MIGRATION_025}`)
    expect(logSpy).toHaveBeenCalledWith("Migrations are up to date.")
  })

  it("can be executed a second time inside BEGIN/COMMIT", async () => {
    await client.query("BEGIN")
    await client.query(readMigration(MIGRATION_025))
    await client.query("COMMIT")
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = $1 AND c.conname = ANY($2::text[])`,
      [SCRATCH_SCHEMA, CONSTRAINTS],
    )
    expect(result.rows[0].count).toBe("2")
  })

  it("was applied to the public schema by globalSetup", async () => {
    await expect(
      client.query(`SELECT survey_route FROM public.surveys LIMIT 0`),
    ).resolves.toBeDefined()
  })
})
