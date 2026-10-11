// Meteo-France observation API capture script (phase 27, D-22).
//
// OWNER-RUN ONLY. Claude never runs this with a credential. The owner runs it once, in plan
// 27-22, from the repo root:
//
//   node --env-file=api/.env api/scripts/meteofrance-spike.mjs [--base=<url>]
//
// What it captures (the facts plan 27-12 needs to map the real provider):
//   1. liste-stations: the 15 nearest stations to three forest test points (Fontainebleau,
//      Vosges near Gerardmer, Landes near Mimizan), with id, name, position, altitude, distance.
//   2. station/horaire for the nearest station of each point, for a recent hour (the accepted
//      date parameter name is recorded).
//   3. station/horaire for the first point 30 hours ago, to see the retention behaviour (D-20).
//   4. A SYNOP sample (at most 10 stations), to see whether it carries the sky (D-21).
//   5. The rate-limit headers, if the portal sends any.
//
// The credential comes from METEOFRANCE_API_KEY (environment only). It is never printed,
// logged or written: it only goes into the request header, and every file text is compared to it
// (and to the token of the application-id flow) in memory before writing (exit 2 on a match).
// Error messages carry a label and an HTTP status, nothing else. The files written under
// api/test/fixtures/meteofrance/ carry no secret. The provider code (plan 27-12) reads those
// fixtures, never this script.
//
// Node 22 built-ins only: global fetch, AbortSignal, node:fs/promises, node:path.
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const DEFAULT_BASE = "https://public-api.meteofrance.fr/public/DPObs/v2"
const TOKEN_URL = "https://portail-api.meteofrance.fr/token"
const TIMEOUT_MS = 15000
const FIXTURES_DIR = path.resolve(process.cwd(), "api/test/fixtures/meteofrance")
const NEAREST_COUNT = 15
const SYNOP_MAX = 10

const TEST_POINTS = [
  { label: "Fontainebleau", lat: 48.4, lng: 2.7 },
  { label: "Vosges (Gerardmer)", lat: 48.07, lng: 6.87 },
  { label: "Landes (Mimizan)", lat: 44.2, lng: -1.23 },
]

const credential = process.env.METEOFRANCE_API_KEY
if (typeof credential !== "string" || credential.trim() === "") {
  console.error("METEOFRANCE_API_KEY is not set: add it to api/.env first")
  process.exit(1)
}

const baseArg = process.argv.find((arg) => arg.startsWith("--base="))
const base = (baseArg ? baseArg.slice("--base=".length) : DEFAULT_BASE).replace(/\/+$/, "")

// The only places the credential and the token live: these two module variables.
let authMode = null
let bearerToken = null
const secrets = [credential.trim()]
const rateLimitHeaders = new Map()

function requestHeaders() {
  if (authMode === "application-id") {
    return { Authorization: `Bearer ${bearerToken}` }
  }
  return { apikey: credential.trim() }
}

function recordRateLimit(headers) {
  for (const [name, value] of headers.entries()) {
    const lower = name.toLowerCase()
    if (lower.startsWith("x-ratelimit") || lower.startsWith("ratelimit")) {
      rateLimitHeaders.set(lower, value)
    }
  }
}

/** One GET. Prints "label: HTTP status, bytes" only; never the URL, the body or a header. */
async function call(label, endpoint, params) {
  const url = new URL(`${base}/${endpoint}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }
  let response
  let text = ""
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, text/csv;q=0.8, */*;q=0.5", ...requestHeaders() },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    text = await response.text()
  } catch {
    console.log(`${label}: no answer (network error or timeout)`)
    return { status: 0, text: "", bytes: 0 }
  }
  recordRateLimit(response.headers)
  const bytes = Buffer.byteLength(text)
  console.log(`${label}: HTTP ${response.status}, ${bytes} bytes`)
  return { status: response.status, text, bytes }
}

/** Application-id flow: the value is an application id, exchanged for a bearer token. */
async function requestToken() {
  let response
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credential.trim()}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const raw = await response.text()
    console.log(`token request: HTTP ${response.status}, ${Buffer.byteLength(raw)} bytes`)
    if (!response.ok) {
      return false
    }
    const parsed = JSON.parse(raw)
    if (typeof parsed?.access_token !== "string" || parsed.access_token === "") {
      console.log("token request: the answer carries no access token")
      return false
    }
    bearerToken = parsed.access_token
    secrets.push(bearerToken)
    return true
  } catch {
    console.log("token request: no usable answer")
    return false
  }
}

function tryJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Minimal CSV reader (delimiter `;` or `,`, double quotes), enough for a station list. */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "")
  if (lines.length < 2) {
    return []
  }
  const delimiter =
    (lines[0].match(/;/g) ?? []).length >= (lines[0].match(/,/g) ?? []).length ? ";" : ","
  const split = (line) => {
    const cells = []
    let cell = ""
    let quoted = false
    for (const char of line) {
      if (char === '"') {
        quoted = !quoted
      } else if (char === delimiter && !quoted) {
        cells.push(cell)
        cell = ""
      } else {
        cell += char
      }
    }
    cells.push(cell)
    return cells.map((value) => value.trim())
  }
  const header = split(lines[0])
  return lines.slice(1).map((line) => {
    const cells = split(line)
    return Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ""]))
  })
}

/** Rows of a JSON answer: a bare array, or the first array found one level down. */
function jsonRows(value) {
  if (Array.isArray(value)) {
    return value
  }
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) {
      if (Array.isArray(inner)) {
        return inner
      }
    }
  }
  return []
}

function pick(row, candidates) {
  const lowered = new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]))
  for (const candidate of candidates) {
    if (lowered.has(candidate) && lowered.get(candidate) !== "" && lowered.get(candidate) != null) {
      return lowered.get(candidate)
    }
  }
  return null
}

function toNumber(value) {
  if (value === null) {
    return null
  }
  const number = Number(String(value).replace(",", "."))
  return Number.isFinite(number) ? number : null
}

/** Great-circle distance in km (haversine). */
function distanceKm(aLat, aLng, bLat, bLng) {
  const rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad
  const dLng = (bLng - aLng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h))
}

function normaliseStation(row) {
  const id = pick(row, ["id_station", "id", "geo_id_insee", "numer_sta", "station_id"])
  const lat = toNumber(pick(row, ["latitude", "lat"]))
  const lng = toNumber(pick(row, ["longitude", "lon", "lng", "long"]))
  if (id === null || lat === null || lng === null) {
    return null
  }
  return {
    // Kept as a string: ids have leading zeros.
    id: String(id),
    name: pick(row, ["nom_usuel", "nom", "name", "nom_station"]),
    latitude: lat,
    longitude: lng,
    altitude: toNumber(pick(row, ["altitude", "alt", "elevation"])),
  }
}

function roundHourUtc(date) {
  const rounded = new Date(date)
  rounded.setUTCMinutes(0, 0, 0)
  return rounded
}

function isoInstant(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z")
}

async function writeFixture(name, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`
  for (const secret of secrets) {
    if (text.includes(secret)) {
      console.error(`Refusing to write ${name}: its text contains a secret`)
      process.exit(2)
    }
  }
  await mkdir(FIXTURES_DIR, { recursive: true })
  await writeFile(path.join(FIXTURES_DIR, name), text, "utf8")
  console.log(`wrote api/test/fixtures/meteofrance/${name}`)
}

async function main() {
  const capturedAt = new Date()

  // Step 1: station list, with the authentication mode decided on its first call.
  authMode = "apikey"
  let listing = await call("liste-stations (format=json)", "liste-stations", { format: "json" })
  if (listing.status === 401 || listing.status === 403) {
    console.log("apikey header refused, trying the application-id token flow")
    if (!(await requestToken())) {
      console.error("Authentication failed in both modes. Check the credential in api/.env")
      process.exit(1)
    }
    authMode = "application-id"
    listing = await call("liste-stations (format=json)", "liste-stations", { format: "json" })
  }
  console.log(`auth mode: ${authMode}`)

  let stationRows = []
  let listingFormat = "json"
  if (listing.status === 200) {
    stationRows = jsonRows(tryJson(listing.text))
  }
  if (stationRows.length === 0) {
    listing = await call("liste-stations (format=csv)", "liste-stations", { format: "csv" })
    listingFormat = "csv"
    if (listing.status === 200) {
      stationRows = parseCsv(listing.text)
    }
  }
  const stations = stationRows.map(normaliseStation).filter((station) => station !== null)
  if (stations.length === 0) {
    console.error("liste-stations: no station could be read, nothing to capture")
    process.exit(1)
  }
  const columns = stationRows.length > 0 ? Object.keys(stationRows[0]) : []

  const points = TEST_POINTS.map((point) => ({
    label: point.label,
    lat: point.lat,
    lng: point.lng,
    nearest: stations
      .map((station) => ({
        ...station,
        distance_km:
          Math.round(distanceKm(point.lat, point.lng, station.latitude, station.longitude) * 100) /
          100,
      }))
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, NEAREST_COUNT),
  }))
  await writeFixture("liste-stations.excerpt.json", {
    captured_at: isoInstant(capturedAt),
    format: listingFormat,
    total_station_count: stations.length,
    columns,
    points,
  })

  // Step 2: a recent hour, for the nearest station of each point. The date parameter name is
  // not documented in the text we could read: try `date`, then `datetime`, keep the first 200.
  const recentInstant = new Date(roundHourUtc(capturedAt).getTime() - 2 * 3600 * 1000)
  const requestedRecent = isoInstant(recentInstant)
  let dateParameter = null
  const recentResponses = []
  for (const point of points) {
    const station = point.nearest[0]
    let answered = null
    const names = dateParameter ? [dateParameter] : ["date", "datetime"]
    for (const name of names) {
      const result = await call(`station/horaire ${point.label} (${name})`, "station/horaire", {
        id_station: station.id,
        [name]: requestedRecent,
        format: "json",
      })
      if (result.status === 200) {
        dateParameter = name
        answered = result
        break
      }
    }
    recentResponses.push({
      station_id: station.id,
      body: answered ? (tryJson(answered.text) ?? answered.text) : null,
    })
  }
  await writeFixture("station-horaire.recent.json", {
    captured_at: isoInstant(capturedAt),
    date_parameter: dateParameter,
    requested_at: requestedRecent,
    responses: recentResponses,
  })

  // Step 3: 30 hours ago (past the 24 h retention), first point, to see what the API returns.
  const oldInstant = new Date(roundHourUtc(capturedAt).getTime() - 30 * 3600 * 1000)
  const requestedOld = isoInstant(oldInstant)
  const firstStation = points[0].nearest[0]
  const oldResult = await call("station/horaire 30 h ago", "station/horaire", {
    id_station: firstStation.id,
    [dateParameter ?? "date"]: requestedOld,
    format: "json",
  })
  await writeFixture("station-horaire.old.json", {
    captured_at: isoInstant(capturedAt),
    date_parameter: dateParameter,
    requested_at: requestedOld,
    http_status: oldResult.status,
    responses: [
      {
        station_id: firstStation.id,
        body: oldResult.status === 200 ? (tryJson(oldResult.text) ?? oldResult.text) : null,
      },
    ],
  })

  // Step 4: SYNOP sample (does it carry the sky?). A 404 means the path differs: skip.
  const synop = await call("synop", "synop", { format: "json" })
  if (synop.status === 200) {
    const rows = jsonRows(tryJson(synop.text))
    const near = rows.filter((row) => {
      const lat = toNumber(pick(row, ["latitude", "lat"]))
      const lng = toNumber(pick(row, ["longitude", "lon", "lng", "long"]))
      return (
        lat !== null &&
        lng !== null &&
        TEST_POINTS.some((point) => distanceKm(point.lat, point.lng, lat, lng) < 150)
      )
    })
    await writeFixture("synop.sample.json", {
      captured_at: isoInstant(capturedAt),
      row_count: rows.length,
      sample: (near.length > 0 ? near : rows).slice(0, SYNOP_MAX),
    })
  } else {
    console.log("synop: not captured (path absent or refused), skipped")
  }

  // Step 5: rate-limit headers, names and values only.
  if (rateLimitHeaders.size === 0) {
    console.log("rate-limit headers: none sent")
  } else {
    for (const [name, value] of rateLimitHeaders) {
      console.log(`rate-limit header ${name}: ${value}`)
    }
  }

  console.log("Run: npx prettier --write api/test/fixtures/meteofrance")
}

await main()
