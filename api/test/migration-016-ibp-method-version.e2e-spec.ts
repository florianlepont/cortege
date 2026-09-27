import "dotenv/config"
import { randomUUID } from "crypto"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { Client, ClientConfig } from "pg"

// Migration 016 (phase 01.8, D-10 amended, D-15): globalSetup migrates an empty schema, so the
// new columns and constraints never meet existing rows there. This spec builds the pre-016 shape
// in a scratch schema (migrations 001-015, recorded in the scratch schema_migrations as the
// runner would have), seeds users and surveys, then lets the real runner (scripts/migrate.js,
// advisory lock, one BEGIN/COMMIT per file) apply 016 only. It then checks that the columns are
// nullable with existing rows NULL (= v3.0, no backfill), that the constraints reject unknown
// values, and that the runner and a raw second execution of the file are both no-ops.
type MigrateModule = { runMigrations: (config: ClientConfig) => Promise<void> }
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig & { database: string }
}

const { runMigrations } = jest.requireActual<MigrateModule>("../scripts/migrate")
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const SCRATCH_SCHEMA = "mig016_scratch"
const MIGRATIONS_DIR = join(__dirname, "..", "migrations")
const MIGRATION_016 = "016_ibp_method_version.sql"
const V3_0 = "cnpf_ibp_fr_v3_0_2023-03-23"
const V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"

const readMigration = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8")

// The runner's connection, pinned to the scratch schema: schema_migrations and every table the
// migration touches resolve there, never in the public schema globalSetup migrated.
const scratchRunnerConfig = (): ClientConfig => ({
  ...resolveDbConfig(process.env),
  options: `-c search_path=${SCRATCH_SCHEMA}`,
})

describe("migration 016: IBP method version columns (e2e)", () => {
  let client: Client
  const userId = randomUUID()
  const seededSurveyIds = [randomUUID(), randomUUID(), randomUUID()]
  let logSpy: jest.SpyInstance

  const insertSurvey = (id: string, columns: Record<string, unknown> = {}) => {
    const names = ["id", "user_id", "site_name", "status", ...Object.keys(columns)]
    const values = [id, userId, `site ${id}`, "draft", ...Object.values(columns)]
    const placeholders = values.map((_, index) => `$${index + 1}`)
    // Column names cannot be bind parameters; `columns` is always a literal object passed by
    // this spec's own test cases, never external input.
    /* eslint-disable sql-no-unsafe-interpolation */
    return client.query(
      `INSERT INTO surveys (${names.join(", ")}, created_at, updated_at, expires_at, sync_version)
       VALUES (${placeholders.join(", ")}, NOW(), NOW(), NOW() + interval '7 days', 1)`,
      values,
    )
    /* eslint-enable sql-no-unsafe-interpolation */
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
      .filter((file) => file.endsWith(".sql") && file < MIGRATION_016)
      .sort()
    expect(preMigrations[0]).toBe("001_init.sql")
    expect(preMigrations[preMigrations.length - 1]).toBe("015_public_indexes_centroid_columns.sql")
    for (const file of preMigrations) {
      await client.query("BEGIN")
      await client.query(readMigration(file))
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
    }

    await client.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [
      userId,
      `mig016-${userId}@example.test`,
    ])
    await insertSurvey(seededSurveyIds[0], { region_version: "ACA", vegetation_stage: "collineen" })
    await insertSurvey(seededSurveyIds[1], {
      factors: JSON.stringify({ A: { native_genus_count: 3 } }),
    })
    await insertSurvey(seededSurveyIds[2])

    const started = Date.now()
    await runMigrations(scratchRunnerConfig())
    console.warn(`Migration 016 on seeded scratch schema took ${Date.now() - started} ms`)
  })

  afterAll(async () => {
    logSpy.mockRestore()
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined)
      await client.query(`DROP SCHEMA IF EXISTS ${SCRATCH_SCHEMA} CASCADE`)
      await client.end()
    }
  })

  it("was applied by the runner, which recorded it after 015", async () => {
    // The scratch schema starts with 001-015 pre-recorded, so the runner applies every migration
    // still unrecorded (016 and, since phase 5, 017) in file order: 016 lands right after 015,
    // whichever migration is now last.
    const applied = await appliedMigrations()
    expect(applied.indexOf(MIGRATION_016)).toBe(
      applied.indexOf("015_public_indexes_centroid_columns.sql") + 1,
    )
    expect(applied).toContain("015_public_indexes_centroid_columns.sql")
    expect(logSpy).toHaveBeenCalledWith(`Applied migration: ${MIGRATION_016}`)
  })

  it("adds three nullable columns with no default", async () => {
    const result = await client.query<{
      column_name: string
      data_type: string
      is_nullable: string
      column_default: string | null
    }>(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'surveys'
         AND column_name IN ('ibp_method_version', 'ibp_cas', 'ibp_cas3_scale')
       ORDER BY column_name`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows).toEqual([
      { column_name: "ibp_cas", data_type: "smallint", is_nullable: "YES", column_default: null },
      {
        column_name: "ibp_cas3_scale",
        data_type: "boolean",
        is_nullable: "YES",
        column_default: null,
      },
      {
        column_name: "ibp_method_version",
        data_type: "text",
        is_nullable: "YES",
        column_default: null,
      },
    ])
  })

  it("leaves every existing survey NULL (v3.0) and its other columns untouched", async () => {
    const result = await client.query<{
      id: string
      ibp_method_version: string | null
      ibp_cas: number | null
      ibp_cas3_scale: boolean | null
      region_version: string | null
    }>(
      `SELECT id, ibp_method_version, ibp_cas, ibp_cas3_scale, region_version
       FROM surveys WHERE user_id = $1`,
      [userId],
    )
    expect(result.rows).toHaveLength(seededSurveyIds.length)
    for (const row of result.rows) {
      expect(row.ibp_method_version).toBeNull()
      expect(row.ibp_cas).toBeNull()
      expect(row.ibp_cas3_scale).toBeNull()
    }
    const first = result.rows.find((row) => row.id === seededSurveyIds[0])
    expect(first?.region_version).toBe("ACA")
  })

  it("creates both constraints and leaves them validated", async () => {
    const result = await client.query<{ conname: string; convalidated: boolean }>(
      `SELECT c.conname, c.convalidated
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = $1
         AND c.conname IN ('chk_surveys_ibp_method_version', 'chk_surveys_ibp_cas')
       ORDER BY c.conname`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows).toEqual([
      { conname: "chk_surveys_ibp_cas", convalidated: true },
      { conname: "chk_surveys_ibp_method_version", convalidated: true },
    ])
  })

  it("rejects an unknown method version and a cas outside 1-4", async () => {
    await expect(insertSurvey(randomUUID(), { ibp_method_version: "v9" })).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_ibp_method_version",
    })
    await expect(insertSurvey(randomUUID(), { ibp_cas: 7 })).rejects.toMatchObject({
      code: "23514",
      constraint: "chk_surveys_ibp_cas",
    })
    await expect(insertSurvey(randomUUID(), { ibp_cas: 0 })).rejects.toMatchObject({
      code: "23514",
    })
  })

  it("accepts both method tags, cas 1-4, the cas-3 flag and NULL", async () => {
    await expect(insertSurvey(randomUUID(), { ibp_method_version: V3_0 })).resolves.toBeDefined()
    for (const cas of [1, 2, 3, 4]) {
      await expect(
        insertSurvey(randomUUID(), {
          ibp_method_version: V3_2,
          ibp_cas: cas,
          ibp_cas3_scale: cas === 2,
        }),
      ).resolves.toBeDefined()
    }
    await expect(
      insertSurvey(randomUUID(), { ibp_method_version: null, ibp_cas: null }),
    ).resolves.toBeDefined()
  })

  it("is a no-op when the runner runs again", async () => {
    const before = await appliedMigrations()
    logSpy.mockClear()
    await expect(runMigrations(scratchRunnerConfig())).resolves.toBeUndefined()
    expect(await appliedMigrations()).toEqual(before)
    expect(logSpy).not.toHaveBeenCalledWith(`Applied migration: ${MIGRATION_016}`)
    expect(logSpy).toHaveBeenCalledWith("Migrations are up to date.")
  })

  it("can be executed a second time inside BEGIN/COMMIT", async () => {
    await client.query("BEGIN")
    await client.query(readMigration(MIGRATION_016))
    await client.query("COMMIT")
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = $1
         AND c.conname IN ('chk_surveys_ibp_method_version', 'chk_surveys_ibp_cas')`,
      [SCRATCH_SCHEMA],
    )
    expect(result.rows[0].count).toBe("2")
  })

  it("was applied to the public schema by globalSetup", async () => {
    await expect(
      client.query(
        `SELECT ibp_method_version, ibp_cas, ibp_cas3_scale FROM public.surveys LIMIT 0`,
      ),
    ).resolves.toBeDefined()
  })
})
