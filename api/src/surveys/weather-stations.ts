import {
  WEATHER_RANGES,
  isWeatherSkyCode,
  type WeatherObservation,
  type WeatherSkyCode,
} from "@cortege/ibp-domain"
import type { WeatherReading, WeatherStation } from "./weather-provider"

// Pure station logic of the weather lookup (D-08, D-19; research Pitfall 6 and "Don't Hand-Roll"):
// no Nest import, no network, nothing to mock. The service composes these.

const EARTH_RADIUS_KM = 6371
const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

export type Point = { lat: number; lng: number }

export type RankedStation = WeatherStation & { distance_km: number }

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Great-circle distance between two points on a 6371 km sphere. */
export function haversineKm(a: Point, b: Point): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** One decimal, and never a negative zero (so equality and JSON stay clean). */
export function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10 + 0
}

/**
 * The stations within `maxKm` of `point`, nearest first, at most `limit` (D-19). The distance
 * is kept to one decimal; the order and the cap use the exact distance.
 */
export function rankStations(
  stations: readonly WeatherStation[],
  point: Point,
  maxKm: number,
  limit: number,
): RankedStation[] {
  return stations
    .map((station) => ({ station, exact: haversineKm(point, station) }))
    .filter((entry) => entry.exact <= maxKm)
    .sort((left, right) => left.exact - right.exact)
    .slice(0, limit)
    .map((entry) => ({ ...entry.station, distance_km: roundOneDecimal(entry.exact) }))
}

/** The UTC hour closest to `at` (half an hour rounds up). */
export function nearestUtcHour(at: Date): Date {
  return new Date(Math.round(at.getTime() / HOUR_MS) * HOUR_MS)
}

/**
 * True when the reading's own time (`validityIso`) is within `toleranceMinutes` of `at`. A reading
 * farther away, or with an unreadable time, must be ignored, never stored as the weather of the
 * survey (Pitfall 6, T-27-21).
 */
export function isWithinTolerance(
  validityIso: string,
  at: Date,
  toleranceMinutes: number,
): boolean {
  const validity = Date.parse(validityIso)
  if (!Number.isFinite(validity)) {
    return false
  }
  return Math.abs(validity - at.getTime()) <= toleranceMinutes * MINUTE_MS
}

type Range = { min: number; max: number }

/** A finite number inside its range, rounded to one decimal; anything else is no value. */
function inRange(value: number | null, range: Range): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null
  }
  const rounded = roundOneDecimal(value)
  return rounded >= range.min && rounded <= range.max ? rounded : null
}

type Merged = {
  sky: WeatherSkyCode | null
  temperature_c: number | null
  wind_kmh: number | null
  rain_24h_mm: number | null
}

/**
 * Merges the readings of the ranked stations value by value, in distance order: each value comes
 * from the nearest station that has a usable one. `observed_at` and `station` are those of the
 * nearest station that contributed any value. Null when no station gave a value.
 */
export function mergeStationReadings(
  entries: ReadonlyArray<{ station: RankedStation; reading: WeatherReading }>,
): WeatherObservation | null {
  const merged: Merged = { sky: null, temperature_c: null, wind_kmh: null, rain_24h_mm: null }
  let contributor: { station: RankedStation; reading: WeatherReading } | null = null

  for (const entry of entries) {
    const { reading } = entry
    let contributed = false
    const temperature =
      merged.temperature_c ?? inRange(reading.temperature_c, WEATHER_RANGES.temperature_c)
    const wind = merged.wind_kmh ?? inRange(reading.wind_kmh, WEATHER_RANGES.wind_kmh)
    const rain = merged.rain_24h_mm ?? inRange(reading.rain_24h_mm, WEATHER_RANGES.rain_24h_mm)
    const sky = merged.sky ?? (isWeatherSkyCode(reading.sky) ? reading.sky : null)
    if (merged.temperature_c === null && temperature !== null) contributed = true
    if (merged.wind_kmh === null && wind !== null) contributed = true
    if (merged.rain_24h_mm === null && rain !== null) contributed = true
    if (merged.sky === null && sky !== null) contributed = true
    merged.temperature_c = temperature
    merged.wind_kmh = wind
    merged.rain_24h_mm = rain
    merged.sky = sky
    if (contributed && contributor === null) {
      contributor = entry
    }
  }

  if (contributor === null) {
    return null
  }
  return {
    sky: merged.sky,
    temperature_c: merged.temperature_c,
    wind_kmh: merged.wind_kmh,
    rain_24h_mm: merged.rain_24h_mm,
    observed_at: contributor.reading.observed_at,
    source: "meteo_france",
    station: {
      id: contributor.station.id,
      name: contributor.station.name,
      distance_km: contributor.station.distance_km,
    },
  }
}
