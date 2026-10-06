import { isIbpCas } from "./context/cas"
import { normalizeRegion } from "./context/region-stage"
import { computeRetainedScores, type IbpEvaluationInput } from "./evaluate"
import { FACTOR_KEYS, type FactorKey } from "./factors"
import { IBP_METHOD_V3_2, resolveMethodVersion } from "./method-version"

/** Survey-level fields a draft may still miss before submit (parcel_ids stays in the app). */
export type SubmitReadinessField =
  | "ibp_method_version"
  | "region_version"
  | "vegetation_stage"
  | "ibp_cas"

export type SubmitReadiness = {
  ready: boolean
  missing_factors: FactorKey[]
  missing_fields: SubmitReadinessField[]
}

/**
 * Whether a draft can be submitted, per its method version: v3.0 needs region and stage, v3.2 the
 * cas; a factor is missing when it is absent, unreadable, out of its allowed set or incomplete.
 * An unsupported version reports `ibp_method_version` and every factor missing.
 */
export function evaluateSubmitReadiness(draft: IbpEvaluationInput): SubmitReadiness {
  const version = resolveMethodVersion(draft.ibp_method_version)
  const retained = computeRetainedScores(draft.factors, draft)
  const missingFactors = FACTOR_KEYS.filter((key) => retained[key] === null)
  const missingFields: SubmitReadinessField[] = []

  if (version === null) {
    missingFields.push("ibp_method_version")
  } else if (version === IBP_METHOD_V3_2) {
    if (!isIbpCas(draft.ibp_cas)) missingFields.push("ibp_cas")
  } else {
    if (!normalizeRegion(draft.region_version)) missingFields.push("region_version")
    const stage = typeof draft.vegetation_stage === "string" ? draft.vegetation_stage : ""
    if (!stage.trim()) missingFields.push("vegetation_stage")
  }

  return {
    ready: missingFactors.length === 0 && missingFields.length === 0,
    missing_factors: missingFactors,
    missing_fields: missingFields,
  }
}
