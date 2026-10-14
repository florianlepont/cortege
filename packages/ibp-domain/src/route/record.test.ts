import type { SurveyRoute } from "../contract/route"
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
  SURVEY_ROUTE_ISSUE_CODES,
  UNCAPPABLE_FACTORS,
  canonicalSurveyRoute,
  isCountingMode,
  isPartialRoute,
  isRouteMethod,
  readSurveyRoute,
  validateSurveyRoute,
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

// The example of spec section 8: a partial route by plot, one continuous sheet, guide accepted.
const SPEC_EXAMPLE: SurveyRoute = {
  version: 1,
  method: "partial_plot",
  counting: "capped",
  zone_surface_ha: 1.5,
  complement: { done: true, total_surface_ha: 15 },
  guide: {
    chosen_by: "guide",
    suggested: { method: "partial_plot", counting: "capped" },
    answers: { surface_ha: 15, homogeneity: "homogeneous", difficulty: false, narrow: false },
  },
}

const FULL_ROUTE: SurveyRoute = {
  version: 1,
  method: "full",
  counting: "capped",
  zone_surface_ha: 3,
  guide: { chosen_by: "observer" },
}

const UNCAPPED_ROUTE: SurveyRoute = {
  version: 1,
  method: "full",
  counting: "uncapped",
  uncapped_factors: ["A", "C", "J"],
  zone_surface_ha: 2.5,
  guide: {
    chosen_by: "guide",
    suggested: { method: "full", counting: "uncapped" },
    answers: {
      surface_ha: 2.5,
      homogeneity: "heterogeneous",
      difficulty: true,
      experience: "beginner",
      hours_available: 6.5,
      subdivided: false,
    },
  },
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function withChange(base: SurveyRoute, change: Record<string, unknown>): unknown {
  const copy: Record<string, unknown> = clone(base) as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(change)) {
    if (value === undefined) delete copy[key]
    else copy[key] = value
  }
  return copy
}

describe("canonicalSurveyRoute", () => {
  it("rounds, sorts, de-duplicates and keeps the complement and the guide", () => {
    const messy = {
      version: 1,
      method: "partial_plot",
      counting: "uncapped",
      uncapped_factors: ["F", "B", "F"],
      zone_surface_ha: 1.23456,
      complement: { done: true, total_surface_ha: 8 },
      guide: { chosen_by: "observer" },
    } as unknown as SurveyRoute
    expect(canonicalSurveyRoute(messy)).toEqual({
      version: 1,
      method: "partial_plot",
      counting: "uncapped",
      uncapped_factors: ["B", "F"],
      zone_surface_ha: 1.23,
      complement: { done: true, total_surface_ha: 8 },
      guide: { chosen_by: "observer" },
    })
  })

  it("rounds half away from zero to two decimals", () => {
    const route = { ...FULL_ROUTE, zone_surface_ha: 2.345 }
    expect(canonicalSurveyRoute(route).zone_surface_ha).toBe(2.35)
    const hours = {
      ...FULL_ROUTE,
      guide: { chosen_by: "guide", answers: { surface_ha: 4.004, hours_available: 1.999 } },
    } as SurveyRoute
    expect(canonicalSurveyRoute(hours).guide.answers).toEqual({
      surface_ha: 4,
      hours_available: 2,
    })
  })

  it("drops uncapped_factors for capped counting", () => {
    const route = { ...FULL_ROUTE, uncapped_factors: ["A"] } as unknown as SurveyRoute
    expect(canonicalSurveyRoute(route)).not.toHaveProperty("uncapped_factors")
  })

  it("leaves uncapped_factors absent when uncapped counting has none", () => {
    const route = { ...FULL_ROUTE, counting: "uncapped" } as SurveyRoute
    expect(canonicalSurveyRoute(route)).not.toHaveProperty("uncapped_factors")
  })

  it("drops H and unknown letters from uncapped_factors", () => {
    const route = {
      ...FULL_ROUTE,
      counting: "uncapped",
      uncapped_factors: ["J", "H", "Z", "A"],
    } as unknown as SurveyRoute
    expect(canonicalSurveyRoute(route).uncapped_factors).toEqual(["A", "J"])
  })

  it("drops the complement for the full parcours", () => {
    const route = { ...FULL_ROUTE, complement: { done: true, total_surface_ha: 9 } }
    expect(canonicalSurveyRoute(route)).not.toHaveProperty("complement")
  })

  it("drops total_surface_ha when the complement was not done", () => {
    const route = {
      ...SPEC_EXAMPLE,
      complement: { done: false, total_surface_ha: 15 },
    }
    expect(canonicalSurveyRoute(route).complement).toEqual({ done: false })
  })

  it("keeps a done complement without a total as done only", () => {
    const route = { ...SPEC_EXAMPLE, complement: { done: true } }
    expect(canonicalSurveyRoute(route).complement).toEqual({ done: true })
  })

  it("rounds the complement total", () => {
    const route = { ...SPEC_EXAMPLE, complement: { done: true, total_surface_ha: 15.678 } }
    expect(canonicalSurveyRoute(route).complement).toEqual({ done: true, total_surface_ha: 15.68 })
  })

  it("keeps a partial route without complement as it is", () => {
    const route = { ...SPEC_EXAMPLE, complement: undefined }
    expect(canonicalSurveyRoute(route)).not.toHaveProperty("complement")
  })

  it("drops undefined values and unknown keys, including the first-draft keys", () => {
    const route = {
      ...FULL_ROUTE,
      extra: "x",
      group_name: "Placette 1",
      sample_total_ha: 4,
      guide: {
        chosen_by: "guide",
        suggested: { method: "full", counting: "capped", why: "x" },
        answers: { surface_ha: 3, homogeneity: undefined, objective: "study", narrow: false },
        note: "x",
      },
    } as unknown as SurveyRoute
    expect(canonicalSurveyRoute(route)).toEqual({
      version: 1,
      method: "full",
      counting: "capped",
      zone_surface_ha: 3,
      guide: {
        chosen_by: "guide",
        suggested: { method: "full", counting: "capped" },
        answers: { surface_ha: 3, narrow: false },
      },
    })
  })

  it("is idempotent on every fixture", () => {
    for (const route of [SPEC_EXAMPLE, FULL_ROUTE, UNCAPPED_ROUTE]) {
      const once = canonicalSurveyRoute(route)
      expect(canonicalSurveyRoute(once)).toEqual(once)
      expect(once).toEqual(route)
    }
    const messy = {
      ...UNCAPPED_ROUTE,
      uncapped_factors: ["J", "A", "C", "A"],
      zone_surface_ha: 2.4999,
    } as unknown as SurveyRoute
    const once = canonicalSurveyRoute(messy)
    expect(canonicalSurveyRoute(once)).toEqual(once)
  })

  it("does not change its input", () => {
    const route = clone(UNCAPPED_ROUTE)
    canonicalSurveyRoute(route)
    expect(route).toEqual(UNCAPPED_ROUTE)
  })
})

describe("validateSurveyRoute", () => {
  it("accepts canonical records, the spec example included", () => {
    expect(validateSurveyRoute(SPEC_EXAMPLE)).toEqual([])
    expect(validateSurveyRoute(FULL_ROUTE)).toEqual([])
    expect(validateSurveyRoute(UNCAPPED_ROUTE)).toEqual([])
    expect(validateSurveyRoute(withChange(SPEC_EXAMPLE, { complement: { done: false } }))).toEqual(
      [],
    )
  })

  it("reports an absent record: the route is mandatory", () => {
    expect(validateSurveyRoute(null)).toEqual(["route_missing"])
    expect(validateSurveyRoute(undefined)).toEqual(["route_missing"])
  })

  it("refuses a value that is not an object", () => {
    expect(validateSurveyRoute("full")).toEqual(["route_not_object"])
    expect(validateSurveyRoute([])).toEqual(["route_not_object"])
    expect(validateSurveyRoute(3)).toEqual(["route_not_object"])
  })

  it("ignores unknown extra keys", () => {
    expect(validateSurveyRoute({ ...FULL_ROUTE, phase31_trace: { id: "x" } })).toEqual([])
  })

  const cases: [string, unknown, string][] = [
    ["version 2", withChange(FULL_ROUTE, { version: 2 }), "route_version_invalid"],
    ["no version", withChange(FULL_ROUTE, { version: undefined }), "route_version_invalid"],
    ["bad method", withChange(FULL_ROUTE, { method: "typological" }), "route_method_invalid"],
    ["no method", withChange(FULL_ROUTE, { method: undefined }), "route_method_invalid"],
    ["bad counting", withChange(FULL_ROUTE, { counting: "rapide" }), "route_counting_invalid"],
    ["zone 0", withChange(FULL_ROUTE, { zone_surface_ha: 0 }), "route_zone_invalid"],
    ["zone negative", withChange(FULL_ROUTE, { zone_surface_ha: -1 }), "route_zone_invalid"],
    ["zone absent", withChange(FULL_ROUTE, { zone_surface_ha: undefined }), "route_zone_invalid"],
    ["zone text", withChange(FULL_ROUTE, { zone_surface_ha: "3" }), "route_zone_invalid"],
    ["zone NaN", withChange(FULL_ROUTE, { zone_surface_ha: NaN }), "route_zone_invalid"],
    ["zone above max", withChange(FULL_ROUTE, { zone_surface_ha: 5000.01 }), "route_zone_invalid"],
    ["zone not rounded", withChange(FULL_ROUTE, { zone_surface_ha: 1.234 }), "route_zone_invalid"],
    [
      "uncapped with no factor",
      withChange(UNCAPPED_ROUTE, { uncapped_factors: undefined }),
      "route_uncapped_factors_invalid",
    ],
    [
      "uncapped with an empty list",
      withChange(UNCAPPED_ROUTE, { uncapped_factors: [] }),
      "route_uncapped_factors_invalid",
    ],
    [
      "uncapped with H",
      withChange(UNCAPPED_ROUTE, { uncapped_factors: ["A", "H"] }),
      "route_uncapped_factors_invalid",
    ],
    [
      "uncapped with a duplicate",
      withChange(UNCAPPED_ROUTE, { uncapped_factors: ["A", "A"] }),
      "route_uncapped_factors_invalid",
    ],
    [
      "uncapped not sorted",
      withChange(UNCAPPED_ROUTE, { uncapped_factors: ["C", "A"] }),
      "route_uncapped_factors_invalid",
    ],
    [
      "uncapped not a list",
      withChange(UNCAPPED_ROUTE, { uncapped_factors: "A" }),
      "route_uncapped_factors_invalid",
    ],
    [
      "capped with factors",
      withChange(FULL_ROUTE, { uncapped_factors: ["A"] }),
      "route_uncapped_factors_unexpected",
    ],
    [
      "partial without complement",
      withChange(SPEC_EXAMPLE, { complement: undefined }),
      "route_complement_missing",
    ],
    [
      "complement on full",
      withChange(FULL_ROUTE, { complement: { done: false } }),
      "route_complement_unexpected",
    ],
    [
      "complement not an object",
      withChange(SPEC_EXAMPLE, { complement: true }),
      "route_complement_invalid",
    ],
    [
      "complement done not boolean",
      withChange(SPEC_EXAMPLE, { complement: { done: "yes" } }),
      "route_complement_invalid",
    ],
    [
      "done complement without total",
      withChange(SPEC_EXAMPLE, { complement: { done: true } }),
      "route_complement_invalid",
    ],
    [
      "total below the zone",
      withChange(SPEC_EXAMPLE, { complement: { done: true, total_surface_ha: 1 } }),
      "route_complement_invalid",
    ],
    [
      "total above the max",
      withChange(SPEC_EXAMPLE, { complement: { done: true, total_surface_ha: 5001 } }),
      "route_complement_invalid",
    ],
    [
      "total with a complement not done",
      withChange(SPEC_EXAMPLE, { complement: { done: false, total_surface_ha: 15 } }),
      "route_complement_invalid",
    ],
    ["no guide", withChange(FULL_ROUTE, { guide: undefined }), "route_guide_invalid"],
    ["guide not an object", withChange(FULL_ROUTE, { guide: "guide" }), "route_guide_invalid"],
    [
      "bad chosen_by",
      withChange(FULL_ROUTE, { guide: { chosen_by: "robot" } }),
      "route_guide_invalid",
    ],
    [
      "suggestion not an object",
      withChange(FULL_ROUTE, { guide: { chosen_by: "guide", suggested: "full" } }),
      "route_guide_invalid",
    ],
    [
      "suggestion with a bad method",
      withChange(FULL_ROUTE, {
        guide: { chosen_by: "guide", suggested: { method: "x", counting: "capped" } },
      }),
      "route_guide_invalid",
    ],
    [
      "suggestion with a bad counting",
      withChange(FULL_ROUTE, {
        guide: { chosen_by: "guide", suggested: { method: "full", counting: "x" } },
      }),
      "route_guide_invalid",
    ],
    [
      "answers without surface_ha",
      withChange(FULL_ROUTE, { guide: { chosen_by: "guide", answers: { narrow: true } } }),
      "route_answers_invalid",
    ],
    [
      "answers not an object",
      withChange(FULL_ROUTE, { guide: { chosen_by: "guide", answers: 12 } }),
      "route_answers_invalid",
    ],
    [
      "negative answer surface",
      withChange(FULL_ROUTE, { guide: { chosen_by: "guide", answers: { surface_ha: -2 } } }),
      "route_answers_invalid",
    ],
    [
      "bad homogeneity",
      withChange(FULL_ROUTE, {
        guide: { chosen_by: "guide", answers: { surface_ha: 3, homogeneity: "x" } },
      }),
      "route_answers_invalid",
    ],
    [
      "bad experience",
      withChange(FULL_ROUTE, {
        guide: { chosen_by: "guide", answers: { surface_ha: 3, experience: "expert" } },
      }),
      "route_answers_invalid",
    ],
    [
      "hours above the max",
      withChange(FULL_ROUTE, {
        guide: { chosen_by: "guide", answers: { surface_ha: 3, hours_available: 25 } },
      }),
      "route_answers_invalid",
    ],
    [
      "hours zero",
      withChange(FULL_ROUTE, {
        guide: { chosen_by: "guide", answers: { surface_ha: 3, hours_available: 0 } },
      }),
      "route_answers_invalid",
    ],
    [
      "difficulty not boolean",
      withChange(FULL_ROUTE, {
        guide: { chosen_by: "guide", answers: { surface_ha: 3, difficulty: "oui" } },
      }),
      "route_answers_invalid",
    ],
    [
      "subdivided not boolean",
      withChange(FULL_ROUTE, {
        guide: { chosen_by: "guide", answers: { surface_ha: 3, subdivided: 1 } },
      }),
      "route_answers_invalid",
    ],
    [
      "serialized size above the max",
      withChange(FULL_ROUTE, { note: "x".repeat(ROUTE_RECORD_MAX_BYTES) }),
      "route_too_large",
    ],
  ]

  it.each(cases)("%s gives the matching code", (_label, value, code) => {
    expect(validateSurveyRoute(value)).toEqual([code])
  })

  it("reports several issues once each, in the order of the constant", () => {
    const issues = validateSurveyRoute({
      version: 2,
      method: "x",
      counting: "y",
      zone_surface_ha: 0,
      guide: null,
    })
    expect(issues).toEqual([
      "route_version_invalid",
      "route_method_invalid",
      "route_counting_invalid",
      "route_zone_invalid",
      "route_guide_invalid",
    ])
    expect(new Set(issues).size).toBe(issues.length)
  })

  it("has no code that is never produced", () => {
    const produced = new Set<string>(["route_missing", "route_not_object"])
    for (const [, value] of cases) for (const code of validateSurveyRoute(value)) produced.add(code)
    expect([...produced].sort()).toEqual([...SURVEY_ROUTE_ISSUE_CODES].sort())
  })
})

describe("readSurveyRoute", () => {
  it("returns the canonical record of a valid one, without unknown keys", () => {
    expect(readSurveyRoute({ ...SPEC_EXAMPLE, extra: 1 })).toEqual(SPEC_EXAMPLE)
  })

  it("returns null for an absent, damaged or older record", () => {
    expect(readSurveyRoute(null)).toBeNull()
    expect(readSurveyRoute(undefined)).toBeNull()
    expect(readSurveyRoute("x")).toBeNull()
    expect(readSurveyRoute(withChange(FULL_ROUTE, { version: 2 }))).toBeNull()
    expect(readSurveyRoute({})).toBeNull()
  })
})
