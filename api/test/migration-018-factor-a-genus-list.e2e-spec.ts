import "dotenv/config"
import { randomUUID } from "crypto"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { Client, ClientConfig } from "pg"

// Migration 018 (phase 5, ADR-002 D-15, ADR-003 CH-12): the Factor A genus list lives in the
// existing `factors` JSONB column, so this migration adds no columns — only a cheap structural
// CHECK (when `factors -> 'A' -> 'genera'` is present, it must be a JSON array). Surveys already
// recorded as a bare `native_genus_count`, or a direct numeric A, are untouched: no backfill, no
// reinterpretation, their score stays exactly as stored. globalSetup migrates an empty schema, so
// this spec builds the pre-018 shape in a scratch schema, seeds rows shaped like already-recorded
// surveys, then lets the real runner (scripts/migrate.js) apply 018 only. Numbered 018, not 017
// (Phase 2's `017_association_only_visibility.sql` claimed that number first).
type MigrateModule = { runMigrations: (config: ClientConfig) => Promise<void> }
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig & { database: string }
}

const { runMigrations } = jest.requireActual<MigrateModule>("../scripts/migrate")
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const SCRATCH_SCHEMA = "mig018_scratch"
const MIGRATIONS_DIR = join(__dirname, "..", "migrations")
const MIGRATION_018 = "018_factor_a_genus_list.sql"

const readMigration = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8")

const scratchRunnerConfig = (): ClientConfig => ({
  ...resolveDbConfig(process.env),
  options: `-c search_path=${SCRATCH_SCHEMA}`,
})

describe("migration 018: Factor A genus list shape guard (e2e)", () => {
  let client: Client
  const userId = randomUUID()
  const legacyCountSurveyId = randomUUID()
  const directScoreSurveyId = randomUUID()
  const noFactorsSurveyId = randomUUID()
  let logSpy: jest.SpyInstance

  const insertSurvey = async (id: string, factors: unknown) => {
    // OA-41: migration 019 drops surveys.expires_at, so a row seeded after it must not set it.
    const { rowCount } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'surveys' AND column_name = 'expires_at'`,
    )
    const expiresColumn = rowCount ? ", expires_at" : ""
    const expiresValue = rowCount ? ", NOW() + interval '7 days'" : ""
    return client.query(
      `INSERT INTO surveys (id, user_id, site_name, status, factors, created_at, updated_at${expiresColumn},
                             sync_version)
       VALUES ($1, $2, $3, 'draft', $4, NOW(), NOW()${expiresValue}, 1)`,
      [id, userId, `site ${id}`, JSON.stringify(factors)],
    )
  }

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
      .filter((file) => file.endsWith(".sql") && file < MIGRATION_018)
      .sort()
    expect(preMigrations[0]).toBe("001_init.sql")
    expect(preMigrations[preMigrations.length - 1]).toBe("017_association_only_visibility.sql")
    for (const file of preMigrations) {
      await client.query("BEGIN")
      await client.query(readMigration(file))
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
    }

    await client.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
      userId,
      `mig018-${userId}@example.test`,
    ])
    // Shaped like surveys already recorded before this phase: a bare count and a direct score.
    await insertSurvey(legacyCountSurveyId, { A: { native_genus_count: 3 } })
    await insertSurvey(directScoreSurveyId, { A: 5 })
    await insertSurvey(noFactorsSurveyId, {})

    const started = Date.now()
    await runMigrations(scratchRunnerConfig())
    console.warn(`Migration 018 on seeded scratch schema took ${Date.now() - started} ms`)
  })

  afterAll(async () => {
    logSpy.mockRestore()
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined)
      await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH_SCHEMA} CASCADE`)
      await client.end()
    }
  })

  it("was applied by the runner, which recorded it after 017", async () => {
    const applied = await appliedMigrations()
    expect(applied[applied.length - 1]).toBe(MIGRATION_018)
    expect(applied).toContain("017_association_only_visibility.sql")
    expect(logSpy).toHaveBeenCalledWith(`Applied migration: ${MIGRATION_018}`)
  })

  it("adds no column: the genus list lives in the existing factors JSONB", async () => {
    const result = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'surveys' AND column_name LIKE '%genus%'`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows).toEqual([])
  })

  it("leaves every existing survey's factors byte-for-byte unchanged (D-15: no decomposition)", async () => {
    const result = await client.query<{ id: string; factors: unknown }>(
      `SELECT id, factors FROM surveys WHERE user_id = $1 ORDER BY id`,
      [userId],
    )
    expect(result.rows).toHaveLength(3)
    const byId = new Map(result.rows.map((row) => [row.id, row.factors]))
    expect(byId.get(legacyCountSurveyId)).toEqual({ A: { native_genus_count: 3 } })
    expect(byId.get(directScoreSurveyId)).toEqual({ A: 5 })
    expect(byId.get(noFactorsSurveyId)).toEqual({})
  })

  it("creates the constraint, validated", async () => {
    const result = await client.query<{ conname: string; convalidated: boolean }>(
      `SELECT c.conname, c.convalidated
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = $1 AND c.conname = 'chk_surveys_factor_a_genera_is_array'`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows).toEqual([
      { conname: "chk_surveys_factor_a_genera_is_array", convalidated: true },
    ])
  })

  it("accepts a genus-list Factor A, a bare count and no A at all", async () => {
    await expect(
      insertSurvey(randomUUID(), { A: { genera: ["Fagus", "Quercus_deciduae"] } }),
    ).resolves.toBeDefined()
    await expect(
      insertSurvey(randomUUID(), { A: { native_genus_count: 2 } }),
    ).resolves.toBeDefined()
    await expect(insertSurvey(randomUUID(), { B: { strata_count: 3 } })).resolves.toBeDefined()
  })

  it("rejects a non-array genera (string, number or object)", async () => {
    await expect(insertSurvey(randomUUID(), { A: { genera: "Fagus" } })).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_factor_a_genera_is_array",
    })
    await expect(insertSurvey(randomUUID(), { A: { genera: 1 } })).rejects.toMatchObject({
      code: "23514",
    })
    await expect(
      insertSurvey(randomUUID(), { A: { genera: { code: "Fagus" } } }),
    ).rejects.toMatchObject({ code: "23514" })
  })

  it("is a no-op when the runner runs again", async () => {
    const before = await appliedMigrations()
    logSpy.mockClear()
    await expect(runMigrations(scratchRunnerConfig())).resolves.toBeUndefined()
    expect(await appliedMigrations()).toEqual(before)
    expect(logSpy).not.toHaveBeenCalledWith(`Applied migration: ${MIGRATION_018}`)
    expect(logSpy).toHaveBeenCalledWith("Migrations are up to date.")
  })

  it("can be executed a second time inside BEGIN/COMMIT", async () => {
    await client.query("BEGIN")
    await client.query(readMigration(MIGRATION_018))
    await client.query("COMMIT")
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = $1 AND c.conname = 'chk_surveys_factor_a_genera_is_array'`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows[0].count).toBe("1")
  })

  it("was applied to the public schema by globalSetup", async () => {
    await expect(
      client.query(`SELECT factors -> 'A' -> 'genera' FROM public.surveys LIMIT 0`),
    ).resolves.toBeDefined()
  })
})
