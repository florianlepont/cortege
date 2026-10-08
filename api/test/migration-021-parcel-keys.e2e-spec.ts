import "dotenv/config"
import { randomUUID } from "crypto"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { Client, ClientConfig } from "pg"
import { parseParcelIdentifier } from "../src/surveys/surveys-normalize.utils"

// Migration 021 (owner request 2026-10-08): the parcels registered by their IGN identifier get the
// IDU's commune, section and number, numbered Alsace-Moselle sections and Paris, Lyon and
// Marseille arrondissements included. globalSetup migrates an empty schema, so the repair never
// meets existing rows there. This spec builds the pre-021 shape in a scratch schema (migrations
// 001-020), seeds parcels written with the old keys, then lets the real runner
// (scripts/migrate.js) apply 021 only.
type MigrateModule = { runMigrations: (config: ClientConfig) => Promise<void> }
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ClientConfig & { database: string }
}

const { runMigrations } = jest.requireActual<MigrateModule>("../scripts/migrate")
const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const SCRATCH_SCHEMA = "mig021_scratch"
const MIGRATIONS_DIR = join(__dirname, "..", "migrations")
const MIGRATION_021 = "021_parcel_keys_numbered_sections_arrondissements.sql"

const readMigration = (file: string): string => readFileSync(join(MIGRATIONS_DIR, file), "utf8")

const scratchRunnerConfig = (): ClientConfig => ({
  ...resolveDbConfig(process.env),
  options: `-c search_path=${SCRATCH_SCHEMA}`,
})

type ParcelFields = { commune_code: string; section: string; number: string }

const PLACEHOLDER: ParcelFields = { commune_code: "00000", section: "AA", number: "0000" }

/** The key the app registers for an id today (parseParcelIdentifier), as stored columns. */
const appKey = (parcelId: string): ParcelFields => {
  const parsed = parseParcelIdentifier(parcelId)
  return { commune_code: parsed.communeCode, section: parsed.section, number: parsed.number }
}

describe("migration 021: parcel keys for numbered sections and arrondissements (e2e)", () => {
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
      .filter((file) => file.endsWith(".sql") && file < MIGRATION_021)
      .sort()
    expect(preMigrations[0]).toBe("001_init.sql")
    expect(preMigrations[preMigrations.length - 1]).toBe("020_parcel_idu_fields.sql")
    for (const file of preMigrations) {
      await client.query("BEGIN")
      await client.query(readMigration(file))
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file])
      await client.query("COMMIT")
    }

    // Alsace-Moselle, registered by id with the old parser: the placeholder.
    await insertParcel("67392000090001", PLACEHOLDER)
    await insertParcel("57250000220220", PLACEHOLDER)
    // Paris, found by point: the reverse geocoder's city code.
    await insertParcel("75112000BL0010", { commune_code: "75056", section: "BL", number: "0010" })
    // Marseille, absorbed-commune prefix 801, city code and a stale section form.
    await insertParcel("132018010B0128", { commune_code: "13055", section: "0B", number: "0128" })
    // Already right: left alone.
    await insertParcel("94080000CD0001", { commune_code: "94080", section: "CD", number: "0001" })
    await insertParcel("751120000C0450", { commune_code: "75112", section: "C", number: "0450" })
    // Not a section ("00") and not an IDU: left alone.
    await insertParcel("94080000000013", PLACEHOLDER)
    await insertParcel("BAD", PLACEHOLDER)
    await insertParcel("75104AE0003", { commune_code: "75104", section: "AE", number: "0003" })
    await client.query(
      `UPDATE parcels SET updated_at = '2026-01-01T00:00:00Z' WHERE parcel_id = '94080000CD0001'`,
    )

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

  it("was applied by the runner, which recorded it after 020", async () => {
    const applied = await appliedMigrations()
    expect(applied.indexOf(MIGRATION_021)).toBe(applied.indexOf("020_parcel_idu_fields.sql") + 1)
    expect(logSpy).toHaveBeenCalledWith(`Applied migration: ${MIGRATION_021}`)
  })

  it("gives numbered-section parcels their two-digit section", async () => {
    expect(await fieldsOf("67392000090001")).toEqual({
      commune_code: "67392",
      section: "09",
      number: "0001",
    })
    expect(await fieldsOf("57250000220220")).toEqual({
      commune_code: "57250",
      section: "22",
      number: "0220",
    })
  })

  it("gives arrondissement parcels the arrondissement code of their IDU", async () => {
    expect(await fieldsOf("75112000BL0010")).toEqual({
      commune_code: "75112",
      section: "BL",
      number: "0010",
    })
    expect(await fieldsOf("132018010B0128")).toEqual({
      commune_code: "13201",
      section: "B",
      number: "0128",
    })
  })

  it("writes the key the app registers for the same id", async () => {
    for (const parcelId of [
      "67392000090001",
      "57250000220220",
      "75112000BL0010",
      "132018010B0128",
      "94080000CD0001",
      "751120000C0450",
    ]) {
      expect(await fieldsOf(parcelId)).toEqual(appKey(parcelId))
    }
  })

  it("touches no other row", async () => {
    expect(await fieldsOf("94080000000013")).toEqual(PLACEHOLDER)
    expect(await fieldsOf("BAD")).toEqual(PLACEHOLDER)
    expect(await fieldsOf("75104AE0003")).toEqual({
      commune_code: "75104",
      section: "AE",
      number: "0003",
    })
    const untouched = await client.query<{ unchanged: boolean }>(
      `SELECT updated_at = '2026-01-01T00:00:00Z'::timestamptz AS unchanged
       FROM parcels WHERE parcel_id = '94080000CD0001'`,
    )
    expect(untouched.rows[0].unchanged).toBe(true)
  })

  it("is a no-op when the runner runs again", async () => {
    const before = await appliedMigrations()
    logSpy.mockClear()
    await expect(runMigrations(scratchRunnerConfig())).resolves.toBeUndefined()
    expect(await appliedMigrations()).toEqual(before)
    expect(logSpy).not.toHaveBeenCalledWith(`Applied migration: ${MIGRATION_021}`)
  })

  it("can be executed a second time inside BEGIN/COMMIT", async () => {
    await client.query("BEGIN")
    const second = await client.query(readMigration(MIGRATION_021))
    await client.query("COMMIT")
    expect(second.rowCount).toBe(0)
    expect(await fieldsOf("67392000090001")).toEqual({
      commune_code: "67392",
      section: "09",
      number: "0001",
    })
  })
})
