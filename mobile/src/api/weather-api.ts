import type { WeatherResponse } from "@cortege/ibp-domain"
import { roundWeatherCoordinate } from "../app/weather"
import { apiRequest } from "./client"

/**
 * `GET /v1/weather` (phase 27, D-08): the only way the app gets weather. The provider key stays on
 * the server, so the app never calls a provider; it asks the Cortege API with the session token.
 *
 * `200` with `observation: null` means nothing exists for that point and time (the `reason` says
 * why): do not retry soon. A rejection (an `ApiError` 503 `weather_provider_unavailable`, a
 * timeout, no network) means retry later; the caller treats every rejection as "unavailable",
 * calmly, never as an error shown to the observer.
 *
 * Only the parcel centre, rounded to four decimals (about 10 m), leaves the phone.
 */
export async function fetchWeather(
  apiUrl: string,
  accessToken: string,
  input: { lat: number; lng: number; at: string },
): Promise<WeatherResponse> {
  const lat = roundWeatherCoordinate(input.lat)
  const lng = roundWeatherCoordinate(input.lng)
  return apiRequest<WeatherResponse>({
    baseUrl: apiUrl,
    path: `/weather?lat=${lat}&lng=${lng}&at=${encodeURIComponent(input.at)}`,
    method: "GET",
    token: accessToken,
  })
}
