import type { FactorCanonical, IbpScores } from "./contract/survey"
import { normalizeRegion } from "./context/region-stage"
import { isIbpCas } from "./context/cas"
import {
  FACTOR_KEYS,
  type FactorClass,
  type FactorKey,
  type FactorScore,
  toFactorClass,
} from "./factors"
import { asNumber, isRecord } from "./input"
import {
  IBP_METHOD_V3_0,
  IBP_METHOD_V3_2,
  type IbpMethodVersion,
  resolveMethodVersion,
} from "./method-version"
import {
  INVALID,
  type FactorScorer,
  type IbpSurveyContext,
  type IbpValidationIssue,
  type IncompleteReason,
  issue,
} from "./rules/common"
import { allowedScoresFor, isAllowedFactorScore } from "./rules/scales"
import { scoreFactorV30 } from "./rules/v3-0"
import { scoreFactorV32 } from "./rules/v3-2"

export type { IbpSurveyContext, IbpValidationIssue } from "./rules/common"

/** What the rules read from a survey: its context, raw factors and expiry. */
export type IbpEvaluationInput = IbpSurveyContext & {
  factors?: unknown
  expires_at?: string | null
}

export type IbpEvaluationMode = "draft" | "submit"

export type FactorRetainedScore = {
  score: FactorScore
  selected_class: FactorClass
}

/**
 * Result of evaluateIbp. The first seven fields are exactly the pre-01.8 API
 * `IbpValidationResult`, so the API adapter passes them through.
 */
export type IbpEvaluation = {
  ok: boolean
  errors: string[]
  warnings: string[]
  issues: IbpValidationIssue[]
  factor_scores: Record<string, number> | null
  factor_results: Record<string, FactorCanonical> | null
  scores: IbpScores | null
  /** The resolved method version, or null when the survey's version is unsupported. */
  method_version: IbpMethodVersion | null
  /** Retained score per factor (null: missing, invalid or incomplete). */
  retained: Record<FactorKey, FactorRetainedScore | null>
  /** Factors present but not scorable yet (v3.2: missing cas or A cover). */
  incomplete_factors: FactorKey[]
}

const SCORERS: Record<IbpMethodVersion, FactorScorer> = {
  [IBP_METHOD_V3_0]: scoreFactorV30,
  [IBP_METHOD_V3_2]: scoreFactorV32,
}

const INCOMPLETE_MESSAGES: Record<IncompleteReason, string> = {
  ibp_cas: "ibp_cas is required",
  native_cover: "native_cover is required",
  native_genus_count: "native_genus_count is required",
}

function emptyRetained(): Record<FactorKey, FactorRetainedScore | null> {
  const retained = {} as Record<FactorKey, FactorRetainedScore | null>
  for (const key of FACTOR_KEYS) retained[key] = null
  return retained
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === ""
}

/** The submit-only checks on the survey context (§3.3). There is no submission deadline (OA-41). */
function addSubmitContextIssues(
  input: IbpEvaluationInput,
  version: IbpMethodVersion,
  issues: IbpValidationIssue[],
): void {
  if (version === IBP_METHOD_V3_2) {
    if (!isIbpCas(input.ibp_cas)) {
      issues.push(issue("ibp_cas_required", "ibp_cas is required and must be 1, 2, 3 or 4", true))
    }
  } else {
    if (!normalizeRegion(input.region_version)) {
      issues.push(
        issue("region_version_required", "region_version is required and must be ACA or M", true),
      )
    }
    if (!input.vegetation_stage || !input.vegetation_stage.trim()) {
      issues.push(issue("vegetation_stage_required", "vegetation_stage is required", true))
    }
  }
}

/**
 * Non-blocking app heuristics, both versions (not CNPF rules). Each compares two scored factors:
 * a factor that is absent or not scorable yet (a v3.2 A without its cas) is not "very low", so it
 * raises no warning. Before 01.8 an absent factor counted as 0 here.
 */
function addConsistencyWarnings(
  factorScores: Record<string, number>,
  issues: IbpValidationIssue[],
): void {
  if (factorScores.A === 0 && factorScores.B !== undefined && factorScores.B >= 2) {
    issues.push(
      issue(
        "consistency_a_b",
        "factor_b indicates complex strata while factor_a is very low; please double-check",
        false,
        "A",
      ),
    )
  }
  if (factorScores.E === 0 && factorScores.F !== undefined && factorScores.F >= 5) {
    issues.push(
      issue(
        "consistency_e_f",
        "factor_f is high while factor_e is 0; possible but should be checked",
        false,
        "F",
      ),
    )
  }
}

/**
 * Scores and validates a survey under its method version (CH-6): a missing version is v3.0, an
 * unknown one is blocking `ibp_method_version_unsupported`. Draft mode reports only unreadable or
 * out-of-set factors as blocking (never a recomputed-score mismatch, D-05 replay safety); submit
 * mode also requires the context and every factor scored. A survey has no submission deadline
 * (OA-41): `expires_at` is no longer read.
 */
export function evaluateIbp(input: IbpEvaluationInput, mode: IbpEvaluationMode): IbpEvaluation {
  const issues: IbpValidationIssue[] = []
  const retained = emptyRetained()
  const version = resolveMethodVersion(input.ibp_method_version)

  if (version === null) {
    issues.push(
      issue(
        "ibp_method_version_unsupported",
        "ibp_method_version is not a supported IBP method version",
        true,
      ),
    )
    return formatResult(issues, null, null, {}, null, retained, [])
  }

  if (mode === "submit") {
    addSubmitContextIssues(input, version, issues)
  }

  const rawFactors = isRecord(input.factors) ? input.factors : {}
  const scorer = SCORERS[version]
  const ctx = { survey: input, factors: rawFactors, issues }
  const factorScores: Record<string, number> = {}
  const factorResults: Record<string, FactorCanonical> = {}
  const incompleteFactors: FactorKey[] = []

  for (const key of FACTOR_KEYS) {
    const value = rawFactors[key]

    if (isMissing(value)) {
      if (mode === "submit") {
        issues.push(issue("factor_required", `factor ${key} is required`, true, key))
      }
      continue
    }

    const direct = asNumber(value)
    const outcome =
      direct !== null
        ? ({ kind: "scored", score: direct } as const)
        : isRecord(value)
          ? scorer(key, value, ctx)
          : INVALID

    if (outcome.kind === "invalid") {
      issues.push(
        issue(
          outcome.code ?? "factor_invalid_raw",
          outcome.message ?? `factor ${key} has invalid raw input`,
          true,
          key,
        ),
      )
      continue
    }

    if (outcome.kind === "incomplete") {
      incompleteFactors.push(key)
      if (mode === "submit") {
        issues.push(issue("factor_required", `factor ${key} is required`, true, key))
      } else {
        const reason = INCOMPLETE_MESSAGES[outcome.reason]
        issues.push(
          issue("factor_incomplete", `factor ${key} is incomplete: ${reason}`, false, key),
        )
      }
      continue
    }

    const score = outcome.score
    if (!isAllowedFactorScore(key, score)) {
      issues.push(
        issue(
          "factor_invalid_score",
          `factor ${key} must resolve to one of [${allowedScoresFor(key).join(",")}]`,
          true,
          key,
        ),
      )
      continue
    }

    factorScores[key] = score
    retained[key] = { score, selected_class: toFactorClass(score) }
    factorResults[key] = {
      factor_id: `factor_${key.toLowerCase()}`,
      observed_value_raw: value,
      selected_class: toFactorClass(score),
      score_points: score,
      warnings: [],
    }
  }

  addConsistencyWarnings(factorScores, issues)
  for (const found of issues) {
    if (found.blocking || !found.factor) continue
    factorResults[found.factor]?.warnings.push(found.message)
  }

  const { completed_factors: _completed, ...scores } = computeTotals(retained)
  return formatResult(
    issues,
    scores,
    factorScores,
    factorResults,
    version,
    retained,
    incompleteFactors,
  )
}

function formatResult(
  issues: IbpValidationIssue[],
  scores: IbpScores | null,
  factorScores: Record<string, number> | null,
  factorResults: Record<string, FactorCanonical>,
  version: IbpMethodVersion | null,
  retained: Record<FactorKey, FactorRetainedScore | null>,
  incompleteFactors: FactorKey[],
): IbpEvaluation {
  const errors = issues.filter((i) => i.blocking).map((i) => i.message)
  const warnings = issues.filter((i) => !i.blocking).map((i) => i.message)
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    issues,
    factor_scores: factorScores,
    factor_results: Object.keys(factorResults).length > 0 ? factorResults : null,
    scores,
    method_version: version,
    retained,
    incomplete_factors: incompleteFactors,
  }
}

/** Retained score per factor under the survey's version (all null for an unsupported version). */
export function computeRetainedScores(
  factors: unknown,
  ctx: IbpSurveyContext,
): Record<FactorKey, FactorRetainedScore | null> {
  return evaluateIbp({ ...ctx, factors }, "draft").retained
}

/** Stand (A-G, /35), context (H-J, /15) and total (/50) of the retained scores (GS-1). */
export function computeTotals(
  retained: Record<FactorKey, FactorRetainedScore | null>,
): IbpScores & { completed_factors: number } {
  const value = (key: FactorKey): number => retained[key]?.score ?? 0
  const standScore =
    value("A") + value("B") + value("C") + value("D") + value("E") + value("F") + value("G")
  const contextScore = value("H") + value("I") + value("J")
  return {
    ibp_peuplement_gestion: standScore,
    ibp_contexte: contextScore,
    ibp_total: standScore + contextScore,
    completed_factors: FACTOR_KEYS.filter((key) => retained[key] !== null).length,
  }
}
