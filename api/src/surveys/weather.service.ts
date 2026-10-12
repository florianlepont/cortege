import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { LRUCache } from "lru-cache"
import { WEATHER_LOOKBACK_MS, type WeatherResponse } from "@cortege/ibp-domain"
import { appConfigOf } from "../config/app-config"
import type { AppConfig } from "../config/config.types"
import {
  WEATHER_PROVIDER_TOKEN,
  type SynopReport,
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

/** The SYNOP station chosen for a lookup, as a station reading for the merge (D-29). */
type SynopLookup = {
  entry: { station: RankedStation; reading: WeatherReading } | null
  anyInCap: boolean
}

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
    const point = { lat: input.lat, lng: input.lng }
    const ranked = rankStations(stations, point, this.settings.maxStationDistanceKm, MAX_STATIONS)
    // D-29: a provider with a SYNOP lookup also gives the sky and the rain over 24 h, from the
    // nearest SYNOP station within its own cap. Without one, the hourly readings give all four.
    const readSynop = provider.readSynopReports?.bind(provider)
    if (ranked.length === 0 && readSynop === undefined) {
      return { observation: null, reason: "no_station" }
    }

    const requested = new Date(at)
    const hour = nearestUtcHour(requested)
    const hourIso = hour.toISOString()
    const isCurrentHour = hour.getTime() >= nearestUtcHour(new Date(now)).getTime()
    const ttlOf = (empty: boolean): number =>
      empty
        ? WEATHER_EMPTY_TTL_MS
        : isCurrentHour
          ? WEATHER_CURRENT_HOUR_TTL_MS
          : WEATHER_PAST_HOUR_TTL_MS

    let synop: SynopLookup = { entry: null, anyInCap: false }
    if (readSynop !== undefined) {
      const reports = await this.shared<SynopReport[]>(
        `synop:${hourIso}`,
        (value) => ttlOf(value.length === 0),
        () => this.callProvider("synop", () => readSynop(hour)),
      )
      synop = this.nearestSynop(reports, point, requested)
      if (ranked.length === 0 && !synop.anyInCap) {
        return { observation: null, reason: "no_station" }
      }
    }
    const synopEntries = synop.entry === null ? [] : [synop.entry]

    const entries: Array<{ station: RankedStation; reading: WeatherReading }> = []
    for (const station of ranked) {
      const reading = await this.shared<WeatherReading | null>(
        `reading:${station.id}:${hourIso}`,
        (value) => ttlOf(value === null),
        () => this.callProvider("reading", () => provider.readHourly(station.id, hour)),
      )
      // Pitfall 6: a reading whose own time is too far from the survey time is not its weather.
      if (
        reading !== null &&
        isWithinTolerance(reading.observed_at, requested, this.settings.timeToleranceMinutes)
      ) {
        entries.push({ station, reading })
        const merged = mergeStationReadings([...entries, ...synopEntries])
        // With a SYNOP lookup the hourly readings can only add temperature and wind (they never
        // carry sky or 24 h rain), so more stations are asked only while one of those is missing.
        if (
          merged !== null &&
          merged.temperature_c !== null &&
          merged.wind_kmh !== null &&
          (readSynop !== undefined || (merged.sky !== null && merged.rain_24h_mm !== null))
        ) {
          return { observation: merged }
        }
      }
    }

    const observation = mergeStationReadings([...entries, ...synopEntries])
    return observation === null ? { observation: null, reason: "no_data" } : { observation }
  }

  /**
   * The SYNOP report to use (D-29): the nearest SYNOP station within its own cap whose report is
   * inside the time tolerance. `anyInCap` tells whether any SYNOP station is within the cap at all
   * (the difference between `no_station` and `no_data`). Nulls stay null: a nearer station that
   * lacks the sky is not replaced by a farther one.
   */
  private nearestSynop(
    reports: readonly SynopReport[],
    point: { lat: number; lng: number },
    requested: Date,
  ): SynopLookup {
    const cap = this.settings.synopMaxDistanceKm
    const anyInCap =
      rankStations(
        reports.map((report) => report.station),
        point,
        cap,
        1,
      ).length > 0
    const usable = reports.filter((report) =>
      isWithinTolerance(report.observed_at, requested, this.settings.timeToleranceMinutes),
    )
    const nearest = rankStations(
      usable.map((report) => report.station),
      point,
      cap,
      1,
    )[0]
    const report =
      nearest === undefined ? undefined : usable.find((r) => r.station.id === nearest.id)
    if (nearest === undefined || report === undefined) {
      return { entry: null, anyInCap }
    }
    return {
      anyInCap,
      entry: {
        station: nearest,
        reading: {
          observed_at: report.observed_at,
          temperature_c: null,
          wind_kmh: null,
          rain_24h_mm: report.rain_24h_mm,
          sky: report.sky,
        },
      },
    }
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
