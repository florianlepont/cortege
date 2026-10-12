import {
  WEATHER_EDITABLE_KEYS,
  WEATHER_LOOKBACK_MS,
  WEATHER_RANGES,
  isWeatherSkyCode,
  type SurveyWeather,
  type WeatherEditableKey,
  type WeatherObservation,
} from "@cortege/ibp-domain"
import { fr } from "../i18n"

// The single place for the app's weather rules (phase 27: D-08 to D-11, D-20, D-21, D-26 and
// UI-SPEC U-02, U-03, U-10). Pure: no React Native, no storage. The prefill hook, the Conditions
// section, the summary card and the PDF all read through these functions.
//
// The server never normalises (research Pitfall 4): a replayed body must compare equal to the
// stored copy, so rounding to one decimal, ordering of `edited` and the shape of the object are
// fixed here, before a weather is written to the draft (`canonicalWeather`).

/** The seven states of the weather status line (UI-SPEC 1.3). None of them is an error. */
export type WeatherViewState =
  | "noParcel"
  | "loading"
  | "prefilled"
  | "edited"
  | "manual"
  | "offline"
  | "unavailable"

/** Where the shown values come from, for the read-only source line. */
export type WeatherProvenance = "prefilled" | "edited" | "manual"

/** The three numbers an observer can type, with their wire keys. */
export type WeatherNumberKey = "temperature_c" | "wind_kmh" | "rain_24h_mm"

/** The four values shown to the reader (the observation time is shown apart). */
const VALUE_KEYS = ["sky", "temperature_c", "wind_kmh", "rain_24h_mm"] as const

const EDITED_KEY_SET: ReadonlySet<string> = new Set<string>(WEATHER_EDITABLE_KEYS)

/** Rounds to one decimal, half away from zero (`toFixed` behaviour), never returning -0. */
function roundOneDecimal(value: number): number {
  const rounded = (Math.sign(value) * Math.round(Math.abs(value) * 10)) / 10
  return rounded + 0
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? roundOneDecimal(value) : null
}

function editedOf(weather: SurveyWeather | null | undefined): readonly WeatherEditableKey[] {
  return weather?.edited ?? []
}

function orderedEdited(edited: readonly unknown[] | undefined): WeatherEditableKey[] {
  const wanted = new Set(edited ?? [])
  return WEATHER_EDITABLE_KEYS.filter((key) => wanted.has(key) && EDITED_KEY_SET.has(key))
}

/** 14.5 gives "14,5", 12 gives "12": one decimal at most, the French comma. */
export function formatWeatherNumber(value: number): string {
  return String(roundOneDecimal(value)).replace(".", ",")
}

/**
 * The values that exist on one line: sky label, temperature, wind, rain (UI-SPEC 3.1). A missing
 * value is skipped, an unknown stored sky code is skipped too (never shown wrong). Null when
 * nothing is left to show.
 */
export function formatWeatherLine(weather: SurveyWeather | null | undefined): string | null {
  if (!weather) return null
  const parts: string[] = []
  if (isWeatherSkyCode(weather.sky)) parts.push(fr.conditions.sky[weather.sky])
  const temperature = finiteOrNull(weather.temperature_c)
  if (temperature !== null)
    parts.push(fr.conditions.weather.parts.temperature(formatWeatherNumber(temperature)))
  const wind = finiteOrNull(weather.wind_kmh)
  if (wind !== null) parts.push(fr.conditions.weather.parts.wind(formatWeatherNumber(wind)))
  const rain = finiteOrNull(weather.rain_24h_mm)
  if (rain !== null) parts.push(fr.conditions.weather.parts.rain(formatWeatherNumber(rain)))
  return parts.length > 0 ? fr.conditions.weather.parts.line(parts) : null
}

const pad2 = (value: number) => String(value).padStart(2, "0")

/** The local "HH:mm" of an ISO timestamp, null for null or an unreadable value. */
export function formatObservationTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** The local "dd/mm/yyyy" of an ISO timestamp, null for null or an unreadable value. */
export function formatObservationDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`
}

/** The date and time of a measurement, as the data licence asks them next to the source (D-31). */
export type ObservationStamp = { date: string; time: string }

/**
 * The local date and time of the provider's measurement, read from `observed_at` only (the
 * survey's request time is not the date of the data). Null when it is missing or unreadable: the
 * source line then stays without a date.
 */
export function observationStamp(
  weather: SurveyWeather | null | undefined,
): ObservationStamp | null {
  const date = formatObservationDate(weather?.observed_at)
  const time = formatObservationTime(weather?.observed_at)
  return date !== null && time !== null ? { date, time } : null
}

/** "1430", "14:30", "14h30", " 9:05 " read as "HH:mm" (U-10); null when it is not a time of day. */
export function parseObservationTimeInput(text: string): string | null {
  const match = /^(\d{1,2})[:hH]?(\d{2})$/.exec(text.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${pad2(hours)}:${pad2(minutes)}`
}

/**
 * The ISO timestamp for a typed "HH:mm" on the local calendar date of `base` (the survey date).
 * Without a readable base, today. Null when the time itself is not valid.
 */
export function withObservationTime(base: string | null | undefined, time: string): string | null {
  const parsed = parseObservationTimeInput(time)
  if (!parsed) return null
  const parsedBase = base ? new Date(base) : new Date()
  const date = Number.isNaN(parsedBase.getTime()) ? new Date() : parsedBase
  const [hours, minutes] = parsed.split(":").map(Number)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

/**
 * A typed weather number: comma or point, one decimal, inside the shared range. An empty text
 * clears the value (`null`); anything else outside the range, or not a number, is a "range" error
 * and is never written to the draft.
 */
export function parseWeatherValueInput(
  key: WeatherNumberKey,
  text: string,
): { value: number | null } | { error: "range" } {
  const trimmed = text.trim()
  if (trimmed.length === 0) return { value: null }
  if (!/^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(trimmed)) return { error: "range" }
  // The pattern above guarantees a finite number once the French comma is a point.
  const value = roundOneDecimal(Number(trimmed.replace(",", ".")))
  const { min, max } = WEATHER_RANGES[key]
  return value >= min && value <= max ? { value } : { error: "range" }
}

/** True when the sky or at least one of the three numbers has a value. */
export function hasWeatherValues(weather: SurveyWeather | null | undefined): boolean {
  if (!weather) return false
  return VALUE_KEYS.some((key) => weather[key] !== null && weather[key] !== undefined)
}

/**
 * True exactly when at least one shown value is still the provider's: the source is the
 * provider and a non-empty value of the four is not listed in `edited` (D-26). The line "Source :
 * Météo-France" follows the data.
 */
export function showsProviderAttribution(weather: SurveyWeather | null | undefined): boolean {
  if (!weather || weather.source !== "meteo_france") return false
  const edited = editedOf(weather)
  return VALUE_KEYS.some(
    (key) => !edited.includes(key) && weather[key] !== null && weather[key] !== undefined,
  )
}

/**
 * The attribution line under the weather values: "Source : Météo-France, mesure du dd/mm/yyyy à
 * HH:mm" (D-26, D-31: the licence asks for the source and the date of the data). Null when no
 * shown value is the provider's (`showsProviderAttribution`); without a readable `observed_at` it
 * is "Source : Météo-France" alone. When the observer edited some values but not all, it ends with
 * "certaines valeurs modifiées par l'observateur" (D-31).
 */
export function weatherSourceLine(weather: SurveyWeather | null | undefined): string | null {
  if (!showsProviderAttribution(weather)) return null
  const stamp = observationStamp(weather)
  const t = fr.conditions.weather
  // Some provider values are shown beside values the observer changed: say so (D-31, no alteration).
  if (editedOf(weather).length > 0) return stamp ? t.sourceMixedDated(stamp) : t.sourceMixed
  return stamp ? t.sourceDated(stamp) : t.source
}

/**
 * Where the shown values come from. Null when there is nothing to show. A weather that the
 * provider filled and the observer then touched is "edited".
 */
export function weatherProvenance(
  weather: SurveyWeather | null | undefined,
): WeatherProvenance | null {
  if (!weather || !hasWeatherValues(weather)) return null
  if (weather.source === "meteo_france") {
    return editedOf(weather).length > 0 ? "edited" : "prefilled"
  }
  return "manual"
}

/**
 * Merges a provider answer into the stored weather, value by value (D-10, U-02): a value is
 * filled only when it is still empty and not listed in `edited`. A touched or cleared value is
 * never replaced, a present value is kept. Numbers are rounded to one decimal, an unknown sky
 * code is dropped. The result is marked as provider-answered whatever it filled, so the catch-up
 * stops asking even when the provider never gives the sky (D-21).
 */
export function mergeWeatherObservation(
  current: SurveyWeather | null | undefined,
  observation: WeatherObservation,
): SurveyWeather {
  const edited = editedOf(current)
  const keep = <T>(key: WeatherEditableKey, stored: T | null | undefined, answer: T | null) =>
    edited.includes(key) || (stored !== null && stored !== undefined) ? (stored ?? null) : answer

  const merged: SurveyWeather = {
    sky: keep("sky", current?.sky, isWeatherSkyCode(observation.sky) ? observation.sky : null),
    temperature_c: keep(
      "temperature_c",
      current?.temperature_c,
      finiteOrNull(observation.temperature_c),
    ),
    wind_kmh: keep("wind_kmh", current?.wind_kmh, finiteOrNull(observation.wind_kmh)),
    rain_24h_mm: keep("rain_24h_mm", current?.rain_24h_mm, finiteOrNull(observation.rain_24h_mm)),
    observed_at: keep("observed_at", current?.observed_at, observation.observed_at),
    source: "meteo_france",
  }
  if (current?.requested_at !== undefined) merged.requested_at = current.requested_at
  const keptEdited = orderedEdited(current?.edited)
  if (keptEdited.length > 0) merged.edited = keptEdited
  return merged
}

/**
 * The observer sets or clears one value: the key joins `edited` (canonical order, no duplicate),
 * numbers are rounded, an unknown sky code or a wrong type becomes a clearing. The source becomes
 * "manual" only when it was not already "meteo_france".
 */
export function editWeatherValue(
  current: SurveyWeather | null | undefined,
  key: WeatherEditableKey,
  value: string | number | null,
): SurveyWeather {
  const next: SurveyWeather = { ...current }
  switch (key) {
    case "sky":
      next.sky = isWeatherSkyCode(value) ? value : null
      break
    case "observed_at":
      next.observed_at = typeof value === "string" && value.length > 0 ? value : null
      break
    default:
      next[key] = typeof value === "number" ? finiteOrNull(value) : null
  }
  next.edited = orderedEdited([...editedOf(current), key])
  if (current?.source !== "meteo_france") next.source = "manual"
  return next
}

/**
 * "Remplir à nouveau" (U-03): every value and the edited list are cleared, `requested_at` is kept
 * so the lookup is still for the survey's time.
 */
export function resetWeatherForRefill(current: SurveyWeather | null | undefined): SurveyWeather {
  const reset: SurveyWeather = {}
  if (current?.requested_at !== undefined) reset.requested_at = current.requested_at
  reset.edited = []
  return reset
}

/**
 * The form a weather takes in the payload: fixed key order, numbers rounded to one decimal,
 * `edited` deduplicated, ordered and omitted when empty, undefined keys dropped, explicit nulls
 * kept (a cleared value is not an absent one). Null when there is no request time and no value.
 */
export function canonicalWeather(weather: SurveyWeather | null | undefined): SurveyWeather | null {
  if (!weather) return null
  const out: SurveyWeather = {}
  if (weather.sky !== undefined) out.sky = weather.sky
  for (const key of ["temperature_c", "wind_kmh", "rain_24h_mm"] as const) {
    if (weather[key] !== undefined) out[key] = finiteOrNull(weather[key])
  }
  if (weather.observed_at !== undefined) out.observed_at = weather.observed_at
  if (weather.requested_at !== undefined) out.requested_at = weather.requested_at
  if (weather.source !== undefined) out.source = weather.source
  const edited = orderedEdited(weather.edited)
  if (edited.length > 0) out.edited = edited

  const hasValue = WEATHER_EDITABLE_KEYS.some((key) => out[key] !== null && out[key] !== undefined)
  if (!out.requested_at && !hasValue) return null
  return out
}

/**
 * Whether a draft still needs a provider lookup (D-11, D-20): no provider answer has been merged,
 * at least one editable value is untouched, and the survey time is at most 24 h old.
 */
export function needsWeatherLookup(
  weather: SurveyWeather | null | undefined,
  now: Date | number,
): boolean {
  if (!weather?.requested_at) return false
  if (weather.source === "meteo_france") return false
  const requestedAt = new Date(weather.requested_at).getTime()
  if (Number.isNaN(requestedAt)) return false
  const nowMs = typeof now === "number" ? now : now.getTime()
  if (nowMs - requestedAt > WEATHER_LOOKBACK_MS) return false
  const edited = editedOf(weather)
  return WEATHER_EDITABLE_KEYS.some((key) => !edited.includes(key))
}

/**
 * The one state of the weather status line (UI-SPEC 1.3). Values on screen decide first (prefilled,
 * edited, manual), because they must never be hidden by a request or a lost connection. Without
 * values: no parcel, then offline, then loading while a request is in flight, else unavailable
 * (a provider that is down, has nothing for that point and time, or a lookup still to come). The
 * `unavailable` input is the hook's last outcome; the three no-value states above it already
 * cover every case, so it does not change the result.
 */
export function weatherViewState(input: {
  hasParcel: boolean
  online: boolean
  inFlight: boolean
  unavailable: boolean
  weather: SurveyWeather | null | undefined
}): WeatherViewState {
  const provenance = weatherProvenance(input.weather)
  if (provenance) return provenance
  // The observer cleared every value the provider had given: still their weather, still refillable.
  if (input.weather?.source === "meteo_france" && editedOf(input.weather).length > 0) {
    return "edited"
  }
  if (!input.hasParcel) return "noParcel"
  if (!input.online) return "offline"
  if (input.inFlight) return "loading"
  return "unavailable"
}

/** Four decimals (about 10 m): all the position the Cortege API needs to find a station. */
export function roundWeatherCoordinate(value: number): number {
  return Math.round(value * 10000) / 10000
}
