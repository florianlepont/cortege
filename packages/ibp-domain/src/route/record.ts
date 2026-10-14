import type { RouteAnswers, SurveyRoute } from "../contract/route"
import { FACTOR_KEYS } from "../factors"
import type { FactorKey } from "../factors"

// The recorded route of phase 30 ("Parcours utilise" of the official survey sheet), D-08 as revised
// by the owner on 2026-10-13 and 2026-10-14. Its keys are owned here and nowhere else. The route is
// mandatory from creation (O-19) and never changes a score: it says how the survey was made. The
// guide rules (which route to propose) are in `guide.ts` (plan 30-05). Text-free: the app maps the
// codes to French. Spec: docs/specs/route-choice-rules-v1.md sections 4, 5 and 8.

/** Version of the stored structure. */
export const SURVEY_ROUTE_VERSION = 1 as const

/** The parcours: in full, or partial by strip or by plot (O-14: no typological or systematic). */
export const ROUTE_METHODS = ["full", "partial_strip", "partial_plot"] as const
export type RouteMethod = (typeof ROUTE_METHODS)[number]

/** The partial parcours, which carry a complement in the non-sampled zone. */
export const PARTIAL_ROUTE_METHODS = ["partial_strip", "partial_plot"] as const
export type PartialRouteMethod = (typeof PARTIAL_ROUTE_METHODS)[number]

/** Capped counting (relevé plafonné) or uncapped (relevé déplafonné). */
export const COUNTING_MODES = ["capped", "uncapped"] as const
export type CountingMode = (typeof COUNTING_MODES)[number]

/** Factors that can be counted without the cap: every factor except H (connectivity). */
export const UNCAPPABLE_FACTORS: readonly Exclude<FactorKey, "H">[] = FACTOR_KEYS.filter(
  (key): key is Exclude<FactorKey, "H"> => key !== "H",
)
export type UncappableFactor = (typeof UNCAPPABLE_FACTORS)[number]

export const ROUTE_HOMOGENEITY_VALUES = ["homogeneous", "heterogeneous"] as const
export type RouteHomogeneity = (typeof ROUTE_HOMOGENEITY_VALUES)[number]

export const ROUTE_EXPERIENCE_VALUES = ["regular", "beginner"] as const
export type RouteExperience = (typeof ROUTE_EXPERIENCE_VALUES)[number]

/** `guide`: the record is the proposal; `observer`: the proposal was changed or chosen directly. */
export const ROUTE_CHOSEN_BY_VALUES = ["guide", "observer"] as const
export type RouteChosenBy = (typeof ROUTE_CHOSEN_BY_VALUES)[number]

/** Largest surface accepted, in hectares (decision U-O11). */
export const ROUTE_SURFACE_MAX_HA = 5000

/** Largest time available, in hours (application choice). */
export const ROUTE_HOURS_MAX = 24

/** Surfaces and hours are rounded to this many decimals in the canonical form. */
export const ROUTE_SURFACE_DECIMALS = 2

/** Largest serialized record (application choice). */
export const ROUTE_RECORD_MAX_BYTES = 4096

/**
 * The 422 code of the API when a new client creates or submits a survey without a route (plan
 * 30-10, O-19).
 */
export const ROUTE_REQUIRED_CODE = "route_required"

/**
 * Header the phone's API client sends on every request (open point P-2). The API applies the
 * mandatory route only when it is present, so an installed older build, which never sends it,
 * keeps working.
 */
export const CLIENT_FEATURES_HEADER = "X-Cortege-Features"

/** Value of `CLIENT_FEATURES_HEADER` for a client that records a route. */
export const SURVEY_ROUTE_CLIENT_FEATURE = "survey_route"

export function isRouteMethod(value: unknown): value is RouteMethod {
  return (ROUTE_METHODS as readonly unknown[]).includes(value)
}

export function isCountingMode(value: unknown): value is CountingMode {
  return (COUNTING_MODES as readonly unknown[]).includes(value)
}

export function isPartialRoute(value: unknown): value is PartialRouteMethod {
  return (PARTIAL_ROUTE_METHODS as readonly unknown[]).includes(value)
}

/**
 * Codes `validateSurveyRoute` can return, in the order it reports them. Text-free: the app maps
 * them to French.
 */
export const SURVEY_ROUTE_ISSUE_CODES = [
  "route_missing",
  "route_not_object",
  "route_too_large",
  "route_version_invalid",
  "route_method_invalid",
  "route_counting_invalid",
  "route_zone_invalid",
  "route_uncapped_factors_invalid",
  "route_uncapped_factors_unexpected",
  "route_complement_missing",
  "route_complement_unexpected",
  "route_complement_invalid",
  "route_guide_invalid",
  "route_answers_invalid",
] as const
export type SurveyRouteIssueCode = (typeof SURVEY_ROUTE_ISSUE_CODES)[number]

/** Keys of the guide answers, in the order the canonical form writes them (spec section 8). */
const ANSWER_KEYS = [
  "surface_ha",
  "homogeneity",
  "difficulty",
  "narrow",
  "experience",
  "hours_available",
  "subdivided",
] as const satisfies readonly (keyof RouteAnswers)[]

const ANSWER_FLAG_KEYS = ["difficulty", "narrow", "subdivided"] as const

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function includesValue(list: readonly unknown[], value: unknown): boolean {
  return list.includes(value)
}

/** Rounds to `ROUTE_SURFACE_DECIMALS` decimals, half away from zero (surfaces and hours). */
function roundDecimals(value: number): number {
  const factor = 10 ** ROUTE_SURFACE_DECIMALS
  return (Math.sign(value) * Math.round(Math.abs(value) * factor)) / factor
}

/** A surface in hectares: finite, above 0, at most `ROUTE_SURFACE_MAX_HA`, already rounded. */
function isSurface(value: unknown, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= max &&
    roundDecimals(value) === value
  )
}

function uncappedFactorsAreValid(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false
  const wanted = new Set<unknown>(value)
  if (wanted.size !== value.length) return false
  if (!value.every((key) => includesValue(UNCAPPABLE_FACTORS, key))) return false
  // Sorted in FACTOR_KEYS order: the server stores and compares without reformatting.
  return UNCAPPABLE_FACTORS.filter((key) => wanted.has(key)).every(
    (key, index) => value[index] === key,
  )
}

function complementIsValid(complement: unknown, zone: unknown): boolean {
  if (!isPlainObject(complement) || typeof complement.done !== "boolean") return false
  if (!complement.done) return complement.total_surface_ha === undefined
  const total = complement.total_surface_ha
  if (!isSurface(total, ROUTE_SURFACE_MAX_HA)) return false
  return typeof zone !== "number" || total >= zone
}

function guideIsValid(guide: unknown): boolean {
  if (!isPlainObject(guide)) return false
  if (!includesValue(ROUTE_CHOSEN_BY_VALUES, guide.chosen_by)) return false
  const suggested = guide.suggested
  if (suggested === undefined) return true
  return (
    isPlainObject(suggested) &&
    isRouteMethod(suggested.method) &&
    isCountingMode(suggested.counting)
  )
}

function answersAreValid(answers: unknown): boolean {
  if (!isPlainObject(answers)) return false
  if (!isSurface(answers.surface_ha, ROUTE_SURFACE_MAX_HA)) return false
  if (
    answers.homogeneity !== undefined &&
    !includesValue(ROUTE_HOMOGENEITY_VALUES, answers.homogeneity)
  )
    return false
  if (
    answers.experience !== undefined &&
    !includesValue(ROUTE_EXPERIENCE_VALUES, answers.experience)
  )
    return false
  if (answers.hours_available !== undefined && !isSurface(answers.hours_available, ROUTE_HOURS_MAX))
    return false
  return ANSWER_FLAG_KEYS.every(
    (key) => answers[key] === undefined || typeof answers[key] === "boolean",
  )
}

/**
 * Checks an untrusted route record and returns the issue codes, each once, in the order of
 * `SURVEY_ROUTE_ISSUE_CODES`; an empty list means a valid, canonical record.
 *
 * An absent record is an issue (`route_missing`): the route is mandatory from creation (O-19).
 * Callers that accept a legacy survey without a route test for absence before calling this.
 * Unknown extra keys are ignored (room for phase 31) and dropped by `canonicalSurveyRoute`. The
 * record must already be in canonical form (rounded numbers, sorted factors), since the server
 * stores and compares it without reformatting.
 */
export function validateSurveyRoute(value: unknown): SurveyRouteIssueCode[] {
  if (value === undefined || value === null) return ["route_missing"]
  if (!isPlainObject(value)) return ["route_not_object"]
  const issues = new Set<SurveyRouteIssueCode>()

  // UTF-16 units, not bytes: the record holds no free text, so the database check of plan 30-07,
  // which measures bytes, agrees.
  if (JSON.stringify(value).length > ROUTE_RECORD_MAX_BYTES) issues.add("route_too_large")
  if (value.version !== SURVEY_ROUTE_VERSION) issues.add("route_version_invalid")
  if (!isSurface(value.zone_surface_ha, ROUTE_SURFACE_MAX_HA)) issues.add("route_zone_invalid")

  if (!isRouteMethod(value.method)) issues.add("route_method_invalid")
  else if (!isPartialRoute(value.method)) {
    if (value.complement !== undefined) issues.add("route_complement_unexpected")
  } else if (value.complement === undefined) issues.add("route_complement_missing")
  else if (!complementIsValid(value.complement, value.zone_surface_ha))
    issues.add("route_complement_invalid")

  if (!isCountingMode(value.counting)) issues.add("route_counting_invalid")
  else if (value.counting === "capped") {
    if (value.uncapped_factors !== undefined) issues.add("route_uncapped_factors_unexpected")
  } else if (!uncappedFactorsAreValid(value.uncapped_factors)) {
    issues.add("route_uncapped_factors_invalid")
  }

  if (!guideIsValid(value.guide)) issues.add("route_guide_invalid")
  const guide = value.guide
  if (isPlainObject(guide) && guide.answers !== undefined && !answersAreValid(guide.answers))
    issues.add("route_answers_invalid")

  return SURVEY_ROUTE_ISSUE_CODES.filter((code) => issues.has(code))
}

function canonicalAnswers(answers: RouteAnswers): RouteAnswers {
  const result: Record<string, unknown> = {}
  for (const key of ANSWER_KEYS) {
    const entry = answers[key]
    if (entry === undefined) continue
    result[key] = typeof entry === "number" ? roundDecimals(entry) : entry
  }
  return result as RouteAnswers
}

/**
 * The canonical form of a route, applied on the phone before storage so an identical replay compares
 * equal on the server (research Pitfall 3): surfaces and hours rounded to
 * `ROUTE_SURFACE_DECIMALS`; `uncapped_factors` sorted in `FACTOR_KEYS` order without duplicate and
 * dropped for capped counting; `complement` dropped for the full parcours, its total dropped when
 * the complement was not done; undefined values and unknown keys dropped. Idempotent.
 */
export function canonicalSurveyRoute(route: SurveyRoute): SurveyRoute {
  const result: SurveyRoute = {
    version: SURVEY_ROUTE_VERSION,
    method: route.method,
    counting: route.counting,
    zone_surface_ha: roundDecimals(route.zone_surface_ha),
    guide: { chosen_by: route.guide.chosen_by },
  }
  if (route.counting === "uncapped" && route.uncapped_factors !== undefined) {
    const wanted = new Set<string>(route.uncapped_factors)
    result.uncapped_factors = UNCAPPABLE_FACTORS.filter((key) => wanted.has(key))
  }
  if (isPartialRoute(route.method) && route.complement !== undefined) {
    const { done, total_surface_ha: total } = route.complement
    result.complement = { done }
    if (done && total !== undefined) result.complement.total_surface_ha = roundDecimals(total)
  }
  if (route.guide.suggested !== undefined) {
    result.guide.suggested = {
      method: route.guide.suggested.method,
      counting: route.guide.suggested.counting,
    }
  }
  if (route.guide.answers !== undefined)
    result.guide.answers = canonicalAnswers(route.guide.answers)
  return result
}

/**
 * Tolerant read of a stored route: the canonical record when `validateSurveyRoute` finds nothing,
 * null otherwise (absent, older, newer or damaged). Never throws, so a display never breaks on a
 * record it does not understand.
 */
export function readSurveyRoute(value: unknown): SurveyRoute | null {
  if (validateSurveyRoute(value).length > 0) return null
  return canonicalSurveyRoute(value as SurveyRoute)
}
