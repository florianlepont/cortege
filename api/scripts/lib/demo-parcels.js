/**
 * Real IGN parcels for the demo seed (seed-demo-community.js): every demo survey sits on parcels
 * of the IGN cadastre (Parcellaire Express, the WFS the API already reads for the Explorer), so
 * the Explorer colours them by score, the survey map zooms on them and the parcel history and
 * parcel picker behave as with a field survey.
 *
 * The pure parts (points, parsing, picking, registration rows, versions, removal decision) are
 * unit-tested in api/test/seed-demo-parcels.spec.ts. Parsing reuses the API's own helpers from
 * the compiled API (api/dist; the unit tests map them to api/src), so a parcel is registered with
 * exactly the commune, section and number the Explorer keys the IGN polygons by.
 */

// Same defaults and overrides as api/src/config/app-config.ts (cadastre).
const DEFAULT_WFS_URL = "https://data.geopf.fr/wfs/ows"
const DEFAULT_WFS_TYPENAME = "CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle"
// A batch script can wait longer than an API request (2500 ms there) when the variable is unset.
const DEFAULT_SEED_TIMEOUT_MS = 10000
// Features asked for per point: the bbox is about 130 m by 130 m, a few dozen parcels at most.
const WFS_FEATURE_COUNT = 100

/** The parcel source written on the rows the seed creates; `--remove` takes them away. */
const DEMO_PARCEL_SOURCE = "demo"

// The IGN parcel identifier: commune 5 digits, prefix 3, section 2, number 4 (94080000AB0012).
// Same shape as IDU_PATTERN in surveys-normalize.utils.ts.
const IDU_SHAPE = /^\d{5}\d{3}[0-9A-Z]{2}\d{4}$/

// Half size of the bbox asked around a point, in degrees (about 130 m at 46 N).
const BBOX_HALF = { lat: 0.0006, lng: 0.0009 }
// How far a site point may fall from its place, in degrees (about 1.7 km by 1.5 km).
const SITE_SPREAD = { lat: 0.015, lng: 0.02 }
// Each retry moves the point by up to this much more, in degrees (about 400 m per attempt).
const RETRY_STEP = 0.004

let helpersCache = null

/**
 * The API's own parcel helpers, from the compiled API (`npm --workspace api run build`; the image
 * has it). The unit tests map this path to api/src.
 */
function apiHelpers() {
  if (helpersCache) return helpersCache
  let normalize
  let cadastre
  try {
    normalize = require("../../dist/surveys/surveys-normalize.utils")
    cadastre = require("../../dist/surveys/cadastre-provider.service")
  } catch (error) {
    throw new Error(
      `The compiled API is missing (api/dist): run "npm --workspace api run build" first (${error.message}).`,
    )
  }
  helpersCache = {
    parseParcelIdentifier: normalize.parseParcelIdentifier,
    parseWfsParcelProperties: cadastre.parseWfsParcelProperties,
    geometryCenter: cadastre.geometryCenter,
  }
  return helpersCache
}

/** WFS URL, type name and timeout, with the API's environment variables. */
function cadastreSettings(env = process.env) {
  const timeout = Math.trunc(Number(env.CADASTRE_PROVIDER_TIMEOUT_MS))
  return {
    wfsUrl: env.CADASTRE_IGN_WFS_URL || DEFAULT_WFS_URL,
    wfsTypename: env.CADASTRE_IGN_WFS_TYPENAME || DEFAULT_WFS_TYPENAME,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_SEED_TIMEOUT_MS,
  }
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

const round6 = (value) => Number(value.toFixed(6))

/** The first point of a site: near its place, drawn from the site's own seeded random. */
function sitePoint(place, random) {
  const [, lat, lng, options] = place
  const spread = options?.spread ?? 1
  return {
    lat: round6(lat + (random() - 0.5) * 2 * SITE_SPREAD.lat * spread),
    lng: round6(lng + (random() - 0.5) * 2 * SITE_SPREAD.lng * spread),
  }
}

/**
 * The point of retry `attempt` (1, 2, ...): further from the first point at each attempt, scaled
 * by the site's `spread`.
 */
function retryPoint(base, attempt, random, spread = 1) {
  return {
    lat: round6(base.lat + (random() - 0.5) * 2 * RETRY_STEP * attempt * spread),
    lng: round6(base.lng + (random() - 0.5) * 2 * RETRY_STEP * attempt * spread),
  }
}

function bboxAround(point, scale = 1) {
  return {
    minLng: point.lng - BBOX_HALF.lng * scale,
    minLat: point.lat - BBOX_HALF.lat * scale,
    maxLng: point.lng + BBOX_HALF.lng * scale,
    maxLat: point.lat + BBOX_HALF.lat * scale,
  }
}

/**
 * The WFS GetFeature URL of the parcels around a point (`scale` widens the area), built like
 * fetchWfsTile in the API.
 */
function wfsUrlAround(settings, point, scale = 1) {
  const bounds = bboxAround(point, scale)
  const url = new URL(settings.wfsUrl)
  url.searchParams.set("service", "WFS")
  url.searchParams.set("version", "2.0.0")
  url.searchParams.set("request", "GetFeature")
  url.searchParams.set("typeNames", settings.wfsTypename)
  url.searchParams.set(
    "bbox",
    `${bounds.minLng.toFixed(6)},${bounds.minLat.toFixed(6)},${bounds.maxLng.toFixed(6)},${bounds.maxLat.toFixed(6)},EPSG:4326`,
  )
  url.searchParams.set("outputFormat", "application/json")
  url.searchParams.set("count", String(WFS_FEATURE_COUNT))
  return url
}

const asRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {}

/**
 * The usable parcels of a WFS answer. A feature is kept only when it has an IDU and the key the
 * Explorer gives its polygon (parseWfsParcelProperties) is the key the app registers for that id
 * (parseParcelIdentifier): then the registered row and the drawn polygon always match, Paris,
 * Lyon and Marseille arrondissements and Alsace-Moselle numbered sections included. Centroid:
 * geometryCenter, 6 decimals.
 */
function parseWfsParcels(payload, helpers = apiHelpers()) {
  const features = Array.isArray(asRecord(payload).features) ? payload.features : []
  const parcels = []
  const seen = new Set()
  for (const raw of features) {
    const feature = asRecord(raw)
    const properties = asRecord(feature.properties)
    const geometry = asRecord(feature.geometry)
    if (
      (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") ||
      !Array.isArray(geometry.coordinates)
    ) {
      continue
    }
    const idu = typeof properties.idu === "string" ? properties.idu.trim().toUpperCase() : ""
    if (!IDU_SHAPE.test(idu) || seen.has(idu)) continue
    const key = helpers.parseWfsParcelProperties(properties)
    const parsed = helpers.parseParcelIdentifier(idu)
    if (
      !key ||
      key.parcel_id !== idu ||
      parsed.communeCode !== key.commune_code ||
      parsed.section !== key.section ||
      parsed.number !== key.number
    ) {
      continue
    }
    const { commune_code: communeCode, section, number } = key
    const centre = helpers.geometryCenter(geometry)
    if (!centre) continue
    seen.add(idu)
    const area = Number(properties.contenance)
    parcels.push({
      parcelId: idu,
      communeCode,
      section,
      number,
      communeName: typeof properties.nom_com === "string" ? properties.nom_com : null,
      areaM2: Number.isFinite(area) && area > 0 ? area : null,
      centroid: { lat: round6(centre.lat), lng: round6(centre.lng) },
      geometry,
    })
  }
  return parcels
}

/** Ray casting on one ring of [lng, lat] positions. */
function ringContains(ring, point) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > point.lat !== yj > point.lat) {
      const x = ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
      if (point.lng < x) inside = !inside
    }
  }
  return inside
}

/** True when a Polygon or MultiPolygon (outer ring minus its holes) contains the point. */
function geometryContains(geometry, point) {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : []
  return polygons.some(
    (rings) =>
      Array.isArray(rings) &&
      rings.length > 0 &&
      ringContains(rings[0], point) &&
      !rings.slice(1).some((hole) => ringContains(hole, point)),
  )
}

function distance2(a, b) {
  // Longitude degrees shrink with latitude: scale them so "nearest" means nearest on the ground.
  const scale = Math.cos((a.lat * Math.PI) / 180)
  return ((a.lng - b.lng) * scale) ** 2 + (a.lat - b.lat) ** 2
}

/**
 * The parcels of one site: the parcel under the point (else the nearest one), then up to
 * `wanted - 1` neighbours, nearest first, those of the same commune before the others. Parcels
 * already used by another site (`usedIds`) are skipped, so two sites never share a parcel; with
 * `commune`, only parcels whose commune code starts with it are taken.
 */
function pickSiteParcels(parcels, point, wanted, usedIds = new Set(), commune = null) {
  const candidates = parcels.filter(
    (parcel) =>
      !usedIds.has(parcel.parcelId) && (!commune || parcel.communeCode.startsWith(commune)),
  )
  if (candidates.length === 0 || wanted < 1) return []
  const byDistance = (from) => (a, b) =>
    distance2(from, a.centroid) - distance2(from, b.centroid) ||
    a.parcelId.localeCompare(b.parcelId)
  const anchor =
    candidates.find((parcel) => geometryContains(parcel.geometry, point)) ??
    [...candidates].sort(byDistance(point))[0]
  const others = candidates
    .filter((parcel) => parcel !== anchor)
    .sort(
      (a, b) =>
        Number(b.communeCode === anchor.communeCode) -
          Number(a.communeCode === anchor.communeCode) || byDistance(anchor.centroid)(a, b),
    )
  return [anchor, ...others.slice(0, wanted - 1)]
}

/** The centre of a set of parcels: the average of their centroids, as LINKED_PARCELS_CENTRE_SQL. */
function centreOf(parcels) {
  const sum = parcels.reduce(
    (acc, parcel) => ({ lat: acc.lat + parcel.centroid.lat, lng: acc.lng + parcel.centroid.lng }),
    { lat: 0, lng: 0 },
  )
  return { lat: round6(sum.lat / parcels.length), lng: round6(sum.lng / parcels.length) }
}

/**
 * The parcels row the seed writes for a real parcel, with the conventions of the app's
 * registration (ParcelsService): parcel_id is the IDU, commune 5 digits, section letters only,
 * number on 4 digits, a centroid at 6 decimals, the IGN geometry. Only `source` differs ("demo"),
 * so `--remove` can find the rows the seed created; no code of the API reads `parcels.source`.
 * Written with ON CONFLICT (parcel_id) DO NOTHING: a parcel already registered is reused as is.
 */
function parcelRegistrationRow(parcel) {
  return {
    parcel_id: parcel.parcelId,
    commune_code: parcel.communeCode,
    section: parcel.section,
    number: parcel.number,
    geometry: parcel.geometry,
    centroid: parcel.centroid,
    area_m2: parcel.areaM2,
    source: DEMO_PARCEL_SOURCE,
  }
}

/** True for an IGN parcel id; the 12.1 demo parcels (DEMO0001...) are not. */
function isRealIdu(parcelId) {
  return typeof parcelId === "string" && IDU_SHAPE.test(parcelId)
}

/**
 * Which "demo" parcels `--remove` deletes. `rows` are the parcels with source "demo", each with
 * `shared`: true when a survey that is not a demo survey links it (survey_parcels or the legacy
 * surveys.parcel_id). Shared parcels are kept: real usage relies on them.
 */
function planDemoParcelRemoval(rows) {
  const remove = []
  const keptShared = []
  let legacyRemoved = 0
  for (const row of rows) {
    if (row.shared) {
      keptShared.push(row.parcel_id)
      continue
    }
    remove.push(row.parcel_id)
    if (!isRealIdu(row.parcel_id)) legacyRemoved += 1
  }
  return { remove, keptShared, legacyRemoved }
}

/**
 * Version numbers of the finished surveys, with the app's rule (ParcelsService): a survey's
 * version is the next version of its parcels, the highest finished version already on any of
 * them plus one, counted in date order. `existingMax` holds the versions already in the database
 * (none in a dry run). Returns one entry per survey, null for a draft.
 */
function assignVersions(surveys, existingMax = new Map()) {
  const current = new Map(existingMax)
  const order = surveys
    .map((survey, index) => ({ survey, index }))
    .filter(({ survey }) => survey.status === "submitted")
    .sort((a, b) => a.survey.when - b.survey.when || a.index - b.index)
  const versions = surveys.map(() => null)
  for (const { survey, index } of order) {
    const version = 1 + Math.max(0, ...survey.parcelIds.map((id) => current.get(id) ?? 0))
    for (const id of survey.parcelIds) current.set(id, version)
    versions[index] = version
  }
  return versions
}

/** One IGN call with the per-request timeout; the body is awaited inside the timeout. */
async function fetchJson(url, timeoutMs) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.json()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Resolves every site to real parcels, one request at a time with a pause between requests
 * (polite to the IGN). A site whose point gives no usable parcel, or whose request fails, is
 * retried at points further away; after `maxAttempts` it is listed in `failures`. Sites are
 * resolved in order, so the same run picks the same parcels.
 *
 * `sites`: [{ key, label, point, wanted, random }]. Returns { resolved: Map key -> parcels,
 * failures: [{ label, reason }] }.
 */
async function resolveSites(sites, options = {}) {
  const settings = options.settings ?? cadastreSettings()
  const fetchImpl = options.fetchJson ?? fetchJson
  const wait = options.sleep ?? sleep
  const delayMs = options.delayMs ?? 250
  const maxAttempts = options.maxAttempts ?? 8
  const helpers = options.helpers ?? apiHelpers()
  const log = options.log ?? (() => {})
  const resolved = new Map()
  const failures = []
  const used = new Set(options.usedIds ?? [])
  let first = true
  for (const site of sites) {
    let reason = "no parcel"
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const point =
        attempt === 0 ? site.point : retryPoint(site.point, attempt, site.random, site.spread ?? 1)
      if (!first) await wait(delayMs * (reason.startsWith("HTTP") ? 4 : 1))
      first = false
      let payload
      try {
        payload = await fetchImpl(
          wfsUrlAround(settings, point, site.search ?? 1),
          settings.timeoutMs,
        )
      } catch (error) {
        reason = error instanceof Error ? error.message : String(error)
        log(`  ${site.label}: attempt ${attempt + 1} failed (${reason})`)
        continue
      }
      const picked = pickSiteParcels(
        parseWfsParcels(payload, helpers),
        point,
        site.wanted,
        used,
        site.commune ?? null,
      )
      if (picked.length === 0) {
        const found = Array.isArray(asRecord(payload).features) ? payload.features.length : 0
        reason =
          found > 0
            ? `${found} parcels found, none usable (no IGN id, other commune or already used)`
            : "no parcel at this point"
        log(`  ${site.label}: attempt ${attempt + 1}, ${reason}`)
        continue
      }
      for (const parcel of picked) used.add(parcel.parcelId)
      resolved.set(site.key, picked)
      break
    }
    if (!resolved.has(site.key)) failures.push({ label: site.label, reason })
  }
  return { resolved, failures }
}

module.exports = {
  DEMO_PARCEL_SOURCE,
  IDU_SHAPE,
  apiHelpers,
  assignVersions,
  bboxAround,
  cadastreSettings,
  centreOf,
  geometryContains,
  isRealIdu,
  makeRandom,
  parcelRegistrationRow,
  parseWfsParcels,
  pickSiteParcels,
  planDemoParcelRemoval,
  resolveSites,
  retryPoint,
  sitePoint,
  wfsUrlAround,
}
