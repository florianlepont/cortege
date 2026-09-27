import {
  computeRetainedScores,
  computeTotals,
  evaluateSubmitReadiness,
  FACTOR_KEYS,
  type FactorCanonical,
  type FactorKey,
  type FactorRetainedScore,
  type IbpEvaluationInput,
  type IbpScores,
  type IbpSurveyContext,
  type SubmitReadiness as DomainSubmitReadiness,
  type SubmitReadinessField,
} from "@cortege/ibp-domain"

// Thin adapter over @cortege/ibp-domain (phase 01.8, D-06): the IBP rules, allowed sets and factor
// keys live in the package only, so the phone's preview scores exactly as the server does. What
// stays here is app-only: the selected parcels, which the rules do not know about.

export { migrateDraftToV32 } from "@cortege/ibp-domain"

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Retained score of one factor on its own, under the given method context (a missing version is
 * v3.0). Null when it is absent, unreadable, incomplete or outside the factor's allowed set.
 */
export const resolveFactorScoreFromRaw = (
  factorKey: FactorKey,
  rawValue: unknown,
  context: IbpSurveyContext = {},
): number | null =>
  computeRetainedScores({ [factorKey]: rawValue }, context)[factorKey]?.score ?? null

/** Retained score per factor, under the survey's method version and station context. */
export const computeRetainedScoresFromRawFactors = (
  factors: Record<string, unknown> | null | undefined,
  context: IbpSurveyContext = {},
): Record<FactorKey, FactorRetainedScore | null> =>
  computeRetainedScores(isObject(factors) ? factors : {}, context)

/** Stand (/35), context (/15) and total (/50) scores, plus the number of scored factors. */
export const computeIbpTotalsFromRetainedScores = (
  scores: Record<FactorKey, FactorRetainedScore | null>,
): IbpScores & { completed_factors: number } => computeTotals(scores)

export const resolveDraftParcelIds = (input: { parcel_ids?: unknown }): string[] => {
  const source = Array.isArray(input.parcel_ids) ? input.parcel_ids : []

  const seen = new Set<string>()
  const output: string[] = []
  for (const value of source) {
    if (typeof value !== "string") {
      continue
    }
    const normalized = value.trim().toUpperCase()
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    output.push(normalized)
  }
  return output
}

/** The package readiness, with the app's own `parcel_ids` requirement. */
export type SubmitReadiness = Omit<DomainSubmitReadiness, "missing_fields"> & {
  missing_fields: Array<SubmitReadinessField | "parcel_ids">
}

export type SubmitReadinessDraft = IbpEvaluationInput & { parcel_ids?: unknown }

/** Whether a local draft can be submitted: the package's readiness, plus a parcel selection. */
export const evaluateSubmitReadinessFromDraft = (
  draft: SubmitReadinessDraft,
  now: Date = new Date(),
): SubmitReadiness => {
  const readiness = evaluateSubmitReadiness(draft, now)
  const missingFields: SubmitReadiness["missing_fields"] = [...readiness.missing_fields]
  if (resolveDraftParcelIds(draft).length === 0) {
    missingFields.push("parcel_ids")
  }

  return {
    ...readiness,
    ready: readiness.ready && missingFields.length === 0,
    missing_fields: missingFields,
  }
}

/** IBP total and subtotal deltas of `current` against `previous` (REQ-C-versioning). Arithmetic
 * only, on scores the package already computed: no rule is re-implemented here. */
export type IbpTotalDelta = {
  total: number
  standAndManagement: number
  context: number
}

export const computeIbpTotalDelta = (current: IbpScores, previous: IbpScores): IbpTotalDelta => ({
  total: current.ibp_total - previous.ibp_total,
  standAndManagement: current.ibp_peuplement_gestion - previous.ibp_peuplement_gestion,
  context: current.ibp_contexte - previous.ibp_contexte,
})

/** Per-factor point delta of `current` against `previous`; a factor missing from either side is
 * omitted rather than guessed. */
export const computeFactorDeltas = (
  current: Record<string, FactorCanonical>,
  previous: Record<string, FactorCanonical>,
): Partial<Record<FactorKey, number>> => {
  const deltas: Partial<Record<FactorKey, number>> = {}
  for (const key of FACTOR_KEYS) {
    const currentPoints = current[key]?.score_points
    const previousPoints = previous[key]?.score_points
    if (typeof currentPoints === "number" && typeof previousPoints === "number") {
      deltas[key] = currentPoints - previousPoints
    }
  }
  return deltas
}
