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

/** A draft whose weather waits for a lookup: it has a survey time (`requested_at`). */
export type WeatherCandidate = {
  id: string
  parcel_ids: string[]
  weather: SurveyWeather
}

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
 * The drafts that carry a survey time for the weather, `{ id, parcel_ids, weather }`, for the
 * catch-up. SQL keeps only draft rows whose payload has a text `weather.requested_at`; only those
 * rows are parsed in JS, and a row whose payload is not a survey payload is skipped, never thrown.
 */
export async function listWeatherCandidates(): Promise<WeatherCandidate[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ id: string; payload_json: string }>(
    `SELECT id, payload_json
     FROM local_surveys
     WHERE status = 'draft'
       AND json_valid(payload_json)
       AND json_type(payload_json, '$.weather.requested_at') = 'text'
     ORDER BY updated_at DESC`,
  )
  const candidates: WeatherCandidate[] = []
  for (const row of rows) {
    const payload = safeParseJson(row.payload_json)
    if (!isSurveyQueuePayload(payload)) continue
    const weather = payload.weather
    if (!weather || typeof weather.requested_at !== "string") continue
    candidates.push({
      id: row.id,
      parcel_ids: normalizeParcelIds(payload.parcel_ids),
      weather,
    })
  }
  return candidates
}
