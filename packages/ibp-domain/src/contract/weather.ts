// Wire types of the weather of a survey (phase 27) and of `GET /v1/weather`, shared by the API and
// the app. Types only: the bounds and the sky codes live in `../conditions`.

/** The sky of a survey, from clear to snow. Catalogue keys of the app (UI-SPEC U-09). */
export type WeatherSkyCode =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "rain"
  | "thunderstorm"
  | "snow"

/** Where the values came from: the provider lookup or the observer's own entry. */
export type WeatherSource = "meteo_france" | "manual"

/** A value the observer can edit by hand (and so the lookup must no longer overwrite, D-10). */
export type WeatherEditableKey =
  | "sky"
  | "temperature_c"
  | "wind_kmh"
  | "rain_24h_mm"
  | "observed_at"

/**
 * The weather stored with a survey, in the `weather` jsonb column (D-09). `observed_at` and
 * `requested_at` are ISO strings stored inside the jsonb, never a timestamp column, so equality is
 * by string. `requested_at` is the survey time the lookup is for (D-11). `edited` lists the values
 * the observer touched, persisted and synced so the overwrite guard survives a restart (D-10).
 * Absent or null means no value.
 */
export type SurveyWeather = {
  sky?: WeatherSkyCode | null
  temperature_c?: number | null
  wind_kmh?: number | null
  rain_24h_mm?: number | null
  observed_at?: string | null
  requested_at?: string | null
  source?: WeatherSource | null
  edited?: WeatherEditableKey[]
}

/** One observation of the nearest station, as `GET /v1/weather` returns it. */
export type WeatherObservation = {
  sky: WeatherSkyCode | null
  temperature_c: number | null
  wind_kmh: number | null
  rain_24h_mm: number | null
  observed_at: string
  source: "meteo_france"
  station: { id: string; name: string | null; distance_km: number }
}

/** Why a lookup returned no observation. */
export type WeatherNoObservationReason = "too_old" | "no_station" | "no_data" | "disabled"

/** Response of `GET /v1/weather`: the observation, or null with the reason. */
export type WeatherResponse = {
  observation: WeatherObservation | null
  reason?: WeatherNoObservationReason
}

/** Error code of `GET /v1/weather` (503) when the provider fails. */
export type WeatherErrorCode = "weather_provider_unavailable"
