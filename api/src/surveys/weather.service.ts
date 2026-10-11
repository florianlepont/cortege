import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { LRUCache } from "lru-cache"
import { WEATHER_LOOKBACK_MS, type WeatherResponse } from "@cortege/ibp-domain"
import { appConfigOf } from "../config/app-config"
import type { AppConfig } from "../config/config.types"
import {
  WEATHER_PROVIDER_TOKEN,
  type WeatherProvider,
  type WeatherReading,
  type WeatherStation,
} from "./weather-provider"
import {
  isWithinTolerance,
  mergeStationReadings,
  nearestUtcHour,
  rankStations,
  type RankedStation,
} from "./weather-stations"

// Cache and outbound protection (D-08, T-27-18). Stations change rarely: one hour. A reading of a
// finished hour is final for the whole 24 h window the provider keeps; the current hour may still
// be refined, so it lives 10 minutes; an hour with no reading is asked again after 10 minutes.
// The cache is keyed by station id and UTC hour, never by coordinates, so every member shares it.
export const WEATHER_STATIONS_TTL_MS = 60 * 60 * 1000
export const WEATHER_PAST_HOUR_TTL_MS = WEATHER_LOOKBACK_MS
export const WEATHER_CURRENT_HOUR_TTL_MS = 10 * 60 * 1000
export const WEATHER_EMPTY_TTL_MS = 10 * 60 * 1000
export const WEATHER_CACHE_MAX_ENTRIES = 2000
export const MAX_CONCURRENT_WEATHER_CALLS = 4
// D-19: the answer merges at most the three nearest stations.
const MAX_STATIONS = 3

/** What the cache stores: boxed, because a null reading is a valid, cacheable answer. */
type Boxed = { value: unknown }

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: "weather_provider_unavailable",
    message: "Weather provider unavailable",
  })
}

/** The provider's HTTP status when it exposes one, else the error's name. Never its message. */
function failureLabel(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status
    if (typeof status === "number" && Number.isFinite(status)) {
      return `status ${status}`
    }
    const name = (error as { name?: unknown }).name
    if (typeof name === "string" && name !== "") {
      return name
    }
  }
  return "error"
}

/**
 * The observed weather at a point and a time (D-08), answered from the nearest stations of the
 * configured provider (D-19) inside the last 24 hours (D-20). The app never calls the provider:
 * the credential stays here, and one shared cache protects the account quota.
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name)
  private readonly settings: AppConfig["weather"]
  // Successful answers only: a failure is never stored.
  private readonly cache = new LRUCache<string, Boxed>({ max: WEATHER_CACHE_MAX_ENTRIES })
  // Identical concurrent keys share one provider call.
  private readonly inFlight = new Map<string, Promise<unknown>>()
  private running = 0

  constructor(
    config: ConfigService,
    @Inject(WEATHER_PROVIDER_TOKEN) private readonly provider: WeatherProvider | null,
  ) {
    this.settings = appConfigOf(config).weather
  }

  async lookup(input: { lat: number; lng: number; at?: string }): Promise<WeatherResponse> {
    const now = Date.now()
    let at = input.at === undefined ? now : Date.parse(input.at)
    if (!Number.isFinite(at) || at > now) {
      // A future (or unreadable) time is the present (D-20).
      at = now
    }
    if (now - at > WEATHER_LOOKBACK_MS) {
      return { observation: null, reason: "too_old" }
    }
    const provider = this.provider
    if (provider === null) {
      return { observation: null, reason: "disabled" }
    }

    const stations = await this.shared<WeatherStation[]>(
      "stations",
      () => WEATHER_STATIONS_TTL_MS,
      () => this.callProvider("stations", () => provider.listStations()),
    )
    const ranked = rankStations(
      stations,
      { lat: input.lat, lng: input.lng },
      this.settings.maxStationDistanceKm,
      MAX_STATIONS,
    )
    if (ranked.length === 0) {
      return { observation: null, reason: "no_station" }
    }

    const requested = new Date(at)
    const hour = nearestUtcHour(requested)
    const hourIso = hour.toISOString()
    const isCurrentHour = hour.getTime() >= nearestUtcHour(new Date(now)).getTime()
    const entries: Array<{ station: RankedStation; reading: WeatherReading }> = []
    for (const station of ranked) {
      const reading = await this.shared<WeatherReading | null>(
        `reading:${station.id}:${hourIso}`,
        (value) =>
          value === null
            ? WEATHER_EMPTY_TTL_MS
            : isCurrentHour
              ? WEATHER_CURRENT_HOUR_TTL_MS
              : WEATHER_PAST_HOUR_TTL_MS,
        () => this.callProvider("reading", () => provider.readHourly(station.id, hour)),
      )
      // Pitfall 6: a reading whose own time is too far from the survey time is not its weather.
      if (
        reading !== null &&
        isWithinTolerance(reading.observed_at, requested, this.settings.timeToleranceMinutes)
      ) {
        entries.push({ station, reading })
        const merged = mergeStationReadings(entries)
        if (
          merged !== null &&
          merged.sky !== null &&
          merged.temperature_c !== null &&
          merged.wind_kmh !== null &&
          merged.rain_24h_mm !== null
        ) {
          return { observation: merged }
        }
      }
    }

    const observation = mergeStationReadings(entries)
    return observation === null ? { observation: null, reason: "no_data" } : { observation }
  }

  /** Cache hit, else the call already running for this key, else a new call (then cached). */
  private shared<T>(key: string, ttlMs: (value: T) => number, load: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    if (cached !== undefined) {
      return Promise.resolve(cached.value as T)
    }
    const running = this.inFlight.get(key)
    if (running) {
      return running as Promise<T>
    }
    const call = load()
      .then((value) => {
        this.cache.set(key, { value }, { ttl: ttlMs(value) })
        return value
      })
      .finally(() => {
        this.inFlight.delete(key)
      })
    this.inFlight.set(key, call)
    return call
  }

  /**
   * One provider call, counted against the concurrency cap and bounded by the configured timeout.
   * Any failure, the cap included, is logged with the provider status only (never the point, the
   * time, the credential or the error text, T-27-20) and becomes a 503.
   */
  private async callProvider<T>(label: string, load: () => Promise<T>): Promise<T> {
    if (this.running >= MAX_CONCURRENT_WEATHER_CALLS) {
      this.logger.warn("Weather provider failed: concurrent call cap reached")
      throw unavailable()
    }
    this.running += 1
    let timer: NodeJS.Timeout | undefined
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error("timeout"), { name: "TimeoutError" })),
          this.settings.timeoutMs,
        )
        timer.unref()
      })
      return await Promise.race([load(), timeout])
    } catch (error) {
      this.logger.warn(`Weather provider failed: ${label} ${failureLabel(error)}`)
      throw unavailable()
    } finally {
      clearTimeout(timer)
      this.running -= 1
    }
  }
}
