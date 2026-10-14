import { isPartialRoute, recommendRoute } from "@cortege/ibp-domain"
import type {
  LargeStandOption,
  RouteExperience,
  RouteHomogeneity,
  RouteMethod,
  RouteQuestionId,
  RouteSurfaceErrorCode,
  CountingMode,
  SurveyRoute,
  UncappableFactor,
} from "@cortege/ibp-domain"
import { formatDecimalFr, formatHectares } from "../../app/route-text"
import {
  answersOf,
  choiceOf,
  hoursOf,
  nextOpen,
  parseRounded,
  roundTwo,
} from "./route-guide-answers"
import {
  canGoNext,
  canStepBack,
  currentOpen,
  isAnswered,
  leave,
  screensOf,
  previousScreen,
} from "./route-guide-steps"

export { answersOf, choiceOf, hoursOf, nextOpen, parseRounded, roundTwo }
export { canGoNext, canStepBack, currentOpen, screensOf }

// Phase 30 (plan 30-17), D-05: what the observer typed and answered, and how each action changes
// it. Pure; every rule decision is the package's (see route-guide-model.ts).

export type GuideQuestionId = Exclude<RouteQuestionId, "refine">

/** What the open card can be: a question, or the choice above the subdivision bound (R-11b). */
export type GuideOpenId = GuideQuestionId | "largeStand"

/** A parcours the observer chose in the chooser, over or instead of the suggestion. */
export type GuideScreenId = GuideOpenId | "result"

export type RouteGuidePick = {
  method: RouteMethod
  counting: CountingMode
  /** The factors counted in full; only read when `counting` is "uncapped". */
  uncappedFactors?: readonly UncappableFactor[]
}

export type RouteGuideModel = {
  /** What is in the surface field. */
  surfaceText: string
  /** The confirmed stand surface (or the surface of one piece when `subdivided`). */
  surfaceHa: number | null
  /** The confirmed surface is the untouched estimate from the parcels. */
  surfaceEstimated: boolean
  /** The estimate from the parcels, null when it could not be computed. */
  prefill: { ha: number; text: string } | null
  surfaceError: RouteSurfaceErrorCode | null
  /** R-11b: the observer cut a large stand and `surfaceHa` is the surface of one piece. */
  subdivided: boolean
  homogeneity?: RouteHomogeneity
  difficulty?: boolean
  narrow?: boolean
  /** R-11b: the observer's choice above the bound; "subdivide" lives in `subdivided`. */
  largeStandOption?: LargeStandOption
  experience?: RouteExperience
  hoursText: string
  pick: RouteGuidePick | null
  /** The described surface as typed; null while the proposal's surface is used. */
  zoneText: string | null
  complementDone: boolean | null
  totalText: string | null
  /**
   * The screen the observer is on: a question, or null for the result. The view falls back when it
   * is not asked any more (`currentOpen`).
   */
  openId: GuideOpenId | null
  /** The questions left with "Suivant", oldest first: what "back" returns to (one screen a step). */
  trail: GuideOpenId[]
  /** The option picked on the large-stand screen, applied by its "Suivant". */
  largeStandDraft?: LargeStandOption
}

export type GuideAction =
  | { type: "setSurfaceText"; text: string }
  | { type: "validateSurface" }
  | { type: "commitSurface" }
  /** "Suivant": to the next needed question, or to the result when none is left. */
  | { type: "next" }
  /** Back, one question at a time. A no-op when there is none to go back to. */
  | { type: "back" }
  | { type: "pickLargeStand"; option: LargeStandOption }
  | { type: "receivePrefill"; surfaceHa: number | null }
  | { type: "answer"; id: "homogeneity"; value: RouteHomogeneity }
  | { type: "answer"; id: "difficulty" | "narrow"; value: boolean }
  | { type: "reopen"; id: GuideOpenId }
  | { type: "chooseLargeStandOption"; option: LargeStandOption }
  | { type: "setRefine"; field: "experience"; value: RouteExperience | undefined }
  | { type: "setRefine"; field: "hours"; text: string }
  | { type: "applyPick"; pick: RouteGuidePick }
  | { type: "restoreSuggestion" }
  | { type: "setZoneText"; text: string | null }
  | { type: "setComplementDone"; done: boolean }
  | { type: "setTotalText"; text: string | null }
  /** Edit mode (30-20): the recorded route's answers and choices come back into the step. */
  | { type: "loadRecord"; route: SurveyRoute }

/** True when the package accepts this number as a stand surface (R-01). */
function isUsableSurface(value: number): boolean {
  return recommendRoute({ surface_ha: value }).status !== "needs_surface"
}

function prefillOf(surfaceHa: number | null | undefined): RouteGuideModel["prefill"] {
  if (typeof surfaceHa !== "number" || !isUsableSurface(surfaceHa)) return null
  return { ha: surfaceHa, text: formatHectares(surfaceHa) }
}

export function initialGuideModel(
  params: { surfaceHaPrefill?: number | null } = {},
): RouteGuideModel {
  const prefill = prefillOf(params.surfaceHaPrefill)
  return {
    surfaceText: prefill === null ? "" : prefill.text,
    surfaceHa: null,
    surfaceEstimated: false,
    prefill,
    surfaceError: null,
    subdivided: false,
    hoursText: "",
    pick: null,
    zoneText: null,
    complementDone: null,
    totalText: null,
    openId: "surface",
    trail: [],
  }
}

type SurfaceCheck = { ha: number } | { error: RouteSurfaceErrorCode }

function checkSurfaceText(text: string): SurfaceCheck {
  const parsed = parseRounded(text)
  if (parsed === null) return { error: text.trim() === "" ? "surface_missing" : "surface_invalid" }
  const result = recommendRoute({ surface_ha: parsed })
  return result.status === "needs_surface" ? { error: result.error } : { ha: parsed }
}

/**
 * The model of a route already recorded (edit mode, plan 30-20): its answers, the observer's pick
 * when the guide's proposal was not taken as it was, and the zone and complement as recorded. A
 * partial route recorded above the subdivision bound keeps the choice "partial", which the record
 * does not carry. Pure; the package then reads the same answers and gives the same questions.
 */
function loadRecord(model: RouteGuideModel, route: SurveyRoute): RouteGuideModel {
  const answers = route.guide.answers
  const loaded: RouteGuideModel = {
    ...model,
    surfaceHa: answers?.surface_ha ?? null,
    surfaceText:
      answers?.surface_ha === undefined ? model.surfaceText : formatHectares(answers.surface_ha),
    surfaceEstimated: false,
    surfaceError: null,
    subdivided: answers?.subdivided === true,
    homogeneity: answers?.homogeneity,
    difficulty: answers?.difficulty,
    narrow: answers?.narrow,
    largeStandOption: undefined,
    experience: answers?.experience,
    hoursText:
      answers?.hours_available === undefined ? "" : formatDecimalFr(answers.hours_available, 2),
    pick:
      route.guide.chosen_by === "observer" || answers === undefined
        ? {
            method: route.method,
            counting: route.counting,
            uncappedFactors: route.uncapped_factors,
          }
        : null,
    zoneText: formatHectares(route.zone_surface_ha),
    complementDone: route.complement?.done ?? null,
    totalText:
      route.complement?.total_surface_ha === undefined
        ? null
        : formatHectares(route.complement.total_surface_ha),
  }
  const needsChoice = !loaded.subdivided && recommendRoute(answersOf(loaded)).status === "options"
  if (needsChoice && isPartialRoute(route.method)) loaded.largeStandOption = "partial"
  return { ...loaded, openId: nextOpen(loaded), trail: [] }
}

const WITHOUT_OVERRIDES = { zoneText: null, complementDone: null, totalText: null } as const

function commitSurface(model: RouteGuideModel): RouteGuideModel {
  const check = checkSurfaceText(model.surfaceText)
  if ("error" in check) return { ...model, surfaceError: check.error }
  const changed = check.ha !== model.surfaceHa
  return leave(
    {
      ...model,
      ...(changed ? { ...WITHOUT_OVERRIDES, largeStandOption: undefined } : null),
      largeStandDraft: changed ? undefined : model.largeStandDraft,
      surfaceHa: check.ha,
      surfaceEstimated: model.prefill !== null && model.surfaceText === model.prefill.text,
      surfaceError: null,
    },
    "surface",
  )
}

/** The large-stand screen's "Suivant" (or a direct choice): a partial parcours goes on, cutting restarts. */
function chooseLargeStand(
  model: RouteGuideModel,
  option: LargeStandOption | undefined,
): RouteGuideModel {
  if (option === undefined) return model
  if (option === "partial") {
    return leave(
      { ...model, largeStandOption: "partial", largeStandDraft: undefined, subdivided: false },
      "largeStand",
    )
  }
  // The piece is a new stand: its surface and its answers are asked again, from the first question.
  return {
    ...model,
    ...WITHOUT_OVERRIDES,
    largeStandOption: undefined,
    largeStandDraft: undefined,
    subdivided: true,
    surfaceHa: null,
    surfaceText: "",
    surfaceEstimated: false,
    surfaceError: null,
    homogeneity: undefined,
    difficulty: undefined,
    narrow: undefined,
    pick: null,
    openId: "surface",
    trail: [],
  }
}

export function guideReducer(model: RouteGuideModel, action: GuideAction): RouteGuideModel {
  switch (action.type) {
    case "setSurfaceText":
      return { ...model, surfaceText: action.text, surfaceError: null }
    case "validateSurface": {
      const check = checkSurfaceText(model.surfaceText)
      return "error" in check ? { ...model, surfaceError: check.error } : model
    }
    case "commitSurface":
      return commitSurface(model)
    case "next": {
      const current = currentOpen(model)
      if (current === "surface") return commitSurface(model)
      if (current === "largeStand") return chooseLargeStand(model, model.largeStandDraft)
      return current === null || !isAnswered(model, current) ? model : leave(model, current)
    }
    case "back": {
      const previous = previousScreen(model)
      return previous === null
        ? model
        : { ...model, openId: previous.id, trail: previous.trail, surfaceError: null }
    }
    case "pickLargeStand":
      return { ...model, largeStandDraft: action.option }
    case "receivePrefill": {
      const prefill = prefillOf(action.surfaceHa)
      const untouched =
        model.prefill === null && model.surfaceHa === null && model.surfaceText === ""
      return prefill === null || !untouched
        ? model
        : { ...model, prefill, surfaceText: prefill.text }
    }
    case "answer": {
      // An answer never moves the screen: "Suivant" does.
      if (action.id === "homogeneity") {
        const changed = action.value !== model.homogeneity
        return {
          ...model,
          homogeneity: action.value,
          ...(changed ? { largeStandOption: undefined, largeStandDraft: undefined } : null),
        }
      }
      return { ...model, [action.id]: action.value }
    }
    case "reopen":
      return { ...model, openId: action.id }
    case "chooseLargeStandOption":
      return chooseLargeStand(model, action.option)
    case "setRefine":
      return action.field === "experience"
        ? { ...model, experience: action.value }
        : { ...model, hoursText: action.text }
    case "applyPick": {
      // A parcours chosen in the chooser is the result: the open question is left on the trail.
      const current = currentOpen(model)
      return {
        ...model,
        ...WITHOUT_OVERRIDES,
        pick: action.pick,
        openId: null,
        trail: current === null ? model.trail : [...model.trail, current],
      }
    }
    case "restoreSuggestion":
      return { ...model, ...WITHOUT_OVERRIDES, pick: null }
    case "setZoneText":
      return { ...model, zoneText: action.text }
    case "setComplementDone":
      return { ...model, complementDone: action.done }
    case "setTotalText":
      return { ...model, totalText: action.text }
    case "loadRecord":
      return loadRecord(model, action.route)
  }
}
