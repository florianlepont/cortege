import type { RouteAnswers, RouteComplement } from "../contract/route"
import type {
  LargeStandOption,
  RouteAdviceCode,
  RouteQuestionId,
  RouteReasonCode,
  RouteRuleId,
  RouteSurfaceErrorCode,
  RouteWarningCode,
  RouteZoneIssueCode,
  UncappedPresetId,
} from "./guide"
import type { CountingMode, RouteMethod } from "./record"

// The decision table of docs/specs/route-choice-rules-v1.md as executable data (phase 30, plan
// 30-05): one case per rule id of section 5 (20) and one per boundary id of the "Cas limites" table
// (23), each holding the examples of the spec's test column. The spec is the text the owner
// validated on 2026-10-14; this fixture is its executable form, so a rule change edits both in one
// commit (api/test/route-rules-spec.spec.ts fails when the two id sets differ). The expectations
// were worked out by hand from the spec rows, never pasted from the output of the functions: where
// the spec gives no reasons, warnings or minutes for an example, the field is left out. Case ids
// are the rule ids (`R-07`) and the boundary ids (`R-07#at-1ha`).

/** What `recommendRoute` returns for an example; the optional fields are compared when present. */
export type RouteRecommendExpectation =
  | { status: "needs_surface"; error: RouteSurfaceErrorCode }
  | { status: "incomplete"; missing: readonly RouteQuestionId[] }
  | {
      status: "options"
      options: readonly LargeStandOption[]
      preselected_option: LargeStandOption
      reasons: readonly RouteReasonCode[]
    }
  | {
      status: "route"
      method: RouteMethod
      counting: CountingMode
      zone_surface_ha: number
      reasons?: readonly RouteReasonCode[]
      warnings?: readonly RouteWarningCode[]
      complement?: RouteComplement | null
      advice?: readonly RouteAdviceCode[]
      estimated_minutes?: { min: number; max: number } | null
    }

export type RouteRuleExample =
  | {
      kind: "recommend"
      answers: Partial<RouteAnswers>
      choice?: { largeStandOption?: LargeStandOption }
      expect: RouteRecommendExpectation
      /** The questions `routeQuestionsFor` lists, compared in order when present. */
      questions?: readonly RouteQuestionId[]
    }
  | {
      /** `routeZoneIssues` for a zone typed as one number or summed from the plots (R-15). */
      kind: "zone"
      method: RouteMethod
      stand_ha?: number
      zone_ha?: number
      plots?: readonly number[]
      complement?: RouteComplement
      expect_zone_ha?: number
      issues: readonly RouteZoneIssueCode[]
    }
  | {
      kind: "advice"
      input: {
        method: RouteMethod
        counting: CountingMode
        zoneHa: number
        answers: Partial<RouteAnswers>
      }
      advice: readonly RouteAdviceCode[]
      estimated_minutes: { min: number; max: number } | null
    }
  | {
      /** The factors a preset counts in full, and whether such a selection can be recorded. */
      kind: "preset"
      preset: UncappedPresetId
      factors: readonly string[]
      valid: boolean
    }

export type RouteRuleCase = {
  /** Rule id (`R-07`) or boundary id (`R-07#at-1ha`), as written in the spec. */
  id: string
  /** The rule of section 5 the case belongs to or bounds. */
  rule: RouteRuleId
  /** Document and page, as the spec cites them. */
  source: string
  examples: readonly RouteRuleExample[]
}

const FULL_FACTORS = ["A", "B", "C", "D", "E", "F", "G", "I", "J"]

export const ROUTE_RULE_CASES: readonly RouteRuleCase[] = [
  // ---- Step 0: preconditions and warnings -------------------------------------------------
  {
    id: "R-01",
    rule: "R-01",
    source: "S p. 18; M p. 2",
    examples: [
      {
        kind: "recommend",
        answers: {},
        expect: { status: "needs_surface", error: "surface_missing" },
        questions: ["surface", "refine"],
      },
      {
        kind: "recommend",
        answers: { surface_ha: -3 },
        expect: { status: "needs_surface", error: "surface_invalid" },
      },
      {
        kind: "recommend",
        answers: { surface_ha: Number.NaN },
        expect: { status: "needs_surface", error: "surface_invalid" },
      },
      {
        kind: "recommend",
        answers: { surface_ha: Number.POSITIVE_INFINITY },
        expect: { status: "needs_surface", error: "surface_invalid" },
      },
    ],
  },
  {
    id: "R-02",
    rule: "R-02",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 0.4 },
        expect: {
          status: "route",
          method: "full",
          counting: "capped",
          zone_surface_ha: 0.4,
          reasons: ["whole_stand_small", "capped_default"],
          warnings: ["small_stand"],
          estimated_minutes: { min: 6, max: 8 },
        },
      },
    ],
  },
  {
    id: "R-03",
    rule: "R-03",
    source: "S p. 6",
    examples: [
      // A hedge of 0.8 ha: same result as R-07, and no code for a linear stand (O-10).
      {
        kind: "recommend",
        answers: { surface_ha: 0.8 },
        expect: {
          status: "route",
          method: "full",
          counting: "capped",
          zone_surface_ha: 0.8,
          reasons: ["whole_stand_small", "capped_default"],
          warnings: [],
        },
        questions: ["surface", "refine"],
      },
    ],
  },
  // ---- Step 1: whole stand by surface, homogeneity and difficulty --------------------------
  {
    id: "R-07",
    rule: "R-07",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 0.8 },
        expect: {
          status: "route",
          method: "full",
          counting: "capped",
          zone_surface_ha: 0.8,
          reasons: ["whole_stand_small", "capped_default"],
          warnings: [],
          complement: null,
          advice: ["duration"],
          estimated_minutes: { min: 12, max: 16 },
        },
        questions: ["surface", "refine"],
      },
      // Answers that are not needed are ignored: the easy range, the same proposal.
      {
        kind: "recommend",
        answers: { surface_ha: 0.8, homogeneity: "heterogeneous", difficulty: true },
        expect: {
          status: "route",
          method: "full",
          counting: "capped",
          zone_surface_ha: 0.8,
          estimated_minutes: { min: 12, max: 16 },
        },
        questions: ["surface", "refine"],
      },
    ],
  },
  {
    id: "R-08",
    rule: "R-08",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 3, homogeneity: "heterogeneous", difficulty: true },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1,
          reasons: [
            "partial_hard_to_observe",
            "partial_strip_why",
            "complement_advised",
            "capped_default",
          ],
          warnings: [],
          complement: { done: true, total_surface_ha: 3 },
          advice: ["duration"],
          estimated_minutes: { min: 25, max: 30 },
        },
        questions: ["surface", "homogeneity", "difficulty", "refine"],
      },
      {
        kind: "recommend",
        answers: { surface_ha: 3, homogeneity: "homogeneous", difficulty: true },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1,
        },
        questions: ["surface", "homogeneity", "difficulty", "refine"],
      },
      {
        kind: "recommend",
        answers: { surface_ha: 3, difficulty: true },
        expect: { status: "incomplete", missing: ["homogeneity"] },
        questions: ["surface", "homogeneity", "difficulty", "refine"],
      },
    ],
  },
  {
    id: "R-09",
    rule: "R-09",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 2, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: {
          status: "route",
          method: "partial_plot",
          counting: "capped",
          zone_surface_ha: 1,
          reasons: [
            "partial_homogeneous",
            "partial_plot_why",
            "complement_advised",
            "capped_default",
          ],
          warnings: [],
          complement: { done: true, total_surface_ha: 2 },
          advice: ["duration"],
          estimated_minutes: { min: 15, max: 20 },
        },
        questions: ["surface", "homogeneity", "difficulty", "narrow", "refine"],
      },
      {
        kind: "recommend",
        answers: { surface_ha: 2, homogeneity: "homogeneous", difficulty: false, narrow: true },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1,
          reasons: [
            "partial_homogeneous",
            "partial_strip_why",
            "complement_advised",
            "capped_default",
          ],
        },
      },
      {
        kind: "recommend",
        answers: { surface_ha: 2, homogeneity: "homogeneous", difficulty: false },
        expect: { status: "incomplete", missing: ["narrow"] },
        questions: ["surface", "homogeneity", "difficulty", "narrow", "refine"],
      },
    ],
  },
  {
    id: "R-10",
    rule: "R-10",
    source: "M p. 4; S p. 18",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 4.5, homogeneity: "heterogeneous", difficulty: false },
        expect: {
          status: "route",
          method: "full",
          counting: "capped",
          zone_surface_ha: 4.5,
          reasons: ["whole_stand_heterogeneous", "capped_default"],
          complement: null,
          estimated_minutes: { min: 68, max: 90 },
        },
        questions: ["surface", "homogeneity", "difficulty", "refine"],
      },
      {
        kind: "recommend",
        answers: { surface_ha: 4.5, homogeneity: "heterogeneous" },
        expect: { status: "incomplete", missing: ["difficulty"] },
      },
    ],
  },
  {
    id: "R-11",
    rule: "R-11",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 15, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: {
          status: "route",
          method: "partial_plot",
          counting: "capped",
          zone_surface_ha: 1.5,
          reasons: [
            "partial_medium_stand",
            "partial_plot_why",
            "complement_advised",
            "capped_default",
          ],
        },
        questions: ["surface", "homogeneity", "difficulty", "narrow", "refine"],
      },
      // difficulty is asked only when the stand is homogeneous.
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "heterogeneous" },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1.6,
        },
        questions: ["surface", "homogeneity", "refine"],
      },
      {
        kind: "recommend",
        answers: { surface_ha: 15, homogeneity: "homogeneous" },
        expect: { status: "incomplete", missing: ["difficulty"] },
        questions: ["surface", "homogeneity", "difficulty", "refine"],
      },
      // A difficult homogeneous stand is walked in strips and narrow is not asked.
      {
        kind: "recommend",
        answers: { surface_ha: 15, homogeneity: "homogeneous", difficulty: true },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1.5,
        },
        questions: ["surface", "homogeneity", "difficulty", "refine"],
      },
    ],
  },
  {
    id: "R-11b",
    rule: "R-11b",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 12, homogeneity: "heterogeneous" },
        expect: {
          status: "options",
          options: ["subdivide", "partial"],
          preselected_option: "subdivide",
          reasons: ["large_stand"],
        },
        questions: ["surface", "homogeneity", "refine"],
      },
      // Subdividing is not a parcours: there is still none until the partial option is chosen.
      {
        kind: "recommend",
        answers: { surface_ha: 12, homogeneity: "heterogeneous" },
        choice: { largeStandOption: "subdivide" },
        expect: {
          status: "options",
          options: ["subdivide", "partial"],
          preselected_option: "subdivide",
          reasons: ["large_stand"],
        },
      },
      // After subdividing, the surface of one piece gives the result of that surface.
      {
        kind: "recommend",
        answers: {
          surface_ha: 4,
          homogeneity: "heterogeneous",
          difficulty: false,
          subdivided: true,
        },
        expect: { status: "route", method: "full", counting: "capped", zone_surface_ha: 4 },
      },
      {
        kind: "recommend",
        answers: { surface_ha: 25, homogeneity: "homogeneous" },
        choice: { largeStandOption: "partial" },
        expect: { status: "incomplete", missing: ["difficulty"] },
        questions: ["surface", "homogeneity", "difficulty", "refine"],
      },
      {
        kind: "recommend",
        answers: { surface_ha: 25, homogeneity: "homogeneous", difficulty: false, narrow: false },
        choice: { largeStandOption: "partial" },
        expect: {
          status: "route",
          method: "partial_plot",
          counting: "capped",
          zone_surface_ha: 2.5,
          reasons: [
            "large_stand",
            "partial_medium_stand",
            "partial_plot_why",
            "complement_advised",
          ],
        },
      },
    ],
  },
  // ---- Step 2: parameters of a partial parcours -------------------------------------------
  {
    id: "R-12a",
    rule: "R-12a",
    source: "M p. 7, p. 8, p. 15",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "heterogeneous" },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1.6,
          reasons: [
            "partial_medium_stand",
            "partial_strip_why",
            "complement_advised",
            "capped_default",
          ],
        },
      },
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "homogeneous", difficulty: true },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1,
        },
      },
    ],
  },
  {
    id: "R-12b",
    rule: "R-12b",
    source: "M p. 7, p. 8",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: {
          status: "route",
          method: "partial_plot",
          counting: "capped",
          zone_surface_ha: 1,
          reasons: [
            "partial_medium_stand",
            "partial_plot_why",
            "complement_advised",
            "capped_default",
          ],
        },
      },
    ],
  },
  {
    id: "R-13",
    rule: "R-13",
    source: "M p. 7",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "heterogeneous" },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1.6,
        },
      },
      {
        kind: "zone",
        method: "partial_strip",
        stand_ha: 8,
        zone_ha: 4.5,
        issues: ["partial_over_half"],
      },
      { kind: "zone", method: "partial_strip", stand_ha: 8, zone_ha: 4, issues: [] },
    ],
  },
  {
    id: "R-14",
    rule: "R-14",
    source: "M p. 8; S p. 20",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "heterogeneous" },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1.6,
          complement: { done: true, total_surface_ha: 8 },
        },
      },
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: {
          status: "route",
          method: "partial_plot",
          counting: "capped",
          zone_surface_ha: 1,
          complement: { done: true, total_surface_ha: 8 },
        },
      },
    ],
  },
  {
    id: "R-15",
    rule: "R-15",
    source: "M p. 7",
    examples: [
      // Three plots of a partial parcours on 8 ha: one sheet, the zone is their sum.
      {
        kind: "zone",
        method: "partial_plot",
        stand_ha: 8,
        plots: [0.5, 0.5, 0.4],
        expect_zone_ha: 1.4,
        issues: [],
      },
      {
        kind: "zone",
        method: "partial_plot",
        stand_ha: 8,
        plots: [0.4, 0.4],
        expect_zone_ha: 0.8,
        issues: ["partial_below_minimum"],
      },
    ],
  },
  // ---- Step 3: counting mode and factors counted in full -----------------------------------
  {
    id: "R-16",
    rule: "R-16",
    source: "M p. 5 (table 2)",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 4, homogeneity: "heterogeneous", difficulty: false },
        expect: { status: "route", method: "full", counting: "capped", zone_surface_ha: 4 },
      },
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "heterogeneous" },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1.6,
        },
      },
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: { status: "route", method: "partial_plot", counting: "capped", zone_surface_ha: 1 },
      },
    ],
  },
  {
    id: "R-17",
    rule: "R-17",
    source: "M p. 23, p. 24; S p. 20, p. 21 (note 1)",
    examples: [
      { kind: "preset", preset: "minimum", factors: ["C", "D", "E"], valid: true },
      { kind: "preset", preset: "all_factors", factors: FULL_FACTORS, valid: true },
      {
        kind: "preset",
        preset: "always_max",
        factors: ["A", "C", "D", "E", "F", "I", "J"],
        valid: true,
      },
    ],
  },
  {
    id: "R-18",
    rule: "R-18",
    source: "S p. 19; M p. 17",
    examples: [
      {
        kind: "advice",
        input: { method: "full", counting: "uncapped", zoneHa: 4, answers: { surface_ha: 4 } },
        advice: ["duration", "uncapped_longer"],
        estimated_minutes: { min: 60, max: 80 },
      },
      {
        kind: "advice",
        input: { method: "full", counting: "capped", zoneHa: 4, answers: { surface_ha: 4 } },
        advice: ["duration"],
        estimated_minutes: { min: 60, max: 80 },
      },
    ],
  },
  // ---- Step 4: duration and advice, information only ---------------------------------------
  {
    id: "R-19",
    rule: "R-19",
    source: "S p. 19; M p. 17",
    examples: [
      {
        kind: "advice",
        input: { method: "full", counting: "capped", zoneHa: 4, answers: { surface_ha: 4 } },
        advice: ["duration"],
        estimated_minutes: { min: 60, max: 80 },
      },
      {
        kind: "advice",
        input: {
          method: "partial_strip",
          counting: "capped",
          zoneHa: 1,
          answers: { surface_ha: 3, difficulty: true },
        },
        advice: ["duration"],
        estimated_minutes: { min: 25, max: 30 },
      },
      {
        kind: "advice",
        input: { method: "partial_plot", counting: "capped", zoneHa: 1.2, answers: {} },
        advice: ["duration"],
        estimated_minutes: { min: 18, max: 24 },
      },
    ],
  },
  {
    id: "R-20",
    rule: "R-20",
    source: "S p. 19; M p. 17",
    examples: [
      {
        kind: "advice",
        input: {
          method: "full",
          counting: "capped",
          zoneHa: 4,
          answers: { surface_ha: 4, hours_available: 0.5 },
        },
        advice: ["duration", "time_short"],
        estimated_minutes: { min: 60, max: 80 },
      },
      // The parcours stays full.
      {
        kind: "recommend",
        answers: {
          surface_ha: 4,
          homogeneity: "heterogeneous",
          difficulty: false,
          hours_available: 0.5,
        },
        expect: {
          status: "route",
          method: "full",
          counting: "capped",
          zone_surface_ha: 4,
          advice: ["duration", "time_short"],
        },
      },
    ],
  },
  {
    id: "R-21",
    rule: "R-21",
    source: "M p. 4 (point 4); S p. 19",
    examples: [
      {
        kind: "recommend",
        answers: {
          surface_ha: 8,
          homogeneity: "heterogeneous",
          experience: "beginner",
        },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1.6,
          advice: ["duration", "beginner"],
          estimated_minutes: { min: 24, max: 32 },
        },
      },
    ],
  },
  // ---- Boundary cases ("Cas limites") ------------------------------------------------------
  {
    id: "R-01#zero",
    rule: "R-01",
    source: "S p. 18",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 0 },
        expect: { status: "needs_surface", error: "surface_invalid" },
      },
    ],
  },
  {
    id: "R-01#at-max",
    rule: "R-01",
    source: "S p. 18",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 5000, homogeneity: "homogeneous" },
        expect: {
          status: "options",
          options: ["subdivide", "partial"],
          preselected_option: "subdivide",
          reasons: ["large_stand"],
        },
      },
    ],
  },
  {
    id: "R-01#above-max",
    rule: "R-01",
    source: "S p. 18",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 5000.01, homogeneity: "homogeneous" },
        expect: { status: "needs_surface", error: "surface_invalid" },
      },
    ],
  },
  {
    id: "R-02#at-half-ha",
    rule: "R-02",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 0.5 },
        expect: {
          status: "route",
          method: "full",
          counting: "capped",
          zone_surface_ha: 0.5,
          warnings: [],
        },
      },
    ],
  },
  {
    id: "R-07#at-1ha",
    rule: "R-07",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 1 },
        expect: { status: "route", method: "full", counting: "capped", zone_surface_ha: 1 },
        questions: ["surface", "refine"],
      },
    ],
  },
  {
    id: "R-08#just-above-1ha",
    rule: "R-08",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 1.01, homogeneity: "heterogeneous", difficulty: true },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1,
          warnings: ["partial_over_half"],
        },
      },
    ],
  },
  {
    id: "R-10#at-5ha",
    rule: "R-10",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 5, homogeneity: "heterogeneous", difficulty: false },
        expect: { status: "route", method: "full", counting: "capped", zone_surface_ha: 5 },
      },
    ],
  },
  {
    id: "R-11#just-above-5ha",
    rule: "R-11",
    source: "M p. 4",
    examples: [
      // 0.2 x 5.01 = 1.002, rounded to 1.00.
      {
        kind: "recommend",
        answers: { surface_ha: 5.01, homogeneity: "heterogeneous" },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1,
        },
      },
    ],
  },
  {
    id: "R-11#hetero-at-10ha",
    rule: "R-11",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 10, homogeneity: "heterogeneous" },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 2,
        },
      },
    ],
  },
  {
    id: "R-11#homo-between-10-and-20ha",
    rule: "R-11",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 12, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: {
          status: "route",
          method: "partial_plot",
          counting: "capped",
          zone_surface_ha: 1.2,
        },
      },
    ],
  },
  {
    id: "R-11#homo-at-20ha",
    rule: "R-11",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 20, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: { status: "route", method: "partial_plot", counting: "capped", zone_surface_ha: 2 },
      },
    ],
  },
  {
    id: "R-11b#hetero-above-10ha",
    rule: "R-11b",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 10.01, homogeneity: "heterogeneous" },
        expect: {
          status: "options",
          options: ["subdivide", "partial"],
          preselected_option: "subdivide",
          reasons: ["large_stand"],
        },
      },
    ],
  },
  {
    id: "R-11b#homo-above-20ha",
    rule: "R-11b",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 20.01, homogeneity: "homogeneous" },
        expect: {
          status: "options",
          options: ["subdivide", "partial"],
          preselected_option: "subdivide",
          reasons: ["large_stand"],
        },
      },
    ],
  },
  {
    id: "R-11b#choose-partial",
    rule: "R-11b",
    source: "M p. 4",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 12, homogeneity: "heterogeneous" },
        choice: { largeStandOption: "partial" },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 2.4,
          reasons: [
            "large_stand",
            "partial_medium_stand",
            "partial_strip_why",
            "complement_advised",
          ],
        },
      },
    ],
  },
  {
    id: "R-12a#narrow",
    rule: "R-12a",
    source: "M p. 8",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 8, homogeneity: "homogeneous", difficulty: false, narrow: true },
        expect: {
          status: "route",
          method: "partial_strip",
          counting: "capped",
          zone_surface_ha: 1,
        },
      },
    ],
  },
  {
    id: "R-13#at-half",
    rule: "R-13",
    source: "M p. 7",
    examples: [
      // Exactly half of the stand is not over half.
      {
        kind: "recommend",
        answers: { surface_ha: 2, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: {
          status: "route",
          method: "partial_plot",
          counting: "capped",
          zone_surface_ha: 1,
          warnings: [],
        },
      },
    ],
  },
  {
    id: "R-13#above-half",
    rule: "R-13",
    source: "M p. 7",
    examples: [
      {
        kind: "recommend",
        answers: { surface_ha: 1.5, homogeneity: "homogeneous", difficulty: false, narrow: false },
        expect: {
          status: "route",
          method: "partial_plot",
          counting: "capped",
          zone_surface_ha: 1,
          warnings: ["partial_over_half"],
        },
      },
    ],
  },
  {
    id: "R-13#below-minimum",
    rule: "R-13",
    source: "M p. 7",
    examples: [
      {
        kind: "zone",
        method: "partial_plot",
        stand_ha: 8,
        zone_ha: 0.9,
        issues: ["partial_below_minimum"],
      },
      { kind: "zone", method: "partial_plot", stand_ha: 8, zone_ha: 1, issues: [] },
    ],
  },
  {
    id: "R-14#complement-below-zone",
    rule: "R-14",
    source: "M p. 8",
    examples: [
      {
        kind: "zone",
        method: "partial_strip",
        stand_ha: 8,
        zone_ha: 2,
        complement: { done: true, total_surface_ha: 1.5 },
        issues: ["complement_below_zone"],
      },
      {
        kind: "zone",
        method: "partial_strip",
        stand_ha: 8,
        zone_ha: 2,
        complement: { done: true, total_surface_ha: 2 },
        issues: [],
      },
    ],
  },
  {
    id: "R-15#sum-of-plots",
    rule: "R-15",
    source: "M p. 7",
    examples: [
      // Stand of 1.4 ha: the sum is not above the stand, it is over half of it (a warning).
      {
        kind: "zone",
        method: "partial_plot",
        stand_ha: 1.4,
        plots: [0.5, 0.5, 0.4],
        expect_zone_ha: 1.4,
        issues: ["partial_over_half"],
      },
      {
        kind: "zone",
        method: "partial_plot",
        stand_ha: 8,
        plots: [0.5, 0.5, 0.4],
        expect_zone_ha: 1.4,
        issues: [],
      },
    ],
  },
  {
    id: "R-17#custom-empty",
    rule: "R-17",
    source: "S p. 21 (note 1)",
    examples: [{ kind: "preset", preset: "custom", factors: [], valid: false }],
  },
  {
    id: "R-20#at-minimum",
    rule: "R-20",
    source: "S p. 19",
    examples: [
      {
        kind: "advice",
        input: {
          method: "full",
          counting: "capped",
          zoneHa: 4,
          answers: { surface_ha: 4, hours_available: 1 },
        },
        advice: ["duration"],
        estimated_minutes: { min: 60, max: 80 },
      },
    ],
  },
  {
    id: "R-21#no-effect",
    rule: "R-21",
    source: "M p. 4",
    examples: [
      // The same stand with any experience and any hours: same method, counting and zone.
      ...(
        [
          { experience: "regular", hours_available: 0.1 },
          { experience: "beginner", hours_available: 24 },
          { experience: "beginner", hours_available: 100 },
          { experience: "regular", hours_available: 5 },
          { experience: "beginner" },
          { hours_available: 0.5 },
        ] as const
      ).map(
        (refine): RouteRuleExample => ({
          kind: "recommend",
          answers: { surface_ha: 8, homogeneity: "heterogeneous", ...refine },
          expect: {
            status: "route",
            method: "partial_strip",
            counting: "capped",
            zone_surface_ha: 1.6,
          },
        }),
      ),
    ],
  },
]
