import "dotenv/config"
import { randomUUID } from "crypto"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { Client, ClientConfig } from "pg"

// Migration 023 (phase 27, D-01): globalSetup migrates an empty schema, so the new columns and
// constraints never meet existing rows there. This spec builds the pre-023 shape in a scratch
// schema (migrations 001-022, recorded in the scratch schema_migrations as the runner would have),
// seeds a user and two surveys, then lets the real runner (scripts/migrate.js, advisory lock, one
// BEGIN/COMMIT per file) apply 023 only. It then checks that the columns are nullable with
// existing rows NULL (no backfill), that the constraints bound the note and the weather, and that
// the runner and a raw second execution of the file are both no-ops.
type MigrateModule = { runMigrations: (config: ClientConfig) => Promise<void> }
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig & { database: string }
}

const { runMigrations } = jest.requireActual<MigrateModule>("../scripts/migrate")
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const SCRATCH_SCHEMA = "mig023_scratch"
const MIGRATIONS_DIR = join(__dirname, "..", "migrations")
const MIGRATION_023 = "023_survey_note_weather.sql"
const CONSTRAINTS = [
  "chk_surveys_survey_note_length",
  "chk_surveys_weather_object",
  "chk_surveys_weather_size",
]

const readMigration = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8")

// The runner's connection, pinned to the scratch schema: schema_migrations and every table the
// migration touches resolve there, never in the public schema globalSetup migrated.
const scratchRunnerConfig = (): ClientConfig => ({
  ...resolveDbConfig(process.env),
  options: `-c search_path=${SCRATCH_SCHEMA}`,
})

describe("migration 023: survey note and weather columns (e2e)", () => {
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

  const setNote = (note: string | null) =>
    client.query(`UPDATE surveys SET survey_note = $2 WHERE id = $1`, [draftId, note])

  const setWeather = (weather: string | null) =>
    client.query(`UPDATE surveys SET weather = $2::jsonb WHERE id = $1`, [draftId, weather])

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
      .filter((file) => file.endsWith(".sql") && file < MIGRATION_023)
      .sort()
    expect(preMigrations[0]).toBe("001_init.sql")
    expect(preMigrations[preMigrations.length - 1]).toBe("022_unaccent_search.sql")
    for (const file of preMigrations) {
      await client.query("BEGIN")
      await client.query(readMigration(file))
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
    }

    await client.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
      userId,
      `mig023-${userId}@example.test`,
    ])
    await insertSurvey(draftId, "draft")
    await insertSurvey(submittedId, "submitted")

    const started = Date.now()
    await runMigrations(scratchRunnerConfig())
    console.warn(`Migration 023 on seeded scratch schema took ${Date.now() - started} ms`)
  })

  afterAll(async () => {
    logSpy.mockRestore()
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined)
      await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH_SCHEMA} CASCADE`)
      await client.end()
    }
  })

  it("was applied by the runner, which recorded it right after 022", async () => {
    const applied = await appliedMigrations()
    expect(applied.indexOf(MIGRATION_023)).toBe(applied.indexOf("022_unaccent_search.sql") + 1)
    expect(logSpy).toHaveBeenCalledWith(`Applied migration: ${MIGRATION_023}`)
  })

  it("adds two nullable columns with no default", async () => {
    const result = await client.query<{
      column_name: string
      data_type: string
      is_nullable: string
      column_default: string | null
    }>(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'surveys'
         AND column_name IN ('survey_note', 'weather')
       ORDER BY column_name`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows).toEqual([
      { column_name: "survey_note", data_type: "text", is_nullable: "YES", column_default: null },
      { column_name: "weather", data_type: "jsonb", is_nullable: "YES", column_default: null },
    ])
  })

  it("leaves every existing survey NULL in both columns (no backfill)", async () => {
    const result = await client.query<{
      id: string
      status: string
      survey_note: string | null
      weather: unknown
    }>(`SELECT id, status, survey_note, weather FROM surveys WHERE user_id = $1`, [userId])
    expect(result.rows).toHaveLength(2)
    expect(result.rows.map((row) => row.status).sort()).toEqual(["draft", "submitted"])
    for (const row of result.rows) {
      expect(row.survey_note).toBeNull()
      expect(row.weather).toBeNull()
    }
  })

  it("creates the three constraints and leaves them validated", async () => {
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

  it("bounds the note at 1000 characters", async () => {
    await expect(setNote("a".repeat(1001))).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_survey_note_length",
    })
    await expect(setNote("é".repeat(1000))).resolves.toBeDefined()
    await expect(setNote(null)).resolves.toBeDefined()
  })

  it("accepts only a JSON object of bounded size as weather", async () => {
    await expect(setWeather("[]")).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_weather_object",
    })
    await expect(setWeather('"rain"')).rejects.toMatchObject({ code: "23514" })
    await expect(setWeather('{"sky":"rain"}')).resolves.toBeDefined()
    await expect(setWeather(JSON.stringify({ sky: "x".repeat(3000) }))).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_weather_size",
    })
    await expect(setWeather(null)).resolves.toBeDefined()
  })

  it("is a no-op when the runner runs again", async () => {
    const before = await appliedMigrations()
    logSpy.mockClear()
    await expect(runMigrations(scratchRunnerConfig())).resolves.toBeUndefined()
    expect(await appliedMigrations()).toEqual(before)
    expect(logSpy).not.toHaveBeenCalledWith(`Applied migration: ${MIGRATION_023}`)
    expect(logSpy).toHaveBeenCalledWith("Migrations are up to date.")
  })

  it("can be executed a second time inside BEGIN/COMMIT", async () => {
    await client.query("BEGIN")
    await client.query(readMigration(MIGRATION_023))
    await client.query("COMMIT")
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = $1 AND c.conname = ANY($2::text[])`,
      [SCRATCH_SCHEMA, CONSTRAINTS],
    )
    expect(result.rows[0].count).toBe("3")
    const notes = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM surveys WHERE id = $1 AND survey_note IS NULL`,
      [draftId],
    )
    expect(notes.rows[0].count).toBe("1")
  })

  it("was applied to the public schema by globalSetup", async () => {
    await expect(
      client.query(`SELECT survey_note, weather FROM public.surveys LIMIT 0`),
    ).resolves.toBeDefined()
  })
})
