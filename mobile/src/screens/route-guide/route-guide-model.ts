import { canonicalSurveyRoute, routeQuestionsFor } from "@cortege/ibp-domain"
import type { RouteAnswers, SurveyRoute } from "@cortege/ibp-domain"
import { answersOf, choiceOf, type RouteGuideModel } from "./route-guide-state"
import { selectGuideView } from "./route-guide-view"

// Phase 30 (plan 30-17), D-05: the pure model of the route step. It holds what the observer typed
// and answered, and derives, from the package alone, which question is open, which are answered,
// what the guide suggests and what the record would be (U-02: `routeQuestionsFor`, `recommendRoute`,
// `routeZoneIssues` and `routeAdviceFor` decide; no number of the method is compared here, the only
// numbers are parsing and rounding). Experience and hours are information only (O-04): they reach
// `routeAdviceFor` and the record, never the choice of the parcours, the counting or the zone.
// Nothing is saved before the observer accepts (U-O14): `buildRouteRecord` is called once, on
// acceptance. Nothing here needs the network (spec section 1).

// The model is in three files under the 400-line cap: `route-guide-state.ts` (answers and the
// reducer), `route-guide-view.ts` (the view the screen draws) and this one (the record).

export * from "./route-guide-state"
export * from "./route-guide-view"

// ---- The record -------------------------------------------------------------------------------

/** The answers recorded: the needed ones, answered, plus the refine answers when given. */
function recordedAnswers(model: RouteGuideModel): RouteAnswers | undefined {
  if (model.surfaceHa === null) return undefined
  const answers = answersOf(model)
  const shown = routeQuestionsFor(answers, choiceOf(model))
  const recorded: RouteAnswers = { surface_ha: model.surfaceHa }
  if (shown.includes("homogeneity") && model.homogeneity !== undefined) {
    recorded.homogeneity = model.homogeneity
  }
  if (shown.includes("difficulty") && model.difficulty !== undefined) {
    recorded.difficulty = model.difficulty
  }
  if (shown.includes("narrow") && model.narrow !== undefined) recorded.narrow = model.narrow
  if (answers.experience !== undefined) recorded.experience = answers.experience
  if (answers.hours_available !== undefined) recorded.hours_available = answers.hours_available
  if (model.subdivided) recorded.subdivided = true
  return recorded
}

/**
 * The route to record once the observer accepts: canonical, `chosen_by` "guide" only when the
 * suggestion is accepted unchanged (spec section 8), null while `canUse` is false.
 */
export function buildRouteRecord(model: RouteGuideModel): SurveyRoute | null {
  const view = selectGuideView(model)
  const { selection } = view
  if (!view.canUse || selection === null || selection.zoneHa === null || view.chosenBy === null) {
    return null
  }
  const route: SurveyRoute = {
    version: 1,
    method: selection.method,
    counting: selection.counting,
    zone_surface_ha: selection.zoneHa,
    guide: { chosen_by: view.chosenBy },
  }
  if (selection.counting === "uncapped") route.uncapped_factors = selection.uncappedFactors
  if (selection.complement !== null) route.complement = selection.complement
  const { recommendation } = view
  if (recommendation.status === "route") {
    route.guide.suggested = { method: recommendation.method, counting: recommendation.counting }
  }
  const answers = recordedAnswers(model)
  if (answers !== undefined) route.guide.answers = answers
  return canonicalSurveyRoute(route)
}
