import { Injectable } from "@nestjs/common"
import {
  evaluateIbp,
  type IbpEvaluation,
  type IbpEvaluationInput,
  type IbpValidationIssue,
} from "@cortege/ibp-domain"

// Thin Nest adapter over the shared IBP rules (phase 01.8, D-06/D-07). Every scoring rule, allowed
// set and factor key lives in @cortege/ibp-domain; this service only gives it a DI token.

export type { IbpEvaluationInput, IbpValidationIssue }

/** The pre-01.8 result fields plus method_version, retained and incomplete_factors. */
export type IbpValidationResult = IbpEvaluation

@Injectable()
export class IbpRulesService {
  /** Draft checks: blocking only on unreadable or disallowed factor values. */
  validateDraft(input: IbpEvaluationInput): IbpValidationResult {
    return evaluateIbp(input, "draft")
  }

  /** Submit checks: every factor, the station context and the expiry are required. */
  validateSubmit(input: IbpEvaluationInput): IbpValidationResult {
    return evaluateIbp(input, "submit")
  }
}
