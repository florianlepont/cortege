import "dotenv/config"
import { randomUUID } from "crypto"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { Client, ClientConfig } from "pg"

// Migration 020 (12.2-19): the parcels registered by their IGN identifier get their commune,
// section and number back. globalSetup migrates an empty schema, so the repair never meets
// existing rows there. This spec builds the pre-020 shape in a scratch schema (migrations
// 001-019), seeds parcels written with the old placeholder, then lets the real runner
// (scripts/migrate.js) apply 020 only.
type MigrateModule = { runMigrations: (config: ClientConfig) => Promise<void> }
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig & { database: string }
}

const { runMigrations } = jest.requireActual<MigrateModule>("../scripts/migrate")
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const SCRATCH_SCHEMA = "mig020_scratch"
const MIGRATIONS_DIR = join(__dirname, "..", "migrations")
const MIGRATION_020 = "020_parcel_idu_fields.sql"

const readMigration = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8")

const scratchRunnerConfig = (): ClientConfig => ({
  ...resolveDbConfig(process.env),
  options: `-c search_path=${SCRATCH_SCHEMA}`,
})

type ParcelFields = { commune_code: string; section: string; number: string }

describe("migration 020: parcel fields from the IGN identifier (e2e)", () => {
  let client: Client
  let logSpy: jest.SpyInstance

  const insertParcel = (parcelId: string, fields: ParcelFields) =>
    client.query(
      `INSERT INTO parcels (id, parcel_id, commune_code, section, number, source)
       VALUES ($1, $2, $3, $4, $5, 'manual')`,
      [randomUUID(), parcelId, fields.commune_code, fields.section, fields.number],
    )

  const fieldsOf = async (parcelId: string): Promise<ParcelFields | undefined> => {
    const result = await client.query<ParcelFields>(
      `SELECT commune_code, section, number FROM parcels WHERE parcel_id = $1`,
      [parcelId],
    )
    return result.rows[0]
  }

  const appliedMigrations = async (): Promise<string[]> => {
    const result = await client.query<{ filename: string }>(
      `SELECT filename FROM schema_migrations ORDER BY filename`,
    )
    return result.rows.map((row) => row.filename)
  }

  const PLACEHOLDER: ParcelFields = { commune_code: "00000", section: "AA", number: "0000" }

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
      .filter((file) => file.endsWith(".sql") && file < MIGRATION_020)
      .sort()
    expect(preMigrations[0]).toBe("001_init.sql")
    expect(preMigrations[preMigrations.length - 1]).toBe("019_no_submission_deadline.sql")
    for (const file of preMigrations) {
      await client.query("BEGIN")
      await client.query(readMigration(file))
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
    }

    // Written by the old parser: an IDU with a two-letter section, one with a one-letter section.
    await insertParcel("94080000AB0012", PLACEHOLDER)
    await insertParcel("751120000C0450", PLACEHOLDER)
    // Left alone: an IDU section without a letter, a non-IDU id, an IDU row already filled in.
    await insertParcel("94080000000013", PLACEHOLDER)
    await insertParcel("BAD", PLACEHOLDER)
    await insertParcel("94080000CD0001", { commune_code: "94080", section: "CD", number: "0001" })

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

  it("was applied by the runner, which recorded it after 019", async () => {
    const applied = await appliedMigrations()
    expect(applied.indexOf(MIGRATION_020)).toBe(
      applied.indexOf("019_no_submission_deadline.sql") + 1,
    )
    expect(logSpy).toHaveBeenCalledWith(`Applied migration: ${MIGRATION_020}`)
  })

  it("fills commune, section and number of a placeholder row from its IDU", async () => {
    expect(await fieldsOf("94080000AB0012")).toEqual({
      commune_code: "94080",
      section: "AB",
      number: "0012",
    })
    // Section letters only, as the IGN features are keyed.
    expect(await fieldsOf("751120000C0450")).toEqual({
      commune_code: "75112",
      section: "C",
      number: "0450",
    })
  })

  it("touches no other row", async () => {
    expect(await fieldsOf("94080000000013")).toEqual(PLACEHOLDER)
    expect(await fieldsOf("BAD")).toEqual(PLACEHOLDER)
    expect(await fieldsOf("94080000CD0001")).toEqual({
      commune_code: "94080",
      section: "CD",
      number: "0001",
    })
  })

  it("is a no-op when the runner runs again", async () => {
    const before = await appliedMigrations()
    logSpy.mockClear()
    await expect(runMigrations(scratchRunnerConfig())).resolves.toBeUndefined()
    expect(await appliedMigrations()).toEqual(before)
    expect(logSpy).not.toHaveBeenCalledWith(`Applied migration: ${MIGRATION_020}`)
  })

  it("can be executed a second time inside BEGIN/COMMIT", async () => {
    await client.query("BEGIN")
    await client.query(readMigration(MIGRATION_020))
    await client.query("COMMIT")
    expect(await fieldsOf("94080000AB0012")).toEqual({
      commune_code: "94080",
      section: "AB",
      number: "0012",
    })
  })
})
