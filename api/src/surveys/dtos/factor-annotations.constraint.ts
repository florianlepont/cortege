import { ValidatorConstraint, ValidatorConstraintInterface } from "class-validator"
import { factorAnnotationsIssues } from "@cortege/ibp-domain"

// Phase 27 (D-23, T-27-09): the `factors.annotations` container is validated by the package, so the
// shape rule (keys A to J, `doubt` and `note` only, note capped at 300) is written once and no
// copy lives in the API. It is applied to `factors` itself, which `@IsObject` already checks: a
// value that is not a plain object passes here and is reported there. The message is constant, so
// no note text is ever echoed (T-27-13).
@ValidatorConstraint({ name: "factorAnnotations", async: false })
export class FactorAnnotationsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return true
    return factorAnnotationsIssues((value as Record<string, unknown>).annotations).length === 0
  }

  defaultMessage(): string {
    return "factors.annotations is invalid"
  }
}
