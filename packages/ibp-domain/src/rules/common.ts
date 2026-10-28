import type { IbpMethodFields } from "../contract/survey"
import type { FactorKey } from "../factors"
import { allowedFactorAGenusCodes, isCnpfFactorAGenusCode } from "../genus"
import type { IbpCas } from "../context/cas"
import { asNumber, isRecord, pickNumber } from "../input"
import { scoreStrataCount, scoreTreeDensity, scoreTypeCount } from "./scales"

// Types and raw-input readers shared by the v3.0 and v3.2 rule modules.

/** The station context of a survey: the method version and its version-specific fields. */
export type IbpSurveyContext = IbpMethodFields & {
  /** v3.0 only. */
  region_version?: string | null
  /** v3.0 only. */
  vegetation_stage?: string | null
}

/** One validation finding. Blocking issues make `ok` false; the others are warnings. */
export type IbpValidationIssue = {
  factor?: FactorKey
  code: string
  message: string
  blocking: boolean
}

/** Why a factor cannot be scored yet (v3.2): the missing input. */
export type IncompleteReason = "ibp_cas" | "native_cover" | "native_genus_count"

/**
 * Result of one factor's scorer:
 * - scored: a number (checked against the allowed set by evaluateIbp);
 * - incomplete: readable but not scorable yet (non-blocking in draft, factor_required at submit);
 * - invalid: unreadable input (blocking `factor_invalid_raw`, or `code`/`message` for a more
 *   specific blocking issue, e.g. `factor_a_genus_invalid`).
 */
export type FactorOutcome =
  | { kind: "scored"; score: number }
  | { kind: "incomplete"; reason: IncompleteReason }
  | { kind: "invalid"; code?: string; message?: string }

export type RuleContext = {
  survey: IbpSurveyContext
  /** Every raw factor of the survey (v3.0 A reads B's legacy cover). */
  factors: Record<string, unknown>
  /** Sink for non-blocking warnings raised while scoring (factor_f_group_capped). */
  issues: IbpValidationIssue[]
}

/** Scores one factor given as an object. Direct numeric scores never reach a scorer. */
export type FactorScorer = (
  key: FactorKey,
  raw: Record<string, unknown>,
  ctx: RuleContext,
) => FactorOutcome

export const scored = (score: number): FactorOutcome => ({ kind: "scored", score })
export const INVALID: FactorOutcome = { kind: "invalid" }
export const incomplete = (reason: IncompleteReason): FactorOutcome => ({
  kind: "incomplete",
  reason,
})
/** A: an entry of `genera` is not one of the CNPF regional list's 34 classes (phase 5, D-15). */
export const INVALID_GENUS: FactorOutcome = {
  kind: "invalid",
  code: "factor_a_genus_invalid",
  message: "factor A genera must each be one of the CNPF regional list's classes",
}

export function issue(
  code: string,
  message: string,
  blocking: boolean,
  factor?: FactorKey,
): IbpValidationIssue {
  return { code, message, blocking, factor }
}

/** Outcome of reading Factor A's genus count, from a list or from the legacy bare count. */
export type GenusCountOutcome =
  | { kind: "count"; count: number }
  | { kind: "none" }
  | { kind: "invalid" }

/**
 * A's native-genus count (D-15, ADR-003 CH-12): read from `genera` (a list of CNPF genus codes,
 * this phase onward) when given, else from the legacy bare count (`native_genus_count` /
 * `autochthonous_genus_count` / `count`, kept for surveys already recorded that way — they cannot
 * be decomposed into named genera and keep their score unchanged).
 *
 * `genera` entries are deduplicated; a structurally valid genus not allowed at this station's cas
 * (a supplementary genus outside cas 2/4) is silently excluded from the count, exactly as a genus
 * not observed at all. An entry that is not one of the 34 CNPF classes is "invalid" (blocking).
 */
export function readFactorAGenusCount(
  raw: Record<string, unknown>,
  cas: IbpCas | null,
): GenusCountOutcome {
  const genera = raw.genera
  if (genera !== undefined) {
    if (!Array.isArray(genera)) return { kind: "invalid" }
    const allowed = new Set(allowedFactorAGenusCodes(cas))
    const counted = new Set<string>()
    for (const entry of genera) {
      if (!isCnpfFactorAGenusCode(entry)) return { kind: "invalid" }
      if (allowed.has(entry)) counted.add(entry)
    }
    return { kind: "count", count: counted.size }
  }

  const legacy = pickNumber(raw, ["native_genus_count", "autochthonous_genus_count", "count"])
  return legacy === null ? { kind: "none" } : { kind: "count", count: legacy }
}

/** A key counts as given unless it is absent, null or "" (the same rule as for a whole factor). */
function isGiven(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ""
}

/**
 * Native cover recorded on A (A-1): `native_cover_percent` (0-100) wins over the boolean
 * `native_cover_below_50`. Returns whether the cover is below 50 %, null when A records none, or
 * "invalid" when the percent is given but unreadable or outside 0-100.
 */
export function readANativeCover(raw: Record<string, unknown>): boolean | null | "invalid" {
  if (isGiven(raw.native_cover_percent)) {
    const percent = asNumber(raw.native_cover_percent)
    if (percent === null || percent < 0 || percent > 100) return "invalid"
    return percent < 50
  }
  return typeof raw.native_cover_below_50 === "boolean" ? raw.native_cover_below_50 : null
}

/** Cover stored under B by the pre-01.8 form (v3.0 legacy location), or null. */
export function readLegacyBCover(rawB: unknown): number | null {
  return isRecord(rawB)
    ? pickNumber(rawB, ["covered_autochthonous_percent", "native_cover_percent"])
    : null
}

/** B: strata count only; a cover given under B is ignored for B's score (BUG-1). */
export function scoreFactorB(raw: Record<string, unknown>): FactorOutcome {
  const strataCount = pickNumber(raw, ["strata_count", "count"])
  return strataCount === null ? INVALID : scored(scoreStrataCount(strataCount))
}

/**
 * F: `trees_per_ha`, or `dmh_group_counts` with each group capped at 2 (a warning per capped
 * group: DRIFT-1 resolved here, both sides now get it).
 */
export function scoreFactorF(raw: Record<string, unknown>, ctx: RuleContext): FactorOutcome {
  const treesPerHa = pickNumber(raw, ["trees_per_ha"])
  if (treesPerHa !== null) {
    return scored(scoreTreeDensity(treesPerHa))
  }

  const groups = raw.dmh_group_counts
  if (!Array.isArray(groups)) return INVALID

  let cappedTotal = 0
  for (const group of groups) {
    const n = asNumber(group)
    if (n === null) return INVALID
    if (n > 2) {
      ctx.issues.push(
        issue("factor_f_group_capped", "factor F group count capped to 2 trees/ha", false, "F"),
      )
    }
    cappedTotal += Math.min(2, Math.max(0, n))
  }
  return scored(scoreTreeDensity(cappedTotal))
}

/** G: the open flowering percent, given directly or as an area ratio. */
export function readFloweringPercent(raw: Record<string, unknown>): number | null {
  const direct = pickNumber(raw, ["open_flowering_percent", "flowering_percent"])
  if (direct !== null) return direct

  const openArea = pickNumber(raw, ["flowering_open_area_m2", "open_area_m2"])
  const describedArea = pickNumber(raw, ["described_area_m2"])
  if (openArea !== null && describedArea !== null && describedArea > 0) {
    return (openArea / describedArea) * 100
  }
  return null
}

/**
 * H: a numeric `class_score`/`score` (returned as is: a 1 is rejected by the allowed set, BUG-2),
 * or a class name recent/partial/ancient (or "0"/"2"/"5").
 */
export function scoreFactorH(raw: Record<string, unknown>): FactorOutcome {
  const numeric = pickNumber(raw, ["class_score", "score"])
  if (numeric !== null) return scored(numeric)

  const cls = typeof raw.class === "string" ? raw.class.trim().toLowerCase() : ""
  if (cls === "recent" || cls === "0") return scored(0)
  if (cls === "partial" || cls === "2") return scored(2)
  if (cls === "ancient" || cls === "5") return scored(5)
  return INVALID
}

/** I and J: the number of habitat types. */
export function scoreFactorIJ(raw: Record<string, unknown>): FactorOutcome {
  const count = pickNumber(raw, ["type_count", "count"])
  return count === null ? INVALID : scored(scoreTypeCount(count))
}

/** The upper class per hectare from which the lower class no longer changes the score of C, D, E. */
export const DENSITY_LOWER_UNREAD_FROM_PER_HA = 1

/** A raw value that was not given at all: absent, null or a blank string (not a bad one). */
function isAbsentCount(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "")
}

/**
 * Counts and surface of a two-class density factor (C/D: BMg/BMm; E: TGB/GB), or null. The lower
 * class only decides the score while the upper class is under 1 per hectare (v3.0: score 0 or 1;
 * v3.2: the sum for 0 or 1), so a lower count that was not given at all is accepted from 1 upper
 * per hectare and reads as 0 (the scorers never look at it then). Below that it stays unreadable,
 * and so does a lower count that is present but not a number.
 */
export function readDensityPair(
  raw: Record<string, unknown>,
  upperKey: string,
  lowerKey: string,
): { upper: number; lower: number; surfaceHa: number } | null {
  const upper = pickNumber(raw, [upperKey])
  const surfaceHa = pickNumber(raw, ["surface_ha"])
  if (upper === null || surfaceHa === null || surfaceHa <= 0) return null
  const lower = pickNumber(raw, [lowerKey])
  if (lower !== null) return { upper, lower, surfaceHa }
  const lowerUnneeded = upper / surfaceHa >= DENSITY_LOWER_UNREAD_FROM_PER_HA
  return lowerUnneeded && isAbsentCount(raw[lowerKey]) ? { upper, lower: 0, surfaceHa } : null
}

/** The raw keys of each two-class density factor: [upper class, lower class]. */
export const DENSITY_COUNT_KEYS = {
  C: ["bmg_count", "bmm_count"],
  D: ["bmg_count", "bmm_count"],
  E: ["tgb_count", "gb_count"],
} as const satisfies Record<string, readonly [string, string]>

/** The factors scored on two diameter classes counted over a surface. */
export type DensityFactor = keyof typeof DENSITY_COUNT_KEYS

/** Per-hectare densities of a two-class factor: the upper class, the lower class, and both. */
export type DensityPerHa = { upperPerHa: number; lowerPerHa: number; sumPerHa: number }

/** The per-hectare densities of a counted pair; the scorers and the display read them here. */
export function densityPerHa(pair: {
  upper: number
  lower: number
  surfaceHa: number
}): DensityPerHa {
  return {
    upperPerHa: pair.upper / pair.surfaceHa,
    lowerPerHa: pair.lower / pair.surfaceHa,
    sumPerHa: (pair.upper + pair.lower) / pair.surfaceHa,
  }
}

/**
 * C, D or E: the per-hectare densities of the factor's raw counts and surface, or null when a
 * count or a positive surface is missing. `upperPerHa` is the figure the score is read from (BMg
 * per ha for C and D, TGB per ha for E). Strings that read as numbers are accepted, as for scoring.
 */
export function readDensityPerHa(
  factor: DensityFactor,
  raw: Record<string, unknown>,
): DensityPerHa | null {
  const [upperKey, lowerKey] = DENSITY_COUNT_KEYS[factor]
  const pair = readDensityPair(raw, upperKey, lowerKey)
  return pair === null ? null : densityPerHa(pair)
}

/**
 * Whether the lower class of C, D or E (BMm, GB) still has to be counted: true while the upper
 * class per hectare cannot be computed yet (no readable upper count or positive surface) or is
 * under 1 per hectare, false from there on (the score ignores the lower class then). The form shows
 * and requires the lower counter by this answer, so the threshold lives only in the package.
 */
export function densityLowerCountNeeded(
  factor: DensityFactor,
  raw: Record<string, unknown>,
): boolean {
  const upper = pickNumber(raw, [DENSITY_COUNT_KEYS[factor][0]])
  const surfaceHa = pickNumber(raw, ["surface_ha"])
  if (upper === null || surfaceHa === null || surfaceHa <= 0) return true
  return upper / surfaceHa < DENSITY_LOWER_UNREAD_FROM_PER_HA
}
