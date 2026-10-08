/**
 * Fake data for owner testing (12.1, OA-105): about a hundred finished, public surveys of eight
 * fake community members spread over France, plus a dozen surveys on the owner's own account
 * (drafts and finished ones). The Communauté search, the Explorer map and parcel history and the
 * read-only survey page then have something to show.
 *
 * Since 2026-10-08 every demo survey sits on REAL parcels of the IGN cadastre (1 to 3 neighbouring
 * parcels per site, two sites per place), found through the IGN WFS the API already reads, so the
 * Explorer colours them by score at parcel zoom, the survey map zooms on them and the parcel
 * history and parcel picker behave as with a field survey. The parcels are resolved first, over
 * the network; nothing is written unless every site resolved, and then everything is written in
 * one transaction. There is no fallback to invented parcels.
 *
 *   node scripts/seed-demo-community.js --dry-run          resolve the parcels and print what
 *                                                          would be created (no database needed)
 *   node scripts/seed-demo-community.js                    replace the demo data
 *   node scripts/seed-demo-community.js --wipe-all         first delete EVERY survey of the database
 *   node scripts/seed-demo-community.js --remove           remove the demo data only
 *   --owner-email=name@example.org                         the account that gets its own surveys
 *   --count=100                                            number of community surveys
 *
 * Everything it creates is marked and removed by `--remove`:
 *   - users with an email ending in @demo.cortege.invalid (auth0_sub "demo|...")
 *   - surveys whose id starts with "demo-" (their events and parcel links go with them)
 *   - parcels with source "demo": the real IGN parcels the seed registered (a parcel that already
 *     existed is reused as is and never marked), and the invented parcels of 12.1 (DEMO0001...).
 *     A demo parcel that a survey other than a demo survey links is kept (counted in the output).
 * Without `--wipe-all` it never touches a real user or survey. `--wipe-all` deletes every survey,
 * event and attachment row (object storage files are left behind) but keeps users and parcels:
 * only for a database that holds test data.
 *
 * Needs the network to reach the IGN (data.geopf.fr, or CADASTRE_IGN_WFS_URL /
 * CADASTRE_IGN_WFS_TYPENAME; timeout CADASTRE_PROVIDER_TIMEOUT_MS), the built shared package
 * (`npm run build:domain`) and the compiled API (`npm --workspace api run build`), both in the
 * image, and the usual POSTGRES_* variables (a production run: inside the API container, see
 * infra/vps/README.md).
 */
const path = require("path")
const crypto = require("crypto")
const { Client } = require("pg")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })
const {
  DEMO_PARCEL_SOURCE,
  assignVersions,
  cadastreSettings,
  centreOf,
  makeRandom,
  parcelRegistrationRow,
  planDemoParcelRemoval,
  resolveSites,
  sitePoint,
} = require("./lib/demo-parcels")

const DEMO_EMAIL_SUFFIX = "@demo.cortege.invalid"
const DEMO_SURVEY_PREFIX = "demo-"
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
  ["Grésigne", 44.05, 1.75],
]
// Where the owner's own surveys sit (Île-de-France and around). A fourth element narrows a site:
// `spread` scales how far its point may fall from the place (and its retries), `search` the size
// of the area asked around the point, `commune` the commune codes its parcels must start with.
const OWNER_PLACES = [
  ["Notre-Dame", 48.775, 2.565],
  // Vincennes itself (INSEE 94080), around the château: the owner tests there.
  ["Vincennes", 48.8435, 2.4365, { spread: 0.1, commune: "94080" }],
  // Paris (an arrondissement, 75116): the Bois de Boulogne has few, large parcels.
  ["Bois de Boulogne", 48.862, 2.2515, { spread: 0.2, search: 3, commune: "751" }],
  ["Fontainebleau", 48.4, 2.69],
  ["Rambouillet", 48.64, 1.83],
  ["Sénart", 48.67, 2.5],
]
// Two survey sites per community place, one per owner place.
const SITES_PER_PLACE = 2
// Seeds of the site points and parcel counts (per site), and of the survey contents.
const COMMUNITY_SITE_SEED = 20261008
const OWNER_SITE_SEED = 8000
const COMMUNITY_SURVEY_SEED = 20261006
const OWNER_SURVEY_SEED = 7

const STAND_NAMES = ["Chênaie", "Hêtraie", "Pinède", "Taillis", "Futaie", "Lisière", "Ripisylve"]
const METHOD_V3_2 = "cnpf_ibp_fr_v3_2_2026-02-02"

const OWNER_PLAN = [
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

function connect() {
  return new Client({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || "ibp",
    password: process.env.POSTGRES_PASSWORD || "ibp",
    database: process.env.POSTGRES_DB || "ibp",
  })
}

/**
 * A survey site: a point near a place and how many parcels (1 to 3) it covers, drawn from its own
 * seeded random (kept for the retry points), so a failed site never shifts the next ones.
 */
function makeSite(key, label, place, seed) {
  const options = place[3] ?? {}
  const random = makeRandom(seed)
  const point = sitePoint(place, random)
  const wanted = 1 + Math.floor(random() * 3)
  return {
    key,
    label,
    name: place[0],
    point,
    wanted,
    random,
    spread: options.spread ?? 1,
    search: options.search ?? 1,
    commune: options.commune ?? null,
  }
}

/**
 * Community sites, interleaved over the places (site k is at place k mod 27), so a small
 * `--count` still spreads over France. Only the sites that get a survey are built.
 */
function communitySites(count) {
  const total = Math.min(count, PLACES.length * SITES_PER_PLACE)
  return Array.from({ length: total }, (_, k) => {
    const place = PLACES[k % PLACES.length]
    const slot = Math.floor(k / PLACES.length) + 1
    return makeSite(`c${k}`, `${place[0]} ${slot}`, place, COMMUNITY_SITE_SEED + k * 7919)
  })
}

function ownerSites() {
  return OWNER_PLACES.map((place, k) =>
    makeSite(`o${k}`, `${place[0]} (owner)`, place, OWNER_SITE_SEED + k * 7919),
  )
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
  const {
    IBP_METHOD_V3_0,
    REGION_VERSIONS,
    VEGETATION_STAGES_BY_REGION,
  } = require("@cortege/ibp-domain")
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

/** Scores of a planned survey, checked by the engine (a dry run checks them too). */
function evaluate(survey) {
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
  return evaluation
}

/** The community surveys: they go round the sites, one year after another (2023 to 2025). */
function planCommunitySurveys(count, sites) {
  const random = makeRandom(COMMUNITY_SURVEY_SEED)
  const years = [2023, 2024, 2025]
  const surveys = []
  for (let index = 0; index < count; index += 1) {
    const site = sites[index % sites.length]
    const year = years[Math.floor(index / sites.length) % years.length]
    const when = new Date(
      Date.UTC(year, 2 + Math.floor(random() * 8), 1 + Math.floor(random() * 27), 9 + (index % 8)),
    )
    surveys.push({
      member: index % MEMBERS.length,
      siteName: `${STAND_NAMES[index % STAND_NAMES.length]} de ${site.name}`,
      status: "submitted",
      visibility: "public",
      method: methodFields(random, index),
      factors: buildFactors(0.1 + random() * 0.85),
      site,
      when,
      withEvents: false,
    })
  }
  return surveys
}

function planOwnerSurveys(sites) {
  const { FACTOR_KEYS } = require("@cortege/ibp-domain")
  const random = makeRandom(OWNER_SURVEY_SEED)
  return OWNER_PLAN.map(([siteName, status, visibility, quality, kept], index) => {
    const full = buildFactors(quality)
    return {
      siteName,
      status,
      visibility,
      method: methodFields(random, index === 8 ? 3 : 0),
      factors: Object.fromEntries(FACTOR_KEYS.slice(0, kept).map((key) => [key, full[key]])),
      site: sites[index % sites.length],
      when: new Date(Date.UTC(2026, 3 + (index % 6), 2 + index * 2, 10)),
      withEvents: true,
    }
  })
}

/** Attaches the resolved parcels and the scores to every planned survey. */
function completeSurveys(surveys, resolved) {
  for (const survey of surveys) {
    survey.parcels = resolved.get(survey.site.key)
    survey.parcelIds = survey.parcels.map((parcel) => parcel.parcelId)
    survey.centre = centreOf(survey.parcels)
    survey.evaluation = evaluate(survey)
  }
}

function printSummary(sites, resolved, surveys) {
  const counts = new Map()
  for (const survey of surveys) counts.set(survey.site.key, (counts.get(survey.site.key) ?? 0) + 1)
  const rows = sites.map((site) => {
    const parcels = resolved.get(site.key) ?? []
    const centre = parcels.length > 0 ? centreOf(parcels) : null
    const communes = [...new Set(parcels.map((p) => `${p.communeName ?? "?"} ${p.communeCode}`))]
    return {
      site: site.label,
      surveys: counts.get(site.key) ?? 0,
      parcels: parcels.map((p) => p.parcelId).join(" "),
      centre: centre ? `${centre.lat.toFixed(6)}, ${centre.lng.toFixed(6)}` : "",
      commune: communes.join(", "),
    }
  })
  console.table(rows)
}

/** Resolves every site, or stops the run with the list of the sites that failed. */
async function resolveAll(sites) {
  const settings = cadastreSettings()
  console.log(
    `Resolving ${sites.length} sites on the IGN cadastre (${settings.wfsUrl}, timeout ${settings.timeoutMs} ms)...`,
  )
  const { resolved, failures } = await resolveSites(sites, {
    settings,
    log: (line) => console.log(line),
  })
  if (failures.length > 0) {
    const list = failures.map((failure) => `  - ${failure.label}: ${failure.reason}`).join("\n")
    throw new Error(
      `No real IGN parcel found for ${failures.length} site(s), nothing was written:\n${list}\n` +
        "Check that this machine reaches the IGN services (data.geopf.fr) and run again.",
    )
  }
  return resolved
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
  // The demo surveys are gone: a "demo" parcel still linked now belongs to a real survey.
  // survey_parcels.parcel_id and surveys.parcel_id carry no foreign key to parcels.
  const demoParcels = await client.query(
    `SELECT p.parcel_id,
            (EXISTS (SELECT 1 FROM survey_parcels sp
                     WHERE sp.parcel_id = p.parcel_id AND sp.survey_id NOT LIKE $2)
             OR EXISTS (SELECT 1 FROM surveys s
                        WHERE s.parcel_id = p.parcel_id AND s.id NOT LIKE $2)) AS shared
     FROM parcels p
     WHERE p.source = $1`,
    [DEMO_PARCEL_SOURCE, `${DEMO_SURVEY_PREFIX}%`],
  )
  const plan = planDemoParcelRemoval(demoParcels.rows)
  if (plan.remove.length > 0) {
    await client.query(`DELETE FROM parcels WHERE source = $1 AND parcel_id = ANY($2::text[])`, [
      DEMO_PARCEL_SOURCE,
      plan.remove,
    ])
  }
  console.log(
    `Removed ${surveys.rowCount} demo surveys, ${users.rowCount} demo users and ` +
      `${plan.remove.length} demo parcels (${plan.legacyRemoved} of them invented 12.1 parcels).`,
  )
  if (plan.keptShared.length > 0) {
    console.log(
      `Kept ${plan.keptShared.length} demo parcel(s) that other surveys link: ${plan.keptShared.join(", ")}.`,
    )
  }
}

async function wipeAllSurveys(client) {
  await client.query(`DELETE FROM attachments`)
  await client.query(`DELETE FROM survey_events`)
  const surveys = await client.query(`DELETE FROM surveys`)
  console.log(`Deleted every survey of the database (${surveys.rowCount}).`)
}

/** Registers the parcels like the app (ON CONFLICT DO NOTHING); returns how many were new. */
async function insertParcels(client, parcels) {
  let created = 0
  for (const parcel of parcels) {
    const row = parcelRegistrationRow(parcel)
    const result = await client.query(
      // centroid_lat and centroid_lng are generated from the centroid JSON.
      `INSERT INTO parcels (id, parcel_id, commune_code, section, number, geometry, centroid, area_m2,
                            source)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
       ON CONFLICT (parcel_id) DO NOTHING`,
      [
        crypto.randomUUID(),
        row.parcel_id,
        row.commune_code,
        row.section,
        row.number,
        JSON.stringify(row.geometry),
        JSON.stringify(row.centroid),
        row.area_m2,
        row.source,
      ],
    )
    created += result.rowCount
  }
  return created
}

/** The highest finished version already on each parcel (real surveys stay as they are). */
async function existingVersions(client, parcelIds) {
  const result = await client.query(
    `SELECT linked.parcel_id, MAX(s.version_number)::int AS max_version
     FROM (SELECT sp.parcel_id, sp.survey_id FROM survey_parcels sp
           WHERE sp.parcel_id = ANY($1::text[])
           UNION
           SELECT s.parcel_id, s.id FROM surveys s WHERE s.parcel_id = ANY($1::text[])) linked
     JOIN surveys s ON s.id = linked.survey_id
     WHERE s.status = 'submitted' AND s.deleted_at IS NULL AND s.version_number IS NOT NULL
     GROUP BY linked.parcel_id`,
    [parcelIds],
  )
  return new Map(result.rows.map((row) => [row.parcel_id, Number(row.max_version)]))
}

async function insertSurvey(client, survey, userId) {
  const evaluation = survey.evaluation
  const id = `${DEMO_SURVEY_PREFIX}${crypto.randomUUID()}`
  const submitted = survey.status === "submitted"
  const when = survey.when.toISOString()
  const location = {
    lat: String(survey.centre.lat),
    lng: String(survey.centre.lng),
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
      userId,
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
      survey.parcelIds[0],
      submitted ? survey.when.getUTCFullYear() : null,
      submitted ? survey.version : null,
      when,
      submitted ? when : null,
    ],
  )
  await client.query(
    `INSERT INTO survey_parcels (survey_id, parcel_id)
     SELECT $1, unnest($2::text[])
     ON CONFLICT DO NOTHING`,
    [id, survey.parcelIds],
  )
  if (survey.withEvents) {
    // The phone pulls its changes from the events: without one, the survey never reaches it.
    await client.query(
      `INSERT INTO survey_events (id, survey_id, actor_id, event_type, payload, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        crypto.randomUUID(),
        id,
        userId,
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
}

async function insertMembers(client) {
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
  return memberIds
}

function argValue(name, fallback) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

/** Plans the demo data and resolves its parcels; no database involved. */
async function prepare(count) {
  const community = communitySites(count)
  const owner = ownerSites()
  const resolved = await resolveAll([...community, ...owner])
  const communitySurveys = planCommunitySurveys(count, community)
  const ownerSurveys = planOwnerSurveys(owner)
  completeSurveys(communitySurveys, resolved)
  completeSurveys(ownerSurveys, resolved)
  return { community, owner, resolved, communitySurveys, ownerSurveys }
}

function uniqueParcels(surveys) {
  const byId = new Map()
  for (const survey of surveys) {
    for (const parcel of survey.parcels) byId.set(parcel.parcelId, parcel)
  }
  return [...byId.values()]
}

async function seed(client, prepared, ownerEmail) {
  const { communitySurveys, ownerSurveys } = prepared
  const owner = await client.query(`SELECT id FROM users WHERE email = $1`, [ownerEmail])
  const ownerId = owner.rows[0]?.id ?? null
  if (!ownerId) {
    console.warn(`No user with the email ${ownerEmail}: no survey created on the owner's account.`)
  }
  const surveys = ownerId ? [...communitySurveys, ...ownerSurveys] : communitySurveys
  const parcels = uniqueParcels(surveys)
  const created = await insertParcels(client, parcels)
  console.log(
    `Registered ${created} real IGN parcels for the demo; ${parcels.length - created} already existed and are reused as they are.`,
  )

  const versions = assignVersions(
    surveys,
    await existingVersions(
      client,
      parcels.map((parcel) => parcel.parcelId),
    ),
  )
  surveys.forEach((survey, index) => {
    survey.version = versions[index]
  })

  const memberIds = await insertMembers(client)
  for (const survey of communitySurveys) {
    await insertSurvey(client, survey, memberIds[survey.member])
  }
  console.log(
    `Created ${memberIds.length} demo members and ${communitySurveys.length} finished public surveys.`,
  )
  if (ownerId) {
    for (const survey of ownerSurveys) await insertSurvey(client, survey, ownerId)
    console.log(`Created ${ownerSurveys.length} surveys on the account ${ownerEmail}.`)
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const remove = process.argv.includes("--remove")
  const count = Number(argValue("count", DEFAULT_COUNT))
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`--count must be a positive integer (got ${argValue("count", "")}).`)
  }
  const ownerEmail = argValue("owner-email", DEFAULT_OWNER_EMAIL)

  // Resolve every parcel before touching the database: an IGN failure writes nothing.
  const prepared = remove ? null : await prepare(count)
  if (dryRun) {
    if (remove) {
      console.log("Dry run: --remove would delete the demo users, surveys and parcels.")
      return
    }
    const sites = [...prepared.community, ...prepared.owner]
    printSummary(sites, prepared.resolved, [...prepared.communitySurveys, ...prepared.ownerSurveys])
    const versions = assignVersions([...prepared.communitySurveys, ...prepared.ownerSurveys])
    const parcels = uniqueParcels([...prepared.communitySurveys, ...prepared.ownerSurveys])
    console.log(
      `Dry run, nothing written: ${MEMBERS.length} members, ${prepared.communitySurveys.length} ` +
        `community surveys and ${prepared.ownerSurveys.length} surveys for ${ownerEmail} ` +
        `(if that account exists) on ${parcels.length} real parcels; highest version on a parcel ` +
        `${Math.max(0, ...versions.filter((v) => v !== null))} (existing surveys not counted).`,
    )
    return
  }

  const client = connect()
  await client.connect()
  try {
    await client.query("BEGIN")
    await removeDemo(client)
    if (!remove) {
      if (process.argv.includes("--wipe-all")) await wipeAllSurveys(client)
      await seed(client, prepared, ownerEmail)
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
