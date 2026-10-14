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
