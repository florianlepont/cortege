import { UnprocessableEntityException } from "@nestjs/common"
import {
  canonicalSurveyRoute,
  CLIENT_FEATURES_HEADER,
  SURVEY_ROUTE_CLIENT_FEATURE,
  type SurveyRoute,
} from "@cortege/ibp-domain"
import {
  assertRouteForCreate,
  assertRouteForSubmit,
  clientRequiresRoute,
} from "../src/surveys/route-required"

const ROUTE: SurveyRoute = canonicalSurveyRoute({
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 2,
  guide: { chosen_by: "observer" },
})

function refusal(call: () => void): UnprocessableEntityException {
  try {
    call()
  } catch (error) {
    return error as UnprocessableEntityException
  }
  throw new Error("expected a refusal")
}

describe("clientRequiresRoute", () => {
  it("reads the fixed package marker", () => {
    expect(CLIENT_FEATURES_HEADER).toBe("X-Cortege-Features")
    expect(clientRequiresRoute(SURVEY_ROUTE_CLIENT_FEATURE)).toBe(true)
  })

  it("is false without the header or without the feature", () => {
    expect(clientRequiresRoute(undefined)).toBe(false)
    expect(clientRequiresRoute("")).toBe(false)
    expect(clientRequiresRoute("other")).toBe(false)
    expect(clientRequiresRoute("survey_route_extra")).toBe(false)
  })

  it("accepts a comma-separated list, trimmed and case-insensitive", () => {
    expect(clientRequiresRoute("other, survey_route")).toBe(true)
    expect(clientRequiresRoute(" SURVEY_ROUTE ,other")).toBe(true)
  })
})

describe("assertRouteForCreate", () => {
  it("refuses a missing, null or damaged route with the 422 route_required", () => {
    for (const body of [
      {},
      { survey_route: null },
      { survey_route: { version: 1 } },
      { survey_route: "x" },
    ]) {
      const error = refusal(() => assertRouteForCreate(body, true))
      expect(error.getStatus()).toBe(422)
      expect(error.getResponse()).toEqual({
        code: "route_required",
        message: "survey_route is required",
      })
    }
  })

  it("accepts a valid route", () => {
    expect(() => assertRouteForCreate({ survey_route: ROUTE }, true)).not.toThrow()
  })

  it("does nothing when the client does not require the route", () => {
    expect(() => assertRouteForCreate({}, false)).not.toThrow()
    expect(() => assertRouteForCreate({ survey_route: null }, false)).not.toThrow()
  })

  it("never echoes a body value in the refusal", () => {
    const error = refusal(() => assertRouteForCreate({ survey_route: "secret-value" }, true))
    expect(JSON.stringify(error.getResponse())).not.toContain("secret-value")
  })
})

describe("assertRouteForSubmit", () => {
  it("refuses a stored null or absent route", () => {
    for (const stored of [null, undefined]) {
      const error = refusal(() => assertRouteForSubmit(stored, true))
      expect(error.getStatus()).toBe(422)
      expect(error.getResponse()).toEqual({
        code: "route_required",
        message: "survey_route is required",
      })
    }
  })

  it("accepts a stored route", () => {
    expect(() => assertRouteForSubmit(ROUTE, true)).not.toThrow()
  })

  it("does nothing when the client does not require the route", () => {
    expect(() => assertRouteForSubmit(null, false)).not.toThrow()
  })
})
