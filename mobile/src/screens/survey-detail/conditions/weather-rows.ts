import { isWeatherSkyCode, type SurveyWeather } from "@cortege/ibp-domain"
import { formatObservationTime, formatWeatherNumber } from "../../../app/weather"
import { fr } from "../../../i18n"

const t = fr.conditions

export type WeatherRow = {
  key: "sky" | "temperature" | "wind" | "rain" | "time"
  label: string
  value: string
  /** "Label, value": what a screen reader says for the row. */
  accessibilityLabel: string
}

const row = (key: WeatherRow["key"], label: string, value: string): WeatherRow => ({
  key,
  label,
  value,
  accessibilityLabel: `${label}, ${value}`,
})

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

/**
 * The label and value rows of the values that exist, in reading order (D-37: temperature, wind,
 * rain and the observation time are the provider's, shown read-only). The sky row is left out when
 * the sky has its own chips (`sky: false`, the Contexte page).
 */
export function weatherRowEntries(
  weather: SurveyWeather | null | undefined,
  options: { sky: boolean },
): WeatherRow[] {
  if (!weather) return []
  const rows: WeatherRow[] = []
  if (options.sky && isWeatherSkyCode(weather.sky)) {
    rows.push(row("sky", t.sky.groupLabel, t.sky[weather.sky]))
  }
  if (finite(weather.temperature_c)) {
    rows.push(
      row(
        "temperature",
        t.weather.rows.temperature,
        t.weather.values.temperature(formatWeatherNumber(weather.temperature_c)),
      ),
    )
  }
  if (finite(weather.wind_kmh)) {
    rows.push(
      row(
        "wind",
        t.weather.rows.wind,
        t.weather.values.wind(formatWeatherNumber(weather.wind_kmh)),
      ),
    )
  }
  if (finite(weather.rain_24h_mm)) {
    rows.push(
      row(
        "rain",
        t.weather.rows.rain,
        t.weather.values.rain(formatWeatherNumber(weather.rain_24h_mm)),
      ),
    )
  }
  const time = formatObservationTime(weather.observed_at)
  if (time !== null) {
    rows.push(row("time", t.weather.rows.time, time))
  }
  return rows
}
