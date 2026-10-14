import { FACTOR_KEYS } from "../factors"
import * as barrel from "./index"
import * as record from "./record"
import {
  CLIENT_FEATURES_HEADER,
  COUNTING_MODES,
  PARTIAL_ROUTE_METHODS,
  ROUTE_CHOSEN_BY_VALUES,
  ROUTE_EXPERIENCE_VALUES,
  ROUTE_HOMOGENEITY_VALUES,
  ROUTE_HOURS_MAX,
  ROUTE_METHODS,
  ROUTE_RECORD_MAX_BYTES,
  ROUTE_REQUIRED_CODE,
  ROUTE_SURFACE_DECIMALS,
  ROUTE_SURFACE_MAX_HA,
  SURVEY_ROUTE_CLIENT_FEATURE,
  SURVEY_ROUTE_VERSION,
  UNCAPPABLE_FACTORS,
  isCountingMode,
  isPartialRoute,
  isRouteMethod,
} from "./index"

describe("route constants", () => {
  it("lists the three parcours, the two counting modes and the chosen-by values", () => {
    expect(ROUTE_METHODS).toEqual(["full", "partial_strip", "partial_plot"])
    expect(PARTIAL_ROUTE_METHODS).toEqual(["partial_strip", "partial_plot"])
    expect(COUNTING_MODES).toEqual(["capped", "uncapped"])
    expect(ROUTE_CHOSEN_BY_VALUES).toEqual(["guide", "observer"])
    expect(ROUTE_HOMOGENEITY_VALUES).toEqual(["homogeneous", "heterogeneous"])
    expect(ROUTE_EXPERIENCE_VALUES).toEqual(["regular", "beginner"])
  })

  it("derives the uncappable factors from FACTOR_KEYS without H", () => {
    expect(UNCAPPABLE_FACTORS).toEqual(["A", "B", "C", "D", "E", "F", "G", "I", "J"])
    for (const key of UNCAPPABLE_FACTORS) expect(FACTOR_KEYS).toContain(key)
    expect(UNCAPPABLE_FACTORS).not.toContain("H")
  })

  it("holds the validated limits", () => {
    expect(SURVEY_ROUTE_VERSION).toBe(1)
    expect(ROUTE_SURFACE_DECIMALS).toBe(2)
    expect(ROUTE_RECORD_MAX_BYTES).toBe(4096)
    expect(ROUTE_SURFACE_MAX_HA).toBe(5000)
    expect(ROUTE_HOURS_MAX).toBe(24)
  })

  it("names the API error code and the client marker once", () => {
    expect(ROUTE_REQUIRED_CODE).toBe("route_required")
    expect(CLIENT_FEATURES_HEADER).toBe("X-Cortege-Features")
    expect(SURVEY_ROUTE_CLIENT_FEATURE).toBe("survey_route")
  })

  it("exposes through the barrel the same values as the module", () => {
    expect(barrel.ROUTE_METHODS).toBe(record.ROUTE_METHODS)
    expect(barrel.isRouteMethod).toBe(record.isRouteMethod)
  })
})

describe("route guards", () => {
  it("recognises a parcours code", () => {
    expect(isRouteMethod("full")).toBe(true)
    expect(isRouteMethod("partial_strip")).toBe(true)
    expect(isRouteMethod("plein")).toBe(false)
    expect(isRouteMethod(3)).toBe(false)
    expect(isRouteMethod(null)).toBe(false)
  })

  it("recognises a counting mode", () => {
    expect(isCountingMode("capped")).toBe(true)
    expect(isCountingMode("uncapped")).toBe(true)
    expect(isCountingMode("rapide")).toBe(false)
    expect(isCountingMode(undefined)).toBe(false)
  })

  it("recognises a partial route", () => {
    expect(isPartialRoute("partial_plot")).toBe(true)
    expect(isPartialRoute("partial_strip")).toBe(true)
    expect(isPartialRoute("full")).toBe(false)
    expect(isPartialRoute("typological")).toBe(false)
  })
})
