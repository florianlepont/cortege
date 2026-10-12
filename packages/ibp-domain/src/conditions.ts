import type { FactorAnnotation, FactorAnnotations } from "./contract/survey"
import type { WeatherEditableKey, WeatherSkyCode, WeatherSource } from "./contract/weather"
import { FACTOR_KEYS } from "./factors"
import type { FactorKey } from "./factors"

// Survey conditions of phase 27: the notes, the weather and the per-factor annotations (doubt flag
// and short note). The annotations container sits at `factors.annotations`, beside the factor keys,
// so no scorer reads it (`evaluateIbp` iterates `FACTOR_KEYS` only, D-14) and a doubt-only factor
// never becomes an unreadable factor record (research Pitfall 1, D-23).

/** Longest survey note, in UTF-16 units (D-05). */
export const SURVEY_NOTE_MAX_LENGTH = 1000

/** Longest note of one factor, in UTF-16 units (D-05). */
export const FACTOR_NOTE_MAX_LENGTH = 300

/** Key of the annotations container inside `factors` (D-23). */
export const FACTOR_ANNOTATIONS_KEY = "annotations"

/** The eight sky values, in the order the app lists them (UI-SPEC U-09). */
export const WEATHER_SKY_CODES = [
  "clear",
  "partly_cloudy",
  "cloudy",
  "overcast",
  "fog",
  "rain",
  "thunderstorm",
  "snow",
] as const satisfies readonly WeatherSkyCode[]

/** Where a weather value can come from. */
export const WEATHER_SOURCES = [
  "meteo_france",
  "manual",
] as const satisfies readonly WeatherSource[]

/** The weather values an observer can edit by hand (D-10). */
export const WEATHER_EDITABLE_KEYS = [
  "sky",
  "temperature_c",
  "wind_kmh",
  "rain_24h_mm",
  "observed_at",
] as const satisfies readonly WeatherEditableKey[]

/** Numeric bounds of the weather values, shared by the API DTO and the app (UI-SPEC 1.2). */
export const WEATHER_RANGES = {
  temperature_c: { min: -40, max: 55 },
  wind_kmh: { min: 0, max: 350 },
  rain_24h_mm: { min: 0, max: 1000 },
} as const

/** The provider keeps 24 hours of observations: a survey older than this gets no lookup (D-20). */
export const WEATHER_LOOKBACK_MS = 24 * 60 * 60 * 1000

export function isWeatherSkyCode(value: unknown): value is WeatherSkyCode {
  return (WEATHER_SKY_CODES as readonly unknown[]).includes(value)
}

/**
 * The canonical text of a note: CRLF and CR become LF, trimmed, clamped to `maxLength`, trimmed
 * again; an empty note is null. The app applies it before writing so a replay compares equal
 * (research Pitfall 4); the server stores what it receives.
 */
export function normalizeNoteText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) return null
  const text = value.replace(/\r\n?/g, "\n").trim().slice(0, maxLength).trim()
  return text === "" ? null : text
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Defensive read of `factors.annotations` for display: only factor keys, only object entries; a
 * `doubt` is kept when strictly true and a `note` when it is a non-blank string (returned as
 * stored). Entries left empty are dropped.
 */
export function readFactorAnnotations(factors: unknown): FactorAnnotations {
  if (!isPlainObject(factors)) return {}
  const container = factors[FACTOR_ANNOTATIONS_KEY]
  if (!isPlainObject(container)) return {}
  const result: FactorAnnotations = {}
  for (const key of FACTOR_KEYS) {
    const entry = container[key]
    if (!isPlainObject(entry)) continue
    const annotation: FactorAnnotation = {}
    if (entry.doubt === true) annotation.doubt = true
    if (typeof entry.note === "string" && entry.note.trim() !== "") annotation.note = entry.note
    if (Object.keys(annotation).length > 0) result[key] = annotation
  }
  return result
}

/**
 * The canonical form of the annotations the app writes: `doubt` only as true, `note` through
 * `normalizeNoteText`, entries in factor order, undefined when nothing remains.
 */
export function canonicalFactorAnnotations(
  input: Partial<Record<FactorKey, { doubt?: boolean; note?: string | null }>>,
): FactorAnnotations | undefined {
  const result: FactorAnnotations = {}
  for (const key of FACTOR_KEYS) {
    const entry = input[key]
    if (!entry) continue
    const annotation: FactorAnnotation = {}
    if (entry.doubt === true) annotation.doubt = true
    const note = normalizeNoteText(entry.note, FACTOR_NOTE_MAX_LENGTH)
    if (note !== null) annotation.note = note
    if (Object.keys(annotation).length > 0) result[key] = annotation
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/** A copy of `factors` with the annotations container set, or removed when undefined. */
export function withFactorAnnotations(
  factors: Record<string, unknown>,
  annotations: FactorAnnotations | undefined,
): Record<string, unknown> {
  const copy = { ...factors }
  if (annotations === undefined) delete copy[FACTOR_ANNOTATIONS_KEY]
  else copy[FACTOR_ANNOTATIONS_KEY] = annotations
  return copy
}

const ANNOTATION_ENTRY_KEYS: readonly string[] = ["doubt", "note"]

/**
 * Shape validation of an untrusted `factors.annotations` for the API DTO. Strict on the shape (keys
 * A to J, entries `doubt` and `note` only, note capped at `FACTOR_NOTE_MAX_LENGTH`), lenient on
 * `doubt: false` so a phone bug never becomes a fatal sync error. Each issue code appears once.
 */
export function factorAnnotationsIssues(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (!isPlainObject(value)) return ["annotations_not_object"]
  const issues = new Set<string>()
  for (const [key, entry] of Object.entries(value)) {
    if (!(FACTOR_KEYS as readonly string[]).includes(key)) {
      issues.add("annotations_unknown_factor")
      continue
    }
    if (!isPlainObject(entry)) {
      issues.add("annotations_entry_not_object")
      continue
    }
    for (const entryKey of Object.keys(entry)) {
      if (!ANNOTATION_ENTRY_KEYS.includes(entryKey)) issues.add("annotations_entry_unknown_key")
    }
    if (entry.doubt !== undefined && typeof entry.doubt !== "boolean") {
      issues.add("annotations_doubt_not_boolean")
    }
    if (entry.note !== undefined) {
      if (typeof entry.note !== "string") issues.add("annotations_note_not_string")
      else if (entry.note.length > FACTOR_NOTE_MAX_LENGTH) issues.add("annotations_note_too_long")
    }
  }
  return [...issues]
}
