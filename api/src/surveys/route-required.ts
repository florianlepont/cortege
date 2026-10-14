import { UnprocessableEntityException } from "@nestjs/common"
import {
  readSurveyRoute,
  ROUTE_REQUIRED_CODE,
  SURVEY_ROUTE_CLIENT_FEATURE,
} from "@cortege/ibp-domain"

/**
 * Phase 30 (O-07 and O-19, spec section 8, open point P-2): the route ("Parcours utilisé") is
 * mandatory for the new client only. The new client sends the fixed header
 * `X-Cortege-Features: survey_route` (CLIENT_FEATURES_HEADER of the package) on every request;
 * an installed older build never sends it and keeps the old behaviour, and so do the existing
 * API tests. The rule is a data-quality rule, not an access control. The score never depends on
 * the route (spec section 1): nothing here reads the factors.
 */

const ROUTE_REQUIRED_MESSAGE = "survey_route is required"

/** True when the comma-separated header value lists the route feature (trimmed, case-insensitive). */
export function clientRequiresRoute(headerValue: string | undefined): boolean {
  if (typeof headerValue !== "string") return false
  return headerValue
    .split(",")
    .some((entry) => entry.trim().toLowerCase() === SURVEY_ROUTE_CLIENT_FEATURE)
}

function routeRequired(): UnprocessableEntityException {
  // Constant code and message: nothing from the request body is echoed.
  return new UnprocessableEntityException({
    code: ROUTE_REQUIRED_CODE,
    message: ROUTE_REQUIRED_MESSAGE,
  })
}

/** Creating a survey: the body must carry a valid route when the client requires it. */
export function assertRouteForCreate(
  body: { survey_route?: unknown },
  requireRoute: boolean,
): void {
  if (!requireRoute) return
  if (readSurveyRoute(body.survey_route) === null) throw routeRequired()
}

/** Submitting a survey: the stored row must carry a valid route when the client requires it. */
export function assertRouteForSubmit(storedRoute: unknown, requireRoute: boolean): void {
  if (!requireRoute) return
  if (readSurveyRoute(storedRoute) === null) throw routeRequired()
}
