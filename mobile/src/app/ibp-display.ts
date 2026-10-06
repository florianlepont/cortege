// Display helpers for the IBP score: tones and fill ratios used by the score ring, the factor bars
// and the survey cards. Not IBP rules: the factor cut points below are a display convention from
// sketch 008 variant I, confirmed with the owner at the first phone check (RESEARCH A2). Total
// tones delegate to the shared package so the display can never drift from its bands.

import { IBP_MAX, bandTone, totalBand } from "@cortege/ibp-domain"
import type { ScoreTone } from "@cortege/ibp-domain"

/** Maximum points of one factor (A to J), the same for all ten. */
export const MAX_FACTOR_POINTS = 5

function clampRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio))
}

/** 0 to 2 points is low, 3 is mid, 4 to 5 is high. */
export function factorTone(points: number): ScoreTone {
  if (points <= 2) return "low"
  if (points < 4) return "mid"
  return "high"
}

/** Tone of the /50 total, or null while the survey has no total yet. */
export function totalTone(total: number | null): ScoreTone | null {
  if (total === null) return null
  return bandTone(totalBand(total))
}

/** Share of the /50 total, from 0 to 1 (a missing total gives 0). */
export function scoreRatio(total: number | null): number {
  if (total === null) return 0
  return clampRatio(total / IBP_MAX.total)
}

/** Share of one factor's maximum, from 0 to 1 (a missing score gives 0). */
export function factorRatio(points: number | null): number {
  if (points === null) return 0
  return clampRatio(points / MAX_FACTOR_POINTS)
}
