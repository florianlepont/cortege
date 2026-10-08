import { bandTone, totalBand } from "@cortege/ibp-domain"

import { factorRatio, factorTone, scoreRatio, totalTone } from "./ibp-display"

describe("factorTone", () => {
  it("is low from 0 to 2, mid at 3, high from 4 to 5", () => {
    expect([0, 1, 2].map(factorTone)).toEqual(["low", "low", "low"])
    expect(factorTone(3)).toBe("mid")
    expect([4, 5].map(factorTone)).toEqual(["high", "high"])
  })

  it("clamps out of range points to the nearest tone", () => {
    expect(factorTone(-1)).toBe("low")
    expect(factorTone(9)).toBe("high")
  })
})

describe("totalTone", () => {
  it("is null without a total", () => {
    expect(totalTone(null)).toBeNull()
  })

  it("equals bandTone(totalBand(n)) for every total from 0 to 50", () => {
    for (let total = 0; total <= 50; total += 1) {
      expect(totalTone(total)).toBe(bandTone(totalBand(total)))
    }
  })

  it("switches tone at 20 and 30", () => {
    expect([19, 20, 29, 30].map(totalTone)).toEqual(["low", "mid", "mid", "high"])
  })
})

describe("scoreRatio", () => {
  it("is the share of 50, clamped to 0..1", () => {
    expect(scoreRatio(25)).toBe(0.5)
    expect(scoreRatio(null)).toBe(0)
    expect(scoreRatio(80)).toBe(1)
    expect(scoreRatio(-3)).toBe(0)
  })
})

describe("factorRatio", () => {
  it("is the share of 5, clamped to 0..1", () => {
    expect(factorRatio(null)).toBe(0)
    expect(factorRatio(3)).toBeCloseTo(0.6)
    expect(factorRatio(7)).toBe(1)
  })
})
