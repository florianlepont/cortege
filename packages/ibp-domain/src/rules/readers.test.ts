import * as domain from "../index"
import {
  DENSITY_COUNT_KEYS,
  densityLowerCountNeeded,
  densityPerHa,
  readDensityPair,
  readDensityPerHa,
  readFactorAGenusCount,
} from "./common"
import { scoreFactorV30 } from "./v3-0"
import { scoreFactorV32 } from "./v3-2"

// The readers the app displays next to a factor (phase 32, follow-up 32-29): the same code the
// scorers use, so a shown figure and the score read from it cannot drift apart.

describe("package entry", () => {
  it("exports the display readers", () => {
    expect(domain.readDensityPerHa).toBe(readDensityPerHa)
    expect(domain.readFactorAGenusCount).toBe(readFactorAGenusCount)
    expect(domain.DENSITY_COUNT_KEYS).toBe(DENSITY_COUNT_KEYS)
    expect(domain.densityLowerCountNeeded).toBe(densityLowerCountNeeded)
  })
})

describe("densityPerHa", () => {
  it("divides each class and their sum by the surface", () => {
    expect(densityPerHa({ upper: 3, lower: 4, surfaceHa: 2 })).toEqual({
      upperPerHa: 1.5,
      lowerPerHa: 2,
      sumPerHa: 3.5,
    })
  })

  it("keeps the sum as one division, as the v3.2 score reads it", () => {
    const { sumPerHa } = densityPerHa({ upper: 1, lower: 2, surfaceHa: 3 })
    expect(sumPerHa).toBe(3 / 3)
  })
})

describe("readDensityPerHa", () => {
  it("reads C and D on the BMg and BMm keys, E on the TGB and GB keys", () => {
    expect(DENSITY_COUNT_KEYS.C).toEqual(["bmg_count", "bmm_count"])
    expect(DENSITY_COUNT_KEYS.D).toEqual(["bmg_count", "bmm_count"])
    expect(DENSITY_COUNT_KEYS.E).toEqual(["tgb_count", "gb_count"])
    const deadwood = { bmg_count: 3, bmm_count: 4, tgb_count: 9, surface_ha: 2 }
    expect(readDensityPerHa("C", deadwood)).toEqual({
      upperPerHa: 1.5,
      lowerPerHa: 2,
      sumPerHa: 3.5,
    })
    expect(readDensityPerHa("D", deadwood)?.upperPerHa).toBe(1.5)
    expect(readDensityPerHa("E", { tgb_count: 2, gb_count: 1, surface_ha: 4 })).toEqual({
      upperPerHa: 0.5,
      lowerPerHa: 0.25,
      sumPerHa: 0.75,
    })
  })

  it("accepts numbers written as strings, like the scorers", () => {
    expect(
      readDensityPerHa("C", { bmg_count: "3", bmm_count: "0", surface_ha: "1.5" })?.upperPerHa,
    ).toBe(2)
  })

  it("is null without a count or without a positive surface", () => {
    expect(readDensityPerHa("C", { bmm_count: 1, surface_ha: 1 })).toBeNull()
    expect(readDensityPerHa("C", { bmg_count: 1, surface_ha: 2 })).toBeNull()
    expect(readDensityPerHa("C", { bmg_count: 1, bmm_count: 1 })).toBeNull()
    expect(readDensityPerHa("C", { bmg_count: 1, bmm_count: 1, surface_ha: 0 })).toBeNull()
    expect(readDensityPerHa("C", {})).toBeNull()
  })

  it("reads the densities without a lower count only from 1 upper per hectare", () => {
    expect(readDensityPerHa("C", { bmg_count: 3, surface_ha: 2 })).toEqual({
      upperPerHa: 1.5,
      lowerPerHa: 0,
      sumPerHa: 1.5,
    })
    expect(readDensityPerHa("E", { tgb_count: 1, gb_count: null, surface_ha: 1 })?.upperPerHa).toBe(
      1,
    )
    expect(readDensityPerHa("E", { tgb_count: 1, gb_count: "  ", surface_ha: 1 })).not.toBeNull()
    // Under 1 per hectare, or a lower count given but unreadable: no density.
    expect(readDensityPerHa("C", { bmg_count: 1, surface_ha: 2 })).toBeNull()
    expect(readDensityPerHa("C", { bmg_count: 3, bmm_count: "x", surface_ha: 1 })).toBeNull()
    expect(readDensityPerHa("C", { bmg_count: 3, bmm_count: {}, surface_ha: 1 })).toBeNull()
    expect(readDensityPerHa("C", { bmg_count: 3 })).toBeNull()
  })

  it("agrees with the score: the upper class per hectare is what the thresholds read", () => {
    const survey = { ibp_method_version: "3.2", ibp_cas: 1 } as const
    const ctx = { survey, factors: {}, issues: [] }
    const raw = { bmg_count: 6, bmm_count: 0, surface_ha: 2 }
    expect(readDensityPerHa("C", raw)?.upperPerHa).toBe(3)
    expect(scoreFactorV32("C", raw, ctx)).toEqual({ kind: "scored", score: 5 })
    expect(scoreFactorV30("C", raw, ctx)).toEqual({ kind: "scored", score: 5 })
  })
})

describe("readDensityPair", () => {
  it("keeps a typed lower count as it is, even when it is not needed", () => {
    expect(
      readDensityPair({ bmg_count: 5, bmm_count: 2, surface_ha: 1 }, "bmg_count", "bmm_count"),
    ).toEqual({
      upper: 5,
      lower: 2,
      surfaceHa: 1,
    })
  })
})

describe("densityLowerCountNeeded", () => {
  it("is needed while the upper class per hectare is under 1 or cannot be computed", () => {
    expect(densityLowerCountNeeded("C", {})).toBe(true)
    expect(densityLowerCountNeeded("C", { bmg_count: 4 })).toBe(true)
    expect(densityLowerCountNeeded("C", { surface_ha: 2 })).toBe(true)
    expect(densityLowerCountNeeded("C", { bmg_count: 4, surface_ha: 0 })).toBe(true)
    expect(densityLowerCountNeeded("D", { bmg_count: 1, surface_ha: 2 })).toBe(true)
    expect(densityLowerCountNeeded("E", { tgb_count: "1", surface_ha: "2" })).toBe(true)
  })

  it("is not needed from 1 upper per hectare, the exact line included", () => {
    expect(densityLowerCountNeeded("C", { bmg_count: 2, surface_ha: 2 })).toBe(false)
    expect(densityLowerCountNeeded("D", { bmg_count: 7, surface_ha: 2 })).toBe(false)
    expect(densityLowerCountNeeded("E", { tgb_count: "1", surface_ha: "1" })).toBe(false)
  })

  it("reads the upper key of its own factor", () => {
    expect(densityLowerCountNeeded("E", { bmg_count: 9, surface_ha: 1 })).toBe(true)
    expect(densityLowerCountNeeded("C", { tgb_count: 9, surface_ha: 1 })).toBe(true)
  })
})

describe("readFactorAGenusCount", () => {
  it("counts the distinct listed genera allowed at the cas", () => {
    expect(readFactorAGenusCount({ genera: ["Fagus", "Acer", "Fagus"] }, 1)).toEqual({
      kind: "count",
      count: 2,
    })
  })

  it("leaves out a supplementary genus outside cas 2 and 4", () => {
    expect(readFactorAGenusCount({ genera: ["Fagus", "Olea"] }, 1)).toEqual({
      kind: "count",
      count: 1,
    })
    expect(readFactorAGenusCount({ genera: ["Fagus", "Olea"] }, 2)).toEqual({
      kind: "count",
      count: 2,
    })
  })

  it("is none without a list or a legacy count, invalid on an unknown genus", () => {
    expect(readFactorAGenusCount({}, null)).toEqual({ kind: "none" })
    expect(readFactorAGenusCount({ native_genus_count: 3 }, null)).toEqual({
      kind: "count",
      count: 3,
    })
    expect(readFactorAGenusCount({ genera: ["Nope"] }, 1)).toEqual({ kind: "invalid" })
    expect(readFactorAGenusCount({ genera: "Fagus" }, 1)).toEqual({ kind: "invalid" })
  })
})
