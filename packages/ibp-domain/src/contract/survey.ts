import type { FactorClass } from "../factors"

// Wire types of a survey, shared by the API and the app. Types only: runtime validation stays in
// the API's class-validator DTOs.

/** Survey lifecycle status, as the API stores and sends it. */
export type SurveyStatus = "draft" | "submitted" | "synced" | "error"

/** Survey visibility on the public map. */
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
}

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
  factor_results: Record<string, FactorCanonical>
  scores: IbpScores
}
