import {
  WEATHER_EDITABLE_KEYS,
  WEATHER_LOOKBACK_MS,
  isWeatherSkyCode,
  type SurveyWeather,
  type WeatherEditableKey,
  type WeatherObservation,
  type WeatherSkyCode,
} from "@cortege/ibp-domain"
import { fr } from "../i18n"

// The single place for the app's weather rules (phase 27: D-08 to D-11, D-20, D-21, D-26, D-37 and
// UI-SPEC U-02, U-03). Pure: no React Native, no storage. The prefill hook, the Conditions
// section, the summary card and the PDF all read through these functions.
//
// The server never normalises (research Pitfall 4): a replayed body must compare equal to the
// stored copy, so rounding to one decimal, ordering of `edited` and the shape of the object are
// fixed here, before a weather is written to the draft (`canonicalWeather`).

/**
 * The states of the weather status line (UI-SPEC 1.3, D-37). They describe the provider's
 * measurements only: the observer's sky never changes them. None of them is an error.
 */
export type WeatherViewState =
  | "noParcel"
  | "loading"
  | "prefilled"
  | "offline"
  | "unavailable"
  | "tooOld"

/** The three provider numbers, with their wire keys (read-only for the observer, D-37). */
const PROVIDER_NUMBER_KEYS = ["temperature_c", "wind_kmh", "rain_24h_mm"] as const

/** The only value the observer may edit (D-37); the wire type still allows the others. */
const OBSERVER_KEYS: readonly WeatherEditableKey[] = ["sky"]

const EDITED_KEY_SET: ReadonlySet<string> = new Set<string>(OBSERVER_KEYS)

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

/** Only "sky" can be listed (D-37): any other stored key is dropped on the next write. */
function orderedEdited(edited: readonly unknown[] | undefined): WeatherEditableKey[] {
  const wanted = new Set(edited ?? [])
  return OBSERVER_KEYS.filter((key) => wanted.has(key) && EDITED_KEY_SET.has(key))
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

/** True when the sky or at least one of the three numbers has a value. */
export function hasWeatherValues(weather: SurveyWeather | null | undefined): boolean {
  if (!weather) return false
  return (
    isWeatherSkyCode(weather.sky) ||
    PROVIDER_NUMBER_KEYS.some((key) => weather[key] !== null && weather[key] !== undefined)
  )
}

/** True when the sky shown is the observer's own: they set it, or cleared it (D-37). */
export function isObserverSky(weather: SurveyWeather | null | undefined): boolean {
  return editedOf(weather).includes("sky") && isWeatherSkyCode(weather?.sky)
}

/**
 * True exactly when at least one shown value is the provider's: the source is the provider and a
 * number, or a sky the observer did not touch, is present (D-26, D-37). The observer's own sky is
 * never Météo-France's, so a weather with only that sky shows no attribution. The line "Source :
 * Météo-France" follows the data.
 */
export function showsProviderAttribution(weather: SurveyWeather | null | undefined): boolean {
  if (!weather || weather.source !== "meteo_france") return false
  const providerSky = isWeatherSkyCode(weather.sky) && !editedOf(weather).includes("sky")
  return (
    providerSky ||
    PROVIDER_NUMBER_KEYS.some((key) => weather[key] !== null && weather[key] !== undefined)
  )
}

/**
 * The attribution line under the weather values: "Source : Météo-France, mesure du dd/mm/yyyy à
 * HH:mm" (D-26, D-31: the licence asks for the source and the date of the data). Null when no
 * shown value is the provider's (`showsProviderAttribution`); without a readable `observed_at` it
 * is "Source : Météo-France" alone. When the sky shown is the observer's it ends with
 * "conditions saisies par l'observateur" (D-37), so no value they chose is presented as the provider's (D-31).
 */
export function weatherSourceLine(weather: SurveyWeather | null | undefined): string | null {
  if (!showsProviderAttribution(weather)) return null
  const stamp = observationStamp(weather)
  const t = fr.conditions.weather
  if (isObserverSky(weather)) return stamp ? t.sourceObserverSkyDated(stamp) : t.sourceObserverSky
  return stamp ? t.sourceDated(stamp) : t.source
}

/**
 * The very short mention on the summary card (D-35, D-37): "Météo-France" while the provider's
 * values are shown, null otherwise. It is never qualified ("en partie modifiée" is gone: only the
 * sky can be changed, and that is said in the dated sentence); the dated sentence stays in
 * `weatherSourceLine`, for the detail view.
 */
export function weatherCardMention(weather: SurveyWeather | null | undefined): string | null {
  return showsProviderAttribution(weather) ? fr.conditions.summary.mention : null
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
 * The observer sets or clears the sky, the only value they can change (D-37): "sky" joins `edited`,
 * which protects the choice from a later provider answer, and an unknown code becomes a clearing.
 * The source becomes "manual" only when it was not already "meteo_france".
 */
export function editWeatherSky(
  current: SurveyWeather | null | undefined,
  sky: WeatherSkyCode | null,
): SurveyWeather {
  const next: SurveyWeather = { ...current }
  next.sky = isWeatherSkyCode(sky) ? sky : null
  next.edited = ["sky"]
  if (current?.source !== "meteo_france") next.source = "manual"
  return next
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
  // A cleared sky (listed in `edited`) is kept: it protects the choice from a later answer.
  if (!out.requested_at && !hasValue && edited.length === 0) return null
  return out
}

/**
 * Whether a draft still needs a provider lookup (D-11, D-20): no provider answer has been merged
 * and the survey time is at most 24 h old. The numbers are never edited by the observer (D-37), so
 * there is always something to fill.
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
  return nowMs - requestedAt <= WEATHER_LOOKBACK_MS
}

/**
 * Reads a creation time from either writer: the phone writes ISO ("2026-10-12T10:00:55.224Z"), a
 * pulled server row keeps the Postgres form ("2026-07-08 10:00:00+00"). Null when unreadable.
 */
function parseCreationTime(value: string | null | undefined): number | null {
  if (!value) return null
  // Fractions are cut to milliseconds: Hermes does not read the 6 digits Postgres writes.
  const iso = value
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00")
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? null : time
}

/** A creation time may lead the phone clock by this much (clock skew) and still count as now. */
const CREATION_SKEW_MS = 5 * 60 * 1000

/**
 * The survey time a draft's weather lookup is for (D-39 safety net). A stamped `requested_at` is
 * returned as it is. A draft that has parcels but was never stamped (it got its parcels by a path
 * that did not stamp it, or before phase 27) takes the time it was created, but only while that is
 * inside the 24 h window: the survey time is never invented, so an older draft gets null and no
 * lookup. The caller still applies `needsWeatherLookup` to the result.
 */
export function weatherRequestTime(
  weather: SurveyWeather | null | undefined,
  createdAt: string | null | undefined,
  now: Date | number,
): string | null {
  if (typeof weather?.requested_at === "string") return weather.requested_at
  const created = parseCreationTime(createdAt)
  if (created === null) return null
  const nowMs = typeof now === "number" ? now : now.getTime()
  if (created - nowMs > CREATION_SKEW_MS || nowMs - created > WEATHER_LOOKBACK_MS) return null
  return new Date(created).toISOString()
}

/**
 * True when the draft has no provider weather and its visit is older than the 24 h window, so no
 * lookup will ever be made for it (D-42). It is the exact complement of the prefill hook's skip
 * rule for age: the hook asks `weatherRequestTime` for the survey time and `needsWeatherLookup`
 * for the window, and this function reads the same two rules. The hook and the view must agree,
 * or the view would offer a "Réessayer" that does nothing: change the window or the survey time
 * rule in those two functions only, never here. False when a provider answer was merged, when the
 * survey time is unreadable or lies ahead of the clock (nothing can be claimed about its age), and
 * at exactly 24 h (the lookup is still allowed).
 */
export function weatherVisitTooOld(
  weather: SurveyWeather | null | undefined,
  createdAt: string | null | undefined,
  now: Date | number,
): boolean {
  if (weather?.source === "meteo_france") return false
  const requestedAt = weatherRequestTime(weather, createdAt, now)
  if (requestedAt !== null) {
    // Stamped (or derived inside the window): old only when the window rule says no more lookup.
    // An unreadable stamp is not "old", it is unknown.
    if (Number.isNaN(new Date(requestedAt).getTime())) return false
    return !needsWeatherLookup({ ...weather, requested_at: requestedAt }, now)
  }
  // No request time: either the creation time is outside the window (old) or it cannot be read or
  // leads the clock (unknown). Only a readable creation time older than the window is "too old".
  const created = parseCreationTime(createdAt)
  const nowMs = typeof now === "number" ? now : now.getTime()
  return created !== null && nowMs - created > WEATHER_LOOKBACK_MS
}

/**
 * The one state of the weather status line (UI-SPEC 1.3, D-37). The provider's measurements on
 * screen decide first ("prefilled"), because a request or a lost connection must never hide them.
 * Without them: no parcel, then offline, then loading while a request is in flight, else
 * unavailable (a provider that is down, has nothing for that point and time, or a lookup still to
 * come). The observer's sky does not change the line. The `unavailable` input is the hook's last
 * outcome; the no-measurement states above it already cover every case, so it does not change the
 * result. `visitTooOld` (`weatherVisitTooOld`, D-42) comes right after "no parcel": a visit older
 * than 24 h will never be looked up, so neither a lost connection, a request nor a retry is worth
 * announcing.
 */
export function weatherViewState(input: {
  hasParcel: boolean
  online: boolean
  inFlight: boolean
  unavailable: boolean
  visitTooOld?: boolean
  weather: SurveyWeather | null | undefined
}): WeatherViewState {
  if (showsProviderAttribution(input.weather)) return "prefilled"
  if (!input.hasParcel) return "noParcel"
  if (input.visitTooOld) return "tooOld"
  if (!input.online) return "offline"
  if (input.inFlight) return "loading"
  return "unavailable"
}

/** Four decimals (about 10 m): all the position the Cortege API needs to find a station. */
export function roundWeatherCoordinate(value: number): number {
  return Math.round(value * 10000) / 10000
}
