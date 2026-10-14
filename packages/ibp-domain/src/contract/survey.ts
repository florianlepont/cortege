import type { FactorClass, FactorKey } from "../factors"
import type { SurveyWeather } from "./weather"

// Wire types of a survey, shared by the API and the app. Types only: runtime validation stays in
// the API's class-validator DTOs.

/** Survey lifecycle status, as the API stores and sends it. */
export type SurveyStatus = "draft" | "submitted" | "synced" | "error"

/**
 * Who reads a submitted survey: 'private' = its author only; 'public' = shared with the
 * association (every authenticated member), never the open internet. Frozen at submit (Phase 29).
 */
export type SurveyVisibility = "private" | "public"

/** Replaces API `FactorCanonical` (surveys.types.ts) and mobile `FactorCanonical` (app/types.ts). */
export type FactorCanonical = {
  factor_id: string
  observed_value_raw: unknown
  selected_class: FactorClass
  score_points: number
  warnings: string[]
}

/** Replaces the `scores` shape of mobile `SurveyDetailResponse` (app/types.ts). */
export type IbpScores = {
  ibp_peuplement_gestion: number
  ibp_contexte: number
  ibp_total: number
}

/**
 * The method fields every survey carries from phase 01.8 (D-02, D-08 amended). A missing
 * `ibp_method_version` means v3.0; `ibp_cas` (1-4) and `ibp_cas3_scale` apply to v3.2 only.
 */
export type IbpMethodFields = {
  ibp_method_version?: string | null
  ibp_cas?: number | null
  ibp_cas3_scale?: boolean | null
}

/**
 * One factor's doubt flag and short note (phase 27, D-23). They live at `factors.annotations`,
 * keyed by factor code, beside the factor keys and never read by a scorer (D-14).
 */
export type FactorAnnotation = { doubt?: true; note?: string }

/** The `factors.annotations` container: only factors with a doubt or a note have an entry. */
export type FactorAnnotations = Partial<Record<FactorKey, FactorAnnotation>>

/** Replaces API `SurveyUpsertBody` (surveys.types.ts) and mobile `SurveyQueuePayload` (storage/types.ts). */
export type SurveyUpsertPayload = IbpMethodFields & {
  id?: string
  sync_version?: number
  site_name?: string
  status?: SurveyStatus
  visibility?: SurveyVisibility
  parcel_id?: string
  parcel_ids?: string[]
  observation_year?: number
  version_number?: number
  previous_survey_id?: string
  region_version?: string
  vegetation_stage?: string
  factors?: Record<string, unknown>
  scores?: Record<string, unknown>
  /** Phase 27, D-01: nullable column of migration 023; read-only after submit (D-03). */
  survey_note?: string | null
  /** Phase 27, D-01: nullable jsonb column of migration 023; read-only after submit (D-03). */
  weather?: SurveyWeather | null
}

// SurveyPatchPayload does not take survey_note or weather: PATCH leaves them untouched (phase 27).
/** Replaces API `SurveyPatchBody` (surveys.types.ts). */
export type SurveyPatchPayload = IbpMethodFields & {
  site_name?: string
  visibility?: SurveyVisibility
  parcel_id?: string
  parcel_ids?: string[]
  observation_year?: number
  version_number?: number
  previous_survey_id?: string
  region_version?: string
  vegetation_stage?: string
  factors?: Record<string, unknown>
  scores?: Record<string, unknown>
}

/** Replaces mobile `SurveyDetailResponse` (app/types.ts); the API sends it from `getSurveyById`. */
export type SurveyDetail = IbpMethodFields & {
  id: string
  site_name?: string
  status?: SurveyStatus
  visibility?: SurveyVisibility
  parcel_id?: string | null
  parcel_ids?: string[]
  observation_year?: number | null
  version_number?: number | null
  previous_survey_id?: string | null
  region_version?: string | null
  vegetation_stage?: string | null
  factors?: Record<string, unknown>
  display_location?: { lat: number; lng: number } | null
  created_at?: string
  updated_at?: string
  submitted_at?: string | null
  sync_version?: number
  /** Phase 27, D-01: null or absent means no note. */
  survey_note?: string | null
  /** Phase 27, D-01: null or absent means no weather. */
  weather?: SurveyWeather | null
  factor_results: Record<string, FactorCanonical>
  scores: IbpScores
}
