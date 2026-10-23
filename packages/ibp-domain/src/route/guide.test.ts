import type { RouteRecommendation, RouteRuleCase, RouteRuleExample } from "./index"
import {
  LARGE_STAND_OPTIONS,
  PARTIAL_OVER_HALF_SHARE,
  PARTIAL_SAMPLE_MIN_HA,
  PARTIAL_SAMPLE_SHARE_HETEROGENEOUS,
  PARTIAL_SAMPLE_SHARE_HOMOGENEOUS,
  ROUTE_ADVICE_CODES,
  ROUTE_FULL_MAX_HA,
  ROUTE_MINUTES_PER_HA_EASY,
  ROUTE_MINUTES_PER_HA_HARD,
  ROUTE_NARROW_WIDTH_M,
  ROUTE_RULE_CASES,
  ROUTE_RULE_IDS,
  ROUTE_QUESTION_IDS,
  ROUTE_REASON_CODES,
  ROUTE_SMALL_STAND_HA,
  ROUTE_SUBDIVIDE_HETEROGENEOUS_HA,
  ROUTE_SUBDIVIDE_HOMOGENEOUS_HA,
  ROUTE_SURFACE_ERROR_CODES,
  ROUTE_TINY_STAND_HA,
  ROUTE_WARNING_CODES,
  ROUTE_ZONE_ISSUE_CODES,
  ROUTE_ZONE_ISSUE_SEVERITY,
  UNCAPPABLE_FACTORS,
  UNCAPPED_PRESETS,
  UNCAPPED_PRESET_IDS,
  defaultCountingFor,
  isUncappedSelectionValid,
  recommendRoute,
  routeAdviceFor,
  routeQuestionsFor,
  routeZoneIssues,
  suggestedZoneHa,
  sumPlotSurfacesHa,
  uncappedFactorsForPreset,
} from "./index"

describe("route guide constants (spec section 5, validated 2026-10-14)", () => {
  it("holds the thresholds of the validated spec", () => {
    expect(ROUTE_TINY_STAND_HA).toBe(0.5)
    expect(ROUTE_SMALL_STAND_HA).toBe(1)
    expect(ROUTE_FULL_MAX_HA).toBe(5)
    expect(ROUTE_SUBDIVIDE_HETEROGENEOUS_HA).toBe(10)
    expect(ROUTE_SUBDIVIDE_HOMOGENEOUS_HA).toBe(20)
    expect(PARTIAL_SAMPLE_MIN_HA).toBe(1)
    expect(PARTIAL_SAMPLE_SHARE_HOMOGENEOUS).toBe(0.1)
    expect(PARTIAL_SAMPLE_SHARE_HETEROGENEOUS).toBe(0.2)
    expect(PARTIAL_OVER_HALF_SHARE).toBe(0.5)
    expect(ROUTE_NARROW_WIDTH_M).toBe(100)
    expect(ROUTE_MINUTES_PER_HA_EASY).toEqual({ min: 15, max: 20 })
    expect(ROUTE_MINUTES_PER_HA_HARD).toEqual({ min: 25, max: 30 })
  })

  it("lists exactly the codes of spec sections 4 to 6", () => {
    expect(ROUTE_QUESTION_IDS).toEqual(["surface", "homogeneity", "difficulty", "narrow", "refine"])
    expect(ROUTE_REASON_CODES).toEqual([
      "whole_stand_small",
      "whole_stand_heterogeneous",
      "partial_hard_to_observe",
      "partial_homogeneous",
      "partial_medium_stand",
      "large_stand",
      "partial_strip_why",
      "partial_plot_why",
      "complement_advised",
      "capped_default",
    ])
    expect(ROUTE_WARNING_CODES).toEqual(["small_stand", "partial_over_half"])
    expect(ROUTE_ADVICE_CODES).toEqual(["duration", "time_short", "beginner", "uncapped_longer"])
    expect(ROUTE_SURFACE_ERROR_CODES).toEqual(["surface_missing", "surface_invalid"])
    expect(LARGE_STAND_OPTIONS).toEqual(["subdivide", "partial"])
    expect(ROUTE_ZONE_ISSUE_CODES).toEqual([
      "zone_not_positive",
      "zone_too_large",
      "zone_above_stand",
      "partial_over_half",
      "partial_below_minimum",
      "complement_below_zone",
    ])
    expect(UNCAPPED_PRESET_IDS).toEqual(["all_factors", "always_max", "minimum", "custom"])
  })

  it("creates no code for a linear stand (O-10) and none for a purpose or a systematic group", () => {
    const all: readonly string[] = [...ROUTE_REASON_CODES, ...ROUTE_WARNING_CODES]
    expect(all).not.toContain("linear_stand_unsupported")
    expect(ROUTE_ADVICE_CODES).not.toContain("group_pending" as never)
  })

  it("marks each zone issue as an error or a warning as the spec table does", () => {
    expect(ROUTE_ZONE_ISSUE_SEVERITY).toEqual({
      zone_not_positive: "error",
      zone_too_large: "error",
      zone_above_stand: "error",
      partial_over_half: "warning",
      partial_below_minimum: "warning",
      complement_below_zone: "error",
    })
  })
})

describe("defaultCountingFor (R-16)", () => {
  it("is capped for the three parcours", () => {
    expect(defaultCountingFor("full")).toBe("capped")
    expect(defaultCountingFor("partial_strip")).toBe("capped")
    expect(defaultCountingFor("partial_plot")).toBe("capped")
  })
})

describe("uncapped presets (R-17)", () => {
  it("lists the factors of each preset", () => {
    expect(UNCAPPED_PRESETS.all_factors).toEqual(["A", "B", "C", "D", "E", "F", "G", "I", "J"])
    expect(UNCAPPED_PRESETS.always_max).toEqual(["A", "C", "D", "E", "F", "I", "J"])
    expect(UNCAPPED_PRESETS.minimum).toEqual(["C", "D", "E"])
    expect(UNCAPPED_PRESETS.custom).toEqual([])
  })

  it("only holds uncappable factors, never H", () => {
    for (const id of UNCAPPED_PRESET_IDS) {
      for (const factor of UNCAPPED_PRESETS[id]) {
        expect(UNCAPPABLE_FACTORS).toContain(factor)
        expect(factor).not.toBe("H")
      }
    }
  })

  it("returns a sorted copy that does not alias the preset", () => {
    const minimum = uncappedFactorsForPreset("minimum")
    expect(minimum).toEqual(["C", "D", "E"])
    expect(minimum).not.toBe(UNCAPPED_PRESETS.minimum)
    minimum.push("J")
    expect(UNCAPPED_PRESETS.minimum).toEqual(["C", "D", "E"])
    expect(uncappedFactorsForPreset("custom")).toEqual([])
  })

  it("accepts a selection of at least one uncappable factor (R-17#custom-empty)", () => {
    expect(isUncappedSelectionValid([])).toBe(false)
    expect(isUncappedSelectionValid(["C"])).toBe(true)
    expect(isUncappedSelectionValid(["A", "B", "C", "D", "E", "F", "G", "I", "J"])).toBe(true)
    expect(isUncappedSelectionValid(["H"])).toBe(false)
    expect(isUncappedSelectionValid(["C", "H"])).toBe(false)
    expect(isUncappedSelectionValid(["Z"])).toBe(false)
  })
})

describe("suggestedZoneHa (R-13)", () => {
  it("is the stand surface for the full parcours", () => {
    expect(suggestedZoneHa("full", 2.4)).toBe(2.4)
    expect(suggestedZoneHa("full", 1.005 * 4)).toBe(4.02)
  })

  it("takes 10 % of a homogeneous and 20 % of a heterogeneous stand", () => {
    expect(suggestedZoneHa("partial_plot", 30, "homogeneous")).toBe(3)
    expect(suggestedZoneHa("partial_strip", 30, "heterogeneous")).toBe(6)
    expect(suggestedZoneHa("partial_strip", 8, "heterogeneous")).toBe(1.6)
    expect(suggestedZoneHa("partial_strip", 5.01, "heterogeneous")).toBe(1)
  })

  it("never goes under 1 ha nor above the stand", () => {
    expect(suggestedZoneHa("partial_plot", 4, "homogeneous")).toBe(1)
    expect(suggestedZoneHa("partial_plot", 0.8, "homogeneous")).toBe(0.8)
  })

  it("invents nothing when the stand or the homogeneity is unknown", () => {
    expect(suggestedZoneHa("partial_plot", 30)).toBeNull()
    expect(suggestedZoneHa("partial_plot", undefined, "homogeneous")).toBeNull()
    expect(suggestedZoneHa("full", undefined)).toBeNull()
    expect(suggestedZoneHa("full", 0)).toBeNull()
    expect(suggestedZoneHa("full", Number.NaN)).toBeNull()
    expect(suggestedZoneHa("full", 5000.01)).toBeNull()
  })

  it("never returns a zone that rounds to zero", () => {
    expect(suggestedZoneHa("full", 0.004)).toBe(0.01)
  })
})

describe("sumPlotSurfacesHa (R-15)", () => {
  it("sums the plots of one sheet, rounded to 2 decimals", () => {
    expect(sumPlotSurfacesHa([0.5, 0.5, 0.4])).toBe(1.4)
    expect(sumPlotSurfacesHa([0.1, 0.2])).toBe(0.3)
    expect(sumPlotSurfacesHa([])).toBe(0)
  })
})

describe("routeZoneIssues", () => {
  const partial = { method: "partial_plot", standHa: 8 } as const

  it("flags an absent or not positive zone and stops there", () => {
    expect(routeZoneIssues({ ...partial, zoneHa: 0 })).toEqual(["zone_not_positive"])
    expect(routeZoneIssues({ ...partial, zoneHa: -1 })).toEqual(["zone_not_positive"])
    expect(routeZoneIssues({ ...partial, zoneHa: undefined })).toEqual(["zone_not_positive"])
    expect(routeZoneIssues({ ...partial, zoneHa: null })).toEqual(["zone_not_positive"])
    expect(routeZoneIssues({ ...partial, zoneHa: Number.NaN })).toEqual(["zone_not_positive"])
  })

  it("flags a zone above the largest surface", () => {
    expect(routeZoneIssues({ method: "full", zoneHa: 5000, standHa: null })).toEqual([])
    expect(routeZoneIssues({ method: "full", zoneHa: 5000.01 })).toEqual(["zone_too_large"])
  })

  it("flags a zone above the stand", () => {
    expect(routeZoneIssues({ method: "full", zoneHa: 2.5, standHa: 2 })).toEqual([
      "zone_above_stand",
    ])
    expect(routeZoneIssues({ method: "full", zoneHa: 2, standHa: 2 })).toEqual([])
  })

  it("warns of a partial zone above half the stand", () => {
    expect(routeZoneIssues({ ...partial, zoneHa: 4.5 })).toEqual(["partial_over_half"])
    expect(routeZoneIssues({ ...partial, zoneHa: 4 })).toEqual([])
    expect(routeZoneIssues({ method: "full", zoneHa: 4.5, standHa: 8 })).toEqual([])
  })

  it("warns of a partial zone under 1 ha", () => {
    expect(routeZoneIssues({ ...partial, zoneHa: 0.9 })).toEqual(["partial_below_minimum"])
    expect(routeZoneIssues({ ...partial, zoneHa: 1 })).toEqual([])
    expect(routeZoneIssues({ method: "full", zoneHa: 0.9, standHa: 8 })).toEqual([])
  })

  it("flags a done complement evaluated under the zone", () => {
    const complement = (total: number) => ({ done: true, total_surface_ha: total })
    expect(routeZoneIssues({ ...partial, zoneHa: 2, complement: complement(1.5) })).toEqual([
      "complement_below_zone",
    ])
    expect(routeZoneIssues({ ...partial, zoneHa: 2, complement: complement(2) })).toEqual([])
    expect(routeZoneIssues({ ...partial, zoneHa: 2, complement: { done: false } })).toEqual([])
    expect(routeZoneIssues({ ...partial, zoneHa: 2, complement: { done: true } })).toEqual([])
    expect(routeZoneIssues({ ...partial, zoneHa: 2, complement: null })).toEqual([])
  })

  it("runs only the stand-free checks without a stand surface", () => {
    expect(routeZoneIssues({ method: "partial_plot", zoneHa: 99 })).toEqual([])
    expect(routeZoneIssues({ method: "partial_plot", zoneHa: 0.9, standHa: undefined })).toEqual([
      "partial_below_minimum",
    ])
    expect(routeZoneIssues({ method: "partial_plot", zoneHa: 99, standHa: 0 })).toEqual([])
  })

  it("lists several issues in the order of ROUTE_ZONE_ISSUE_CODES", () => {
    expect(
      routeZoneIssues({
        method: "partial_strip",
        zoneHa: 0.9,
        standHa: 0.5,
        complement: { done: true, total_surface_ha: 0.2 },
      }),
    ).toEqual([
      "zone_above_stand",
      "partial_over_half",
      "partial_below_minimum",
      "complement_below_zone",
    ])
  })
})

describe("routeAdviceFor (R-18 to R-21)", () => {
  it("estimates the duration of the sampled surface (R-19)", () => {
    expect(
      routeAdviceFor({
        method: "full",
        counting: "capped",
        zoneHa: 4,
        answers: { surface_ha: 4 },
      }),
    ).toEqual({ advice: ["duration"], estimated_minutes: { min: 60, max: 80 } })
    expect(
      routeAdviceFor({
        method: "partial_strip",
        counting: "capped",
        zoneHa: 1,
        answers: { surface_ha: 3, difficulty: true },
      }),
    ).toEqual({ advice: ["duration"], estimated_minutes: { min: 25, max: 30 } })
    expect(
      routeAdviceFor({ method: "partial_plot", counting: "capped", zoneHa: 1.2, answers: {} }),
    ).toEqual({ advice: ["duration"], estimated_minutes: { min: 18, max: 24 } })
  })

  it("rounds the minutes to the minute", () => {
    expect(
      routeAdviceFor({ method: "full", counting: "capped", zoneHa: 4.5, answers: {} })
        .estimated_minutes,
    ).toEqual({ min: 68, max: 90 })
  })

  it("gives no duration without a usable zone", () => {
    for (const zoneHa of [undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(routeAdviceFor({ method: "full", counting: "capped", zoneHa, answers: {} })).toEqual({
        advice: [],
        estimated_minutes: null,
      })
    }
    expect(
      routeAdviceFor({
        method: "full",
        counting: "capped",
        zoneHa: undefined,
        answers: { hours_available: 0.1 },
      }).advice,
    ).toEqual([])
  })

  it("warns when the time available is under the minimum estimate (R-20)", () => {
    const base = { method: "full", counting: "capped", zoneHa: 4 } as const
    expect(routeAdviceFor({ ...base, answers: { hours_available: 0.5 } }).advice).toEqual([
      "duration",
      "time_short",
    ])
    expect(routeAdviceFor({ ...base, answers: { hours_available: 1 } }).advice).toEqual([
      "duration",
    ])
    expect(routeAdviceFor({ ...base, answers: { hours_available: 6 } }).advice).toEqual([
      "duration",
    ])
  })

  it("ignores a time available out of range", () => {
    const base = { method: "full", counting: "capped", zoneHa: 4 } as const
    for (const hours of [0, -2, Number.NaN, 24.5, Number.POSITIVE_INFINITY]) {
      expect(routeAdviceFor({ ...base, answers: { hours_available: hours } }).advice).toEqual([
        "duration",
      ])
    }
  })

  it("advises more time for a beginner, without a number (R-21)", () => {
    const base = { method: "full", counting: "capped", zoneHa: 4 } as const
    expect(routeAdviceFor({ ...base, answers: { experience: "beginner" } }).advice).toEqual([
      "duration",
      "beginner",
    ])
    expect(routeAdviceFor({ ...base, answers: { experience: "regular" } }).advice).toEqual([
      "duration",
    ])
  })

  it("advises a longer survey for the uncapped counting (R-18)", () => {
    const base = { method: "full", zoneHa: 4, answers: {} } as const
    expect(routeAdviceFor({ ...base, counting: "uncapped" }).advice).toEqual([
      "duration",
      "uncapped_longer",
    ])
    expect(routeAdviceFor({ ...base, counting: "capped" }).advice).toEqual(["duration"])
  })

  it("lists every advice in the order of ROUTE_ADVICE_CODES", () => {
    expect(
      routeAdviceFor({
        method: "full",
        counting: "uncapped",
        zoneHa: 4,
        answers: { hours_available: 0.5, experience: "beginner" },
      }).advice,
    ).toEqual([...ROUTE_ADVICE_CODES])
  })
})

describe("routeQuestionsFor (spec section 4, D-05)", () => {
  it("asks the surface first and offers the refine section last", () => {
    expect(routeQuestionsFor({})).toEqual(["surface", "refine"])
    expect(routeQuestionsFor({ surface_ha: 0 })).toEqual(["surface", "refine"])
    expect(routeQuestionsFor({ surface_ha: 6000 })).toEqual(["surface", "refine"])
  })

  it("asks nothing more for a stand of 1 ha or less (R-07)", () => {
    expect(routeQuestionsFor({ surface_ha: 0.8 })).toEqual(["surface", "refine"])
    expect(routeQuestionsFor({ surface_ha: 1 })).toEqual(["surface", "refine"])
  })

  it("asks homogeneity and difficulty between 1 and 5 ha", () => {
    expect(routeQuestionsFor({ surface_ha: 2.4 })).toEqual([
      "surface",
      "homogeneity",
      "difficulty",
      "refine",
    ])
  })

  it("asks narrow only for a partial parcours of a homogeneous, easy stand", () => {
    const base = { surface_ha: 2, homogeneity: "homogeneous" } as const
    expect(routeQuestionsFor({ ...base, difficulty: false })).toEqual([
      "surface",
      "homogeneity",
      "difficulty",
      "narrow",
      "refine",
    ])
    expect(routeQuestionsFor({ ...base, difficulty: true })).toEqual([
      "surface",
      "homogeneity",
      "difficulty",
      "refine",
    ])
    expect(routeQuestionsFor({ ...base })).toEqual([
      "surface",
      "homogeneity",
      "difficulty",
      "refine",
    ])
    // A heterogeneous easy stand is walked in full: narrow would change nothing.
    expect(
      routeQuestionsFor({ surface_ha: 2, homogeneity: "heterogeneous", difficulty: false }),
    ).toEqual(["surface", "homogeneity", "difficulty", "refine"])
  })

  it("asks difficulty above 5 ha only for a homogeneous stand", () => {
    expect(routeQuestionsFor({ surface_ha: 8 })).toEqual(["surface", "homogeneity", "refine"])
    expect(routeQuestionsFor({ surface_ha: 8, homogeneity: "heterogeneous" })).toEqual([
      "surface",
      "homogeneity",
      "refine",
    ])
    expect(routeQuestionsFor({ surface_ha: 8, homogeneity: "homogeneous" })).toEqual([
      "surface",
      "homogeneity",
      "difficulty",
      "refine",
    ])
  })

  it("asks nothing after the options of a large stand until partial is chosen", () => {
    const large = { surface_ha: 25, homogeneity: "homogeneous" } as const
    expect(routeQuestionsFor(large)).toEqual(["surface", "homogeneity", "refine"])
    expect(routeQuestionsFor(large, { largeStandOption: "subdivide" })).toEqual([
      "surface",
      "homogeneity",
      "refine",
    ])
    expect(routeQuestionsFor(large, { largeStandOption: "partial" })).toEqual([
      "surface",
      "homogeneity",
      "difficulty",
      "refine",
    ])
    expect(
      routeQuestionsFor(
        { surface_ha: 12, homogeneity: "heterogeneous" },
        { largeStandOption: "partial" },
      ),
    ).toEqual(["surface", "homogeneity", "refine"])
  })

  it("never asks about experience or hours, which are information only (O-04)", () => {
    const withRefine = routeQuestionsFor({
      surface_ha: 2,
      homogeneity: "homogeneous",
      difficulty: false,
      narrow: true,
      experience: "beginner",
      hours_available: 0.5,
    })
    expect(withRefine).toEqual(
      routeQuestionsFor({
        surface_ha: 2,
        homogeneity: "homogeneous",
        difficulty: false,
        narrow: true,
      }),
    )
    expect(withRefine.filter((id) => id === "refine")).toHaveLength(1)
    expect(withRefine[withRefine.length - 1]).toBe("refine")
  })
})

describe("recommendRoute", () => {
  function route(result: RouteRecommendation) {
    if (result.status !== "route") throw new Error(`expected a route, got ${result.status}`)
    return result
  }

  it("treats a value that is not a number as an invalid surface", () => {
    expect(recommendRoute({ surface_ha: "8" as unknown as number })).toEqual({
      status: "needs_surface",
      error: "surface_invalid",
    })
    expect(recommendRoute({ surface_ha: null as unknown as number })).toEqual({
      status: "needs_surface",
      error: "surface_missing",
    })
  })

  it("ignores an answer that is not one of the closed values", () => {
    const result = recommendRoute({
      surface_ha: 3,
      homogeneity: "mixed" as unknown as "homogeneous",
      difficulty: "yes" as unknown as boolean,
    })
    expect(result).toEqual({
      status: "incomplete",
      questions: ["surface", "homogeneity", "difficulty", "refine"],
      missing: ["homogeneity", "difficulty"],
    })
  })

  it("returns the options of a large stand with subdivide pre-selected (R-11b)", () => {
    expect(recommendRoute({ surface_ha: 30, homogeneity: "homogeneous" })).toEqual({
      status: "options",
      options: ["subdivide", "partial"],
      preselected_option: "subdivide",
      reasons: ["large_stand"],
    })
    // The returned arrays are copies: changing them does not change the constants.
    const options = recommendRoute({ surface_ha: 30, homogeneity: "homogeneous" })
    if (options.status === "options") options.options.push("partial")
    expect(LARGE_STAND_OPTIONS).toEqual(["subdivide", "partial"])
  })

  it("keeps the same proposal whatever the experience and the hours (R-21#no-effect)", () => {
    const answers = {
      surface_ha: 15,
      homogeneity: "homogeneous",
      difficulty: false,
      narrow: false,
    } as const
    const reference = route(recommendRoute(answers))
    for (const experience of [undefined, "regular", "beginner"] as const) {
      for (const hours_available of [undefined, 0.1, 1, 24, 99]) {
        const result = route(recommendRoute({ ...answers, experience, hours_available }))
        expect(result.method).toBe(reference.method)
        expect(result.counting).toBe(reference.counting)
        expect(result.zone_surface_ha).toBe(reference.zone_surface_ha)
        expect(result.reasons).toEqual(reference.reasons)
        expect(result.complement).toEqual(reference.complement)
        expect(result.warnings).toEqual(reference.warnings)
      }
    }
  })

  it("never proposes the uncapped counting (R-16, O-01)", () => {
    const result = route(
      recommendRoute({ surface_ha: 4, homogeneity: "heterogeneous", difficulty: false }),
    )
    expect(result.counting).toBe("capped")
    expect(result.uncapped_factors).toEqual([])
    expect(result.advice).not.toContain("uncapped_longer")
  })

  it("keeps at most four reasons and never returns an empty list", () => {
    for (const rule of ROUTE_RULE_CASES) {
      for (const example of rule.examples) {
        if (example.kind !== "recommend") continue
        const result = recommendRoute(example.answers, example.choice)
        if (result.status === "route") {
          expect(result.reasons.length).toBeGreaterThan(0)
          expect(result.reasons.length).toBeLessThanOrEqual(4)
        }
      }
    }
  })

  it("never returns a zone that rounds to zero for a tiny stand", () => {
    const result = route(recommendRoute({ surface_ha: 0.004 }))
    expect(result.zone_surface_ha).toBe(0.01)
    expect(result.warnings).toEqual(["small_stand"])
  })

  it("lists the rules it applied, in order", () => {
    expect(route(recommendRoute({ surface_ha: 0.4 })).applied_rules).toEqual([
      "R-02",
      "R-07",
      "R-16",
      "R-19",
    ])
    expect(
      route(
        recommendRoute(
          {
            surface_ha: 12,
            homogeneity: "heterogeneous",
            experience: "beginner",
            hours_available: 0.1,
          },
          { largeStandOption: "partial" },
        ),
      ).applied_rules,
    ).toEqual(["R-11b", "R-11", "R-12a", "R-13", "R-14", "R-16", "R-19", "R-20", "R-21"])
    expect(
      route(recommendRoute({ surface_ha: 3, homogeneity: "homogeneous", difficulty: true }))
        .applied_rules,
    ).toEqual(["R-08", "R-12a", "R-13", "R-14", "R-16", "R-19"])
    expect(
      route(
        recommendRoute({
          surface_ha: 2,
          homogeneity: "homogeneous",
          difficulty: false,
          narrow: false,
        }),
      ).applied_rules,
    ).toEqual(["R-09", "R-12b", "R-13", "R-14", "R-16", "R-19"])
    expect(
      route(recommendRoute({ surface_ha: 4.5, homogeneity: "heterogeneous", difficulty: false }))
        .applied_rules,
    ).toEqual(["R-10", "R-16", "R-19"])
    expect(
      route(recommendRoute({ surface_ha: 0.4 })).applied_rules.every((id) =>
        (ROUTE_RULE_IDS as readonly string[]).includes(id),
      ),
    ).toBe(true)
  })

  it("keeps the zone of a proposal consistent with the zone checks", () => {
    const result = route(recommendRoute({ surface_ha: 8, homogeneity: "heterogeneous" }))
    expect(
      routeZoneIssues({
        method: result.method,
        zoneHa: result.zone_surface_ha,
        standHa: 8,
        complement: result.complement,
      }),
    ).toEqual([])
  })
})

describe("ROUTE_RULE_CASES (spec section 5, validated 2026-10-14)", () => {
  it("holds one case per rule id and one per boundary id, each id once", () => {
    const ids = ROUTE_RULE_CASES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter((id) => !id.includes("#"))).toEqual([...ROUTE_RULE_IDS])
    expect(ids.filter((id) => id.includes("#"))).toHaveLength(23)
    expect(ids).toHaveLength(43)
  })

  it("ties every case to a rule, a page and at least one example", () => {
    for (const c of ROUTE_RULE_CASES) {
      expect(ROUTE_RULE_IDS).toContain(c.rule)
      expect(c.id.startsWith(c.rule)).toBe(true)
      expect(c.source).toMatch(/p\. /)
      expect(c.examples.length).toBeGreaterThan(0)
    }
  })

  function runRecommend(example: Extract<RouteRuleExample, { kind: "recommend" }>) {
    const result = recommendRoute(example.answers, example.choice)
    expect(result).toMatchObject(example.expect)
    if (example.questions !== undefined) {
      expect(routeQuestionsFor(example.answers, example.choice)).toEqual(example.questions)
    }
  }

  function runZone(example: Extract<RouteRuleExample, { kind: "zone" }>) {
    const zoneHa = example.plots !== undefined ? sumPlotSurfacesHa(example.plots) : example.zone_ha
    if (example.expect_zone_ha !== undefined) expect(zoneHa).toBe(example.expect_zone_ha)
    expect(
      routeZoneIssues({
        method: example.method,
        zoneHa,
        standHa: example.stand_ha,
        complement: example.complement,
      }),
    ).toEqual(example.issues)
  }

  function run(example: RouteRuleExample) {
    switch (example.kind) {
      case "recommend":
        return runRecommend(example)
      case "zone":
        return runZone(example)
      case "advice":
        expect(routeAdviceFor(example.input)).toEqual({
          advice: example.advice,
          estimated_minutes: example.estimated_minutes,
        })
        return
      case "preset":
        expect(uncappedFactorsForPreset(example.preset)).toEqual(example.factors)
        expect(isUncappedSelectionValid(example.factors)).toBe(example.valid)
    }
  }

  it.each(ROUTE_RULE_CASES.map((c): [string, RouteRuleCase] => [c.id, c]))("%s", (_id, c) => {
    for (const example of c.examples) run(example)
  })
})
