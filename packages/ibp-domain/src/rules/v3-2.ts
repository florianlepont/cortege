import { isIbpCas, usesCas3Scale } from "../context/cas"
import {
  type FactorOutcome,
  type FactorScorer,
  INVALID,
  INVALID_GENUS,
  incomplete,
  readANativeCover,
  readDensityPair,
  readFactorAGenusCount,
  readFloweringPercent,
  scored,
  scoreFactorB,
  scoreFactorF,
  scoreFactorH,
  scoreFactorIJ,
} from "./common"
import { applyNativeCoverCap, scoreFloweringPercent, scoreGenusCount } from "./scales"

// IBP FR v3.2 (CNPF / INRAE Dynafor, 2026-02-02), CH-1..CH-5 of ADR-003:
// - A and G scales follow the cas (cas-3 scale when ibp_cas = 3 or ibp_cas3_scale), CH-1/CH-4;
// - A needs its native cover and is capped at 2 below 50 % (A-1), CH-1;
// - C/D and E score 1 on the sum of both diameter classes (CD-1, E-1), CH-2/CH-3.
// A v3.2 draft may lack its cas: A and G are then incomplete, never invalid (D-08).

/**
 * Two-class density rule, v3.2: 0 when upper/ha < 1 and (upper + lower)/ha < 1; 1 when upper/ha
 * < 1 and the sum ≥ 1; 2 below `upperCap`; else 5 (v3.2 p. 3).
 */
function scoreDensityV32(
  pair: { upper: number; lower: number; surfaceHa: number } | null,
  upperCap: number,
): FactorOutcome {
  if (pair === null) return INVALID
  const upperPerHa = pair.upper / pair.surfaceHa
  const sumPerHa = (pair.upper + pair.lower) / pair.surfaceHa
  if (upperPerHa < 1) return scored(sumPerHa < 1 ? 0 : 1)
  if (upperPerHa < upperCap) return scored(2)
  return scored(5)
}

const scoreFactorAV32: FactorScorer = (_key, raw, ctx) => {
  const cover = readANativeCover(raw)
  if (cover === "invalid") return INVALID
  const cas = isIbpCas(ctx.survey.ibp_cas) ? ctx.survey.ibp_cas : null
  const genusResult = readFactorAGenusCount(raw, cas)
  if (genusResult.kind === "invalid") return INVALID_GENUS
  if (genusResult.kind === "none") {
    return cover === null ? INVALID : incomplete("native_genus_count")
  }
  if (cas === null) return incomplete("ibp_cas")
  if (cover === null) return incomplete("native_cover")
  return scored(
    applyNativeCoverCap(scoreGenusCount(genusResult.count, usesCas3Scale(ctx.survey)), cover),
  )
}

export const scoreFactorV32: FactorScorer = (key, raw, ctx) => {
  switch (key) {
    case "A":
      return scoreFactorAV32(key, raw, ctx)
    case "B":
      return scoreFactorB(raw)
    case "C":
    case "D":
      return scoreDensityV32(readDensityPair(raw, "bmg_count", "bmm_count"), 3)
    case "E":
      return scoreDensityV32(readDensityPair(raw, "tgb_count", "gb_count"), 5)
    case "F":
      return scoreFactorF(raw, ctx)
    case "G": {
      const percent = readFloweringPercent(raw)
      if (percent === null) return INVALID
      if (!isIbpCas(ctx.survey.ibp_cas)) return incomplete("ibp_cas")
      return scored(scoreFloweringPercent(percent, usesCas3Scale(ctx.survey)))
    }
    case "H":
      return scoreFactorH(raw)
    default:
      return scoreFactorIJ(raw)
  }
}
