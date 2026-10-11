import "dotenv/config"
import { NestExpressApplication } from "@nestjs/platform-express"
import { Test, TestingModule } from "@nestjs/testing"
import request = require("supertest")
import { WEATHER_RANGES, WEATHER_SKY_CODES } from "@cortege/ibp-domain"
import { AppModule } from "../src/app.module"
import { configureApp } from "../src/app.setup"
import { loginTestUser } from "./helpers/surveys-e2e"

// GET /v1/weather (phase 27, D-08, D-19, D-20, D-22). The e2e environment runs the synthetic
// provider (api/test/setup-env.js), so the answers are deterministic and need no network.

const HOUR_MS = 60 * 60 * 1000

type Observation = {
  sky: string | null
  temperature_c: number | null
  wind_kmh: number | null
  rain_24h_mm: number | null
  observed_at: string
  source: string
  station: { id: string; name: string | null; distance_km: number }
}

describe("Weather endpoint (e2e)", () => {
  let app: NestExpressApplication
  let token: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleFixture.createNestApplication<NestExpressApplication>()
    // The same bootstrap as the real server: the /v1 prefix and the global validation pipe.
    configureApp(app)
    await app.init()
    token = await loginTestUser(app, "weather")
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  function get(query: Record<string, string>) {
    return request(app.getHttpServer())
      .get("/v1/weather")
      .set("Authorization", `Bearer ${token}`)
      .query(query)
  }

  it("answers 401 without a token", async () => {
    await request(app.getHttpServer())
      .get("/v1/weather")
      .query({ lat: "48.40", lng: "2.70" })
      .expect(401)
  })

  it("answers the observation of the nearest station, inside the ranges", async () => {
    const at = new Date(Date.now() - HOUR_MS).toISOString()
    const response = await get({ lat: "48.40", lng: "2.70", at }).expect(200)
    const observation = response.body.observation as Observation
    expect(observation.source).toBe("meteo_france")
    expect(observation.station.id).toMatch(/^SYN-\d{3}$/)
    expect(observation.station.distance_km).toBeLessThan(25)
    expect(Math.abs(Date.parse(observation.observed_at) - Date.parse(at))).toBeLessThanOrEqual(
      90 * 60 * 1000,
    )
    expect(WEATHER_SKY_CODES).toContain(observation.sky)
    expect(observation.temperature_c).toBeGreaterThanOrEqual(WEATHER_RANGES.temperature_c.min)
    expect(observation.temperature_c).toBeLessThanOrEqual(WEATHER_RANGES.temperature_c.max)
    expect(observation.wind_kmh).toBeGreaterThanOrEqual(WEATHER_RANGES.wind_kmh.min)
    expect(observation.wind_kmh).toBeLessThanOrEqual(WEATHER_RANGES.wind_kmh.max)
    expect(observation.rain_24h_mm).toBeGreaterThanOrEqual(WEATHER_RANGES.rain_24h_mm.min)
    expect(observation.rain_24h_mm).toBeLessThanOrEqual(WEATHER_RANGES.rain_24h_mm.max)
  })

  it("answers the same body twice for the same request", async () => {
    const at = new Date(Date.now() - 2 * HOUR_MS).toISOString()
    const first = await get({ lat: "48.40", lng: "2.70", at }).expect(200)
    const second = await get({ lat: "48.40", lng: "2.70", at }).expect(200)
    expect(second.body).toEqual(first.body)
    expect(first.body.observation).not.toBeNull()
  })

  it("answers now when no time is given", async () => {
    const response = await get({ lat: "48.40", lng: "2.70" }).expect(200)
    expect(response.body.observation).not.toBeNull()
  })

  it("answers too_old past 24 hours without an error", async () => {
    const at = new Date(Date.now() - 25 * HOUR_MS).toISOString()
    const response = await get({ lat: "48.40", lng: "2.70", at }).expect(200)
    expect(response.body).toEqual({ observation: null, reason: "too_old" })
  })

  it("answers no_station beyond the distance cap", async () => {
    const at = new Date(Date.now() - HOUR_MS).toISOString()
    const response = await get({ lat: "0", lng: "-30", at }).expect(200)
    expect(response.body).toEqual({ observation: null, reason: "no_station" })
  })

  it("answers 400 for a latitude out of range", async () => {
    await get({ lat: "95", lng: "2.70" }).expect(400)
  })

  it("answers 400 for a longitude out of range", async () => {
    await get({ lat: "48.40", lng: "-181" }).expect(400)
  })

  it("answers 400 for a time that is not ISO 8601", async () => {
    await get({ lat: "48.40", lng: "2.70", at: "hier" }).expect(400)
  })

  it("answers 400 for missing coordinates", async () => {
    await get({}).expect(400)
  })
})
