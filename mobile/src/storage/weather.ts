import type { SurveyWeather } from "@cortege/ibp-domain"
import { getDb } from "./db"
import { isSurveyQueuePayload, normalizeParcelIds, safeParseJson } from "./utils"

// Phase 27 (D-10, D-11): the weather lookup point of a survey is the parcel centre the selection
// map had in hand. It is kept on the phone only, so the catch-up can ask for the weather later
// (a draft chosen offline, a lookup that failed). Convenience data in the local_meta key/value
// table (no migration, SCHEMA_VERSION stays 5), never synced, and deleted by clearLocalIbpData so
// the next account on the phone never sees it. Best-effort like parcel-history-cache.ts: a storage
// failure never breaks the survey flow (worst case, the weather stays empty).
export const WEATHER_POINT_KEY_PREFIX = "weather_point:"

export type WeatherPoint = { lat: number; lng: number }

/**
 * A draft whose weather waits for a lookup. Normally it has a survey time (`weather.requested_at`).
 * A draft with parcels that was never stamped (D-39) has none: it comes with its `created_at` so the
 * caller can derive the survey time (`weatherRequestTime`), and its weather may be empty.
 */
export type WeatherCandidate = {
  id: string
  parcel_ids: string[]
  weather: SurveyWeather
  created_at?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

// About 10 m: far finer than a weather station grid, so nothing useful is lost.
const roundCoordinate = (value: number): number => Math.round(value * 10000) / 10000

const weatherPointKey = (surveyId: string): string => `${WEATHER_POINT_KEY_PREFIX}${surveyId}`

// A corrupt value (not JSON, wrong shape, non-finite numbers) reads as no point.
function parseWeatherPoint(raw: string | null | undefined): WeatherPoint | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    const { lat, lng } = parsed as Record<string, unknown>
    if (typeof lat !== "number" || typeof lng !== "number") return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

export async function saveWeatherPoint(surveyId: string, point: WeatherPoint): Promise<void> {
  try {
    const db = await getDb()
    const value: WeatherPoint = { lat: roundCoordinate(point.lat), lng: roundCoordinate(point.lng) }
    await db.runAsync(
      `INSERT INTO local_meta (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [weatherPointKey(surveyId), JSON.stringify(value), new Date().toISOString()],
    )
  } catch {
    // Best-effort: without the point the weather simply stays empty for this survey.
  }
}

export async function loadWeatherPoint(surveyId: string): Promise<WeatherPoint | null> {
  try {
    const db = await getDb()
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM local_meta WHERE key = ?`,
      [weatherPointKey(surveyId)],
    )
    return parseWeatherPoint(row?.value)
  } catch {
    return null
  }
}

/**
 * The drafts that wait for a weather lookup, `{ id, parcel_ids, weather, created_at }`, for the
 * catch-up. SQL keeps draft rows whose payload has a text `weather.requested_at`, plus (D-39 safety
 * net) drafts that have parcels, no provider answer yet and no survey time but were created within
 * two days of `now` (the exact 24 h rule is applied by the caller; `created_at` has two formats, so
 * SQL compares only its date). Only those rows are parsed in JS, and a row whose payload is not a
 * survey payload is skipped, never thrown.
 */
export async function listWeatherCandidates(now: number = Date.now()): Promise<WeatherCandidate[]> {
  const db = await getDb()
  const oldestCreationDay = new Date(now - 2 * DAY_MS).toISOString().slice(0, 10)
  const rows = await db.getAllAsync<{ id: string; payload_json: string; created_at: string }>(
    `SELECT id, payload_json, created_at
     FROM local_surveys
     WHERE status = 'draft'
       AND json_valid(payload_json)
       AND (
         json_type(payload_json, '$.weather.requested_at') = 'text'
         OR (
           COALESCE(json_extract(payload_json, '$.weather.source'), '') <> 'meteo_france'
           AND COALESCE(json_array_length(payload_json, '$.parcel_ids'), 0) > 0
           AND substr(created_at, 1, 10) >= ?
         )
       )
     ORDER BY updated_at DESC`,
    [oldestCreationDay],
  )
  const candidates: WeatherCandidate[] = []
  for (const row of rows) {
    const payload = safeParseJson(row.payload_json)
    if (!isSurveyQueuePayload(payload)) continue
    const weather = payload.weather ?? {}
    candidates.push({
      id: row.id,
      parcel_ids: normalizeParcelIds(payload.parcel_ids),
      weather,
      created_at: row.created_at,
    })
  }
  return candidates
}
