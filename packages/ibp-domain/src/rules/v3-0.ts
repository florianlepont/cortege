import { usesSubalpineScale } from "../context/region-stage"
import {
  type FactorOutcome,
  type FactorScorer,
  INVALID,
  incomplete,
  readANativeCover,
  readDensityPair,
  readFloweringPercent,
  readGenusCount,
  readLegacyBCover,
  scored,
  scoreFactorB,
  scoreFactorF,
  scoreFactorH,
  scoreFactorIJ,
} from "./common"
import { applyNativeCoverCap, scoreFloweringPercent, scoreGenusCount } from "./scales"

// IBP Fr v3.0 as the app implements it (D-05): the pre-01.8 rules with two fixes that are wrong
// under both versions. BUG-1: the native-cover cap is on A, not B. BUG-2: G and H allow 0, 2, 5
// only (the allowed sets live in scales.ts). Scales for A and G follow region and stage.

/**
 * Two-class density rule, v3.0: score 1 needs the lower class alone at ≥ 1/ha.
 * `upperCap` is the density of the upper class from which the score is 5 (C/D 3, E 5).
 */
function scoreDensityV30(
  pair: { upper: number; lower: number; surfaceHa: number } | null,
  upperCap: number,
): FactorOutcome {
  if (pair === null) return INVALID
  const upperPerHa = pair.upper / pair.surfaceHa
  const lowerPerHa = pair.lower / pair.surfaceHa
  if (upperPerHa < 1 && lowerPerHa < 1) return scored(0)
  if (upperPerHa < 1) return scored(1)
  if (upperPerHa < upperCap) return scored(2)
  return scored(5)
}

/**
 * A, v3.0: the cover is read from A (percent, else the below-50 boolean), else from B's legacy
 * field. An unknown cover means no cap (keeps pre-01.8 surveys scoring as before).
 */
const scoreFactorAV30: FactorScorer = (_key, raw, ctx) => {
  const cover = readANativeCover(raw)
  if (cover === "invalid") return INVALID
  const count = readGenusCount(raw)
  if (count === null) {
    return cover === null ? INVALID : incomplete("native_genus_count")
  }

  const restricted = usesSubalpineScale(ctx.survey.region_version, ctx.survey.vegetation_stage)
  const legacyCover = readLegacyBCover(ctx.factors.B)
  const coverBelow50 = cover ?? (legacyCover !== null && legacyCover < 50)
  return scored(applyNativeCoverCap(scoreGenusCount(count, restricted), coverBelow50))
}

export const scoreFactorV30: FactorScorer = (key, raw, ctx) => {
  switch (key) {
    case "A":
      return scoreFactorAV30(key, raw, ctx)
    case "B":
      return scoreFactorB(raw)
    case "C":
    case "D":
      return scoreDensityV30(readDensityPair(raw, "bmg_count", "bmm_count"), 3)
    case "E":
      return scoreDensityV30(readDensityPair(raw, "tgb_count", "gb_count"), 5)
    case "F":
      return scoreFactorF(raw, ctx)
    case "G": {
      const percent = readFloweringPercent(raw)
      if (percent === null) return INVALID
      const restricted = usesSubalpineScale(ctx.survey.region_version, ctx.survey.vegetation_stage)
      return scored(scoreFloweringPercent(percent, restricted))
    }
    case "H":
      return scoreFactorH(raw)
    default:
      return scoreFactorIJ(raw)
  }
}
