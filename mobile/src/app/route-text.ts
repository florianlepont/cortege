import type {
  CountingMode,
  LargeStandOption,
  RouteAdviceCode,
  RouteMethod,
  RouteQuestionId,
  RouteReasonCode,
  RouteSurfaceErrorCode,
  RouteWarningCode,
  RouteZoneIssueCode,
  UncappedPresetId,
} from "@cortege/ibp-domain"
import { fr } from "../i18n"

// Phase 30 (plan 30-11): the package speaks in codes, these maps turn them into the catalogue's
// French, with the words of the official method (O-12). Every map is typed `Record<Code, ...>` over
// the package unions, so a new code without a sentence fails the type check (T-30-27), and a test
// walks the package code lists. Also here: the hectare and duration formatters, written without
// `Intl` for numbers (the Hermes build may lack it), like `survey-pdf/html.ts`.

const guide = fr.routeGuide

export const ROUTE_REASON_TEXT: Readonly<Record<RouteReasonCode, string>> = {
  whole_stand_small: guide.reasons.wholeStandSmall,
  whole_stand_heterogeneous: guide.reasons.wholeStandHeterogeneous,
  partial_hard_to_observe: guide.reasons.partialHardToObserve,
  partial_homogeneous: guide.reasons.partialHomogeneous,
  partial_medium_stand: guide.reasons.partialMediumStand,
  large_stand: guide.reasons.largeStand,
  partial_strip_why: guide.reasons.partialStripWhy,
  partial_plot_why: guide.reasons.partialPlotWhy,
  complement_advised: guide.reasons.complementAdvised,
  capped_default: guide.reasons.cappedDefault,
}

export const ROUTE_WARNING_TEXT: Readonly<Record<RouteWarningCode, string>> = {
  small_stand: guide.warnings.smallStand,
  partial_over_half: guide.warnings.partialOverHalf,
}

/** The zone and complement checks, errors and warnings (spec section 5). */
export const ROUTE_ZONE_ISSUE_TEXT: Readonly<Record<RouteZoneIssueCode, string>> = {
  zone_not_positive: guide.details.issues.zoneNotPositive,
  zone_too_large: guide.details.issues.zoneTooLarge,
  zone_above_stand: guide.details.issues.zoneAboveStand,
  partial_over_half: guide.details.issues.partialOverHalf,
  partial_below_minimum: guide.details.issues.partialBelowMinimum,
  complement_below_zone: guide.details.issues.complementBelowZone,
}

export const ROUTE_SURFACE_ERROR_TEXT: Readonly<Record<RouteSurfaceErrorCode, string>> = {
  surface_missing: guide.surfaceErrors.missing,
  surface_invalid: guide.surfaceErrors.invalid,
}

type RouteMethodText = {
  name: string
  short: string
  explanation: string
  does: string
  suits: string
}

/** The three parcours: the name, its explanation, what to do on the ground, who it suits. */
export const ROUTE_METHOD_TEXT: Readonly<Record<RouteMethod, RouteMethodText>> = {
  full: guide.routes.full,
  partial_strip: guide.routes.partialStrip,
  partial_plot: guide.routes.partialPlot,
}

/**
 * The full words of a parcours, for the sheet of its information glyph: the explanation, what to do
 * on the ground and who it suits, one per line. The cards themselves show only `short`.
 */
export function routeSheetText(method: RouteMethod): string {
  const text = ROUTE_METHOD_TEXT[method]
  return [text.explanation, text.does, text.suits].join("\n")
}

type CountingText = { name: string; short: string; explanation: string }

/** "Relevé plafonné" and "Relevé déplafonné", each with its one-sentence explanation. */
export const COUNTING_TEXT: Readonly<Record<CountingMode, CountingText>> = {
  capped: guide.counting.capped,
  uncapped: guide.counting.uncapped,
}

type PresetText = { name: string; caption: string; note?: string }

/** The four presets of the factors counted in full; R-17 advises the long one. */
export const UNCAPPED_PRESET_TEXT: Readonly<Record<UncappedPresetId, PresetText>> = {
  all_factors: {
    name: guide.counting.presets.allFactors,
    caption: guide.counting.presetCaptions.allFactors,
  },
  always_max: {
    name: guide.counting.presets.alwaysMax,
    caption: guide.counting.presetCaptions.alwaysMax,
    note: guide.counting.presetNote,
  },
  minimum: {
    name: guide.counting.presets.minimum,
    caption: guide.counting.presetCaptions.minimum,
  },
  custom: {
    name: guide.counting.presets.custom,
    caption: guide.counting.presetCaptions.custom,
  },
}

type QuestionText = { title: string; why: string; short: string }

const pickQuestion = ({ title, why, short }: QuestionText): QuestionText => ({ title, why, short })

/** Title, the reason for asking and the short label of the answered row, per question. */
export const ROUTE_QUESTION_TEXT: Readonly<Record<RouteQuestionId, QuestionText>> = {
  surface: pickQuestion(guide.questions.surface),
  homogeneity: pickQuestion(guide.questions.homogeneity),
  difficulty: pickQuestion(guide.questions.difficulty),
  narrow: pickQuestion(guide.questions.narrow),
  refine: {
    title: guide.questions.refine.title,
    why: guide.questions.refine.lead,
    short: guide.questions.refine.title,
  },
}

type LargeStandOptionText = { title: string; caption: string }

/** The two options above the subdivision bound (R-11b). */
export const LARGE_STAND_OPTION_TEXT: Readonly<Record<LargeStandOption, LargeStandOptionText>> = {
  subdivide: guide.largeStand.subdivide,
  partial: guide.largeStand.partial,
}

/** A duration range in minutes, as the package returns it (R-19). */
export type EstimatedMinutes = { min: number; max: number }

const NARROW_NO_BREAK_SPACE = "\u202f"
const MINUTES_PER_TWO_HOURS = 120

/** A number rounded to `digits` decimals with a comma and no trailing zero; "0" for a non-number. */
export function formatDecimalFr(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "0"
  const text = Math.abs(value).toFixed(digits)
  if (Number(text) === 0) return "0"
  const [whole, decimals = ""] = text.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NO_BREAK_SPACE)
  const trimmed = decimals.replace(/0+$/, "")
  const sign = value < 0 ? "-" : ""
  return trimmed === "" ? `${sign}${grouped}` : `${sign}${grouped},${trimmed}`
}

/** Hectares for display: at most two decimals, decimal comma, narrow no-break space for thousands. */
export function formatHectares(value: number): string {
  return formatDecimalFr(value, 2)
}

/**
 * The hectares an observer typed. The comma and the dot are both accepted as the decimal sign and
 * spaces (also no-break ones) are ignored. Null for an empty text, a negative number or anything
 * that is not a plain number; zero is returned as such (the package then says the surface is not
 * valid, R-01).
 */
export function parseHectaresInput(text: string): number | null {
  const compact = text.replace(/[\s\u00a0\u202f]+/g, "")
  if (!/^(\d+([.,]\d*)?|[.,]\d+)$/.test(compact)) return null
  const value = Number(compact.replace(",", "."))
  return Number.isFinite(value) ? value : null
}

/**
 * "25 à 30 minutes" below two hours, "environ 2 à 3 heures" from two hours (rounded to the half
 * hour), never "min" or "h" (R-19: an indication for an observer used to the IBP).
 */
export function formatDurationRange(range: EstimatedMinutes): string {
  const { advice } = guide
  if (range.max < 1) return advice.durationUnderMinute
  if (range.min < MINUTES_PER_TWO_HOURS) {
    return advice.durationMinutes({ min: range.min, max: range.max })
  }
  const halfHours = (minutes: number) => formatDecimalFr(Math.round(minutes / 30) / 2, 1)
  return advice.durationHours({ min: halfHours(range.min), max: halfHours(range.max) })
}

/**
 * The sentence of an advice code. The duration sentence carries the range; a duration with no range
 * (the package never sends one) falls back to the note that durations are only an indication.
 */
export function routeAdviceText(
  code: RouteAdviceCode,
  options: { estimated_minutes: EstimatedMinutes | null },
): string {
  switch (code) {
    case "duration":
      return options.estimated_minutes === null
        ? guide.advice.durationNote
        : guide.advice.duration({ range: formatDurationRange(options.estimated_minutes) })
    case "time_short":
      return guide.advice.timeShort
    case "beginner":
      return guide.advice.beginner
    case "uncapped_longer":
      return guide.advice.uncappedLonger
  }
}
