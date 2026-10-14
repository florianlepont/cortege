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
  routeAdviceFor,
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
    expect(UNCAPPED_PRESET_IDS).toEqual(["all_factors", "mature", "always_max", "minimum", "custom"])
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
    expect(UNCAPPED_PRESETS.mature).toEqual(["A", "C", "D", "E", "F"])
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
    const mature = uncappedFactorsForPreset("mature")
    expect(mature).toEqual(["A", "C", "D", "E", "F"])
    expect(mature).not.toBe(UNCAPPED_PRESETS.mature)
    mature.push("J")
    expect(UNCAPPED_PRESETS.mature).toEqual(["A", "C", "D", "E", "F"])
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
