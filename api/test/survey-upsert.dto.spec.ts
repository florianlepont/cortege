import { BadRequestException } from "@nestjs/common"
import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"
import { validateSyncDto } from "../src/surveys/sync-operation-validation"
import { SurveyUpsertDto } from "../src/surveys/dtos/survey-upsert.dto"
import { SurveyWeatherDto } from "../src/surveys/dtos/survey-weather.dto"

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
