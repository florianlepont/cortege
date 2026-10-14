import type {
  CountingMode,
  RouteChosenBy,
  RouteExperience,
  RouteHomogeneity,
  RouteMethod,
  UncappableFactor,
} from "../route/record"

// Wire types of the recorded route ("Parcours utilise", phase 30, D-08 as revised by the owner).
// Types only: the constants, the canonical form and the validator are in `route/record.ts`. The
// record holds closed codes and numbers, never free text, and no field names the IBP version or the
// cas (O-14, O-18). Spec: docs/specs/route-choice-rules-v1.md section 8.

/**
 * The answers of the guide that were needed and given (spec section 4). A key is present only when
 * its question was needed and answered.
 */
export type RouteAnswers = {
  /** Stand surface, in hectares; the surface of one piece when `subdivided` is true. */
  surface_ha: number
  homogeneity?: RouteHomogeneity
  /** Difficult to observe (visibility under 10 to 15 m, hard to walk, rough relief). */
  difficulty?: boolean
  /** Stand narrower than 100 m. */
  narrow?: boolean
  experience?: RouteExperience
  /** Information only: the time available never moves the proposal. */
  hours_available?: number
  /** True when the observer cut a large stand and `surface_ha` is the surface of one piece. */
  subdivided?: boolean
}

/** What the guide last proposed. */
export type RouteSuggestion = {
  method: RouteMethod
  counting: CountingMode
}

/** What led to the choice. */
export type RouteGuideRecord = {
  /** `guide`: the recorded route is the proposal; `observer`: changed or chosen directly. */
  chosen_by: RouteChosenBy
  /** Absent when the observer chose directly without complete answers. */
  suggested?: RouteSuggestion
  answers?: RouteAnswers
}

/** "Releve complementaire dans la zone non echantillonnee" of a partial route. */
export type RouteComplement = {
  done: boolean
  /** Present only when `done` is true; at least `zone_surface_ha`. */
  total_surface_ha?: number
}

/**
 * The route used for a survey, stored beside `survey_note` and `weather`, outside `factors`: no
 * scorer reads it and the score does not depend on it.
 */
export type SurveyRoute = {
  version: 1
  /** The parcours: "Parcours utilise" of the official sheet (S p. 20). */
  method: RouteMethod
  /** The counting mode: "capped" or "uncapped". */
  counting: CountingMode
  /** "Facteurs deplafonnes" of the sheet; only for `counting` "uncapped", sorted, no duplicate. */
  uncapped_factors?: UncappableFactor[]
  /** "Zone de releve IBP, surface (ha)" of the sheet; always present. */
  zone_surface_ha: number
  /** Only for a partial route (`partial_strip` or `partial_plot`). */
  complement?: RouteComplement
  guide: RouteGuideRecord
}
