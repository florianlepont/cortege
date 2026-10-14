import {
  ROUTE_ZONE_ISSUE_SEVERITY,
  SURVEY_ROUTE_VERSION,
  UNCAPPABLE_FACTORS,
  UNCAPPED_PRESET_IDS,
  canonicalSurveyRoute,
  defaultCountingFor,
  isPartialRoute,
  isUncappedSelectionValid,
  readDmhCounts,
  readStrataCover,
  routeAdviceFor,
  routeZoneIssues,
  suggestedZoneHa,
  uncappedFactorsForPreset,
} from "@cortege/ibp-domain"
import type {
  CountingMode,
  RouteAdvice,
  RouteAnswers,
  RouteComplement,
  RouteHomogeneity,
  RouteMethod,
  RouteZoneIssueCode,
  SurveyRoute,
  UncappableFactor,
  UncappedPresetId,
} from "@cortege/ibp-domain"
import { formatHectares } from "../../app/route-text"
import type { RoutePick } from "../../navigation/types"
import type { RouteDetailsValue } from "./RouteDetailsCard"
import { parseRounded } from "./route-guide-state"

// Phase 30 (plan 30-21): the state of the chooser "Choisir le parcours" and the record or pick it
// produces. Pure. The default mode, the presets, the zone checks and the advice are the package's
// (R-16, R-17, R-13): this file holds no threshold and no factor list of its own (spec sections 5
// and 6, owner decisions O-01 and O-14).

/** What the guide proposed, to mark the card "Conseillé" (the package never proposes uncapped). */
export type ChooseSuggestion = { method: RouteMethod; counting: CountingMode }

export type RouteChooseModel = {
  /** The parcours; null until one is chosen (a draft without a route, or no preselection). */
  method: RouteMethod | null
  counting: CountingMode
  /** The mode was chosen (or loaded as relevé déplafonné) in this session: a parcours keeps it. */
  countingTouched: boolean
  preset: UncappedPresetId
  /** The factors counted in full, sorted; empty unless the mode is "uncapped". */
  factors: UncappableFactor[]
  zoneText: string
  complementDone: boolean
  totalText: string
  /** The zone and complement were given (loaded or typed): a parcours of the same kind keeps them. */
  detailsTouched: boolean
  /** The stand surface; null when unknown (the zone is then typed by hand, offline included). */
  standHa: number | null
  homogeneity: RouteHomogeneity | undefined
  /** The guide's answers on a recorded route: they only feed the duration advice. */
  answers: Partial<RouteAnswers>
  suggested: ChooseSuggestion | null
  /** B or F detail values exist on the draft (U-O10): leaving the full count says they are kept. */
  hasDetailData: boolean
  keptValuesNotice: boolean
}

export type ChooseInit = {
  /** The selection of the route step (pick mode). It wins over `record`. */
  preselect?: RoutePick
  /** The route recorded on the draft (edit mode); null or absent for a draft without a route. */
  record?: SurveyRoute | null
  standHa: number | null
  suggested?: ChooseSuggestion | null
  hasDetailData?: boolean
}

export type ChooseAction =
  | { type: "selectMethod"; method: RouteMethod }
  | { type: "selectCounting"; counting: CountingMode }
  | { type: "selectPreset"; preset: UncappedPresetId }
  | { type: "toggleFactor"; factor: UncappableFactor }
  | { type: "setDetails"; value: RouteDetailsValue }
  /** Edit mode: the recorded route arrived after the first render. */
  | { type: "load"; model: RouteChooseModel }

// ---- Start ------------------------------------------------------------------------------------

function sortedFactors(factors: readonly UncappableFactor[]): UncappableFactor[] {
  const wanted = new Set(factors)
  return UNCAPPABLE_FACTORS.filter((factor) => wanted.has(factor))
}

/** The preset a list of factors is exactly, else "custom" (R-17). */
export function presetOfFactors(factors: readonly UncappableFactor[]): UncappedPresetId {
  const key = sortedFactors(factors).join()
  const found = UNCAPPED_PRESET_IDS.find(
    (id) => id !== "custom" && uncappedFactorsForPreset(id).join() === key,
  )
  return found ?? "custom"
}

type Defaults = Pick<RouteChooseModel, "zoneText" | "complementDone" | "totalText">

/** What a parcours starts with (R-13, R-14): the package's zone, and for a partial one the rest. */
function defaultsFor(
  method: RouteMethod,
  standHa: number | null,
  homogeneity: RouteHomogeneity | undefined,
): Defaults {
  const zone = suggestedZoneHa(method, standHa, homogeneity)
  const partial = isPartialRoute(method)
  return {
    zoneText: zone === null ? "" : formatHectares(zone),
    // R-14: looking at the rest of the stand is on by default for a partial parcours.
    complementDone: partial && standHa !== null,
    totalText: partial && standHa !== null ? formatHectares(standHa) : "",
  }
}

const NO_ANSWERS: Partial<RouteAnswers> = {}

function empty(init: ChooseInit): RouteChooseModel {
  return {
    method: null,
    counting: "capped",
    countingTouched: false,
    preset: "all_factors",
    factors: [],
    zoneText: "",
    complementDone: false,
    totalText: "",
    detailsTouched: false,
    standHa: init.standHa,
    homogeneity: undefined,
    answers: NO_ANSWERS,
    suggested: init.suggested ?? null,
    hasDetailData: init.hasDetailData === true,
    keptValuesNotice: false,
  }
}

function fromPick(init: ChooseInit, pick: RoutePick): RouteChooseModel {
  const base = empty(init)
  const factors = pick.counting === "uncapped" ? sortedFactors(pick.uncapped_factors) : []
  const given = pick.details
  const defaults = defaultsFor(pick.method, init.standHa, undefined)
  return {
    ...base,
    method: pick.method,
    counting: pick.counting,
    countingTouched: pick.counting !== defaultCountingFor(pick.method),
    preset: factors.length === 0 ? base.preset : presetOfFactors(factors),
    factors,
    zoneText: given?.zoneText ?? defaults.zoneText,
    complementDone: given?.complementDone ?? defaults.complementDone,
    totalText: given?.totalText ?? defaults.totalText,
    detailsTouched: given !== undefined,
  }
}

function fromRecord(init: ChooseInit, record: SurveyRoute): RouteChooseModel {
  const base = empty(init)
  const factors = record.counting === "uncapped" ? sortedFactors(record.uncapped_factors ?? []) : []
  const answers = record.guide.answers
  return {
    ...base,
    method: record.method,
    counting: record.counting,
    countingTouched: record.counting !== defaultCountingFor(record.method),
    preset: factors.length === 0 ? base.preset : presetOfFactors(factors),
    factors,
    zoneText: formatHectares(record.zone_surface_ha),
    complementDone: record.complement?.done ?? false,
    totalText:
      record.complement?.total_surface_ha === undefined
        ? ""
        : formatHectares(record.complement.total_surface_ha),
    detailsTouched: true,
    homogeneity: answers?.homogeneity,
    answers: answers ?? NO_ANSWERS,
    suggested: init.suggested ?? record.guide.suggested ?? null,
  }
}

/**
 * The chooser's starting point: the route step's selection, else the recorded route, else nothing
 * chosen (a draft without a route: "Utiliser ce parcours" stays off until a parcours and a valid
 * surface are given, spec section 9).
 */
export function initialChooseModel(init: ChooseInit): RouteChooseModel {
  if (init.preselect !== undefined) return fromPick(init, init.preselect)
  if (init.record !== undefined && init.record !== null) return fromRecord(init, init.record)
  return empty(init)
}

/**
 * The stand surface behind a recorded route when the caller did not give one: the guide's answer,
 * else what the record itself says (the zone of a full parcours is the stand, a done complement
 * carries the total surface).
 */
export function standOfRecord(record: SurveyRoute): number | null {
  const answered = record.guide.answers?.surface_ha
  if (answered !== undefined) return answered
  if (!isPartialRoute(record.method)) return record.zone_surface_ha
  return record.complement?.done === true ? (record.complement.total_surface_ha ?? null) : null
}

/** True when the draft holds B cover or F counts, which a capped relevé hides but keeps (U-O10). */
export function hasUncappedDetailData(factors: unknown): boolean {
  if (typeof factors !== "object" || factors === null) return false
  const { B, F } = factors as { B?: { strata_cover?: unknown }; F?: { dmh_counts?: unknown } }
  return readStrataCover(B?.strata_cover) !== null || readDmhCounts(F?.dmh_counts) !== null
}

// ---- Reducer ----------------------------------------------------------------------------------

function selectMethod(model: RouteChooseModel, method: RouteMethod): RouteChooseModel {
  if (model.method === method) return model
  const counting = model.countingTouched ? model.counting : defaultCountingFor(method)
  // A partial parcours does not describe the stand: leaving one kind for the other starts again from
  // the package's zone. Between two partial parcours, or untouched, the typed values stand.
  const kindChanged =
    model.method !== null && isPartialRoute(model.method) !== isPartialRoute(method)
  const details =
    kindChanged || !model.detailsTouched
      ? { ...defaultsFor(method, model.standHa, model.homogeneity), detailsTouched: false }
      : {}
  return { ...model, method, counting, ...details }
}

function selectCounting(model: RouteChooseModel, counting: CountingMode): RouteChooseModel {
  if (counting === model.counting) return { ...model, countingTouched: true }
  if (counting === "uncapped") {
    // R-16, R-17: the relevé déplafonné is a manual choice and starts from "Tous les facteurs".
    return {
      ...model,
      counting,
      countingTouched: true,
      preset: "all_factors",
      factors: uncappedFactorsForPreset("all_factors"),
      keptValuesNotice: false,
    }
  }
  // Back to plafonné: the detail values are kept and hidden, never deleted (U-O10).
  return {
    ...model,
    counting,
    countingTouched: true,
    factors: [],
    keptValuesNotice: model.hasDetailData,
  }
}

export function chooseReducer(model: RouteChooseModel, action: ChooseAction): RouteChooseModel {
  switch (action.type) {
    case "selectMethod":
      return selectMethod(model, action.method)
    case "selectCounting":
      return selectCounting(model, action.counting)
    case "selectPreset":
      return { ...model, preset: action.preset, factors: uncappedFactorsForPreset(action.preset) }
    case "toggleFactor": {
      const wanted = new Set(model.factors)
      if (wanted.has(action.factor)) wanted.delete(action.factor)
      else wanted.add(action.factor)
      // Touching a chip leaves the preset: the selection is the observer's own (R-17).
      return { ...model, preset: "custom", factors: sortedFactors([...wanted]) }
    }
    case "setDetails":
      return {
        ...model,
        zoneText: action.value.zoneText,
        complementDone: action.value.complementDone,
        totalText: action.value.totalText,
        detailsTouched: true,
      }
    case "load":
      return action.model
  }
}

// ---- View -------------------------------------------------------------------------------------

export type ChooseView = {
  method: RouteMethod | null
  counting: CountingMode
  preset: UncappedPresetId
  factors: UncappableFactor[]
  /** The mode is "uncapped" and no factor is left (R-17). */
  factorsMissing: boolean
  keptValuesNotice: boolean
  details: RouteDetailsValue
  standHa: number | null
  suggested: ChooseSuggestion | null
  zoneIssues: RouteZoneIssueCode[]
  advice: RouteAdvice
  canUse: boolean
}

function complementOf(model: RouteChooseModel): {
  value: RouteComplement | null
  missing: boolean
} {
  if (model.method === null || !isPartialRoute(model.method)) return { value: null, missing: false }
  if (!model.complementDone) return { value: { done: false }, missing: false }
  const total = parseRounded(model.totalText)
  return total === null
    ? { value: { done: true }, missing: true }
    : { value: { done: true, total_surface_ha: total }, missing: false }
}

/** What the screen draws, derived from the model and the package alone. */
export function selectChooseView(model: RouteChooseModel): ChooseView {
  const { method, counting } = model
  const zoneHa = parseRounded(model.zoneText)
  const complement = complementOf(model)
  const zoneIssues =
    method === null
      ? []
      : routeZoneIssues({ method, zoneHa, standHa: model.standHa, complement: complement.value })
  const blocked = zoneIssues.some((code) => ROUTE_ZONE_ISSUE_SEVERITY[code] === "error")
  const factorsMissing = counting === "uncapped" && !isUncappedSelectionValid(model.factors)
  return {
    method,
    counting,
    preset: model.preset,
    factors: model.factors,
    factorsMissing,
    keptValuesNotice: model.keptValuesNotice && counting === "capped",
    details: {
      zoneText: model.zoneText,
      complementDone: model.complementDone,
      totalText: model.totalText,
    },
    standHa: model.standHa,
    suggested: model.suggested,
    zoneIssues,
    // The duration and the "takes longer" line depend on the mode and the zone, not on a parcours.
    advice: routeAdviceFor({ method: method ?? "full", counting, zoneHa, answers: model.answers }),
    canUse: method !== null && !factorsMissing && !blocked && !complement.missing,
  }
}

// ---- Outputs ----------------------------------------------------------------------------------

/** The selection handed back to the route step; null while it cannot be used. */
export function buildPick(model: RouteChooseModel): RoutePick | null {
  const view = selectChooseView(model)
  if (!view.canUse || view.method === null) return null
  return {
    method: view.method,
    counting: view.counting,
    uncapped_factors: view.counting === "uncapped" ? view.factors : [],
    details: view.details,
  }
}

/** True when the selection is exactly what the guide had suggested (method and plafonné mode). */
function isTheSuggestion(model: RouteChooseModel, previous: SurveyRoute | null): boolean {
  const suggested = previous?.guide.suggested
  return (
    suggested !== undefined &&
    model.method === suggested.method &&
    model.counting === "capped" &&
    suggested.counting === "capped"
  )
}

/**
 * The canonical record an edit saves. `chosen_by` is "observer" unless the selection is the guide's
 * own suggestion; the previous answers and suggestion are kept (spec section 8). With no previous
 * record the guide holds `chosen_by` alone. Null while the selection cannot be used.
 */
export function buildEditedRecord(
  model: RouteChooseModel,
  previous: SurveyRoute | null,
): SurveyRoute | null {
  const view = selectChooseView(model)
  const zoneHa = parseRounded(model.zoneText)
  if (!view.canUse || view.method === null || zoneHa === null) return null
  const complement = complementOf(model).value
  const record: SurveyRoute = {
    version: SURVEY_ROUTE_VERSION,
    method: view.method,
    counting: view.counting,
    zone_surface_ha: zoneHa,
    guide: { chosen_by: isTheSuggestion(model, previous) ? "guide" : "observer" },
  }
  if (view.counting === "uncapped") record.uncapped_factors = view.factors
  if (complement !== null) record.complement = complement
  if (previous?.guide.suggested !== undefined) record.guide.suggested = previous.guide.suggested
  if (previous?.guide.answers !== undefined) record.guide.answers = previous.guide.answers
  return canonicalSurveyRoute(record)
}
