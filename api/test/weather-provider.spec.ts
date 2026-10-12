import { WEATHER_RANGES, WEATHER_SKY_CODES } from "@cortege/ibp-domain"
import {
  SyntheticWeatherProvider,
  WEATHER_PROVIDER_TOKEN,
  createWeatherProvider,
} from "../src/surveys/weather-provider"
import { MeteoFranceWeatherProvider } from "../src/surveys/meteofrance-provider"
import { buildTestConfig } from "./config-helper"

describe("SyntheticWeatherProvider", () => {
  const provider = new SyntheticWeatherProvider()
  const hour = new Date("2026-10-11T08:00:00.000Z")

  it("lists the same stations on every call", async () => {
    const first = await provider.listStations()
    const second = await provider.listStations()
    expect(first.length).toBeGreaterThanOrEqual(10)
    expect(second).toEqual(first)
    expect(new Set(first.map((entry) => entry.id)).size).toBe(first.length)
    for (const entry of first) {
      expect(entry.id).toMatch(/^SYN-\d{3}$/)
      expect(entry.lat).toBeGreaterThan(41)
      expect(entry.lat).toBeLessThan(52)
      expect(entry.lng).toBeGreaterThan(-5)
      expect(entry.lng).toBeLessThan(10)
    }
  })

  it("returns the same reading for the same station and hour", async () => {
    const first = await provider.readHourly("SYN-001", hour)
    const second = await new SyntheticWeatherProvider().readHourly("SYN-001", hour)
    expect(second).toEqual(first)
  })

  it("sets observed_at to the hour and keeps every value inside the ranges", async () => {
    const stations = await provider.listStations()
    for (const entry of stations) {
      for (let h = 0; h < 24; h += 1) {
        const at = new Date(Date.UTC(2026, 9, 11, h))
        const result = await provider.readHourly(entry.id, at)
        expect(result).not.toBeNull()
        expect(result?.observed_at).toBe(at.toISOString())
        const { temperature_c, wind_kmh, rain_24h_mm, sky } = result!
        expect(temperature_c).toBeGreaterThanOrEqual(WEATHER_RANGES.temperature_c.min)
        expect(temperature_c).toBeLessThanOrEqual(WEATHER_RANGES.temperature_c.max)
        expect(wind_kmh).toBeGreaterThanOrEqual(WEATHER_RANGES.wind_kmh.min)
        expect(wind_kmh).toBeLessThanOrEqual(WEATHER_RANGES.wind_kmh.max)
        expect(rain_24h_mm).toBeGreaterThanOrEqual(WEATHER_RANGES.rain_24h_mm.min)
        expect(rain_24h_mm).toBeLessThanOrEqual(WEATHER_RANGES.rain_24h_mm.max)
        expect(WEATHER_SKY_CODES).toContain(sky)
      }
    }
  })

  it("varies with the station and the hour", async () => {
    const readings = new Set<string>()
    for (const id of ["SYN-001", "SYN-002", "SYN-003"]) {
      for (let h = 0; h < 6; h += 1) {
        const result = await provider.readHourly(id, new Date(Date.UTC(2026, 9, 11, h)))
        readings.add(JSON.stringify([result?.temperature_c, result?.sky]))
      }
    }
    expect(readings.size).toBeGreaterThan(3)
  })
})

describe("createWeatherProvider", () => {
  it("returns null for off", () => {
    expect(createWeatherProvider(buildTestConfig({ WEATHER_PROVIDER: "off" }).weather)).toBeNull()
  })

  it("returns the synthetic provider for synthetic", () => {
    const provider = createWeatherProvider(
      buildTestConfig({ WEATHER_PROVIDER: "synthetic" }).weather,
    )
    expect(provider).toBeInstanceOf(SyntheticWeatherProvider)
  })

  it("returns the Météo-France provider for meteofrance with a credential", () => {
    const config = buildTestConfig({
      WEATHER_PROVIDER: "meteofrance",
      METEOFRANCE_API_KEY: "marker-secret-value",
    }).weather
    const provider = createWeatherProvider(config)
    expect(provider).toBeInstanceOf(MeteoFranceWeatherProvider)
    // The credential is held in private fields: serialising the provider never shows it.
    expect(JSON.stringify(provider)).not.toContain("marker-secret-value")
  })

  it("passes the configured auth mode on to the provider", () => {
    const config = buildTestConfig({
      WEATHER_PROVIDER: "meteofrance",
      METEOFRANCE_API_KEY: "a.b.c",
      METEOFRANCE_AUTH_MODE: "bearer",
    }).weather
    expect(config.authMode).toBe("bearer")
    expect(createWeatherProvider(config)).toBeInstanceOf(MeteoFranceWeatherProvider)
  })

  it("returns null for meteofrance without a credential (the service answers disabled)", () => {
    const config = buildTestConfig({ WEATHER_PROVIDER: "meteofrance", METEOFRANCE_API_KEY: "" })
    expect(createWeatherProvider(config.weather)).toBeNull()
  })

  it("exposes a DI token", () => {
    expect(typeof WEATHER_PROVIDER_TOKEN).toBe("symbol")
  })
})
