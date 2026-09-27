import type { FactorKey, FactorScore } from "../factors"

// Score scales shared by both method versions (v3.2 p. 3-4; unchanged from v3.0 except where a
// rule module says otherwise).

const STANDARD_ALLOWED = [0, 1, 2, 5] as const satisfies readonly FactorScore[]
const RESTRICTED_ALLOWED = [0, 2, 5] as const satisfies readonly FactorScore[]

/**
 * Scores each factor may take, both versions: A-F 0/1/2/5; G, H, I, J 0/2/5. G and H were 0/1/2/5
 * before phase 01.8 (BUG-2: both CNPF versions allow only 0, 2 or 5 there, v3.2 p. 4).
 */
export const ALLOWED_SCORES_BY_FACTOR: Readonly<Record<FactorKey, readonly FactorScore[]>> = {
  A: STANDARD_ALLOWED,
  B: STANDARD_ALLOWED,
  C: STANDARD_ALLOWED,
  D: STANDARD_ALLOWED,
  E: STANDARD_ALLOWED,
  F: STANDARD_ALLOWED,
  G: RESTRICTED_ALLOWED,
  H: RESTRICTED_ALLOWED,
  I: RESTRICTED_ALLOWED,
  J: RESTRICTED_ALLOWED,
}

export function allowedScoresFor(factor: FactorKey): readonly FactorScore[] {
  return ALLOWED_SCORES_BY_FACTOR[factor]
}

export function isAllowedFactorScore(factor: FactorKey, score: number): score is FactorScore {
  return (ALLOWED_SCORES_BY_FACTOR[factor] as readonly number[]).includes(score)
}

/**
 * A, native genus count. Standard scale: ≤1 → 0, 2 → 1, 3-4 → 2, ≥5 → 5. Restricted scale (v3.0
 * subalpine, v3.2 cas 3): 0 → 0, 1 → 1, 2 → 2, ≥3 → 5.
 */
export function scoreGenusCount(count: number, restricted: boolean): FactorScore {
  if (restricted) {
    if (count <= 0) return 0
    if (count === 1) return 1
    if (count === 2) return 2
    return 5
  }
  if (count <= 1) return 0
  if (count === 2) return 1
  if (count <= 4) return 2
  return 5
}

/** A, native-cover cap: a cover below 50 % caps A at 2 (exactly 50 % is not capped; v3.2 p. 3). */
export function applyNativeCoverCap(score: FactorScore, coverBelow50: boolean): FactorScore {
  return coverBelow50 && score > 2 ? 2 : score
}

/** B, vertical strata count: ≤1 → 0, 2 → 1, 3-4 → 2, 5 → 5. */
export function scoreStrataCount(count: number): FactorScore {
  if (count <= 1) return 0
  if (count === 2) return 1
  if (count <= 4) return 2
  return 5
}

/** F, living trees bearing microhabitats per ha: <2 → 0, <3 → 1, <8 → 2, ≥8 → 5. */
export function scoreTreeDensity(treesPerHa: number): FactorScore {
  if (treesPerHa < 2) return 0
  if (treesPerHa < 3) return 1
  if (treesPerHa < 8) return 2
  return 5
}

/**
 * G, open flowering cover (percent). 0 → 0. Standard scale: under 1 % or over 5 % → 2, 1-5 % → 5.
 * Restricted scale (v3.0 subalpine, v3.2 cas 3): under 1 % → 2, 1 % or more → 5.
 */
export function scoreFloweringPercent(percent: number, restricted: boolean): FactorScore {
  if (percent <= 0) return 0
  if (restricted) {
    return percent < 1 ? 2 : 5
  }
  return percent < 1 || percent > 5 ? 2 : 5
}

/** I and J, number of habitat types: 0 → 0, 1 → 2, ≥2 → 5. */
export function scoreTypeCount(count: number): FactorScore {
  if (count <= 0) return 0
  if (count === 1) return 2
  return 5
}
