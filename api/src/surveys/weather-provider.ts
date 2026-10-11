import { Logger } from "@nestjs/common"
import { WEATHER_SKY_CODES, type WeatherSkyCode } from "@cortege/ibp-domain"
import type { AppConfig } from "../config/config.types"

// The weather provider seam (D-08, D-19, D-22). The service only knows this interface; the
// Météo-France implementation plugs in through `createWeatherProvider` in plan 27-12, once the
// owner's spike has fixed the real field names and units. Providers convert to app units.

export type WeatherStation = { id: string; name: string | null; lat: number; lng: number }

/** One hourly reading of one station, already in app units (degrees C, km/h, mm). */
export type WeatherReading = {
  observed_at: string
  temperature_c: number | null
  wind_kmh: number | null
  rain_24h_mm: number | null
  sky: WeatherSkyCode | null
}

export interface WeatherProvider {
  listStations(): Promise<WeatherStation[]>
  readHourly(stationId: string, hourUtc: Date): Promise<WeatherReading | null>
}

export const WEATHER_PROVIDER_TOKEN = Symbol("WEATHER_PROVIDER")

// About a dozen stations spread over mainland France. Stable ids so a cache key means the same
// thing on every run. Coordinates are plain places, not real station data.
const SYNTHETIC_STATIONS: readonly WeatherStation[] = [
  { id: "SYN-001", name: "Synthetic Lille", lat: 50.57, lng: 3.1 },
  { id: "SYN-002", name: "Synthetic Rouen", lat: 49.38, lng: 1.18 },
  { id: "SYN-003", name: "Synthetic Brest", lat: 48.44, lng: -4.42 },
  { id: "SYN-004", name: "Synthetic Strasbourg", lat: 48.55, lng: 7.64 },
  { id: "SYN-005", name: "Synthetic Fontainebleau", lat: 48.4, lng: 2.7 },
  { id: "SYN-006", name: "Synthetic Nantes", lat: 47.15, lng: -1.61 },
  { id: "SYN-007", name: "Synthetic Dijon", lat: 47.27, lng: 5.09 },
  { id: "SYN-008", name: "Synthetic Limoges", lat: 45.86, lng: 1.18 },
  { id: "SYN-009", name: "Synthetic Lyon", lat: 45.73, lng: 5.08 },
  { id: "SYN-010", name: "Synthetic Bordeaux", lat: 44.83, lng: -0.7 },
  { id: "SYN-011", name: "Synthetic Toulouse", lat: 43.62, lng: 1.38 },
  { id: "SYN-012", name: "Synthetic Marseille", lat: 43.44, lng: 5.22 },
]

/** FNV-1a on a string, unsigned 32 bit: a small stable hash, no randomness. */
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value
}

/**
 * Deterministic provider with no network (D-22): the same station and hour always give the same
 * reading. Local development and every test use it; production refuses it (plan 27-04).
 */
export class SyntheticWeatherProvider implements WeatherProvider {
  async listStations(): Promise<WeatherStation[]> {
    return SYNTHETIC_STATIONS.map((station) => ({ ...station }))
  }

  async readHourly(stationId: string, hourUtc: Date): Promise<WeatherReading | null> {
    const hour = hourUtc.toISOString()
    const seed = hash(`${stationId}|${hour}`)
    // Temperature -5.0 to 29.9, wind 0 to 59.9, rain 0 to 19.9, all inside WEATHER_RANGES.
    const temperature = ((seed % 350) - 50) / 10
    const wind = (Math.floor(seed / 350) % 600) / 10
    const rain = (Math.floor(seed / 210000) % 200) / 10
    return {
      observed_at: hour,
      temperature_c: temperature,
      wind_kmh: wind,
      rain_24h_mm: rain,
      sky: WEATHER_SKY_CODES[Math.floor(seed / 42000000) % WEATHER_SKY_CODES.length],
    }
  }
}

const logger = new Logger("WeatherProvider")
let meteoFranceNoticeLogged = false

/**
 * The provider for the configured mode: null for `off`, the synthetic provider for `synthetic`.
 * The `meteofrance` case is filled by plan 27-12, built on the spike's fixtures (D-22); until
 * then it returns null (the service answers `disabled`) and says so once.
 */
export function createWeatherProvider(config: AppConfig["weather"]): WeatherProvider | null {
  switch (config.provider) {
    case "synthetic":
      return new SyntheticWeatherProvider()
    case "meteofrance":
      if (!meteoFranceNoticeLogged) {
        meteoFranceNoticeLogged = true
        logger.warn("WEATHER_PROVIDER=meteofrance needs the Météo-France provider of plan 27-12")
      }
      return null
    case "off":
    default:
      return null
  }
}
