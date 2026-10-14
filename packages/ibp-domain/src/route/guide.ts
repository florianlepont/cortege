import type { RouteAnswers, RouteComplement } from "../contract/route"
import {
  ROUTE_HOMOGENEITY_VALUES,
  ROUTE_HOURS_MAX,
  ROUTE_SURFACE_DECIMALS,
  ROUTE_SURFACE_MAX_HA,
  UNCAPPABLE_FACTORS,
} from "./record"
import type {
  CountingMode,
  PartialRouteMethod,
  RouteHomogeneity,
  RouteMethod,
  UncappableFactor,
} from "./record"

// Phase 30: the route-choice rules of docs/specs/route-choice-rules-v1.md, validated by the owner
// on 2026-10-14 (section 13). Pure functions that return codes only: the app's French catalogue
// speaks, no screen holds a threshold. Two parcours only (O-14): the full parcours and the partial
// one, by strip or by plot. Only the stand chooses the parcours: its surface, homogeneity,
// difficulty and width (D-05, O-18). Time available and experience are information (O-04): they
// never appear in a condition of R-01 to R-18 and only produce the advice of R-19 to R-21. Every
// constant cites its page: S is the CNPF sheet (IBP FR v3.2, 02/02/26), M is "Methodes de releve de
// l'IBP" (Gonin and Larrieu, 09/09/25).

/** Rule ids of spec section 5. R-04, R-05 and R-06 are retired and their ids are never reused. */
export const ROUTE_RULE_IDS = [
  "R-01",
  "R-02",
  "R-03",
  "R-07",
  "R-08",
  "R-09",
  "R-10",
  "R-11",
  "R-11b",
  "R-12a",
  "R-12b",
  "R-13",
  "R-14",
  "R-15",
  "R-16",
  "R-17",
  "R-18",
  "R-19",
  "R-20",
  "R-21",
] as const
export type RouteRuleId = (typeof ROUTE_RULE_IDS)[number]

/** Below this surface (ha) the proposal is unchanged and `small_stand` is added (M p. 4, O-11). */
export const ROUTE_TINY_STAND_HA = 0.5

/** Up to this surface (ha) the whole stand is described, a full parcours (M p. 4). */
export const ROUTE_SMALL_STAND_HA = 1

/** Largest stand (ha) of the full parcours (M p. 4, p. 6; S p. 18; decision O-05). */
export const ROUTE_FULL_MAX_HA = 5

/** Above this surface (ha) a heterogeneous stand is cut or sampled (M p. 4, "10-20 ha", O-02). */
export const ROUTE_SUBDIVIDE_HETEROGENEOUS_HA = 10

/** Above this surface (ha) a homogeneous stand is cut or sampled (M p. 4, O-02). */
export const ROUTE_SUBDIVIDE_HOMOGENEOUS_HA = 20

/** Smallest surface (ha) a partial parcours samples (M p. 7). */
export const PARTIAL_SAMPLE_MIN_HA = 1

/** Share of a homogeneous stand a partial parcours samples, a pure plantation (M p. 7). */
export const PARTIAL_SAMPLE_SHARE_HOMOGENEOUS = 0.1

/** Share of a heterogeneous stand a partial parcours samples, a mixed irregular high forest (M p. 7). */
export const PARTIAL_SAMPLE_SHARE_HETEROGENEOUS = 0.2

/** Above this share of the stand a partial zone raises `partial_over_half` (M p. 7). */
export const PARTIAL_OVER_HALF_SHARE = 0.5

/** A stand narrower than this (m) is better described in strips (M p. 8, table 3). */
export const ROUTE_NARROW_WIDTH_M = 100

/** Minutes per hectare and per person, easy stand, for an operator used to the IBP (S p. 19; M p. 17). */
export const ROUTE_MINUTES_PER_HA_EASY = { min: 15, max: 20 } as const

/** Minutes per hectare and per person, hard stand, for an operator used to the IBP (S p. 19; M p. 17). */
export const ROUTE_MINUTES_PER_HA_HARD = { min: 25, max: 30 } as const

/** Questions of the guide, in display order (spec section 4). */
export const ROUTE_QUESTION_IDS = [
  "surface",
  "homogeneity",
  "difficulty",
  "narrow",
  "refine",
] as const
export type RouteQuestionId = (typeof ROUTE_QUESTION_IDS)[number]

/** Reasons of a proposal (spec section 5), at most four are returned. */
export const ROUTE_REASON_CODES = [
  "whole_stand_small",
  "whole_stand_heterogeneous",
  "partial_hard_to_observe",
  "partial_homogeneous",
  "partial_medium_stand",
  "large_stand",
  "partial_strip_why",
  "partial_plot_why",
  "complement_advised",
  "capped_default",
] as const
export type RouteReasonCode = (typeof ROUTE_REASON_CODES)[number]

/**
 * Warnings of a proposal (R-02, R-13). `partial_below_minimum` is a warning of the zone checks only
 * (`ROUTE_ZONE_ISSUE_CODES`): a proposed zone is never under 1 ha for a partial parcours.
 */
export const ROUTE_WARNING_CODES = ["small_stand", "partial_over_half"] as const
export type RouteWarningCode = (typeof ROUTE_WARNING_CODES)[number]

/** Advice that never moves the proposal (R-18 to R-21). */
export const ROUTE_ADVICE_CODES = ["duration", "time_short", "beginner", "uncapped_longer"] as const
export type RouteAdviceCode = (typeof ROUTE_ADVICE_CODES)[number]

/** Errors on the stand surface (R-01). */
export const ROUTE_SURFACE_ERROR_CODES = ["surface_missing", "surface_invalid"] as const
export type RouteSurfaceErrorCode = (typeof ROUTE_SURFACE_ERROR_CODES)[number]

/** The two options above the subdivision bound, in order (R-11b, O-03): subdivide is pre-selected. */
export const LARGE_STAND_OPTIONS = ["subdivide", "partial"] as const
export type LargeStandOption = (typeof LARGE_STAND_OPTIONS)[number]

/** Checks of the described surface, in the order of the spec table (section "Controles"). */
export const ROUTE_ZONE_ISSUE_CODES = [
  "zone_not_positive",
  "zone_too_large",
  "zone_above_stand",
  "partial_over_half",
  "partial_below_minimum",
  "complement_below_zone",
] as const
export type RouteZoneIssueCode = (typeof ROUTE_ZONE_ISSUE_CODES)[number]

/** An error blocks the recording, a warning does not. */
export const ROUTE_ZONE_ISSUE_SEVERITY: Readonly<Record<RouteZoneIssueCode, "error" | "warning">> =
  {
    zone_not_positive: "error",
    zone_too_large: "error",
    zone_above_stand: "error",
    partial_over_half: "warning",
    partial_below_minimum: "warning",
    complement_below_zone: "error",
  }

/** Presets of the uncapped counting (R-17, O-01). */
export const UNCAPPED_PRESET_IDS = [
  "all_factors",
  "mature",
  "always_max",
  "minimum",
  "custom",
] as const
export type UncappedPresetId = (typeof UNCAPPED_PRESET_IDS)[number]

/**
 * Factors counted in full by preset (R-17; M p. 23, p. 24; S p. 20, p. 21 note 1). `always_max` is
 * the candidate set, all proposed at the start; `custom` starts empty and needs at least one.
 */
export const UNCAPPED_PRESETS: Readonly<Record<UncappedPresetId, readonly UncappableFactor[]>> = {
  all_factors: ["A", "B", "C", "D", "E", "F", "G", "I", "J"],
  mature: ["A", "C", "D", "E", "F"],
  always_max: ["A", "C", "D", "E", "F", "I", "J"],
  minimum: ["C", "D", "E"],
  custom: [],
}

/** Default counting by parcours: capped for the three (R-16; M p. 5, table 2). */
const DEFAULT_COUNTING: Readonly<Record<RouteMethod, CountingMode>> = {
  full: "capped",
  partial_strip: "capped",
  partial_plot: "capped",
}

/** The counting the guide proposes. It never proposes uncapped (R-16, O-01). */
export function defaultCountingFor(method: RouteMethod): CountingMode {
  return DEFAULT_COUNTING[method]
}

/** The factors of a preset, in factor order, as a copy the caller may change (R-17). */
export function uncappedFactorsForPreset(preset: UncappedPresetId): UncappableFactor[] {
  const wanted = new Set<UncappableFactor>(UNCAPPED_PRESETS[preset])
  return UNCAPPABLE_FACTORS.filter((factor) => wanted.has(factor))
}

/** A selection is valid with at least one uncappable factor, never H (R-17, R-17#custom-empty). */
export function isUncappedSelectionValid(factors: readonly string[]): boolean {
  return (
    factors.length > 0 &&
    factors.every((factor) => (UNCAPPABLE_FACTORS as readonly string[]).includes(factor))
  )
}

/** Rounds a surface to `ROUTE_SURFACE_DECIMALS` decimals. */
function roundHa(value: number): number {
  const scale = 10 ** ROUTE_SURFACE_DECIMALS
  return Math.round(value * scale) / scale
}

/** Smallest surface the record accepts: a zone that rounds to zero would be refused. */
const SMALLEST_ZONE_HA = 1 / 10 ** ROUTE_SURFACE_DECIMALS

/** A usable surface: a finite number above 0 and at most `ROUTE_SURFACE_MAX_HA` (R-01). */
function isValidSurface(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= ROUTE_SURFACE_MAX_HA
  )
}

/** The zone of the full parcours is the stand (R-13 table "Surface decrite conseillee"; M p. 6). */
function fullZoneHa(standHa: number): number {
  return Math.max(SMALLEST_ZONE_HA, roundHa(standHa))
}

const PARTIAL_SHARE: Readonly<Record<RouteHomogeneity, number>> = {
  homogeneous: PARTIAL_SAMPLE_SHARE_HOMOGENEOUS,
  heterogeneous: PARTIAL_SAMPLE_SHARE_HETEROGENEOUS,
}

/** R-13 (M p. 7): min(S, max(1 ha, share x S)), rounded to 2 decimals. */
function partialZoneHa(standHa: number, homogeneity: RouteHomogeneity): number {
  return roundHa(
    Math.min(standHa, Math.max(PARTIAL_SAMPLE_MIN_HA, PARTIAL_SHARE[homogeneity] * standHa)),
  )
}

/**
 * The surface a survey describes by default (R-13), null when it cannot be told: a stand surface
 * that is absent or out of range, or a partial parcours without homogeneity (no invented share).
 */
export function suggestedZoneHa(
  method: RouteMethod,
  standHa: number | null | undefined,
  homogeneity?: RouteHomogeneity,
): number | null {
  if (!isValidSurface(standHa)) return null
  if (method === "full") return fullZoneHa(standHa)
  if (homogeneity === undefined) return null
  return partialZoneHa(standHa, homogeneity)
}

/**
 * R-15 (M p. 7): several plots of a partial parcours are one sheet and the described surface is the
 * sum of their surfaces, checked like any zone.
 */
export function sumPlotSurfacesHa(plots: readonly number[]): number {
  return roundHa(plots.reduce((total, plot) => total + plot, 0))
}

/** True when a partial zone is more than half the stand (R-13; M p. 7). */
function isOverHalf(zoneHa: number, standHa: number): boolean {
  return zoneHa > PARTIAL_OVER_HALF_SHARE * standHa
}

export type RouteZoneInput = {
  method: RouteMethod
  /** The described surface, as typed or summed from the plots. */
  zoneHa: number | null | undefined
  /** The stand surface when known; without it only the stand-free checks run. */
  standHa?: number | null
  complement?: RouteComplement | null
}

/**
 * Live checks of the described surface (spec section "Controles de la surface decrite"), in the
 * order of `ROUTE_ZONE_ISSUE_CODES`. `ROUTE_ZONE_ISSUE_SEVERITY` says which block the recording.
 */
export function routeZoneIssues(input: RouteZoneInput): RouteZoneIssueCode[] {
  const { method, zoneHa, standHa, complement } = input
  if (typeof zoneHa !== "number" || !(zoneHa > 0)) return ["zone_not_positive"]
  const issues = new Set<RouteZoneIssueCode>()
  const stand = typeof standHa === "number" && standHa > 0 ? standHa : null
  if (zoneHa > ROUTE_SURFACE_MAX_HA) issues.add("zone_too_large")
  if (stand !== null && zoneHa > stand) issues.add("zone_above_stand")
  if (method !== "full") {
    if (stand !== null && isOverHalf(zoneHa, stand)) issues.add("partial_over_half")
    if (zoneHa < PARTIAL_SAMPLE_MIN_HA) issues.add("partial_below_minimum")
  }
  if (
    complement?.done &&
    complement.total_surface_ha !== undefined &&
    complement.total_surface_ha < zoneHa
  )
    issues.add("complement_below_zone")
  return ROUTE_ZONE_ISSUE_CODES.filter((code) => issues.has(code))
}

export type RouteAdviceInput = {
  /** The parcours; the sampled surface is the zone for each of them (R-19). */
  method: RouteMethod
  counting: CountingMode
  zoneHa: number | null | undefined
  answers: Partial<RouteAnswers>
}

export type RouteAdvice = {
  advice: RouteAdviceCode[]
  estimated_minutes: { min: number; max: number } | null
}

/**
 * Advice for a selection: it never changes the method, the counting or the zone (R-19 to R-21, O-04).
 * The duration is information for an operator used to the IBP; the official text gives it as an
 * indication (S p. 19; M p. 17).
 */
export function routeAdviceFor(input: RouteAdviceInput): RouteAdvice {
  const { counting, zoneHa, answers } = input
  const advice: RouteAdviceCode[] = []

  // R-19 (S p. 19; M p. 17): zone x minutes per hectare, the hard range when the observer said so.
  let minutes: RouteAdvice["estimated_minutes"] = null
  if (typeof zoneHa === "number" && Number.isFinite(zoneHa) && zoneHa > 0) {
    const rate = answers.difficulty === true ? ROUTE_MINUTES_PER_HA_HARD : ROUTE_MINUTES_PER_HA_EASY
    minutes = { min: Math.round(zoneHa * rate.min), max: Math.round(zoneHa * rate.max) }
    advice.push("duration")
  }

  // R-20 (decision 2026-10-14): the time available only warns, it never moves the parcours.
  const hours = answers.hours_available
  if (
    minutes !== null &&
    typeof hours === "number" &&
    hours > 0 &&
    hours <= ROUTE_HOURS_MAX &&
    hours * 60 < minutes.min
  )
    advice.push("time_short")

  // R-21 (M p. 4 point 4; S p. 19): a beginner needs more time, with no number and no coefficient.
  if (answers.experience === "beginner") advice.push("beginner")

  // R-18 (S p. 19; M p. 17): the uncapped counting takes longer.
  if (counting === "uncapped") advice.push("uncapped_longer")

  return { advice, estimated_minutes: minutes }
}

/** The observer's choice above the subdivision bound (R-11b). */
export type RouteChoice = { largeStandOption?: LargeStandOption }

/**
 * What the guide says for a set of answers. `route` is a proposal: the observer can still change
 * it, and the app records `chosen_by` accordingly. Every field is a code or a number.
 */
export type RouteRecommendation =
  | {
      /** R-01: the surface is absent or out of range; the question `surface` stays open. */
      status: "needs_surface"
      error: RouteSurfaceErrorCode
    }
  | {
      /** A needed answer is missing. `questions` is the display list, `missing` the open ones. */
      status: "incomplete"
      questions: RouteQuestionId[]
      missing: RouteQuestionId[]
    }
  | {
      /** R-11b: no parcours until the observer chooses; `subdivide` is pre-selected (O-03). */
      status: "options"
      options: LargeStandOption[]
      preselected_option: LargeStandOption
      reasons: RouteReasonCode[]
    }
  | {
      status: "route"
      method: RouteMethod
      counting: CountingMode
      /** Always empty: the guide never proposes the uncapped counting (R-16, O-01). */
      uncapped_factors: UncappableFactor[]
      zone_surface_ha: number
      /** Only for a partial parcours (R-14). */
      complement: RouteComplement | null
      /** At most four, in the order of the spec (section 5). */
      reasons: RouteReasonCode[]
      warnings: RouteWarningCode[]
      advice: RouteAdviceCode[]
      estimated_minutes: { min: number; max: number } | null
      /** The rules that produced the proposal, in order, for traceability and tests. */
      applied_rules: RouteRuleId[]
    }

/** The most reasons returned (spec section 5, order of the reasons). */
const MAX_REASONS = 4

type ShownQuestion = Exclude<RouteQuestionId, "refine">

type RouteOutcome =
  | { kind: "options" }
  | {
      kind: "route"
      method: RouteMethod
      stand: number
      zone: number
      head: RouteReasonCode[]
      rules: RouteRuleId[]
    }

type Walk = {
  /** The questions to display, in order, answered or not (the refine section excluded). */
  shown: ShownQuestion[]
  /** The shown questions without a usable answer. */
  missing: ShownQuestion[]
  error: RouteSurfaceErrorCode | null
  /** Null while an answer is missing. */
  outcome: RouteOutcome | null
}

function surfaceErrorFor(value: unknown): RouteSurfaceErrorCode {
  return value === undefined || value === null ? "surface_missing" : "surface_invalid"
}

function flag(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function fullOutcome(stand: number, head: RouteReasonCode[], rules: RouteRuleId[]): RouteOutcome {
  return { kind: "route", method: "full", stand, zone: fullZoneHa(stand), head, rules }
}

function partialOutcome(
  method: PartialRouteMethod,
  stand: number,
  homogeneity: RouteHomogeneity,
  head: RouteReasonCode[],
  rules: RouteRuleId[],
): RouteOutcome {
  return {
    kind: "route",
    method,
    stand,
    zone: partialZoneHa(stand, homogeneity),
    head,
    rules,
  }
}

/**
 * Walks the questions of spec section 4 with the decision table of section 5 (steps 0 to 2), once,
 * so the question list and the proposal cannot disagree. A question is shown only when its answer
 * can change the parcours, the counting or the suggested zone (D-05); an answer that is not needed
 * is ignored.
 */
function walk(answers: Partial<RouteAnswers>, choice: RouteChoice | undefined): Walk {
  const stand = answers.surface_ha
  // R-01 (S p. 18; M p. 2): no usable surface, no proposal.
  if (!isValidSurface(stand)) {
    return {
      shown: ["surface"],
      missing: ["surface"],
      error: surfaceErrorFor(stand),
      outcome: null,
    }
  }
  const homogeneity = ROUTE_HOMOGENEITY_VALUES.find((value) => value === answers.homogeneity)
  const difficulty = flag(answers.difficulty)
  const narrow = flag(answers.narrow)
  const answered: Record<ShownQuestion, boolean> = {
    surface: true,
    homogeneity: homogeneity !== undefined,
    difficulty: difficulty !== undefined,
    narrow: narrow !== undefined,
  }
  const shown: ShownQuestion[] = ["surface"]
  const finish = (outcome: RouteOutcome | null): Walk => ({
    shown,
    missing: shown.filter((question) => !answered[question]),
    error: null,
    outcome,
  })

  // R-07 (M p. 4): up to 1 ha the whole stand is described, and nothing else is asked.
  if (stand <= ROUTE_SMALL_STAND_HA) {
    return finish(fullOutcome(stand, ["whole_stand_small"], ["R-07"]))
  }

  shown.push("homogeneity")
  const upToFullMax = stand <= ROUTE_FULL_MAX_HA
  if (upToFullMax) shown.push("difficulty")
  if (homogeneity === undefined || (upToFullMax && difficulty === undefined)) return finish(null)

  // Homogeneous and easy to observe: the strip or the plot depends on the width (R-12a, R-12b).
  const byWidth = (head: RouteReasonCode[], rules: RouteRuleId[]): Walk => {
    shown.push("narrow")
    if (narrow === undefined) return finish(null)
    const method = narrow ? "partial_strip" : "partial_plot"
    return finish(partialOutcome(method, stand, homogeneity, head, rules))
  }

  if (upToFullMax) {
    // R-08 (M p. 4): hard to observe, a partial parcours in strips (R-12a).
    if (difficulty) {
      const head: RouteReasonCode[] = ["partial_hard_to_observe"]
      return finish(partialOutcome("partial_strip", stand, homogeneity, head, ["R-08"]))
    }
    // R-10 (M p. 4; S p. 18): a heterogeneous, easy stand is walked in full.
    if (homogeneity === "heterogeneous") {
      return finish(fullOutcome(stand, ["whole_stand_heterogeneous"], ["R-10"]))
    }
    // R-09 (M p. 4): a homogeneous, easy stand is sampled.
    return byWidth(["partial_homogeneous"], ["R-09"])
  }

  // R-11 and R-11b (M p. 4): above 5 ha, 10 ha (heterogeneous) or 20 ha (homogeneous) is the bound
  // of the partial parcours; above it the observer chooses (decisions O-02, O-03).
  const bound =
    homogeneity === "homogeneous"
      ? ROUTE_SUBDIVIDE_HOMOGENEOUS_HA
      : ROUTE_SUBDIVIDE_HETEROGENEOUS_HA
  const large = stand > bound
  if (large && choice?.largeStandOption !== "partial") return finish({ kind: "options" })
  const head: RouteReasonCode[] = large
    ? ["large_stand", "partial_medium_stand"]
    : ["partial_medium_stand"]
  const rules: RouteRuleId[] = large ? ["R-11b", "R-11"] : ["R-11"]

  // R-12a (M p. 7, p. 8): a heterogeneous stand is walked in strips; difficulty is not asked.
  if (homogeneity === "heterogeneous") {
    return finish(partialOutcome("partial_strip", stand, homogeneity, head, rules))
  }
  shown.push("difficulty")
  if (difficulty === undefined) return finish(null)
  if (difficulty) return finish(partialOutcome("partial_strip", stand, homogeneity, head, rules))
  return byWidth(head, rules)
}

/**
 * The questions to display for a set of answers, in order, the optional "refine" section last
 * (spec section 4). A question is listed only when its answer can change the result; experience and
 * hours never add one (O-04).
 */
export function routeQuestionsFor(
  answers: Partial<RouteAnswers>,
  choice?: RouteChoice,
): RouteQuestionId[] {
  return [...walk(answers, choice).shown, "refine"]
}

function routeResult(
  answers: Partial<RouteAnswers>,
  shown: readonly ShownQuestion[],
  outcome: Extract<RouteOutcome, { kind: "route" }>,
): Extract<RouteRecommendation, { status: "route" }> {
  const { method, stand, zone } = outcome
  const counting = defaultCountingFor(method)
  const reasons = [...outcome.head]
  const rules = [...outcome.rules]
  const warnings: RouteWarningCode[] = []
  let complement: RouteComplement | null = null

  // R-02 (M p. 4, O-11): a stand under 0.5 ha is warned about, never blocked.
  if (stand < ROUTE_TINY_STAND_HA) {
    warnings.push("small_stand")
    rules.unshift("R-02")
  }

  if (method !== "full") {
    // R-12a, R-12b: the reason of the type, then R-13 and R-14 (M p. 7, p. 8): the zone, and the
    // complement advised for the rest of the stand, proposed done with the whole stand evaluated.
    reasons.push(method === "partial_strip" ? "partial_strip_why" : "partial_plot_why")
    rules.push(method === "partial_strip" ? "R-12a" : "R-12b")
    reasons.push("complement_advised")
    complement = { done: true, total_surface_ha: roundHa(stand) }
    rules.push("R-13", "R-14")
    if (isOverHalf(zone, stand)) warnings.push("partial_over_half")
  }

  // R-16 (M p. 5, table 2): the counting is capped for the three parcours, so the last reason is
  // always `capped_default`.
  reasons.push("capped_default")
  rules.push("R-16")

  // R-19 to R-21 (S p. 19; M p. 17): information only. The difficulty counts only when it was a
  // needed question. R-18 never applies: the guide does not propose the uncapped counting.
  const { advice, estimated_minutes } = routeAdviceFor({
    method,
    counting,
    zoneHa: zone,
    answers: {
      difficulty: shown.includes("difficulty") ? answers.difficulty : undefined,
      experience: answers.experience,
      hours_available: answers.hours_available,
    },
  })
  // The zone is always usable here, so the duration (R-19) is always given.
  rules.push("R-19")
  if (advice.includes("time_short")) rules.push("R-20")
  if (advice.includes("beginner")) rules.push("R-21")

  return {
    status: "route",
    method,
    counting,
    uncapped_factors: [],
    zone_surface_ha: zone,
    complement,
    reasons: reasons.slice(0, MAX_REASONS),
    warnings,
    advice,
    estimated_minutes,
    applied_rules: rules,
  }
}

/**
 * The route the guide proposes for the answers given (spec sections 4 and 5), or what is still
 * needed: a usable surface, an answer, or the choice above the subdivision bound. Only the stand
 * chooses the parcours; experience and hours are read by the advice alone (O-04). Subdividing is
 * expressed by the answers: `subdivided` with the surface of one piece gives the result of that
 * surface (R-11b).
 */
export function recommendRoute(
  answers: Partial<RouteAnswers>,
  choice?: RouteChoice,
): RouteRecommendation {
  const walked = walk(answers, choice)
  if (walked.error !== null) return { status: "needs_surface", error: walked.error }
  const { outcome } = walked
  if (outcome === null) {
    return {
      status: "incomplete",
      questions: [...walked.shown, "refine"],
      missing: walked.missing,
    }
  }
  if (outcome.kind === "options") {
    return {
      status: "options",
      options: [...LARGE_STAND_OPTIONS],
      preselected_option: "subdivide",
      reasons: ["large_stand"],
    }
  }
  return routeResult(answers, walked.shown, outcome)
}
