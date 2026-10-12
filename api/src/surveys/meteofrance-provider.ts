import { WEATHER_RANGES, type WeatherSkyCode } from "@cortege/ibp-domain"
import { MeteoFranceHttp, MeteoFranceHttpError } from "./meteofrance-http"
import type {
  SynopReport,
  WeatherProvider,
  WeatherReading,
  WeatherStation,
} from "./weather-provider"
import { inRange } from "./weather-stations"

// The Météo-France provider (D-08, D-22): the observation API DPObs v2, read through
// MeteoFranceHttp and mapped to app units. Field names, units and rules come from the owner's
// spike (api/test/fixtures/meteofrance/README.md, plan 27-22), proven on its real captures.
//
// Two lookups, D-29:
//  - the HOURLY stations (`liste-stations` as CSV, `station/horaire` as JSON) give temperature
//    and wind. The hourly product has no 24 h rain and its sky field `n` was null in every
//    captured reading, so those two values are never taken from it.
//  - the SYNOP stations (`synop`, JSON, with their own position) give the sky and the rain over
//    24 h.
//
// D-21 decision (spike 2026-10): sky and rain over 24 h are PREFILLED from the nearest SYNOP
// station within its own cap (the choice of the station is the service's); the alternative of
// summing 24 hourly readings was rejected by the spike. A value the report does not hold stays
// null and the observer keeps the manual chip: nothing is invented. Wind stays on the hourly
// station (SYNOP wind as a fallback is an open owner decision, not taken here).
//
// Never forwards a raw provider object (T-27-40): every field is read defensively.

type JsonRecord = Record<string, unknown>

const KELVIN_OFFSET = 273.15
const MS_TO_KMH = 3.6
// The SYNOP window around the requested hour: SYNOP reports come every few hours, so one lies
// within 90 minutes of the hour whatever the step (the service then applies its own tolerance).
const SYNOP_WINDOW_MS = 90 * 60 * 1000
// A hourly station id is 8 digits (DDCCCNNN); this only guards what is sent to the provider.
const SAFE_STATION_ID = /^[A-Za-z0-9]{1,16}$/

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {}
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** The provider's UTC instant as `AAAA-MM-JJTHH:mm:00Z`, the format of its date parameters. */
function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z")
}

/** A position with both coordinates finite and on the globe, else no position. */
function pointOf(lat: number | null, lng: number | null): { lat: number; lng: number } | null {
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null
  }
  return { lat, lng }
}

// ---------------------------------------------------------------------------------------------
// Station list (CSV)

/** Splits one CSV line on `delimiter`, honouring double quotes. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
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

/** A coordinate cell: a number with a point or a decimal comma; anything else is no value. */
function coordinate(cell: string | undefined): number | null {
  if (cell === undefined || cell.trim() === "") {
    return null
  }
  const parsed = Number(cell.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

/** Ids are strings with leading zeros; a numeric id short of 8 digits gets its zeros back. */
function stationIdOf(cell: string | undefined): string | null {
  if (cell === undefined || cell === "") {
    return null
  }
  return /^\d{1,7}$/.test(cell) ? cell.padStart(8, "0") : cell
}

/**
 * The hourly stations of `liste-stations` (CSV only, D-30). Columns used: `Id_station`,
 * `Nom_usuel`, `Latitude`, `Longitude` (header names compared in lower case). A row with no id or
 * no finite position is skipped. Anything that is not a CSV with those columns gives no station.
 */
export function parseStationList(body: unknown): WeatherStation[] {
  if (typeof body !== "string") {
    return []
  }
  // A byte order mark is dropped by code, not by a literal in the source.
  const text = body.charCodeAt(0) === 0xfeff ? body.slice(1) : body
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "")
  if (lines.length < 2) {
    return []
  }
  const header = lines[0]
  const delimiter =
    (header.match(/;/g) ?? []).length >= (header.match(/,/g) ?? []).length ? ";" : ","
  const names = splitCsvLine(header, delimiter).map((name) => name.toLowerCase())
  const idColumn = names.indexOf("id_station")
  const nameColumn = names.indexOf("nom_usuel")
  const latColumn = names.indexOf("latitude")
  const lngColumn = names.indexOf("longitude")
  if (idColumn < 0 || latColumn < 0 || lngColumn < 0) {
    return []
  }

  const stations: WeatherStation[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter)
    const id = stationIdOf(cells[idColumn])
    const point = pointOf(coordinate(cells[latColumn]), coordinate(cells[lngColumn]))
    if (id === null || point === null) {
      continue
    }
    const name = nameColumn < 0 ? "" : (cells[nameColumn] ?? "")
    stations.push({ id, name: name === "" ? null : name, ...point })
  }
  return stations
}

// ---------------------------------------------------------------------------------------------
// Hourly reading (station/horaire)

// inRange rounds to one decimal and returns null outside the range.
function kelvinToCelsius(kelvin: number | null): number | null {
  return kelvin === null ? null : inRange(kelvin - KELVIN_OFFSET, WEATHER_RANGES.temperature_c)
}

function metresPerSecondToKmh(speed: number | null): number | null {
  return speed === null ? null : inRange(speed * MS_TO_KMH, WEATHER_RANGES.wind_kmh)
}

/** Distance in ms between a row's own time and `hourUtc` (0 without a reference time). */
function gapMs(validity: number, hourUtc: Date | undefined): number {
  return hourUtc === undefined ? 0 : Math.abs(validity - hourUtc.getTime())
}

/**
 * One reading of a `station/horaire` answer (a JSON array with one object per hour): `t` in
 * Kelvin to degrees C and `ff` in m/s to km/h, each rounded to one decimal and dropped when it
 * falls outside `WEATHER_RANGES` (a value in the wrong unit becomes null, not a wrong number).
 * `observed_at` is the row's own `validity_time`. Sky and rain over 24 h are not read here (D-21,
 * see the top of this file). When several rows come back, the one nearest `hourUtc` wins.
 * Null for an empty or unreadable answer.
 */
export function parseHourlyReading(body: unknown, hourUtc?: Date): WeatherReading | null {
  if (!Array.isArray(body)) {
    return null
  }
  let best: { row: JsonRecord; observedAt: string; gap: number } | null = null
  for (const item of body) {
    const row = asRecord(item)
    const observedAt = asString(row.validity_time)
    const validity = observedAt === null ? Number.NaN : Date.parse(observedAt)
    if (observedAt === null || !Number.isFinite(validity)) {
      continue
    }
    const gap = gapMs(validity, hourUtc)
    if (best === null || gap < best.gap) {
      best = { row, observedAt, gap }
    }
  }
  if (best === null) {
    return null
  }
  return {
    observed_at: best.observedAt,
    temperature_c: kelvinToCelsius(finite(best.row.t)),
    wind_kmh: metresPerSecondToKmh(finite(best.row.ff)),
    rain_24h_mm: null,
    sky: null,
  }
}

// ---------------------------------------------------------------------------------------------
// SYNOP (sky and rain over 24 h)

// Present weather `ww`, WMO code table 4677 (research A10). Groups that say what the sky is doing
// now; every other code (00-39, 87-90 hail showers, past-hour codes) says nothing usable and the
// cloud cover `n` decides.
//   thunderstorm: 17 (thunder heard, no rain at the station), 95-99
//   snow:         70-79 (snow), 85-86 (snow showers), 93-94 (snow or hail with a past thunderstorm)
//   rain:         50-69 (drizzle, rain, rain and snow mixed), 80-84 (showers), 91-92
//   fog:          41-49 (fog or ice fog at the station; 40 is fog at a distance, not here)
function skyFromPresentWeather(ww: number): WeatherSkyCode | null {
  if (ww === 17 || (ww >= 95 && ww <= 99)) return "thunderstorm"
  if ((ww >= 70 && ww <= 79) || ww === 85 || ww === 86 || ww === 93 || ww === 94) return "snow"
  if ((ww >= 50 && ww <= 69) || (ww >= 80 && ww <= 84) || ww === 91 || ww === 92) return "rain"
  if (ww >= 41 && ww <= 49) return "fog"
  return null
}

// Total cloud cover `n` in percent, cut at the oktas boundaries (1 okta = 12.5 %):
//   0 to 25 % (0-2 oktas) clear, over 25 to 50 % (3-4) partly cloudy,
//   over 50 to 87.5 % (5-7) cloudy, over 87.5 % (8, overcast) overcast.
function skyFromCloudCover(percent: number): WeatherSkyCode | null {
  if (percent < 0 || percent > 100) return null
  if (percent <= 25) return "clear"
  if (percent <= 50) return "partly_cloudy"
  if (percent <= 87.5) return "cloudy"
  return "overcast"
}

/**
 * The app sky from a SYNOP row (D-21): a present-weather phenomenon (`ww`) wins, else the cloud
 * cover `n`. Null when neither says anything: `nbas` (the lowest layer only) is no substitute.
 * An unknown or out-of-table value is null, never a wrong label.
 */
export function skyFromSynop(ww: unknown, n: unknown): WeatherSkyCode | null {
  const code = finite(ww)
  if (code !== null && Number.isInteger(code) && code >= 0 && code <= 99) {
    const phenomenon = skyFromPresentWeather(code)
    if (phenomenon !== null) {
      return phenomenon
    }
  }
  const cover = finite(n)
  return cover === null ? null : skyFromCloudCover(cover)
}

/**
 * `rr24` in mm. A negative value is the provider's trace code (-0.1 was seen, probably "less than
 * 0.1 mm"): it is read as 0, the rain being negligible. Out of range or not a number: null.
 */
function rainOver24h(value: unknown): number | null {
  const mm = finite(value)
  if (mm === null) {
    return null
  }
  return inRange(mm < 0 ? 0 : mm, WEATHER_RANGES.rain_24h_mm)
}

function wmoIdOf(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return String(value).padStart(5, "0")
  }
  return asString(value)
}

/**
 * The reports of a `synop` answer, one per station (the one nearest `hourUtc`). Each row carries
 * its station (`geo_id_wmo`, `name`, `lat`, `lon`), so no separate SYNOP station list is read.
 * A row with no id, no finite position or no readable `validity_time` is skipped.
 */
export function parseSynopReports(body: unknown, hourUtc: Date): SynopReport[] {
  if (!Array.isArray(body)) {
    return []
  }
  const byStation = new Map<string, { report: SynopReport; gap: number }>()
  for (const item of body) {
    const row = asRecord(item)
    const id = wmoIdOf(row.geo_id_wmo)
    const point = pointOf(finite(row.lat), finite(row.lon))
    const observedAt = asString(row.validity_time)
    const validity = observedAt === null ? Number.NaN : Date.parse(observedAt)
    if (id === null || point === null || observedAt === null || !Number.isFinite(validity)) {
      continue
    }
    const gap = gapMs(validity, hourUtc)
    const known = byStation.get(id)
    if (known !== undefined && known.gap <= gap) {
      continue
    }
    byStation.set(id, {
      gap,
      report: {
        station: { id, name: asString(row.name), ...point },
        observed_at: observedAt,
        rain_24h_mm: rainOver24h(row.rr24),
        sky: skyFromSynop(row.ww, row.n),
      },
    })
  }
  return [...byStation.values()].map((entry) => entry.report)
}

// ---------------------------------------------------------------------------------------------

export class MeteoFranceWeatherProvider implements WeatherProvider {
  constructor(private readonly http: MeteoFranceHttp) {}

  /** The hourly stations. An empty list is a failure (never cached as "no station"). */
  async listStations(): Promise<WeatherStation[]> {
    const text = await this.http.getText("liste-stations", { format: "csv" }, "stations")
    const stations = parseStationList(text)
    if (stations.length === 0) {
      throw new MeteoFranceHttpError("stations", 200, "returned no station")
    }
    return stations
  }

  async readHourly(stationId: string, hourUtc: Date): Promise<WeatherReading | null> {
    // Station ids come from the provider's own list; this guard only keeps the query clean.
    if (!SAFE_STATION_ID.test(stationId)) {
      return null
    }
    const body = await this.http.getJson(
      "station/horaire",
      { id_station: stationId, date: isoSeconds(hourUtc), format: "json" },
      "hourly",
    )
    return parseHourlyReading(body, hourUtc)
  }

  /** One call for every SYNOP station, in the window around the hour (D-29). */
  async readSynopReports(hourUtc: Date): Promise<SynopReport[]> {
    const body = await this.http.getJson(
      "synop",
      {
        format: "json",
        date_debut: isoSeconds(new Date(hourUtc.getTime() - SYNOP_WINDOW_MS)),
        date_fin: isoSeconds(new Date(hourUtc.getTime() + SYNOP_WINDOW_MS)),
      },
      "synop",
    )
    return parseSynopReports(body, hourUtc)
  }
}
