/**
 * Fake data for owner testing (12.1, OA-105): about a hundred finished, public surveys of eight
 * fake community members spread over France, plus a dozen surveys on the owner's own account
 * (drafts and finished ones). The Communauté search, the Explorer map and parcel history and the
 * read-only survey page then have something to show.
 *
 *   node scripts/seed-demo-community.js                    replace the demo data
 *   node scripts/seed-demo-community.js --wipe-all         first delete EVERY survey of the database
 *   node scripts/seed-demo-community.js --remove           remove the demo data only
 *   --owner-email=name@example.org                         the account that gets its own surveys
 *   --count=100                                            number of community surveys
 *
 * Everything it creates is marked and removed by `--remove`:
 *   - users with an email ending in @demo.cortege.invalid (auth0_sub "demo|...")
 *   - surveys whose id starts with "demo-" (their events and parcel links go with them)
 *   - parcels with source "demo" (invented parcels with a centroid, no geometry)
 * Without `--wipe-all` it never touches a real user, survey or parcel. `--wipe-all` deletes every
 * survey, event and attachment row (object storage files are left behind) but keeps users and
 * parcels: only for a database that holds test data.
 *
 * Needs the built shared package (`npm run build:domain`) for the IBP scores, and the usual
 * POSTGRES_* variables (a production run: inside the API container, see infra/vps/README.md).
 */
const path = require("path")
const crypto = require("crypto")
const { Client } = require("pg")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })

const DEMO_EMAIL_SUFFIX = "@demo.cortege.invalid"
const DEMO_SURVEY_PREFIX = "demo-"
const DEMO_PARCEL_SOURCE = "demo"
const DEFAULT_OWNER_EMAIL = "florian.lepont@icloud.com"
const DEFAULT_COUNT = 100

const MEMBERS = [
  ["camille", "Camille", "Martin"],
  ["yanis", "Yanis", "Bernard"],
  ["lea", "Léa", "Moreau"],
  ["hugo", "Hugo", "Lambert"],
  ["ines", "Inès", "Fontaine"],
  ["noe", "Noé", "Girard"],
  ["manon", "Manon", "Roux"],
  ["theo", "Théo", "Vidal"],
]

// Forests and woodlands of France: [short name, latitude, longitude].
const PLACES = [
  ["Fontainebleau", 48.4, 2.69],
  ["Compiègne", 49.35, 2.9],
  ["Rambouillet", 48.64, 1.83],
  ["Sénart", 48.67, 2.5],
  ["Retz", 49.3, 3.02],
  ["Lyons", 49.45, 1.5],
  ["Brotonne", 49.5, 0.75],
  ["Argonne", 49.2, 4.9],
  ["Haguenau", 48.8, 7.78],
  ["Vosges du Nord", 48.95, 7.4],
  ["Gérardmer", 48.07, 6.88],
  ["Chaux", 47.05, 5.65],
  ["Morvan", 47.15, 4.05],
  ["Tronçais", 46.67, 2.72],
  ["Chartreuse", 45.33, 5.8],
  ["Vercors", 44.98, 5.5],
  ["Belledonne", 45.2, 6.0],
  ["Mercantour", 44.1, 7.1],
  ["Sainte-Baume", 43.32, 5.72],
  ["Landes de Gascogne", 44.2, -0.9],
  ["Pyrénées ariégeoises", 42.9, 1.4],
  ["Aigoual", 44.12, 3.58],
  ["Millevaches", 45.6, 2.0],
  ["Perche", 48.4, 0.7],
  ["Brocéliande", 48.0, -2.2],
  ["Cévennes", 44.3, 3.9],
]
// Where the owner's own surveys sit (Île-de-France and around).
const OWNER_PLACES = [
  ["Notre-Dame", 48.775, 2.565],
  ["Vincennes", 48.83, 2.43],
  ["Fontainebleau", 48.4, 2.69],
  ["Rambouillet", 48.64, 1.83],
  ["Sénart", 48.67, 2.5],
]

const STAND_NAMES = ["Chênaie", "Hêtraie", "Pinède", "Taillis", "Futaie", "Lisière", "Ripisylve"]
const METHOD_V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"

function connect() {
  return new Client({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "ibp",
    password: process.env.POSTGRES_PASSWORD || "ibp",
    database: process.env.POSTGRES_DB || "ibp",
  })
}

/** A small seeded generator: the same run gives the same data. */
function makeRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function removeDemo(client) {
  await client.query(`DELETE FROM survey_events WHERE survey_id LIKE $1`, [
    `${DEMO_SURVEY_PREFIX}%`,
  ])
  await client.query(`DELETE FROM attachments WHERE survey_id LIKE $1`, [`${DEMO_SURVEY_PREFIX}%`])
  const surveys = await client.query(`DELETE FROM surveys WHERE id LIKE $1`, [
    `${DEMO_SURVEY_PREFIX}%`,
  ])
  const users = await client.query(`DELETE FROM users WHERE email LIKE $1`, [
    `%${DEMO_EMAIL_SUFFIX}`,
  ])
  const parcels = await client.query(`DELETE FROM parcels WHERE source = $1`, [DEMO_PARCEL_SOURCE])
  console.log(
    `Removed ${surveys.rowCount} demo surveys, ${users.rowCount} demo users and ${parcels.rowCount} demo parcels.`,
  )
}

async function wipeAllSurveys(client) {
  await client.query(`DELETE FROM attachments`)
  await client.query(`DELETE FROM survey_events`)
  const surveys = await client.query(`DELETE FROM surveys`)
  console.log(`Deleted every survey of the database (${surveys.rowCount}).`)
}

/** Raw factor entries for a quality between 0 (poor) and 1 (rich), valid under the rules. */
function buildFactors(quality) {
  const { ALLOWED_SCORES_BY_FACTOR, CNPF_FACTOR_A_MAIN_GENERA } = require("@cortege/ibp-domain")
  const round = Math.round
  const classScores = [...ALLOWED_SCORES_BY_FACTOR.H].sort((a, b) => a - b)
  return {
    A: {
      genera: CNPF_FACTOR_A_MAIN_GENERA.slice(0, 1 + round(quality * 9)),
      native_cover_percent: 5 + round(quality * 60),
    },
    B: { strata_count: 1 + round(quality * 4) },
    C: { bmg_count: round(quality * 8), bmm_count: round(quality * 4), surface_ha: 10 },
    D: { bmg_count: round(quality * 6), bmm_count: round(quality * 4), surface_ha: 10 },
    E: { gb_count: round(quality * 3), tgb_count: round(quality * 3), surface_ha: 5 },
    F: { trees_per_ha: round(20 + quality * 180) },
    G: { open_flowering_percent: round(quality * 40) },
    H: { class_score: classScores[round(quality * (classScores.length - 1))] },
    I: { type_count: round(quality * 4) },
    J: { type_count: round(quality * 3) },
  }
}

function methodFields(random, index) {
  const { IBP_METHOD_V3_0, REGION_VERSIONS, VEGETATION_STAGES_BY_REGION } = require("@cortege/ibp-domain")
  // About one survey in seven follows the older method, to show both on the map.
  if (index % 7 === 3) {
    const region = REGION_VERSIONS[0]
    const stages = VEGETATION_STAGES_BY_REGION[region]
    return {
      ibp_method_version: IBP_METHOD_V3_0,
      ibp_cas: null,
      ibp_cas3_scale: false,
      region_version: region,
      vegetation_stage: stages[Math.floor(random() * stages.length)],
    }
  }
  const cas = 1 + Math.floor(random() * 4)
  return {
    ibp_method_version: METHOD_V3_2,
    ibp_cas: cas,
    ibp_cas3_scale: false,
    region_version: null,
    vegetation_stage: null,
  }
}

async function insertParcel(client, index, place, random) {
  const [name, lat, lng] = place
  const latitude = lat + (random() - 0.5) * 0.08
  const longitude = lng + (random() - 0.5) * 0.12
  const number = String(index + 1).padStart(4, "0")
  const parcelId = `DEMO${number}`
  await client.query(
    // centroid_lat and centroid_lng are generated from the centroid JSON.
    `INSERT INTO parcels (id, parcel_id, commune_code, section, number, geometry, centroid, area_m2,
                          source)
     VALUES ($1, $2, '00000', 'DM', $3, '{}'::jsonb, $4::jsonb, $5, $6)`,
    [
      crypto.randomUUID(),
      parcelId,
      number,
      JSON.stringify({ lat: latitude, lng: longitude }),
      Math.round(20000 + random() * 180000),
      DEMO_PARCEL_SOURCE,
    ],
  )
  return { parcelId, name, latitude, longitude }
}

async function insertSurvey(client, survey) {
  const { evaluateIbp } = require("@cortege/ibp-domain")
  const evaluation = evaluateIbp(
    {
      ibp_method_version: survey.method.ibp_method_version,
      ibp_cas: survey.method.ibp_cas,
      ibp_cas3_scale: survey.method.ibp_cas3_scale,
      region_version: survey.method.region_version,
      vegetation_stage: survey.method.vegetation_stage,
      factors: survey.factors,
    },
    survey.status === "submitted" ? "submit" : "draft",
  )
  if (!evaluation.ok || !evaluation.scores) {
    throw new Error(`Demo factors rejected by the engine: ${(evaluation.errors ?? []).join("; ")}`)
  }
  const id = `${DEMO_SURVEY_PREFIX}${crypto.randomUUID()}`
  const submitted = survey.status === "submitted"
  const when = survey.when.toISOString()
  const location = {
    lat: String(survey.parcel.latitude),
    lng: String(survey.parcel.longitude),
    collected_at: when,
  }
  await client.query(
    `INSERT INTO surveys
       (id, user_id, site_name, status, visibility, ibp_method_version, ibp_cas, ibp_cas3_scale,
        region_version, vegetation_stage, factors, factor_results, scores, location, parcel_id,
        observation_year, version_number, created_at, updated_at, submitted_at, sync_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb,
             $15, $16, $17, $18, $18, $19, 1)`,
    [
      id,
      survey.userId,
      survey.siteName,
      survey.status,
      survey.visibility,
      survey.method.ibp_method_version,
      survey.method.ibp_cas,
      survey.method.ibp_cas3_scale,
      survey.method.region_version,
      survey.method.vegetation_stage,
      JSON.stringify(survey.factors),
      JSON.stringify(evaluation.factor_results ?? {}),
      JSON.stringify(evaluation.scores),
      JSON.stringify(location),
      survey.parcel.parcelId,
      submitted ? survey.when.getUTCFullYear() : null,
      submitted ? survey.version : null,
      when,
      submitted ? when : null,
    ],
  )
  await client.query(
    `INSERT INTO survey_parcels (survey_id, parcel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [id, survey.parcel.parcelId],
  )
  if (survey.withEvents) {
    // The phone pulls its changes from the events: without one, the survey never reaches it.
    await client.query(
      `INSERT INTO survey_events (id, survey_id, actor_id, event_type, payload, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        crypto.randomUUID(),
        id,
        survey.userId,
        submitted ? "submitted" : "updated",
        JSON.stringify(
          submitted
            ? { scores: evaluation.scores, warnings: [] }
            : { site_name: survey.siteName, sync_version: 1, warnings: [] },
        ),
        when,
      ],
    )
  }
  return evaluation.scores.ibp_total
}

async function addCommunity(client, count) {
  const random = makeRandom(20261006)
  const memberIds = []
  for (const [key, first, last] of MEMBERS) {
    const id = crypto.randomUUID()
    await client.query(
      `INSERT INTO users (id, email, role, first_name, last_name, display_name, auth0_sub)
       VALUES ($1, $2, 'contributor', $3, $4, $5, $6)`,
      [id, `${key}${DEMO_EMAIL_SUFFIX}`, first, last, `${first} ${last}`, `demo|${key}`],
    )
    memberIds.push(id)
  }

  // Two parcels around each place, then the surveys go round them: a parcel gets one survey per
  // year, so the parcel history has several entries.
  const parcels = []
  for (const [placeIndex, place] of PLACES.entries()) {
    for (let k = 0; k < 2; k += 1) {
      parcels.push(await insertParcel(client, placeIndex * 2 + k, place, random))
    }
  }

  const versions = new Map()
  const years = [2023, 2024, 2025]
  for (let index = 0; index < count; index += 1) {
    const parcel = parcels[index % parcels.length]
    const year = years[Math.floor(index / parcels.length) % years.length]
    const key = `${parcel.parcelId}:${year}`
    const version = (versions.get(key) ?? 0) + 1
    versions.set(key, version)
    const when = new Date(
      Date.UTC(year, 2 + Math.floor(random() * 8), 1 + Math.floor(random() * 27), 9 + (index % 8)),
    )
    await insertSurvey(client, {
      userId: memberIds[index % memberIds.length],
      siteName: `${STAND_NAMES[index % STAND_NAMES.length]} de ${parcel.name}`,
      status: "submitted",
      visibility: "public",
      method: methodFields(random, index),
      factors: buildFactors(0.1 + random() * 0.85),
      parcel,
      when,
      version,
      withEvents: false,
    })
  }
  console.log(`Created ${memberIds.length} demo members and ${count} finished public surveys.`)
}

async function addOwnerSurveys(client, ownerEmail) {
  const { FACTOR_KEYS } = require("@cortege/ibp-domain")
  const owner = await client.query(`SELECT id FROM users WHERE email = $1`, [ownerEmail])
  if (owner.rowCount === 0) {
    console.warn(`No user with the email ${ownerEmail}: no survey created on the owner's account.`)
    return
  }
  const random = makeRandom(7)
  const parcels = []
  for (const [index, place] of OWNER_PLACES.entries()) {
    parcels.push(await insertParcel(client, 900 + index, place, random))
  }

  const plan = [
    // [name, status, visibility, quality, factors kept (drafts)]
    ["Chênaie du Bois Joli", "draft", "private", 0.3, 3],
    ["Lisière de la Marne", "draft", "private", 0.5, 6],
    ["Taillis du Plateau", "draft", "private", 0.2, 2],
    ["Parcelle de la source", "draft", "private", 0.6, 9],
    ["Hêtraie de la Butte", "draft", "private", 0.4, 5],
    ["Futaie des Gaillardes", "draft", "private", 0.7, 8],
    ["Pinède des Sables", "submitted", "public", 0.8, 10],
    ["Ripisylve de l'Yerres", "submitted", "public", 0.55, 10],
    ["Boisement de la gare", "submitted", "private", 0.35, 10],
    ["Chênaie de la Mare", "submitted", "private", 0.9, 10],
    ["Taillis de l'Étang", "submitted", "public", 0.45, 10],
  ]
  const versions = new Map()
  for (const [index, [siteName, status, visibility, quality, kept]] of plan.entries()) {
    const parcel = parcels[index % parcels.length]
    const full = buildFactors(quality)
    const factors = Object.fromEntries(FACTOR_KEYS.slice(0, kept).map((key) => [key, full[key]]))
    const when = new Date(Date.UTC(2026, 3 + (index % 6), 2 + index * 2, 10))
    const key = `${parcel.parcelId}:${when.getUTCFullYear()}`
    const version = (versions.get(key) ?? 0) + 1
    versions.set(key, version)
    await insertSurvey(client, {
      userId: owner.rows[0].id,
      siteName,
      status,
      visibility,
      method: methodFields(random, index === 8 ? 3 : 0),
      factors,
      parcel,
      when,
      version,
      withEvents: true,
    })
  }
  console.log(`Created ${plan.length} surveys on the account ${ownerEmail}.`)
}

function argValue(name, fallback) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

async function main() {
  const client = connect()
  await client.connect()
  try {
    await client.query("BEGIN")
    if (process.argv.includes("--remove")) {
      await removeDemo(client)
    } else {
      await removeDemo(client)
      if (process.argv.includes("--wipe-all")) await wipeAllSurveys(client)
      await addCommunity(client, Number(argValue("count", DEFAULT_COUNT)))
      await addOwnerSurveys(client, argValue("owner-email", DEFAULT_OWNER_EMAIL))
    }
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
