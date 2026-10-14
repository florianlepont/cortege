import {
  LARGE_STAND_OPTIONS,
  ROUTE_HOURS_MAX,
  ROUTE_ZONE_ISSUE_SEVERITY,
  UNCAPPABLE_FACTORS,
  canonicalSurveyRoute,
  isPartialRoute,
  isUncappedSelectionValid,
  recommendRoute,
  routeAdviceFor,
  routeQuestionsFor,
  routeZoneIssues,
  suggestedZoneHa,
} from "@cortege/ibp-domain"
import type {
  CountingMode,
  LargeStandOption,
  RouteAdvice,
  RouteAnswers,
  RouteChosenBy,
  RouteChoice,
  RouteComplement,
  RouteExperience,
  RouteHomogeneity,
  RouteMethod,
  RouteQuestionId,
  RouteRecommendation,
  RouteSurfaceErrorCode,
  RouteZoneIssueCode,
  SurveyRoute,
  UncappableFactor,
} from "@cortege/ibp-domain"
import { formatDecimalFr, formatHectares, parseHectaresInput } from "../../app/route-text"

// Phase 30 (plan 30-17), D-05: the pure model of the route step. It holds what the observer typed
// and answered, and derives, from the package alone, which question is open, which are answered,
// what the guide suggests and what the record would be (U-02: `routeQuestionsFor`, `recommendRoute`,
// `routeZoneIssues` and `routeAdviceFor` decide; no number of the method is compared here, the only
// numbers are parsing and rounding). Experience and hours are information only (O-04): they reach
// `routeAdviceFor` and the record, never the choice of the parcours, the counting or the zone.
// Nothing is saved before the observer accepts (U-O14): `buildRouteRecord` is called once, on
// acceptance. Nothing here needs the network (spec section 1).

/** The questions the observer answers one at a time (the folded "refine" section is not one). */
export type GuideQuestionId = Exclude<RouteQuestionId, "refine">

/** What the open card can be: a question, or the choice above the subdivision bound (R-11b). */
export type GuideOpenId = GuideQuestionId | "largeStand"

/** A parcours the observer chose in the chooser, over or instead of the suggestion. */
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
  /** The card the observer asked to open; the view falls back when it is not asked any more. */
  openId: GuideOpenId | null
}

export type GuideAction =
  | { type: "setSurfaceText"; text: string }
  | { type: "validateSurface" }
  | { type: "commitSurface" }
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

const DECIMALS_FACTOR = 100

/** Rounds to the two decimals of the record (surfaces and hours). */
function roundTwo(value: number): number {
  return Math.round(value * DECIMALS_FACTOR) / DECIMALS_FACTOR
}

/** The hectares of a typed text, rounded like the record, null when it is not a number. */
function parseRounded(text: string): number | null {
  const parsed = parseHectaresInput(text)
  return parsed === null ? null : roundTwo(parsed)
}

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
  }
}

/** The valid hours the observer gave, null when empty or unusable. */
function hoursOf(model: RouteGuideModel): number | null {
  const hours = parseRounded(model.hoursText)
  return hours !== null && hours > 0 && hours <= ROUTE_HOURS_MAX ? hours : null
}

/** The answers as the package reads them; a key is absent until it is given. */
function answersOf(model: RouteGuideModel): Partial<RouteAnswers> {
  const answers: Partial<RouteAnswers> = {}
  if (model.surfaceHa !== null) answers.surface_ha = model.surfaceHa
  if (model.homogeneity !== undefined) answers.homogeneity = model.homogeneity
  if (model.difficulty !== undefined) answers.difficulty = model.difficulty
  if (model.narrow !== undefined) answers.narrow = model.narrow
  if (model.experience !== undefined) answers.experience = model.experience
  const hours = hoursOf(model)
  if (hours !== null) answers.hours_available = hours
  if (model.subdivided) answers.subdivided = true
  return answers
}

function choiceOf(model: RouteGuideModel): RouteChoice {
  return model.largeStandOption === undefined ? {} : { largeStandOption: model.largeStandOption }
}

/** The card to open after a change: the first thing still missing, nothing when complete. */
function nextOpen(model: RouteGuideModel): GuideOpenId | null {
  const recommendation = recommendRoute(answersOf(model), choiceOf(model))
  switch (recommendation.status) {
    case "needs_surface":
      return "surface"
    case "incomplete":
      return recommendation.missing[0] as GuideQuestionId
    case "options":
      return "largeStand"
    case "route":
      return null
  }
}

/** A change that moves the open card to the first missing question. */
function advance(model: RouteGuideModel): RouteGuideModel {
  return { ...model, openId: nextOpen(model) }
}

type SurfaceCheck = { ha: number } | { error: RouteSurfaceErrorCode }

function checkSurfaceText(text: string): SurfaceCheck {
  const parsed = parseRounded(text)
  if (parsed === null) return { error: text.trim() === "" ? "surface_missing" : "surface_invalid" }
  const result = recommendRoute({ surface_ha: parsed })
  return result.status === "needs_surface" ? { error: result.error } : { ha: parsed }
}

const WITHOUT_OVERRIDES = { zoneText: null, complementDone: null, totalText: null } as const

export function guideReducer(model: RouteGuideModel, action: GuideAction): RouteGuideModel {
  switch (action.type) {
    case "setSurfaceText":
      return { ...model, surfaceText: action.text, surfaceError: null }
    case "validateSurface": {
      const check = checkSurfaceText(model.surfaceText)
      return "error" in check ? { ...model, surfaceError: check.error } : model
    }
    case "commitSurface": {
      const check = checkSurfaceText(model.surfaceText)
      if ("error" in check) return { ...model, surfaceError: check.error }
      const changed = check.ha !== model.surfaceHa
      return advance({
        ...model,
        ...(changed ? { ...WITHOUT_OVERRIDES, largeStandOption: undefined } : null),
        surfaceHa: check.ha,
        surfaceEstimated: model.prefill !== null && model.surfaceText === model.prefill.text,
        surfaceError: null,
      })
    }
    case "receivePrefill": {
      const prefill = prefillOf(action.surfaceHa)
      const untouched =
        model.prefill === null && model.surfaceHa === null && model.surfaceText === ""
      return prefill === null || !untouched
        ? model
        : { ...model, prefill, surfaceText: prefill.text }
    }
    case "answer": {
      if (action.id === "homogeneity") {
        const changed = action.value !== model.homogeneity
        return advance({
          ...model,
          homogeneity: action.value,
          ...(changed ? { largeStandOption: undefined } : null),
        })
      }
      return advance({ ...model, [action.id]: action.value })
    }
    case "reopen":
      return { ...model, openId: action.id }
    case "chooseLargeStandOption":
      if (action.option === "partial") {
        return advance({ ...model, largeStandOption: "partial", subdivided: false })
      }
      // The piece is a new stand: its surface and its answers are asked again.
      return {
        ...model,
        ...WITHOUT_OVERRIDES,
        largeStandOption: undefined,
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
      }
    case "setRefine":
      return action.field === "experience"
        ? { ...model, experience: action.value }
        : { ...model, hoursText: action.text }
    case "applyPick":
      return { ...model, ...WITHOUT_OVERRIDES, pick: action.pick }
    case "restoreSuggestion":
      return { ...model, ...WITHOUT_OVERRIDES, pick: null }
    case "setZoneText":
      return { ...model, zoneText: action.text }
    case "setComplementDone":
      return { ...model, complementDone: action.done }
    case "setTotalText":
      return { ...model, totalText: action.text }
  }
}

// ---- The view ---------------------------------------------------------------------------------

export type GuideRow =
  | { id: "surface"; hectares: number; estimated: boolean }
  | { id: "homogeneity"; value: RouteHomogeneity }
  | { id: "largeStand"; value: LargeStandOption }
  | { id: "difficulty"; value: boolean }
  | { id: "narrow"; value: boolean }

export type OpenQuestion =
  | {
      id: "surface"
      text: string
      error: RouteSurfaceErrorCode | null
      /** The text is still the estimate from the parcels. */
      estimated: boolean
      /** No estimate could be computed: the card opens empty with its explanation. */
      unknown: boolean
      /** The card asks for the surface of one piece of a cut stand (R-11b). */
      subStand: boolean
    }
  | { id: "homogeneity"; selected?: RouteHomogeneity }
  | { id: "difficulty"; selected?: boolean }
  | { id: "narrow"; selected?: boolean }
  | {
      id: "largeStand"
      options: LargeStandOption[]
      preselected: LargeStandOption
      selected: LargeStandOption
    }

export type GuideSelection = {
  /** "suggestion": what the guide proposes; "pick": what the observer chose. */
  source: "suggestion" | "pick"
  method: RouteMethod
  counting: CountingMode
  /** Sorted, empty unless the counting is uncapped. */
  uncappedFactors: UncappableFactor[]
  /** The surface described; null until one can be told. */
  zoneHa: number | null
  /** What the proposal alone would describe, null when it cannot be told. */
  zoneDefaultHa: number | null
  /** Only for a partial parcours. */
  complement: RouteComplement | null
}

export type GuideView = {
  /** The answered questions in order, the open one excluded. */
  rows: GuideRow[]
  open: OpenQuestion | null
  recommendation: RouteRecommendation
  selection: GuideSelection | null
  /** Null while there is no selection. */
  chosenBy: RouteChosenBy | null
  zoneIssues: RouteZoneIssueCode[]
  /** The text of the zone and total fields (what was typed, else the proposal). */
  zoneFieldText: string
  totalFieldText: string
  /** The complement is done but its total is missing or not a number. */
  complementTotalMissing: boolean
  advice: RouteAdvice | null
  refine: {
    experience: RouteExperience | undefined
    hoursText: string
    hoursInvalid: boolean
    /** Something usable was given: the folded section says so. */
    filled: boolean
  }
  canUse: boolean
}

function sortedFactors(factors: readonly UncappableFactor[] | undefined): UncappableFactor[] {
  const wanted = new Set(factors)
  return UNCAPPABLE_FACTORS.filter((factor) => wanted.has(factor))
}

type Proposal = {
  method: RouteMethod
  counting: CountingMode
  factors: UncappableFactor[]
  zoneHa: number | null
  complement: RouteComplement | null
}

/** What the selection starts from: the observer's pick if any, else the guide's route. */
function proposalOf(
  model: RouteGuideModel,
  recommendation: RouteRecommendation,
  neededHomogeneity: RouteHomogeneity | undefined,
): { proposal: Proposal; source: GuideSelection["source"] } | null {
  const { pick } = model
  if (pick !== null) {
    const { surfaceHa } = model
    let complement: RouteComplement | null = null
    if (isPartialRoute(pick.method)) {
      complement =
        surfaceHa === null ? { done: false } : { done: true, total_surface_ha: roundTwo(surfaceHa) }
    }
    return {
      source: "pick",
      proposal: {
        method: pick.method,
        counting: pick.counting,
        factors: pick.counting === "uncapped" ? sortedFactors(pick.uncappedFactors) : [],
        zoneHa: suggestedZoneHa(pick.method, model.surfaceHa, neededHomogeneity),
        complement,
      },
    }
  }
  if (recommendation.status !== "route") return null
  return {
    source: "suggestion",
    proposal: {
      method: recommendation.method,
      counting: recommendation.counting,
      factors: recommendation.uncapped_factors,
      zoneHa: recommendation.zone_surface_ha,
      complement: recommendation.complement,
    },
  }
}

type Resolved = {
  selection: GuideSelection
  zoneIssues: RouteZoneIssueCode[]
  zoneFieldText: string
  totalFieldText: string
  complementTotalMissing: boolean
}

function fieldText(value: number | null | undefined): string {
  return typeof value === "number" ? formatDecimalFr(value, 2) : ""
}

/** The selection with the observer's typed zone and complement applied, and its checks. */
function resolveSelection(
  model: RouteGuideModel,
  found: NonNullable<ReturnType<typeof proposalOf>>,
): Resolved {
  const { proposal, source } = found
  const zoneHa = model.zoneText === null ? proposal.zoneHa : parseRounded(model.zoneText)

  let complement: RouteComplement | null = null
  let complementTotalMissing = false
  let totalFieldText = ""
  if (proposal.complement !== null) {
    const done = model.complementDone ?? proposal.complement.done
    const total =
      model.totalText === null
        ? (proposal.complement.total_surface_ha ?? null)
        : parseRounded(model.totalText)
    totalFieldText = model.totalText ?? fieldText(proposal.complement.total_surface_ha)
    complementTotalMissing = done && total === null
    complement = done && total !== null ? { done, total_surface_ha: total } : { done }
  }

  const zoneIssues = routeZoneIssues({
    method: proposal.method,
    zoneHa,
    standHa: model.surfaceHa,
    complement,
  })
  return {
    selection: {
      source,
      method: proposal.method,
      counting: proposal.counting,
      uncappedFactors: proposal.factors,
      zoneHa,
      zoneDefaultHa: proposal.zoneHa,
      complement,
    },
    zoneIssues,
    zoneFieldText: model.zoneText ?? fieldText(proposal.zoneHa),
    totalFieldText,
    complementTotalMissing,
  }
}

function isSuggested(recommendation: RouteRecommendation, selection: GuideSelection): boolean {
  return (
    recommendation.status === "route" &&
    recommendation.method === selection.method &&
    recommendation.counting === selection.counting &&
    recommendation.uncapped_factors.join() === selection.uncappedFactors.join()
  )
}

function rowsOf(
  model: RouteGuideModel,
  shown: readonly GuideQuestionId[],
  large: boolean,
  openId: GuideOpenId | null,
): GuideRow[] {
  const rows: GuideRow[] = []
  const push = (row: GuideRow | null) => {
    if (row !== null && row.id !== openId) rows.push(row)
  }
  for (const id of shown) {
    if (id === "surface") {
      push(
        model.surfaceHa === null
          ? null
          : { id, hectares: model.surfaceHa, estimated: model.surfaceEstimated },
      )
    } else if (id === "homogeneity") {
      push(model.homogeneity === undefined ? null : { id, value: model.homogeneity })
      push(
        large && model.largeStandOption === "partial"
          ? { id: "largeStand", value: "partial" }
          : null,
      )
    } else {
      const value = model[id]
      push(value === undefined ? null : { id, value })
    }
  }
  return rows
}

function openQuestion(model: RouteGuideModel, id: GuideOpenId | null): OpenQuestion | null {
  switch (id) {
    case null:
      return null
    case "surface":
      return {
        id,
        text: model.surfaceText,
        error: model.surfaceError,
        estimated: model.prefill !== null && model.surfaceText === model.prefill.text,
        unknown: model.prefill === null,
        subStand: model.subdivided,
      }
    case "homogeneity":
      return { id, selected: model.homogeneity }
    case "difficulty":
    case "narrow":
      return { id, selected: model[id] }
    case "largeStand":
      return {
        id,
        options: [...LARGE_STAND_OPTIONS],
        preselected: "subdivide",
        selected: model.largeStandOption ?? "subdivide",
      }
  }
}

export function selectGuideView(model: RouteGuideModel): GuideView {
  const answers = answersOf(model)
  const recommendation = recommendRoute(answers, choiceOf(model))
  const shown = routeQuestionsFor(answers, choiceOf(model)).filter(
    (id): id is GuideQuestionId => id !== "refine",
  )
  // Above the bound the package offers the two options; without the observer's choice it says so.
  const large = recommendRoute(answers).status === "options"

  const requested = model.openId
  const asked = requested === "largeStand" ? large : requested !== null && shown.includes(requested)
  const openId = asked ? requested : nextOpen(model)

  const neededHomogeneity = shown.includes("homogeneity") ? model.homogeneity : undefined
  const found = proposalOf(model, recommendation, neededHomogeneity)
  const resolved = found === null ? null : resolveSelection(model, found)
  const selection = resolved?.selection ?? null
  const zoneIssues = resolved?.zoneIssues ?? []

  const blocked = zoneIssues.some((code) => ROUTE_ZONE_ISSUE_SEVERITY[code] === "error")
  const countingValid =
    selection === null ||
    selection.counting === "capped" ||
    isUncappedSelectionValid(selection.uncappedFactors)
  const canUse =
    selection !== null && !blocked && !resolved?.complementTotalMissing && countingValid

  const hours = hoursOf(model)
  const advice =
    selection === null
      ? null
      : routeAdviceFor({
          method: selection.method,
          counting: selection.counting,
          zoneHa: selection.zoneHa,
          answers: {
            difficulty: shown.includes("difficulty") ? model.difficulty : undefined,
            experience: model.experience,
            hours_available: hours ?? undefined,
          },
        })

  return {
    rows: rowsOf(model, shown, large, openId),
    open: openQuestion(model, openId),
    recommendation,
    selection,
    chosenBy:
      selection === null ? null : isSuggested(recommendation, selection) ? "guide" : "observer",
    zoneIssues,
    zoneFieldText: resolved?.zoneFieldText ?? "",
    totalFieldText: resolved?.totalFieldText ?? "",
    complementTotalMissing: resolved?.complementTotalMissing ?? false,
    advice,
    refine: {
      experience: model.experience,
      hoursText: model.hoursText,
      hoursInvalid: model.hoursText.trim() !== "" && hours === null,
      filled: model.experience !== undefined || hours !== null,
    },
    canUse,
  }
}

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
