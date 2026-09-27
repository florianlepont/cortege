import { CNPF_FACTOR_A_GENUS_CODES } from "@cortege/ibp-domain"
import {
  assertAllGenusThresholdsPresent,
  classifyConfidence,
  GENUS_STRONG_THRESHOLD,
  POOLED_MEDIUM_THRESHOLD,
  POOLED_WEAK_THRESHOLD,
} from "./calibration"

describe("calibration", () => {
  it("has a calibrated strong threshold for all 34 CNPF genera, none withheld", () => {
    expect(Object.keys(GENUS_STRONG_THRESHOLD)).toHaveLength(34)
    for (const genus of CNPF_FACTOR_A_GENUS_CODES) {
      expect(typeof GENUS_STRONG_THRESHOLD[genus]).toBe("number")
      expect(GENUS_STRONG_THRESHOLD[genus]).toBeGreaterThan(0)
      expect(GENUS_STRONG_THRESHOLD[genus]).toBeLessThanOrEqual(1)
    }
    expect(() => assertAllGenusThresholdsPresent()).not.toThrow()
  })

  it("labels a score at or above a genus's own strong threshold as strong", () => {
    // Abies: strong at 0.8463 (measurement document §15.2).
    expect(classifyConfidence("Abies", 0.9)).toBe("strong")
    expect(classifyConfidence("Abies", 0.8463)).toBe("strong")
  })

  it("labels the same raw score differently depending on the genus (D-04/D-12)", () => {
    // 0.5 clears Fagus's threshold (0.5766? no - below it) - use two genera with thresholds either
    // side of 0.5: Fagus (0.5766, below 0.5 => not strong) vs Quercus_deciduae (0.5064, below 0.5).
    // Pick a clearer pair: Tamarix (0.2027) vs Prunus (0.9519) at confidence 0.6.
    expect(classifyConfidence("Tamarix", 0.6)).toBe("strong")
    expect(classifyConfidence("Prunus", 0.6)).toBe("medium")
  })

  it("falls through medium, weak and very-weak using the pooled cut points", () => {
    // Fraxinus strong threshold 0.9265, well above the pooled medium/weak cuts, so its bands are
    // not clamped and behave exactly like the pooled §15.4 bands.
    expect(classifyConfidence("Fraxinus", 0.95)).toBe("strong")
    expect(classifyConfidence("Fraxinus", POOLED_MEDIUM_THRESHOLD)).toBe("medium")
    expect(classifyConfidence("Fraxinus", POOLED_WEAK_THRESHOLD)).toBe("weak")
    expect(classifyConfidence("Fraxinus", 0.1)).toBe("very-weak")
  })

  it("clamps medium/weak bands below a genus's own strong threshold (Cercis, Tamarix)", () => {
    // Cercis: strong threshold 0.4221, below the pooled medium cut (0.4866) - medium collapses to
    // the strong cut itself, so nothing scores "medium" for Cercis.
    expect(classifyConfidence("Cercis", 0.45)).toBe("strong")
    expect(classifyConfidence("Cercis", 0.4)).toBe("weak")
    expect(classifyConfidence("Cercis", 0.3)).toBe("very-weak")

    // Tamarix: strong threshold 0.2027, below even the pooled weak cut (0.3461) - medium and weak
    // both collapse, so any score below the strong threshold is very-weak for Tamarix.
    expect(classifyConfidence("Tamarix", 0.25)).toBe("strong")
    expect(classifyConfidence("Tamarix", 0.2)).toBe("very-weak")
  })

  it("never regresses to a lower band as the score rises, for every calibrated genus", () => {
    const bandRank: Record<string, number> = { "very-weak": 0, weak: 1, medium: 2, strong: 3 }
    for (const genus of CNPF_FACTOR_A_GENUS_CODES) {
      const samples = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
      let previousRank = -1
      for (const score of samples) {
        const rank = bandRank[classifyConfidence(genus, score)]
        expect(rank).toBeGreaterThanOrEqual(previousRank)
        previousRank = rank
      }
    }
  })
})
