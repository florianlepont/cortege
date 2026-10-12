import { isWeatherSkyCode, type SurveyWeather, type WeatherSkyCode } from "@cortege/ibp-domain"
import type { Ionicons } from "@expo/vector-icons"
import { formatWeatherLine, formatWeatherNumber, weatherCardMention } from "../../../app/weather"
import { fr } from "../../../i18n"
import { weatherRowEntries, type WeatherRow } from "./weather-rows"

const t = fr.conditions
const s = t.summary

type Glyph = keyof typeof Ionicons.glyphMap

/** The glyph of each sky, one outline glyph per code (UI-SPEC 3.1). */
export const SKY_GLYPHS: Record<WeatherSkyCode, Glyph> = {
  clear: "sunny-outline",
  partly_cloudy: "partly-sunny-outline",
  cloudy: "cloudy-outline",
  overcast: "cloud-outline",
  fog: "reorder-two-outline",
  rain: "rainy-outline",
  thunderstorm: "thunderstorm-outline",
  snow: "snow-outline",
}

/** Without a sky a card still has a glyph: the neutral one of the invitation. */
export const NEUTRAL_GLYPH: Glyph = "cloud-outline"
export const OFFLINE_GLYPH: Glyph = "cloud-offline-outline"

/** The three measurements shown as columns (wind, rain over 24 h, time). */
export type StatKey = "wind" | "rain" | "time"
const STAT_KEYS: readonly string[] = ["wind", "rain", "time"] satisfies readonly StatKey[]

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

export type WeatherCardModel = {
  sky: WeatherSkyCode | null
  temperature: number | null
  /** The wind, rain and time rows that exist. */
  stats: (WeatherRow & { key: StatKey })[]
  /** "Nuageux, 14 °C, vent 12 km/h, ..." */
  line: string | null
  /** "Météo-France" while the provider's values are shown. */
  mention: string | null
  /** Something to show beyond the invitation: a sky, a temperature or a column. */
  hasContent: boolean
}

/** What a weather card draws, read once from the stored weather (shared by both pages). */
export function weatherCardModel(weather: SurveyWeather | null | undefined): WeatherCardModel {
  const sky = weather && isWeatherSkyCode(weather.sky) ? weather.sky : null
  const temperature = finite(weather?.temperature_c) ? weather.temperature_c : null
  const stats = weatherRowEntries(weather, { sky: false }).filter(
    (entry): entry is WeatherRow & { key: StatKey } => STAT_KEYS.includes(entry.key),
  )
  return {
    sky,
    temperature,
    stats,
    line: formatWeatherLine(weather),
    mention: weatherCardMention(weather),
    hasContent: temperature !== null || sky !== null || stats.length > 0,
  }
}

/**
 * "vent 12 km/h, pluie 2 mm sur 24 h": the secondary line of the compact card, wind and rain only
 * (the time is on the Contexte page). Null when neither exists.
 */
export function weatherDetailLine(weather: SurveyWeather | null | undefined): string | null {
  const parts: string[] = []
  if (finite(weather?.wind_kmh)) {
    parts.push(t.weather.parts.wind(formatWeatherNumber(weather.wind_kmh)))
  }
  if (finite(weather?.rain_24h_mm)) {
    parts.push(t.weather.parts.rain(formatWeatherNumber(weather.rain_24h_mm)))
  }
  return parts.length > 0 ? t.weather.parts.line(parts) : null
}

/** "Ouvrir la météo du relevé. {what the card says}" (UI-SPEC 3.1, accessibility). */
export function areaAccessibilityLabel(input: {
  line: string | null
  mention: string | null
  loading: boolean
  offline: boolean
  tooOld?: boolean
  hasContent: boolean
}): string {
  if (input.line !== null) {
    return input.mention !== null
      ? s.openWithLineSource(input.line, input.mention)
      : s.openWithLine(input.line)
  }
  if (input.hasContent) return s.open
  if (input.tooOld) return s.openWithLine(s.compactTooOld)
  if (input.loading) return s.openWithLine(s.loading)
  return s.openWithLine(input.offline ? s.offlineBody : s.emptyBody)
}
