import type {
  FactorCanonical,
  SurveyPatchPayload,
  SurveyStatus,
  SurveyUpsertPayload,
  SurveyVisibility,
  SyncChangeAttachment,
  SyncChangeEvent,
  SyncChangeSurvey,
  SyncOperationResult,
  SyncResultError,
} from "@cortege/ibp-domain"

// Wire types come from the shared contract (phase 01.8, D-06); the names stay so no importer
// changes. Request validation stays in the class-validator DTOs. Row and DB-only types stay here.
export type {
  FactorCanonical,
  SyncChangeAttachment,
  SyncChangeEvent,
  SyncChangeSurvey,
  SyncOperationResult,
  SyncResultError,
}

export type SurveyUpsertBody = SurveyUpsertPayload

export type SurveyPatchBody = SurveyPatchPayload

export type SurveyVisibilityPatchBody = {
  visibility?: SurveyVisibility
}

export type CreateAttachmentBody = {
  mime_type?: string
  size_bytes?: number
  captured_at?: string
  metadata?: Record<string, unknown>
}

type JsonObject = Record<string, unknown>

export type SurveyRow = {
  id: string
  user_id: string | null
  site_name: string
  status: SurveyStatus
  visibility: SurveyVisibility
  parcel_id: string | null
  parcel_ids?: string[]
  observation_year: number | null
  version_number: number | null
  previous_survey_id: string | null
  region_version: string | null
  vegetation_stage: string | null
  // Migration 016: a NULL method version means v3.0; ibp_cas and ibp_cas3_scale are v3.2 only.
  ibp_method_version: string | null
  ibp_cas: number | null
  ibp_cas3_scale: boolean | null
  factors: JsonObject
  factor_results: Record<string, FactorCanonical>
  scores: JsonObject
  created_at: string
  updated_at: string
  submitted_at: string | null
  sync_version: number
  last_sync_error: string | null
  deleted_at: string | null
}

export type SurveyEventRow = {
  id: string
  survey_id: string
  actor_id: string | null
  event_type: string
  payload: JsonObject | null
  created_at: string
}

export type AttachmentRow = {
  id: string
  survey_id: string
  storage_key: string
  mime_type: string
  size_bytes: number
  created_at: string
  captured_at: string | null
  metadata: JsonObject | null
  upload_token: string
  uploaded_at: string | null
  deleted_at: string | null
}

// Internal row of the changes-feed query: the feed position travels as text (xid8 and bigint
// can exceed Number.MAX_SAFE_INTEGER) and is stripped before the response.
export type SyncChangeEventRow = SyncChangeEvent & { xid8: string; seq: string }

export type ParcelRow = {
  id: string
  parcel_id: string
  commune_code: string
  section: string
  number: string
  geometry: JsonObject
  centroid: { lat?: number; lng?: number; [key: string]: unknown }
  area_m2: number | null
  source: string | null
  created_at: string
  updated_at: string
}
