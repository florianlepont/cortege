import {
  LARGE_STAND_OPTIONS,
  preselectedLargeStandOption,
  ROUTE_ZONE_ISSUE_SEVERITY,
  UNCAPPABLE_FACTORS,
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
  RouteChosenBy,
  RouteComplement,
  RouteExperience,
  RouteHomogeneity,
  RouteMethod,
  RouteRecommendation,
  RouteSurfaceErrorCode,
  RouteZoneIssueCode,
  UncappableFactor,
} from "@cortege/ibp-domain"
import { formatDecimalFr } from "../../app/route-text"
import {
  answersOf,
  choiceOf,
  canGoNext,
  canStepBack,
  currentOpen,
  hoursOf,
  parseRounded,
  roundTwo,
  type GuideOpenId,
  type GuideQuestionId,
  type GuideScreenId,
  type RouteGuideModel,
} from "./route-guide-state"

// Phase 30 (plan 30-17): what the screen draws, derived from the model and the package alone.

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
      /** Nothing is selected until the observer picks (the tag only marks the advised one). */
      selected?: LargeStandOption
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
  /** The screen drawn: the open question, or the result once none is open. */
  screen: GuideScreenId
  /** "Suivant" can be pressed on the open question (it holds an answer). */
  canNext: boolean
  /** "Back" returns to a previous question; false on the first one, where it leaves the step. */
  canStepBack: boolean
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
        preselected: preselectedLargeStandOption(model.homogeneity),
        selected: model.largeStandDraft ?? model.largeStandOption,
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

  const openId = currentOpen(model)

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
    screen: openId ?? "result",
    canNext: canGoNext(model, openId),
    canStepBack: canStepBack(model),
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
