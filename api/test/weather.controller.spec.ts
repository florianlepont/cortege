import "reflect-metadata"
import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"
import { AuthGuard } from "../src/auth/auth.guard"
import { WEATHER_THROTTLE } from "../src/common/rate-limit.config"
import { WeatherQueryDto } from "../src/surveys/dtos/weather-query.dto"
import { WeatherController } from "../src/surveys/weather.controller"
import type { WeatherService } from "../src/surveys/weather.service"

async function errorsOf(query: Record<string, unknown>) {
  const instance = plainToInstance(WeatherQueryDto, query)
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true })
  return errors.map((error) => error.property).sort()
}

describe("WeatherQueryDto", () => {
  it("accepts a point with no time", async () => {
    await expect(errorsOf({ lat: "48.4", lng: "2.7" })).resolves.toEqual([])
  })

  it("accepts a point with an ISO time", async () => {
    await expect(
      errorsOf({ lat: "48.4", lng: "2.7", at: "2026-10-11T08:00:00Z" }),
    ).resolves.toEqual([])
  })

  it("converts the query strings to numbers", () => {
    const instance = plainToInstance(WeatherQueryDto, { lat: "48.4", lng: "-2.7" })
    expect(instance.lat).toBe(48.4)
    expect(instance.lng).toBe(-2.7)
  })

  it("accepts the bounds", async () => {
    await expect(errorsOf({ lat: "90", lng: "-180" })).resolves.toEqual([])
    await expect(errorsOf({ lat: "-90", lng: "180" })).resolves.toEqual([])
  })

  it("refuses a latitude out of range", async () => {
    await expect(errorsOf({ lat: "91", lng: "2.7" })).resolves.toEqual(["lat"])
  })

  it("refuses a longitude out of range", async () => {
    await expect(errorsOf({ lat: "48.4", lng: "-181" })).resolves.toEqual(["lng"])
  })

  it("refuses a value that is not a number", async () => {
    await expect(errorsOf({ lat: "abc", lng: "2.7" })).resolves.toEqual(["lat"])
  })

  it("refuses missing coordinates", async () => {
    await expect(errorsOf({})).resolves.toEqual(["lat", "lng"])
  })

  it("refuses a time that is not ISO 8601", async () => {
    await expect(errorsOf({ lat: "48.4", lng: "2.7", at: "hier" })).resolves.toEqual(["at"])
  })

  it("refuses a time that is too long", async () => {
    await expect(
      errorsOf({ lat: "48.4", lng: "2.7", at: `2026-10-11T08:00:00Z${"0".repeat(40)}` }),
    ).resolves.toContain("at")
  })

  it("refuses an unknown field", async () => {
    await expect(errorsOf({ lat: "48.4", lng: "2.7", station: "SYN-001" })).resolves.toEqual([
      "station",
    ])
  })
})

// The controller only delegates: the rules live in the service.
describe("WeatherController", () => {
  it("delegates lookup with the validated query and returns its value unchanged", async () => {
    const answer = { observation: null, reason: "no_station" as const }
    const weather = { lookup: jest.fn().mockResolvedValue(answer) }
    const controller = new WeatherController(weather as unknown as WeatherService)
    const query = Object.assign(new WeatherQueryDto(), {
      lat: 48.4,
      lng: 2.7,
      at: "2026-10-11T08:00:00Z",
    })
    await expect(controller.get(query)).resolves.toBe(answer)
    expect(weather.lookup).toHaveBeenCalledWith({
      lat: 48.4,
      lng: 2.7,
      at: "2026-10-11T08:00:00Z",
    })
  })

  describe("metadata", () => {
    it("is behind the auth guard", () => {
      expect(Reflect.getMetadata("__guards__", WeatherController)).toContain(AuthGuard)
    })

    it("gives the handler its own weather throttle", () => {
      const target = WeatherController.prototype.get
      expect(Reflect.getMetadata("THROTTLER:TTL" + "default", target)).toBe(
        WEATHER_THROTTLE.default.ttl,
      )
      expect(Reflect.getMetadata("THROTTLER:LIMIT" + "default", target)).toBe(
        WEATHER_THROTTLE.default.limit,
      )
    })

    it("serves GET /weather", () => {
      expect(Reflect.getMetadata("path", WeatherController)).toBe("weather")
      expect(Reflect.getMetadata("path", WeatherController.prototype.get)).toBe("/")
    })
  })
})
