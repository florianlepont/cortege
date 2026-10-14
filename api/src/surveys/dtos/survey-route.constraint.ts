import { ValidatorConstraint, ValidatorConstraintInterface } from "class-validator"
import { validateSurveyRoute } from "@cortege/ibp-domain"

// Phase 30 (D-08, D-09): the cross-field rules of the recorded route are the package's
// (validateSurveyRoute), so they are written once and no copy lives in the API. It is applied to
// `survey_route` itself, after the nested DTO checks: a present, non-null value is run through the
// package validator, an absent or null one is skipped by @IsOptional (whether a route is required
// is decided by the service from the client marker, plan 30-10). The message is constant, so no
// value is ever echoed.
@ValidatorConstraint({ name: "surveyRoute", async: false })
export class SurveyRouteConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true
    return validateSurveyRoute(value).length === 0
  }

  defaultMessage(): string {
    return "survey_route is invalid"
  }
}
