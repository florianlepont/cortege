import "dotenv/config"
import { readFileSync } from "fs"
import { join } from "path"
import { Client } from "pg"

// Migration 022 (phase 25, D-16): the `unaccent` extension and the parcels key index. globalSetup
// has already migrated ibp_test, so this spec only checks the result and that the file is safe to
// run a second time.
type E2eEnvModule = {
  resolveDbConfig: (env: NodeJS.ProcessEnv) => ConstructorParameters<typeof Client>[0]
}

const { resolveDbConfig } = jest.requireActual<E2eEnvModule>("./e2e-env")

const MIGRATION_022 = "022_unaccent_search.sql"
const INDEX_NAME = "idx_parcels_commune_section_number"

// The letters the phone folds in mobile/src/app/search-text.ts; unaccent.rules of PostgreSQL 16
// maps the oe and ae ligatures to two letters, as the phone does.
const FIXTURE = "é è ê ë à â ç ï î ô ù û ü ÿ œ æ"
const FOLDED = "e e e e a a c i i o u u u y oe ae"

describe("migration 022: unaccent and the parcels key index (e2e)", () => {
  let client: Client

  beforeAll(async () => {
    client = new Client(resolveDbConfig(process.env))
    await client.connect()
  })

  afterAll(async () => {
    if (client) {
      await client.end()
    }
  })

  const scalar = async (sql: string, values: unknown[] = []): Promise<string> => {
    const result = await client.query<{ value: string }>(sql, values)
    return result.rows[0].value
  }

  it("was recorded by the runner", async () => {
    const result = await client.query(`SELECT 1 FROM schema_migrations WHERE filename = $1`, [
      MIGRATION_022,
    ])
    expect(result.rowCount).toBe(1)
  })

  it("enables the unaccent extension in the public schema", async () => {
    const result = await client.query<{ schema: string }>(
      `SELECT n.nspname AS schema
         FROM pg_extension e
         JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'unaccent'`,
    )
    expect(result.rows).toEqual([{ schema: "public" }])
  })

  it("removes the accent of a word", async () => {
    expect(await scalar(`SELECT unaccent('Éléphant') AS value`)).toBe("Elephant")
  })

  it("folds the fixture letters like the phone, in lower and upper case", async () => {
    expect(await scalar(`SELECT lower(unaccent($1::text)) AS value`, [FIXTURE])).toBe(FOLDED)
    expect(await scalar(`SELECT lower(unaccent($1::text)) AS value`, [FIXTURE.toUpperCase()])).toBe(
      FOLDED,
    )
  })

  it("matches an unaccented text against an accented name with ILIKE", async () => {
    expect(
      await scalar(`SELECT (unaccent($1::text) ILIKE unaccent($2::text))::text AS value`, [
        "Forêt de Bercé",
        "%foret%",
      ]),
    ).toBe("true")
  })

  it("creates the parcels key index", async () => {
    const result = await client.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'parcels' AND indexname = $1`,
      [INDEX_NAME],
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].indexdef).toContain("(commune_code, section, number)")
  })

  it("is safe to run a second time", async () => {
    const sql = readFileSync(join(__dirname, "..", "migrations", MIGRATION_022), "utf8")
    await expect(client.query(sql)).resolves.toBeDefined()
  })
})
