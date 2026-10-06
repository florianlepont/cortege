/**
 * Fake community data for owner testing (12.1, OA-105): a few "other members" with finished,
 * public surveys on parcels that already exist in the database, so the Communauté search, the
 * Explorer parcel history and the read-only survey page have something to show.
 *
 *   node scripts/seed-demo-community.js            add the demo data (idempotent: replaces it)
 *   node scripts/seed-demo-community.js --remove   remove it
 *
 * Everything it creates is marked and removed by `--remove`:
 *   - users with an email ending in @demo.cortege.invalid (auth0_sub "demo|...")
 *   - surveys whose id starts with "demo-" (their parcel links go with them)
 * It never touches a real user, survey or parcel. Remove it before the app opens to the public.
 *
 * Needs the built shared package (`npm run build:domain`) for the IBP scores, and the usual
 * POSTGRES_* variables (a production run: inside the API container, see infra/vps/README.md).
 * It also needs at least one parcel in the database: it adds surveys on existing parcels only.
 */
const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const DEMO_EMAIL_SUFFIX = '@demo.cortege.invalid'
const DEMO_SURVEY_PREFIX = 'demo-'
const METHOD_V3_2 = 'cnpf_ibp_fr_v3_2_2026-02-02'

const MEMBERS = [
  { key: 'camille', first: 'Camille', last: 'Martin' },
  { key: 'yanis', first: 'Yanis', last: 'Bernard' },
  { key: 'lea', first: 'Léa', last: 'Moreau' },
]
const SITE_NAMES = ['Bois des Roches', 'Lisière du Nord', 'Parcelle de la source', 'Taillis de l\'Étang']

function connect() {
  return new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'ibp',
    password: process.env.POSTGRES_PASSWORD || 'ibp',
    database: process.env.POSTGRES_DB || 'ibp',
  })
}

async function remove(client) {
  await client.query(
    `DELETE FROM survey_events WHERE survey_id LIKE $1`,
    [`${DEMO_SURVEY_PREFIX}%`],
  )
  const surveys = await client.query(`DELETE FROM surveys WHERE id LIKE $1`, [
    `${DEMO_SURVEY_PREFIX}%`,
  ])
  const users = await client.query(`DELETE FROM users WHERE email LIKE $1`, [
    `%${DEMO_EMAIL_SUFFIX}`,
  ])
  console.log(`Removed ${surveys.rowCount} demo surveys and ${users.rowCount} demo users.`)
}

/** Direct factor scores valid under the rules; varied but plausible, checked by the engine. */
function buildFactors(seed) {
  const { allowedScoresFor, FACTOR_KEYS } = require('@cortege/ibp-domain')
  const factors = {}
  FACTOR_KEYS.forEach((key, index) => {
    const allowed = [...allowedScoresFor(key)].sort((a, b) => a - b)
    factors[key] = allowed[(seed + index * 3) % allowed.length]
  })
  return factors
}

async function add(client) {
  const { evaluateIbp } = require('@cortege/ibp-domain')
  await remove(client)

  const parcels = await client.query(
    `SELECT parcel_id, centroid FROM parcels
     WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 3`,
  )
  if (parcels.rowCount === 0) {
    throw new Error(
      'No parcel in the database yet. Create a survey with a parcel from the app and sync it, then run this again.',
    )
  }

  const userIds = []
  for (const member of MEMBERS) {
    const id = require('crypto').randomUUID()
    await client.query(
      `INSERT INTO users (id, email, role, first_name, last_name, display_name, auth0_sub)
       VALUES ($1, $2, 'contributor', $3, $4, $5, $6)`,
      [
        id,
        `${member.key}${DEMO_EMAIL_SUFFIX}`,
        member.first,
        member.last,
        `${member.first} ${member.last}`,
        `demo|${member.key}`,
      ],
    )
    userIds.push(id)
  }

  let created = 0
  let seed = 1
  for (const [parcelIndex, parcel] of parcels.rows.entries()) {
    const years = [2024, 2025]
    for (const [yearIndex, year] of years.entries()) {
      const userId = userIds[(parcelIndex + yearIndex) % userIds.length]
      const version = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next
         FROM surveys
         WHERE parcel_id = $1 AND observation_year = $2
           AND deleted_at IS NULL AND status = 'submitted'`,
        [parcel.parcel_id, year],
      )
      const factors = buildFactors(seed)
      const evaluation = evaluateIbp(
        { ibp_method_version: METHOD_V3_2, ibp_cas: 1, factors },
        'draft',
      )
      if (!evaluation.ok || !evaluation.scores) {
        throw new Error(`Demo factors rejected by the engine: ${evaluation.errors.join('; ')}`)
      }
      const id = `${DEMO_SURVEY_PREFIX}${require('crypto').randomUUID()}`
      const submittedAt = new Date(Date.UTC(year, 5 + parcelIndex, 10 + yearIndex, 10, 0, 0))
      const location = {
        lat: String(parcel.centroid.lat),
        lng: String(parcel.centroid.lng),
        collected_at: submittedAt.toISOString(),
      }
      await client.query(
        `INSERT INTO surveys
           (id, user_id, site_name, status, visibility, ibp_method_version, ibp_cas, ibp_cas3_scale,
            factors, factor_results, scores, location, parcel_id, observation_year, version_number,
            created_at, updated_at, submitted_at, expires_at, sync_version)
         VALUES ($1, $2, $3, 'submitted', 'public', $4, 1, false,
                 $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11,
                 $12, $12, $12, $13, 1)`,
        [
          id,
          userId,
          SITE_NAMES[(parcelIndex + yearIndex) % SITE_NAMES.length],
          METHOD_V3_2,
          JSON.stringify(factors),
          JSON.stringify(evaluation.factor_results ?? {}),
          JSON.stringify(evaluation.scores),
          JSON.stringify(location),
          parcel.parcel_id,
          year,
          version.rows[0].next,
          submittedAt.toISOString(),
          new Date(submittedAt.getTime() + 365 * 24 * 3600 * 1000).toISOString(),
        ],
      )
      await client.query(
        `INSERT INTO survey_parcels (survey_id, parcel_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, parcel.parcel_id],
      )
      created += 1
      seed += 1
    }
  }
  console.log(
    `Created ${MEMBERS.length} demo members and ${created} finished surveys on ${parcels.rowCount} existing parcels.`,
  )
}

async function main() {
  const client = connect()
  await client.connect()
  try {
    await client.query('BEGIN')
    if (process.argv.includes('--remove')) await remove(client)
    else await add(client)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
