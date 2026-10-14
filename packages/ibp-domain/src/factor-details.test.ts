import {
  B_STRATUM_CODES,
  DMH_GROUP_CODES,
  DMH_GROUP_DENSITY_CAP_PER_HA,
  STRATUM_MIN_COVER_PERCENT,
  UNCAPPED_DETAIL_KEYS,
  dmhDensityPerHa,
  readDmhCounts,
  readStrataCover,
  strataCountFromCover,
} from "./factor-details"

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
    expect(UNCAPPED_DETAIL_KEYS).toEqual({ B: ["strata_cover"], F: ["dmh_counts", "surface_ha"] })
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
      strataCountFromCover({ very_low: 100, low: 100, intermediate: 100, high: 100, herbaceous: 20 }),
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
