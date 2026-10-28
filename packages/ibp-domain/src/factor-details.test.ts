import {
  B_STRATUM_CODES,
  DMH_GROUP_CODES,
  DMH_GROUP_DENSITY_CAP_PER_HA,
  OPEN_AREAS_MAX_COUNT,
  STRATUM_MIN_COVER_PERCENT,
  UNCAPPED_DETAIL_KEYS,
  cappedDmhCounts,
  cappedDmhTotalPerHa,
  clampOpenAreaHa,
  dmhDensityPerHa,
  floweringPercentFromAreas,
  openAreasExceedSurface,
  readDmhCounts,
  readOpenAreasHa,
  readStrataCover,
  strataCountFromCover,
  sumOpenAreasHa,
} from "./factor-details"
import { ROUTE_SURFACE_MAX_HA } from "./route/record"

describe("codes and constants", () => {
  it("lists the five strata of the current B input", () => {
    expect(B_STRATUM_CODES).toEqual(["very_low", "low", "intermediate", "high", "herbaceous"])
  })

  it("lists dmh_01 to dmh_15 in order", () => {
    expect(DMH_GROUP_CODES).toHaveLength(15)
    expect(DMH_GROUP_CODES[0]).toBe("dmh_01")
    expect(DMH_GROUP_CODES[8]).toBe("dmh_09")
    expect(DMH_GROUP_CODES[14]).toBe("dmh_15")
  })

  it("names the detail keys, never the dmh_group_counts array key", () => {
    expect(UNCAPPED_DETAIL_KEYS).toEqual({
      B: ["strata_cover"],
      F: ["dmh_counts", "surface_ha"],
      G: ["open_areas_ha"],
    })
    expect(UNCAPPED_DETAIL_KEYS.F).not.toContain("dmh_group_counts")
  })

  it("keeps the spec thresholds", () => {
    expect(STRATUM_MIN_COVER_PERCENT).toBe(20)
    expect(DMH_GROUP_DENSITY_CAP_PER_HA).toBe(2)
  })
})

describe("strataCountFromCover", () => {
  it("counts a stratum at 20 % or more (19 no, 20 yes)", () => {
    expect(strataCountFromCover({ very_low: 25, low: 19, intermediate: 20, high: 60 })).toBe(3)
  })

  it("is 0 for an empty object", () => {
    expect(strataCountFromCover({})).toBe(0)
  })

  it("counts the five strata when all reach the threshold (the sum may exceed 100)", () => {
    expect(
      strataCountFromCover({
        very_low: 100,
        low: 100,
        intermediate: 100,
        high: 100,
        herbaceous: 20,
      }),
    ).toBe(5)
  })
})

describe("dmhDensityPerHa", () => {
  it("caps each group at 2 trees per hectare and names the capped groups", () => {
    expect(dmhDensityPerHa({ dmh_01: 5, dmh_02: 1 }, 2)).toEqual({
      trees_per_ha: 2.5,
      capped_groups: ["dmh_01"],
    })
  })

  it("does not cap a group exactly at the cap", () => {
    expect(dmhDensityPerHa({ dmh_03: 4 }, 2)).toEqual({ trees_per_ha: 2, capped_groups: [] })
  })

  it("does not round, so a threshold cannot be crossed by rounding", () => {
    const result = dmhDensityPerHa({ dmh_01: 1, dmh_02: 1, dmh_03: 1 }, 3)
    expect(result?.trees_per_ha).toBeCloseTo(1, 12)
    expect(dmhDensityPerHa({ dmh_01: 1 }, 3)?.trees_per_ha).toBe(1 / 3)
  })

  it("returns an empty density for no counts", () => {
    expect(dmhDensityPerHa({}, 1)).toEqual({ trees_per_ha: 0, capped_groups: [] })
  })

  it("returns null for a surface of 0, negative or not finite", () => {
    expect(dmhDensityPerHa({ dmh_01: 1 }, 0)).toBeNull()
    expect(dmhDensityPerHa({ dmh_01: 1 }, -1)).toBeNull()
    expect(dmhDensityPerHa({ dmh_01: 1 }, Number.NaN)).toBeNull()
    expect(dmhDensityPerHa({ dmh_01: 1 }, Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe("cappedDmhCounts and cappedDmhTotalPerHa (capped survey mode)", () => {
  it("holds each group at 2 trees per hectare, keeps the groups given, in code order", () => {
    const input = { dmh_05: 7, dmh_01: 1, dmh_12: 0 }
    const result = cappedDmhCounts(input)
    expect(result).toEqual({ dmh_01: 1, dmh_05: 2, dmh_12: 0 })
    expect(Object.keys(result)).toEqual(["dmh_01", "dmh_05", "dmh_12"])
    expect(input).toEqual({ dmh_05: 7, dmh_01: 1, dmh_12: 0 })
  })

  it("sums the capped counts with no surface and no rounding", () => {
    expect(cappedDmhTotalPerHa({})).toBe(0)
    expect(cappedDmhTotalPerHa({ dmh_01: 2, dmh_05: 2, dmh_12: 1 })).toBe(5)
    expect(cappedDmhTotalPerHa({ dmh_01: 9, dmh_02: 1 })).toBe(3)
  })

  it("is not limited to 8: the score classes already stop there", () => {
    const all = Object.fromEntries(DMH_GROUP_CODES.map((code) => [code, 2]))
    expect(cappedDmhTotalPerHa(all)).toBe(30)
  })

  it("agrees with the density of a one hectare surface", () => {
    const counts = { dmh_01: 3, dmh_02: 1, dmh_03: 2 }
    expect(cappedDmhTotalPerHa(counts)).toBe(dmhDensityPerHa(counts, 1)?.trees_per_ha)
  })
})

describe("readStrataCover", () => {
  it("keeps only known codes with finite values from 0 to 100", () => {
    expect(
      readStrataCover({
        very_low: 25,
        low: 0,
        intermediate: 100,
        high: 101,
        herbaceous: -1,
        unknown: 50,
      }),
    ).toEqual({ very_low: 25, low: 0, intermediate: 100 })
  })

  it("drops non-numeric and non-finite values", () => {
    expect(readStrataCover({ very_low: "30", low: Number.NaN, high: 40 })).toEqual({ high: 40 })
  })

  it("returns null for a non-object", () => {
    expect(readStrataCover(null)).toBeNull()
    expect(readStrataCover(undefined)).toBeNull()
    expect(readStrataCover(3)).toBeNull()
    expect(readStrataCover("x")).toBeNull()
    expect(readStrataCover([20])).toBeNull()
  })

  it("returns null when no entry is valid", () => {
    expect(readStrataCover({})).toBeNull()
    expect(readStrataCover({ foo: 20, low: 200 })).toBeNull()
  })
})

describe("readDmhCounts", () => {
  it("keeps only known codes with whole numbers of 0 or more", () => {
    expect(
      readDmhCounts({
        dmh_01: 3,
        dmh_02: 0,
        dmh_03: 1.5,
        dmh_04: -1,
        dmh_15: 7,
        dmh_16: 2,
        nope: 1,
      }),
    ).toEqual({ dmh_01: 3, dmh_02: 0, dmh_15: 7 })
  })

  it("drops strings and non-finite numbers", () => {
    expect(readDmhCounts({ dmh_01: "3", dmh_02: Number.POSITIVE_INFINITY, dmh_03: 2 })).toEqual({
      dmh_03: 2,
    })
  })

  it("returns null for a non-object and for no valid entry", () => {
    expect(readDmhCounts(null)).toBeNull()
    expect(readDmhCounts([1, 2])).toBeNull()
    expect(readDmhCounts("dmh_01")).toBeNull()
    expect(readDmhCounts({})).toBeNull()
    expect(readDmhCounts({ dmh_01: 0.5 })).toBeNull()
  })
})

describe("sumOpenAreasHa", () => {
  it("adds the zones and rounds to two decimals (0.1 + 0.2 is 0.3)", () => {
    expect(sumOpenAreasHa([0.1, 0.2])).toBe(0.3)
    expect(sumOpenAreasHa([0.123, 0.456])).toBe(0.58)
  })

  it("is 0 for an empty list and ignores a zone at 0 or an entry that is not a number above 0", () => {
    expect(sumOpenAreasHa([])).toBe(0)
    expect(sumOpenAreasHa([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.5])).toBe(0.5)
  })
})

describe("floweringPercentFromAreas", () => {
  it("is the sum of the zones over the surface, in percent", () => {
    expect(floweringPercentFromAreas([0.3], 2)).toBe(15)
    expect(floweringPercentFromAreas([0.1, 0.2], 3)).toBe(10)
  })

  it("rounds to two decimals", () => {
    expect(floweringPercentFromAreas([1], 3)).toBe(33.33)
    expect(floweringPercentFromAreas([2], 3)).toBe(66.67)
  })

  it("is 0 for zones at 0 (a row added and not filled)", () => {
    expect(floweringPercentFromAreas([0, 0], 2)).toBe(0)
  })

  it("is capped at 100 when the zones exceed the surface", () => {
    expect(floweringPercentFromAreas([1.5, 1], 2)).toBe(100)
    expect(floweringPercentFromAreas([2], 2)).toBe(100)
  })

  it("is null without a zone or without a surface above 0", () => {
    expect(floweringPercentFromAreas([], 2)).toBeNull()
    expect(floweringPercentFromAreas([0.3], 0)).toBeNull()
    expect(floweringPercentFromAreas([0.3], -1)).toBeNull()
    expect(floweringPercentFromAreas([0.3], Number.NaN)).toBeNull()
  })
})

describe("openAreasExceedSurface", () => {
  it("is true only when the sum is above the surface", () => {
    expect(openAreasExceedSurface([1.5, 1], 2)).toBe(true)
    expect(openAreasExceedSurface([2], 2)).toBe(false)
    expect(openAreasExceedSurface([0.3], 2)).toBe(false)
  })

  it("is false without a usable surface", () => {
    expect(openAreasExceedSurface([5], 0)).toBe(false)
    expect(openAreasExceedSurface([5], Number.NaN)).toBe(false)
  })
})

describe("readOpenAreasHa", () => {
  it("keeps a valid list, rounded to two decimals", () => {
    expect(readOpenAreasHa([0.3, 1.234, 0.005])).toEqual([0.3, 1.23, 0.01])
  })

  it("keeps a zone at 0 and an empty list", () => {
    expect(readOpenAreasHa([0, 0.5])).toEqual([0, 0.5])
    expect(readOpenAreasHa([])).toEqual([])
  })

  it("keeps the surface maximum and drops what is above it", () => {
    expect(readOpenAreasHa([ROUTE_SURFACE_MAX_HA, ROUTE_SURFACE_MAX_HA + 1])).toEqual([
      ROUTE_SURFACE_MAX_HA,
    ])
  })

  it("drops entries that are not finite numbers from 0", () => {
    expect(readOpenAreasHa(["1", null, -0.5, Number.NaN, Number.POSITIVE_INFINITY, 2])).toEqual([2])
  })

  it("keeps the first zones up to the maximum", () => {
    const many = Array.from({ length: OPEN_AREAS_MAX_COUNT + 3 }, (_, index) => index + 1)
    const read = readOpenAreasHa(many)
    expect(read).toHaveLength(OPEN_AREAS_MAX_COUNT)
    expect(read?.[OPEN_AREAS_MAX_COUNT - 1]).toBe(OPEN_AREAS_MAX_COUNT)
  })

  it("is null for anything that is not an array", () => {
    expect(readOpenAreasHa(undefined)).toBeNull()
    expect(readOpenAreasHa("0,3")).toBeNull()
    expect(readOpenAreasHa({ 0: 1 })).toBeNull()
  })
})

describe("clampOpenAreaHa", () => {
  it("rounds to two decimals", () => {
    expect(clampOpenAreaHa(0.3)).toBe(0.3)
    expect(clampOpenAreaHa(0.1 + 0.2)).toBe(0.3)
    expect(clampOpenAreaHa(1.236)).toBe(1.24)
  })

  it("brings a negative value to 0 and a large one to the surface maximum", () => {
    expect(clampOpenAreaHa(-2)).toBe(0)
    expect(clampOpenAreaHa(ROUTE_SURFACE_MAX_HA + 10)).toBe(ROUTE_SURFACE_MAX_HA)
  })

  it("counts a value that is not a finite number as 0", () => {
    expect(clampOpenAreaHa(Number.NaN)).toBe(0)
    expect(clampOpenAreaHa(Number.POSITIVE_INFINITY)).toBe(0)
  })
})
