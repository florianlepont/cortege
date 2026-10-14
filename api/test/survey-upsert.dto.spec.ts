import { BadRequestException } from "@nestjs/common"
import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"
import { validateSyncDto } from "../src/surveys/sync-operation-validation"
import { SurveyUpsertDto } from "../src/surveys/dtos/survey-upsert.dto"
import { SurveyWeatherDto } from "../src/surveys/dtos/survey-weather.dto"
import { SurveyRouteDto } from "../src/surveys/dtos/survey-route.dto"

// Phase 27 (D-01, D-05, D-09, D-23): survey_note, the nested weather and the factors.annotations
// container are validated on both entry points. /v1/sync goes through validateSyncDto (whitelist
// without rejection), POST /v1/surveys through the global pipe (forbidNonWhitelisted).

const validWeather = {
  sky: "rain",
  temperature_c: 8.5,
  wind_kmh: 12,
  rain_24h_mm: 2.4,
  observed_at: "2026-10-11T08:00:00Z",
  requested_at: "2026-10-11T08:12:41Z",
  source: "meteo_france",
  edited: ["sky"],
}

async function rejectedFields(payload: unknown): Promise<string[]> {
  try {
    await validateSyncDto(SurveyUpsertDto, payload)
  } catch (error) {
    if (error instanceof BadRequestException) {
      const response = error.getResponse() as { details: { fields: string[] } }
      return response.details.fields
    }
    throw error
  }
  return []
}

async function pipeErrors(payload: unknown) {
  const instance = plainToInstance(SurveyUpsertDto, payload)
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true })
}

describe("SurveyUpsertDto survey_note", () => {
  it("accepts a note of 1000 characters, null, or absent", async () => {
    await expect(
      validateSyncDto(SurveyUpsertDto, { survey_note: "a".repeat(1000) }),
    ).resolves.toMatchObject({
      survey_note: "a".repeat(1000),
    })
    await expect(validateSyncDto(SurveyUpsertDto, { survey_note: null })).resolves.toBeDefined()
    await expect(validateSyncDto(SurveyUpsertDto, {})).resolves.toBeDefined()
  })

  it("rejects a note of 1001 characters", async () => {
    expect(await rejectedFields({ survey_note: "a".repeat(1001) })).toEqual(["survey_note"])
  })

  it("rejects a note that is not a string", async () => {
    expect(await rejectedFields({ survey_note: 12 })).toEqual(["survey_note"])
  })
})

describe("SurveyUpsertDto weather", () => {
  it("accepts a full weather and keeps every key on the instance", async () => {
    const instance = await validateSyncDto(SurveyUpsertDto, { weather: validWeather })
    expect(instance.weather).toBeInstanceOf(SurveyWeatherDto)
    expect({ ...instance.weather }).toEqual(validWeather)
  })

  it("accepts weather null and weather {}", async () => {
    await expect(validateSyncDto(SurveyUpsertDto, { weather: null })).resolves.toBeDefined()
    await expect(validateSyncDto(SurveyUpsertDto, { weather: {} })).resolves.toBeDefined()
  })

  it("accepts null values inside the weather", async () => {
    await expect(
      validateSyncDto(SurveyUpsertDto, {
        weather: { sky: null, temperature_c: null, source: "manual", edited: [] },
      }),
    ).resolves.toBeDefined()
  })

  it.each([
    ["an unknown sky", { sky: "sunny" }],
    ["a temperature above the range", { temperature_c: 56 }],
    ["a temperature below the range", { temperature_c: -41 }],
    ["a negative wind", { wind_kmh: -1 }],
    ["a rain above the range", { rain_24h_mm: 1001 }],
    ["a text temperature", { temperature_c: "8" }],
    ["a non-date observed_at", { observed_at: "yesterday" }],
    ["a non-date requested_at", { requested_at: "yesterday" }],
    ["an unknown source", { source: "other" }],
    ["an unknown edited key", { edited: ["foo"] }],
    [
      "an edited list of 6 items",
      { edited: ["sky", "temperature_c", "wind_kmh", "rain_24h_mm", "observed_at", "sky"] },
    ],
    ["an edited that is not an array", { edited: "sky" }],
  ])("rejects %s", async (_label, weather) => {
    expect(await rejectedFields({ weather })).toEqual(["weather"])
  })

  it("rejects a weather that is not an object", async () => {
    expect(await rejectedFields({ weather: "rain" })).toEqual(["weather"])
  })

  it("strips an undeclared weather key on /v1/sync", async () => {
    const instance = await validateSyncDto(SurveyUpsertDto, {
      weather: { sky: "fog", station: "07149" },
    })
    expect({ ...instance.weather }).toEqual({ sky: "fog" })
  })

  it("rejects an undeclared weather key under the POST /v1/surveys pipe settings", async () => {
    const errors = await pipeErrors({ weather: { sky: "fog", station: "07149" } })
    expect(errors.map((error) => error.property)).toEqual(["weather"])
  })

  it("accepts a valid weather under the POST /v1/surveys pipe settings", async () => {
    expect(await pipeErrors({ survey_note: "x", weather: validWeather })).toEqual([])
  })
})

describe("SurveyUpsertDto factors.annotations", () => {
  it("accepts annotations beside the factor keys", async () => {
    await expect(
      validateSyncDto(SurveyUpsertDto, {
        factors: { A: 5, annotations: { A: { doubt: true, note: "x" } } },
      }),
    ).resolves.toBeDefined()
  })

  it("accepts factors without annotations", async () => {
    await expect(validateSyncDto(SurveyUpsertDto, { factors: { A: 5 } })).resolves.toBeDefined()
  })

  it.each([
    ["an unknown factor key", { annotations: { K: {} } }],
    ["a note of 301 characters", { annotations: { A: { note: "a".repeat(301) } } }],
    ["annotations as an array", { annotations: [] }],
    ["an unknown entry key", { annotations: { A: { colour: "red" } } }],
    ["a doubt that is not a boolean", { annotations: { A: { doubt: "yes" } } }],
  ])("rejects %s", async (_label, factors) => {
    expect(await rejectedFields({ factors })).toEqual(["factors"])
  })

  it("does not echo the offending value in the error message", async () => {
    const errors = await pipeErrors({ factors: { annotations: { A: { note: "a".repeat(301) } } } })
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}))
    expect(messages).toContain("factors.annotations is invalid")
    expect(JSON.stringify(messages)).not.toContain("aaaa")
  })
})

// Phase 30 (D-08, D-09): the recorded route, a nested object with every key declared, validated by
// the package on both entry points. Whether a route is required is decided elsewhere (plan 30-10),
// so null and absent both pass here.
describe("SurveyUpsertDto survey_route", () => {
  const fullRoute = {
    version: 1,
    method: "full",
    counting: "capped",
    zone_surface_ha: 2.5,
    guide: { chosen_by: "observer" },
  }
  const guidedPartialRoute = {
    version: 1,
    method: "partial_strip",
    counting: "uncapped",
    uncapped_factors: ["A", "B", "E"],
    zone_surface_ha: 12,
    complement: { done: true, total_surface_ha: 14.5 },
    guide: {
      chosen_by: "guide",
      suggested: { method: "partial_strip", counting: "uncapped" },
      answers: {
        surface_ha: 12,
        homogeneity: "homogeneous",
        difficulty: false,
        narrow: true,
        experience: "regular",
        hours_available: 3.5,
        subdivided: false,
      },
    },
  }
  const notDoneComplementRoute = {
    version: 1,
    method: "partial_plot",
    counting: "capped",
    zone_surface_ha: 40,
    complement: { done: false },
    guide: { chosen_by: "guide", suggested: { method: "partial_plot", counting: "capped" } },
  }

  it.each([
    ["a full capped route chosen by the observer", fullRoute],
    ["a guided partial route with answers and a done complement", guidedPartialRoute],
    ["a partial route with a complement not done", notDoneComplementRoute],
  ])("accepts %s and keeps every key on the instance", async (_label, route) => {
    const instance = await validateSyncDto(SurveyUpsertDto, { survey_route: route })
    expect(instance.survey_route).toBeInstanceOf(SurveyRouteDto)
    expect(JSON.parse(JSON.stringify(instance.survey_route))).toEqual(route)
  })

  it("accepts survey_route null and an absent key", async () => {
    await expect(validateSyncDto(SurveyUpsertDto, { survey_route: null })).resolves.toBeDefined()
    await expect(validateSyncDto(SurveyUpsertDto, {})).resolves.toBeDefined()
  })

  it.each([
    ["the retired typological method", { ...fullRoute, method: "typological" }],
    ["the retired systematic method", { ...fullRoute, method: "systematic" }],
    ["an unknown method", { ...fullRoute, method: "random" }],
    ["an unknown counting", { ...fullRoute, counting: "half" }],
    ["a version other than 1", { ...fullRoute, version: 2 }],
    ["a missing version", { ...fullRoute, version: undefined }],
    ["a zone of 0", { ...fullRoute, zone_surface_ha: 0 }],
    ["a zone above the maximum", { ...fullRoute, zone_surface_ha: 5001 }],
    ["a text zone", { ...fullRoute, zone_surface_ha: "2" }],
    ["a missing guide", { ...fullRoute, guide: undefined }],
    ["an unknown chosen_by", { ...fullRoute, guide: { chosen_by: "robot" } }],
    [
      "an unknown homogeneity",
      { ...fullRoute, guide: { chosen_by: "guide", answers: { surface_ha: 2, homogeneity: "x" } } },
    ],
    [
      "an unknown experience",
      { ...fullRoute, guide: { chosen_by: "guide", answers: { surface_ha: 2, experience: "x" } } },
    ],
    [
      "hours above the maximum",
      {
        ...fullRoute,
        guide: { chosen_by: "guide", answers: { surface_ha: 2, hours_available: 25 } },
      },
    ],
    [
      "a text flag",
      { ...fullRoute, guide: { chosen_by: "guide", answers: { surface_ha: 2, narrow: "yes" } } },
    ],
    [
      "an unknown suggested method",
      {
        ...fullRoute,
        guide: { chosen_by: "guide", suggested: { method: "x", counting: "capped" } },
      },
    ],
    ["an uncapped route with no factor", { ...fullRoute, counting: "uncapped" }],
    [
      "an uncapped route with an empty factor list",
      { ...fullRoute, counting: "uncapped", uncapped_factors: [] },
    ],
    [
      "an uncapped route with factor H",
      { ...fullRoute, counting: "uncapped", uncapped_factors: ["A", "H"] },
    ],
    [
      "an uncapped route with unsorted factors",
      { ...fullRoute, counting: "uncapped", uncapped_factors: ["B", "A"] },
    ],
    ["a capped route with factors", { ...fullRoute, uncapped_factors: ["A"] }],
    ["a complement on a full route", { ...fullRoute, complement: { done: false } }],
    ["a partial route without complement", { ...fullRoute, method: "partial_strip" }],
    ["a done complement without total", { ...notDoneComplementRoute, complement: { done: true } }],
    [
      "a complement total below the zone",
      { ...notDoneComplementRoute, complement: { done: true, total_surface_ha: 10 } },
    ],
    ["a route that is a string", "full"],
    ["a route that is an array", [fullRoute]],
  ])("rejects %s", async (_label, survey_route) => {
    expect(await rejectedFields({ survey_route })).toEqual(["survey_route"])
  })

  it("reports a constant message that echoes no value", async () => {
    const errors = await pipeErrors({ survey_route: { ...fullRoute, method: "SECRET-VALUE" } })
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}))
    expect(messages).toContain("survey_route is invalid")
    expect(JSON.stringify(messages)).not.toContain("SECRET-VALUE")
  })

  it.each([
    ["the route", (route: Record<string, unknown>) => ({ ...route, extra: 1 })],
    [
      "the complement",
      (route: Record<string, unknown>) => ({
        ...route,
        complement: { done: false, extra: 1 },
      }),
    ],
    [
      "the guide",
      (route: Record<string, unknown>) => ({
        ...route,
        guide: { ...(route.guide as object), extra: 1 },
      }),
    ],
    [
      "the suggestion",
      (route: Record<string, unknown>) => ({
        ...route,
        guide: { chosen_by: "guide", suggested: { method: "full", counting: "capped", extra: 1 } },
      }),
    ],
    [
      "the answers",
      (route: Record<string, unknown>) => ({
        ...route,
        guide: { chosen_by: "guide", answers: { surface_ha: 2, extra: 1 } },
      }),
    ],
  ])("handles an undeclared key in %s", async (_label, build) => {
    const route = build(notDoneComplementRoute)
    // /v1/sync: the whitelist strips it and the rest still validates.
    const instance = await validateSyncDto(SurveyUpsertDto, { survey_route: route })
    expect(JSON.stringify(instance.survey_route)).not.toContain("extra")
    // POST /v1/surveys: forbidNonWhitelisted rejects it.
    const errors = await pipeErrors({ survey_route: route })
    expect(errors.map((error) => error.property)).toEqual(["survey_route"])
  })

  it("accepts a valid route under the POST /v1/surveys pipe settings", async () => {
    expect(await pipeErrors({ survey_route: guidedPartialRoute })).toEqual([])
    expect(await pipeErrors({ survey_route: fullRoute })).toEqual([])
  })
})
