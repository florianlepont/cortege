import { IBP_CAS_VALUES, casFromRegionStage, isIbpCas, usesCas3Scale } from "./cas"
import {
  DEFAULT_VEGETATION_STAGE_BY_REGION,
  REGION_VERSIONS,
  VEGETATION_STAGES_BY_REGION,
  normalizeRegion,
  normalizeVegetationStageForRegion,
  usesSubalpineScale,
} from "./region-stage"
import {
  ALLOWED_SCORES_BY_FACTOR,
  allowedScoresFor,
  isAllowedFactorScore,
  scoreFloweringPercent,
  scoreGenusCount,
  scoreStrataCount,
  scoreTreeDensity,
  scoreTypeCount,
} from "../rules/scales"
import { asNumber, isRecord, pickNumber } from "../input"

describe("region and stage model (v3.0)", () => {
  it("lists the two regions and their stages", () => {
    expect(REGION_VERSIONS).toEqual(["ACA", "M"])
    expect(VEGETATION_STAGES_BY_REGION.ACA).toEqual([
      "planitiaire",
      "collineen",
      "montagnard",
      "subalpin",
    ])
    expect(VEGETATION_STAGES_BY_REGION.M).toEqual([
      "thermo_mediterraneen",
      "meso_mediterraneen",
      "supra_mediterraneen",
    ])
    expect(DEFAULT_VEGETATION_STAGE_BY_REGION).toEqual({
      ACA: "planitiaire",
      M: "thermo_mediterraneen",
    })
  })

  it("normalizeRegion keeps ACA and M only", () => {
    expect(normalizeRegion("ACA")).toBe("ACA")
    expect(normalizeRegion("M")).toBe("M")
    expect(normalizeRegion("aca")).toBeNull()
    expect(normalizeRegion(undefined)).toBeNull()
    expect(normalizeRegion(3)).toBeNull()
  })

  it("normalizeVegetationStageForRegion keeps a stage of the region, else the default", () => {
    expect(normalizeVegetationStageForRegion("ACA", "subalpin")).toBe("subalpin")
    expect(normalizeVegetationStageForRegion("M", "meso_mediterraneen")).toBe("meso_mediterraneen")
    expect(normalizeVegetationStageForRegion("ACA", "montagnard_mediterraneen")).toBe("montagnard")
    expect(normalizeVegetationStageForRegion("M", "subalpin")).toBe("thermo_mediterraneen")
    expect(normalizeVegetationStageForRegion("ACA", 12)).toBe("planitiaire")
    expect(normalizeVegetationStageForRegion("ACA", null)).toBe("planitiaire")
  })

  it("usesSubalpineScale only for ACA + subalpin", () => {
    expect(usesSubalpineScale("ACA", "subalpin")).toBe(true)
    expect(usesSubalpineScale("M", "subalpin")).toBe(false)
    expect(usesSubalpineScale("ACA", "collineen")).toBe(false)
    expect(usesSubalpineScale(undefined, "subalpin")).toBe(false)
    expect(usesSubalpineScale("M", "montagnard_mediterraneen")).toBe(false)
  })
})

describe("cas model (v3.2)", () => {
  it("lists cas 1 to 4 and recognises them", () => {
    expect(IBP_CAS_VALUES).toEqual([1, 2, 3, 4])
    expect(isIbpCas(1)).toBe(true)
    expect(isIbpCas(4)).toBe(true)
    expect(isIbpCas(0)).toBe(false)
    expect(isIbpCas(5)).toBe(false)
    expect(isIbpCas("3")).toBe(false)
    expect(isIbpCas(null)).toBe(false)
  })

  it.each([
    [{ ibp_cas: 3, ibp_cas3_scale: false }, true],
    [{ ibp_cas: 2, ibp_cas3_scale: true }, true],
    [{ ibp_cas: 2, ibp_cas3_scale: false }, false],
    [{ ibp_cas: 1, ibp_cas3_scale: undefined }, false],
    [{ ibp_cas: 1, ibp_cas3_scale: null }, false],
  ])("usesCas3Scale(%p) = %p", (input, expected) => {
    expect(usesCas3Scale(input)).toBe(expected)
  })

  it.each([
    ["ACA", "planitiaire", 1],
    ["ACA", "collineen", 1],
    ["ACA", "montagnard", 1],
    ["ACA", "montagnard_mediterraneen", 1],
    ["ACA", "subalpin", null],
    ["ACA", "meso_mediterraneen", null],
    ["ACA", undefined, null],
    ["M", "thermo_mediterraneen", 4],
    ["M", "meso_mediterraneen", 4],
    ["M", "supra_mediterraneen", null],
    ["M", "collineen", null],
    ["X", "collineen", null],
    [undefined, undefined, null],
  ])("casFromRegionStage(%p, %p) = %p", (region, stage, expected) => {
    expect(casFromRegionStage(region, stage)).toBe(expected)
  })
})

describe("allowed scores and scales", () => {
  it("A-F allow 0,1,2,5; G-J allow 0,2,5 (BUG-2)", () => {
    expect(ALLOWED_SCORES_BY_FACTOR.A).toEqual([0, 1, 2, 5])
    expect(ALLOWED_SCORES_BY_FACTOR.F).toEqual([0, 1, 2, 5])
    expect(ALLOWED_SCORES_BY_FACTOR.G).toEqual([0, 2, 5])
    expect(ALLOWED_SCORES_BY_FACTOR.H).toEqual([0, 2, 5])
    expect(allowedScoresFor("J")).toEqual([0, 2, 5])
    expect(isAllowedFactorScore("G", 1)).toBe(false)
    expect(isAllowedFactorScore("H", 1)).toBe(false)
    expect(isAllowedFactorScore("A", 1)).toBe(true)
    expect(isAllowedFactorScore("J", 2)).toBe(true)
    expect(isAllowedFactorScore("A", 3)).toBe(false)
    expect(isAllowedFactorScore("B", 2.5)).toBe(false)
  })

  it("A count scales: standard and restricted (subalpine / cas 3)", () => {
    expect([0, 1, 2, 3, 4, 5, 9].map((n) => scoreGenusCount(n, false))).toEqual([
      0, 0, 1, 2, 2, 5, 5,
    ])
    expect([0, 1, 2, 3, 7].map((n) => scoreGenusCount(n, true))).toEqual([0, 1, 2, 5, 5])
  })

  it("B strata, F density, I/J type counts", () => {
    expect([0, 1, 2, 3, 4, 5].map(scoreStrataCount)).toEqual([0, 0, 1, 2, 2, 5])
    expect([0, 1.9, 2, 2.9, 3, 7.9, 8].map(scoreTreeDensity)).toEqual([0, 0, 1, 1, 2, 2, 5])
    expect([0, 1, 2, 11].map(scoreTypeCount)).toEqual([0, 2, 5, 5])
  })

  it("G flowering scales: standard and restricted", () => {
    expect([0, 0.5, 1, 5, 5.1].map((p) => scoreFloweringPercent(p, false))).toEqual([
      0, 2, 5, 5, 2,
    ])
    expect([0, 0.5, 1, 60].map((p) => scoreFloweringPercent(p, true))).toEqual([0, 2, 5, 5])
  })
})

describe("input parsing", () => {
  it("asNumber reads finite numbers and numeric strings", () => {
    expect(asNumber(2)).toBe(2)
    expect(asNumber(" 3.5 ")).toBe(3.5)
    expect(asNumber("")).toBeNull()
    expect(asNumber("abc")).toBeNull()
    expect(asNumber(Number.NaN)).toBeNull()
    expect(asNumber(Infinity)).toBeNull()
    expect(asNumber(null)).toBeNull()
    expect(asNumber([1])).toBeNull()
  })

  it("pickNumber returns the first readable key", () => {
    expect(pickNumber({ a: "x", b: "4" }, ["a", "b"])).toBe(4)
    expect(pickNumber({}, ["a"])).toBeNull()
  })

  it("isRecord accepts plain objects only", () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord("x")).toBe(false)
  })
})
