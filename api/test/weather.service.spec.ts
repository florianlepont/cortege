import { Logger, ServiceUnavailableException } from "@nestjs/common"
import { WEATHER_LOOKBACK_MS } from "@cortege/ibp-domain"
import { MAX_CONCURRENT_WEATHER_CALLS, WeatherService } from "../src/surveys/weather.service"
import type {
  SynopReport,
  WeatherProvider,
  WeatherReading,
  WeatherStation,
} from "../src/surveys/weather-provider"
import { nearestUtcHour } from "../src/surveys/weather-stations"
import { buildTestConfigService } from "./config-helper"

const HOUR_MS = 60 * 60 * 1000

// Fontainebleau area. Station N is about 1 km away, M about 11 km, F about 22 km.
const POINT = { lat: 48.4, lng: 2.7 }
const NEAR: WeatherStation = { id: "N", name: "Near", lat: 48.41, lng: 2.7 }
const MID: WeatherStation = { id: "M", name: "Mid", lat: 48.5, lng: 2.7 }
const FAR: WeatherStation = { id: "F", name: "Far", lat: 48.6, lng: 2.7 }
const OUTSIDE: WeatherStation = { id: "O", name: "Outside", lat: 49.4, lng: 2.7 }

function full(hour: Date): WeatherReading {
  return {
    observed_at: hour.toISOString(),
    temperature_c: 12.34,
    wind_kmh: 18.04,
    rain_24h_mm: 0.2,
    sky: "rain",
  }
}

type FakeProvider = {
  listStations: jest.Mock<Promise<WeatherStation[]>, []>
  readHourly: jest.Mock<Promise<WeatherReading | null>, [string, Date]>
}

function fakeProvider(stations: WeatherStation[] = [NEAR, MID, FAR, OUTSIDE]): FakeProvider {
  return {
    listStations: jest.fn(async () => stations),
    readHourly: jest.fn(async (_id: string, hour: Date) => full(hour)),
  }
}

function build(provider: FakeProvider | null, overrides: Record<string, string> = {}) {
  return new WeatherService(
    buildTestConfigService({ WEATHER_PROVIDER: "synthetic", ...overrides }),
    provider as unknown as WeatherProvider | null,
  )
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

async function failureOf(call: Promise<unknown>): Promise<ServiceUnavailableException> {
  try {
    await call
  } catch (error) {
    expect(error).toBeInstanceOf(ServiceUnavailableException)
    return error as ServiceUnavailableException
  }
  throw new Error("expected a ServiceUnavailableException")
}

describe("WeatherService", () => {
  let warn: jest.SpyInstance

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("windows and switches", () => {
    it("answers disabled when there is no provider and calls nothing", async () => {
      const service = build(null)
      await expect(service.lookup({ ...POINT, at: minutesAgo(30) })).resolves.toEqual({
        observation: null,
        reason: "disabled",
      })
    })

    it("answers too_old past 24 h without any provider call", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      const at = new Date(Date.now() - WEATHER_LOOKBACK_MS - HOUR_MS).toISOString()
      await expect(service.lookup({ ...POINT, at })).resolves.toEqual({
        observation: null,
        reason: "too_old",
      })
      expect(provider.listStations).not.toHaveBeenCalled()
      expect(provider.readHourly).not.toHaveBeenCalled()
    })

    it("still serves a time just inside the 24 h window", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      const at = new Date(Date.now() - WEATHER_LOOKBACK_MS + 5 * 60 * 1000).toISOString()
      const result = await service.lookup({ ...POINT, at })
      expect(result.observation).not.toBeNull()
    })

    it("treats a future time as now", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      const before = nearestUtcHour(new Date()).toISOString()
      const result = await service.lookup({
        ...POINT,
        at: new Date(Date.now() + 3 * HOUR_MS).toISOString(),
      })
      const after = nearestUtcHour(new Date()).toISOString()
      const requested = provider.readHourly.mock.calls[0][1].toISOString()
      expect([before, after]).toContain(requested)
      expect(result.observation).not.toBeNull()
    })

    it("defaults to now when no time is given", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      const result = await service.lookup(POINT)
      expect(result.observation).not.toBeNull()
    })

    it("answers no_station when nothing is within the distance cap", async () => {
      const provider = fakeProvider([OUTSIDE])
      const service = build(provider)
      await expect(service.lookup({ ...POINT, at: minutesAgo(10) })).resolves.toEqual({
        observation: null,
        reason: "no_station",
      })
      expect(provider.readHourly).not.toHaveBeenCalled()
    })

    it("follows the configured distance cap", async () => {
      const provider = fakeProvider([MID])
      const service = build(provider, { WEATHER_MAX_STATION_DISTANCE_KM: "5" })
      await expect(service.lookup({ ...POINT, at: minutesAgo(10) })).resolves.toEqual({
        observation: null,
        reason: "no_station",
      })
    })

    it("answers no_data when every reading is null or outside the tolerance", async () => {
      const provider = fakeProvider([NEAR, MID])
      provider.readHourly.mockImplementation(async (id: string, hour: Date) =>
        id === "N"
          ? null
          : { ...full(hour), observed_at: new Date(hour.getTime() - 5 * HOUR_MS).toISOString() },
      )
      const service = build(provider)
      await expect(service.lookup({ ...POINT, at: minutesAgo(10) })).resolves.toEqual({
        observation: null,
        reason: "no_data",
      })
    })

    it("ignores a reading whose own time is beyond the tolerance (Pitfall 6)", async () => {
      const provider = fakeProvider([NEAR, MID])
      provider.readHourly.mockImplementation(async (id: string, hour: Date) =>
        id === "N"
          ? {
              ...full(hour),
              temperature_c: 99.5,
              observed_at: new Date(hour.getTime() - 4 * HOUR_MS).toISOString(),
            }
          : { ...full(hour), temperature_c: 7 },
      )
      const service = build(provider)
      const result = await service.lookup({ ...POINT, at: minutesAgo(10) })
      expect(result.observation?.temperature_c).toBe(7)
      expect(result.observation?.station.id).toBe("M")
    })
  })

  describe("observation", () => {
    it("returns the merged observation of the nearest station and stops when complete", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      const result = await service.lookup({ ...POINT, at: minutesAgo(10) })
      expect(result.observation).toMatchObject({
        sky: "rain",
        temperature_c: 12.3,
        wind_kmh: 18,
        rain_24h_mm: 0.2,
        source: "meteo_france",
        station: { id: "N", name: "Near", distance_km: 1.1 },
      })
      expect(provider.readHourly).toHaveBeenCalledTimes(1)
    })

    it("asks further stations (at most three) for the values the nearest lacks", async () => {
      const provider = fakeProvider()
      provider.readHourly.mockImplementation(async (id: string, hour: Date) => ({
        observed_at: hour.toISOString(),
        temperature_c: id === "N" ? 10 : null,
        wind_kmh: id === "M" ? 25 : null,
        rain_24h_mm: null,
        sky: null,
      }))
      const service = build(provider)
      const result = await service.lookup({ ...POINT, at: minutesAgo(10) })
      expect(result.observation).toMatchObject({
        temperature_c: 10,
        wind_kmh: 25,
        rain_24h_mm: null,
        sky: null,
        station: { id: "N" },
      })
      expect(provider.readHourly.mock.calls.map((call) => call[0])).toEqual(["N", "M", "F"])
    })

    it("requests the nearest UTC hour of the survey time", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      const at = new Date(Date.now() - 3 * HOUR_MS)
      await service.lookup({ ...POINT, at: at.toISOString() })
      expect(provider.readHourly.mock.calls[0][1].toISOString()).toBe(
        nearestUtcHour(at).toISOString(),
      )
    })
  })

  describe("cache and de-duplication", () => {
    it("serves an identical second lookup from the cache", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      const at = minutesAgo(90)
      const first = await service.lookup({ ...POINT, at })
      const second = await service.lookup({ ...POINT, at })
      expect(second).toEqual(first)
      expect(provider.listStations).toHaveBeenCalledTimes(1)
      expect(provider.readHourly).toHaveBeenCalledTimes(1)
    })

    it("keys readings by station and hour, never by coordinates", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      const at = minutesAgo(90)
      await service.lookup({ lat: 48.4, lng: 2.7, at })
      await service.lookup({ lat: 48.4003, lng: 2.7004, at })
      expect(provider.readHourly).toHaveBeenCalledTimes(1)
    })

    it("asks again for another hour", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      await service.lookup({ ...POINT, at: minutesAgo(90) })
      await service.lookup({ ...POINT, at: minutesAgo(5 * 60) })
      expect(provider.listStations).toHaveBeenCalledTimes(1)
      expect(provider.readHourly).toHaveBeenCalledTimes(2)
    })

    it("shares one provider call between concurrent identical lookups", async () => {
      const provider = fakeProvider()
      let release: (value: WeatherReading) => void = () => undefined
      provider.readHourly.mockImplementation(
        () => new Promise<WeatherReading>((resolve) => (release = resolve)),
      )
      const service = build(provider)
      const at = minutesAgo(120)
      const first = service.lookup({ ...POINT, at })
      const second = service.lookup({ ...POINT, at })
      await flush()
      await flush()
      release(full(nearestUtcHour(new Date(at))))
      const [a, b] = await Promise.all([first, second])
      expect(a).toEqual(b)
      expect(provider.listStations).toHaveBeenCalledTimes(1)
      expect(provider.readHourly).toHaveBeenCalledTimes(1)
    })

    it("caches a null reading, so an empty hour is not asked again at once", async () => {
      const provider = fakeProvider([NEAR])
      provider.readHourly.mockResolvedValue(null)
      const service = build(provider)
      const at = minutesAgo(200)
      await service.lookup({ ...POINT, at })
      await service.lookup({ ...POINT, at })
      expect(provider.readHourly).toHaveBeenCalledTimes(1)
    })
  })

  describe("failures", () => {
    it("maps a station list failure to a 503 and does not cache it", async () => {
      const provider = fakeProvider()
      provider.listStations.mockRejectedValueOnce(new Error("boom"))
      const service = build(provider)
      const failure = await failureOf(service.lookup({ ...POINT, at: minutesAgo(10) }))
      expect(failure.getResponse()).toEqual({
        code: "weather_provider_unavailable",
        message: "Weather provider unavailable",
      })
      const retry = await service.lookup({ ...POINT, at: minutesAgo(10) })
      expect(retry.observation).not.toBeNull()
      expect(provider.listStations).toHaveBeenCalledTimes(2)
    })

    it("maps a reading failure, an HTTP 429 included, to the same 503 and retries next time", async () => {
      const provider = fakeProvider()
      const rateLimited = Object.assign(new Error("HTTP 429 Too Many Requests"), { status: 429 })
      provider.readHourly.mockRejectedValueOnce(rateLimited)
      const service = build(provider)
      const at = minutesAgo(60)
      const failure = await failureOf(service.lookup({ ...POINT, at }))
      expect(failure.getResponse()).toMatchObject({ code: "weather_provider_unavailable" })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("429"))
      const retry = await service.lookup({ ...POINT, at })
      expect(retry.observation).not.toBeNull()
      expect(provider.readHourly).toHaveBeenCalledTimes(2)
    })

    it("maps a non-Error rejection to the same 503 with a generic log label", async () => {
      const provider = fakeProvider()
      provider.listStations.mockRejectedValueOnce("secret text")
      const service = build(provider)
      await failureOf(service.lookup({ ...POINT, at: minutesAgo(10) }))
      expect(warn).toHaveBeenCalledWith("Weather provider failed: stations error")
    })

    it("gives a 503 when the concurrency cap is reached", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      // Warm the station list so the next lookups go straight to readings.
      await service.lookup({ ...POINT, at: minutesAgo(10) })
      const releases: Array<() => void> = []
      provider.readHourly.mockImplementation(
        (_id: string, hour: Date) =>
          new Promise<WeatherReading>((resolve) => releases.push(() => resolve(full(hour)))),
      )
      const running: Array<Promise<unknown>> = []
      for (let index = 0; index < MAX_CONCURRENT_WEATHER_CALLS; index += 1) {
        running.push(service.lookup({ ...POINT, at: minutesAgo(60 * (index + 3)) }))
      }
      await flush()
      expect(releases).toHaveLength(MAX_CONCURRENT_WEATHER_CALLS)
      const failure = await failureOf(
        service.lookup({ ...POINT, at: minutesAgo(60 * (MAX_CONCURRENT_WEATHER_CALLS + 4)) }),
      )
      expect(failure.getResponse()).toMatchObject({ code: "weather_provider_unavailable" })
      for (const release of releases) release()
      await Promise.all(running)
    })

    it("frees the slot after a call, success or failure", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      for (let index = 0; index < MAX_CONCURRENT_WEATHER_CALLS + 2; index += 1) {
        provider.readHourly.mockRejectedValueOnce(new Error("down"))
        await failureOf(service.lookup({ ...POINT, at: minutesAgo(60 * (index + 2)) }))
      }
      const ok = await service.lookup({ ...POINT, at: minutesAgo(60 * 20) })
      expect(ok.observation).not.toBeNull()
    })
  })

  describe("logs", () => {
    it("never carry the coordinates, the requested time or the error text", async () => {
      const provider = fakeProvider()
      const at = minutesAgo(45)
      const lat = 48.40123
      const lng = 2.70987
      const leaky = new Error(
        `GET https://example.test/obs?lat=${lat}&lng=${lng}&at=${at} apikey=marker-secret`,
      )
      provider.readHourly.mockRejectedValueOnce(leaky)
      const service = build(provider)
      await failureOf(service.lookup({ lat, lng, at }))
      expect(warn).toHaveBeenCalled()
      for (const call of warn.mock.calls) {
        const text = String(call[0])
        expect(text).not.toContain("48.40")
        expect(text).not.toContain("2.70")
        expect(text).not.toContain("40123")
        expect(text).not.toContain("70987")
        expect(text).not.toContain(at)
        expect(text).not.toContain(at.slice(0, 13))
        expect(text).not.toContain("marker-secret")
        expect(text).not.toContain("example.test")
      }
    })

    it("logs the cap without any request detail", async () => {
      const provider = fakeProvider()
      const service = build(provider)
      await service.lookup({ ...POINT, at: minutesAgo(10) })
      const releases: Array<() => void> = []
      provider.readHourly.mockImplementation(
        (_id: string, hour: Date) =>
          new Promise<WeatherReading>((resolve) => releases.push(() => resolve(full(hour)))),
      )
      const running: Array<Promise<unknown>> = []
      for (let index = 0; index < MAX_CONCURRENT_WEATHER_CALLS; index += 1) {
        running.push(service.lookup({ ...POINT, at: minutesAgo(60 * (index + 3)) }))
      }
      await flush()
      await failureOf(service.lookup({ ...POINT, at: minutesAgo(60 * 8) }))
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("cap"))
      for (const release of releases) release()
      await Promise.all(running)
    })
  })

  describe("timeout", () => {
    it("gives a 503 when the provider never answers, and frees the slot", async () => {
      const provider = fakeProvider()
      provider.readHourly.mockImplementationOnce(() => new Promise<WeatherReading>(() => undefined))
      const service = build(provider, { WEATHER_TIMEOUT_MS: "30" })
      const at = minutesAgo(120)
      const failure = await failureOf(service.lookup({ ...POINT, at }))
      expect(failure.getResponse()).toMatchObject({ code: "weather_provider_unavailable" })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("TimeoutError"))
      const retry = await service.lookup({ ...POINT, at })
      expect(retry.observation).not.toBeNull()
    })
  })
})

describe("WeatherService with a SYNOP lookup (D-29)", () => {
  // POINT is about 1 km from NEAR. SYN_NEAR is about 11 km away, SYN_MID about 33 km.
  const SYN_NEAR: WeatherStation = { id: "07100", name: "Syn near", lat: 48.5, lng: 2.7 }
  const SYN_MID: WeatherStation = { id: "07200", name: "Syn mid", lat: 48.7, lng: 2.7 }
  const SYN_FAR: WeatherStation = { id: "07300", name: "Syn far", lat: 49.5, lng: 2.7 }

  function report(
    station: WeatherStation,
    hour: Date,
    patch: Partial<SynopReport> = {},
  ): SynopReport {
    return { station, observed_at: hour.toISOString(), rain_24h_mm: 1.5, sky: "cloudy", ...patch }
  }

  /** Hourly stations give temperature and wind only, like the Météo-France hourly product. */
  function hourlyOnly(hour: Date, patch: Partial<WeatherReading> = {}): WeatherReading {
    return {
      observed_at: hour.toISOString(),
      temperature_c: 11.2,
      wind_kmh: 9.4,
      rain_24h_mm: null,
      sky: null,
      ...patch,
    }
  }

  type SynopProvider = FakeProvider & {
    readSynopReports: jest.Mock<Promise<SynopReport[]>, [Date]>
  }

  function synopProvider(
    reports: (hour: Date) => SynopReport[],
    stations: WeatherStation[] = [NEAR, MID, FAR],
  ): SynopProvider {
    const provider = fakeProvider(stations) as SynopProvider
    provider.readHourly.mockImplementation(async (_id: string, hour: Date) => hourlyOnly(hour))
    provider.readSynopReports = jest.fn(async (hour: Date) => reports(hour))
    return provider
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("takes sky and rain over 24 h from the nearest SYNOP station and the rest from the hourly one", async () => {
    const provider = synopProvider((hour) => [
      report(SYN_MID, hour, { sky: "fog" }),
      report(SYN_NEAR, hour),
    ])
    const result = await build(provider).lookup({ ...POINT, at: minutesAgo(120) })

    expect(result.observation).toMatchObject({
      sky: "cloudy",
      rain_24h_mm: 1.5,
      temperature_c: 11.2,
      wind_kmh: 9.4,
      source: "meteo_france",
      station: { id: "N" },
    })
    // Temperature and wind are known after the nearest hourly station: no further hourly call.
    expect(provider.readHourly).toHaveBeenCalledTimes(1)
    expect(provider.readSynopReports).toHaveBeenCalledTimes(1)
  })

  it("asks further hourly stations (at most three) while the wind is missing", async () => {
    const provider = synopProvider((hour) => [report(SYN_NEAR, hour)])
    provider.readHourly.mockImplementation(async (_id: string, hour: Date) =>
      hourlyOnly(hour, { wind_kmh: null }),
    )
    const result = await build(provider).lookup({ ...POINT, at: minutesAgo(120) })

    expect(provider.readHourly).toHaveBeenCalledTimes(3)
    expect(result.observation).toMatchObject({ temperature_c: 11.2, wind_kmh: null, sky: "cloudy" })
  })

  it("keeps null where the nearest SYNOP station has nothing: no farther station replaces it", async () => {
    const provider = synopProvider((hour) => [
      report(SYN_NEAR, hour, { sky: null, rain_24h_mm: null }),
      report(SYN_MID, hour, { sky: "snow", rain_24h_mm: 8 }),
    ])
    const result = await build(provider, { WEATHER_SYNOP_MAX_DISTANCE_KM: "50" }).lookup({
      ...POINT,
      at: minutesAgo(120),
    })
    expect(result.observation).toMatchObject({ sky: null, rain_24h_mm: null, temperature_c: 11.2 })
  })

  it("skips a SYNOP report outside the time tolerance and uses the next station in tolerance", async () => {
    const provider = synopProvider((hour) => [
      report(SYN_NEAR, new Date(hour.getTime() - 5 * HOUR_MS), { sky: "snow" }),
      report(SYN_MID, hour, { sky: "rain", rain_24h_mm: 4 }),
    ])
    const result = await build(provider, { WEATHER_SYNOP_MAX_DISTANCE_KM: "50" }).lookup({
      ...POINT,
      at: minutesAgo(120),
    })
    expect(result.observation).toMatchObject({ sky: "rain", rain_24h_mm: 4 })
  })

  it("follows the SYNOP cap, which is its own (default 50 km) and not the hourly one", async () => {
    const provider = synopProvider((hour) => [report(SYN_MID, hour), report(SYN_FAR, hour)])
    const inside = await build(provider, { WEATHER_SYNOP_MAX_DISTANCE_KM: "40" }).lookup({
      ...POINT,
      at: minutesAgo(120),
    })
    expect(inside.observation).toMatchObject({ sky: "cloudy" })

    const outside = await build(
      synopProvider((hour) => [report(SYN_MID, hour)]),
      {
        WEATHER_SYNOP_MAX_DISTANCE_KM: "20",
      },
    ).lookup({ ...POINT, at: minutesAgo(120) })
    expect(outside.observation).toMatchObject({ sky: null, rain_24h_mm: null, temperature_c: 11.2 })
  })

  it("answers from the SYNOP station alone when no hourly station is within its cap", async () => {
    const provider = synopProvider((hour) => [report(SYN_NEAR, hour)], [OUTSIDE])
    const result = await build(provider).lookup({ ...POINT, at: minutesAgo(120) })
    expect(result.observation).toMatchObject({
      sky: "cloudy",
      rain_24h_mm: 1.5,
      temperature_c: null,
      wind_kmh: null,
      station: { id: "07100", name: "Syn near" },
    })
    expect(provider.readHourly).not.toHaveBeenCalled()
  })

  it("answers no_station when no station of either kind is within its cap", async () => {
    const provider = synopProvider((hour) => [report(SYN_FAR, hour)], [OUTSIDE])
    await expect(build(provider).lookup({ ...POINT, at: minutesAgo(120) })).resolves.toEqual({
      observation: null,
      reason: "no_station",
    })
  })

  it("answers no_data when a SYNOP station is in range but its report is outside the tolerance", async () => {
    const provider = synopProvider(
      (hour) => [report(SYN_NEAR, new Date(hour.getTime() - 6 * HOUR_MS))],
      [OUTSIDE],
    )
    await expect(build(provider).lookup({ ...POINT, at: minutesAgo(120) })).resolves.toEqual({
      observation: null,
      reason: "no_data",
    })
  })

  it("caches the SYNOP reports by hour, an empty answer included", async () => {
    const provider = synopProvider(() => [])
    const service = build(provider)
    const at = minutesAgo(120)
    await service.lookup({ ...POINT, at })
    await service.lookup({ lat: POINT.lat + 0.01, lng: POINT.lng, at })
    expect(provider.readSynopReports).toHaveBeenCalledTimes(1)
  })

  it("maps a SYNOP failure to the same 503 and does not cache it", async () => {
    const provider = synopProvider((hour) => [report(SYN_NEAR, hour)])
    provider.readSynopReports.mockRejectedValueOnce(Object.assign(new Error("x"), { status: 429 }))
    const service = build(provider)
    const failure = await failureOf(service.lookup({ ...POINT, at: minutesAgo(120) }))
    expect(failure.getResponse()).toMatchObject({ code: "weather_provider_unavailable" })
    const retry = await service.lookup({ ...POINT, at: minutesAgo(120) })
    expect(retry.observation).not.toBeNull()
  })
})
