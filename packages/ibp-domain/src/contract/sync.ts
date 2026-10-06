import type { FactorCanonical, IbpMethodFields, SurveyStatus, SurveyVisibility } from "./survey"

// Wire types of `POST /v1/sync` and `GET /v1/sync/changes`, shared by the API and the app.
// A field is optional here when one side does not rely on it today.

export type SyncEntity = "survey" | "attachment"

export type SyncAction = "upsert" | "create" | "delete" | "visibility_update"

/** Replaces the fields of API `SyncOperationEnvelopeDto` (dtos/sync-batch.dto.ts) and mobile `SyncBatchOperation` (storage/types.ts). */
export type SyncOperation = {
  client_ref?: string
  entity: SyncEntity
  action: SyncAction
  survey_id?: string
  payload?: Record<string, unknown>
}

/** Replaces API `SyncResultError` (surveys.types.ts) and mobile `SyncBatchError` (storage/types.ts). */
export type SyncResultError = {
  code: string
  message: string
  http_status?: number
  details?: Record<string, unknown>
}

export type SyncOperationStatus = "synced" | "retryable_error" | "fatal_error"

/** Replaces API `SyncOperationResult` (surveys.types.ts) and mobile `SyncBatchResult` (storage/types.ts). */
export type SyncOperationResult = {
  client_ref: string | null
  entity: string
  action: string
  status: SyncOperationStatus
  data?: Record<string, unknown>
  error?: SyncResultError
}

/** Replaces mobile `SyncBatchResponse` (storage/types.ts); the API returns it from `syncBatch`. */
export type SyncBatchResponse = {
  results?: SyncOperationResult[]
}

/** Replaces API `SyncChangeEvent` (surveys.types.ts): one survey event of the changes feed. */
export type SyncChangeEvent = {
  id: string
  survey_id: string
  actor_id: string | null
  event_type: string
  payload: Record<string, unknown> | null
  created_at: string
}

/** Replaces API `SyncChangeSurvey` (surveys.types.ts) and mobile `RemoteSurvey` (storage/types.ts). */
export type SyncChangeSurvey = IbpMethodFields & {
  id: string
  site_name: string
  status: SurveyStatus
  visibility?: SurveyVisibility
  parcel_id?: string | null
  parcel_ids?: string[]
  observation_year?: number | null
  version_number?: number | null
  previous_survey_id?: string | null
  region_version?: string | null
  vegetation_stage?: string | null
  factors?: Record<string, unknown>
  factor_results?: Record<string, FactorCanonical>
  scores?: Record<string, unknown>
  created_at?: string | null
  updated_at?: string
  submitted_at?: string | null
  sync_version: number
  deleted_at?: string | null
}

/** Replaces API `SyncChangeAttachment` (surveys.types.ts) and mobile `RemoteAttachment` (storage/types.ts). */
export type SyncChangeAttachment = {
  id: string
  survey_id: string
  storage_key: string
  mime_type: string
  size_bytes: number
  captured_at?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string
  uploaded_at?: string | null
  deleted_at?: string | null
}

/** Replaces mobile `SyncChangesResponse` (storage/types.ts) and the API `listSyncChanges` return type. */
export type SyncChangesResponse = {
  cursor_in: string | null
  cursor_out: string | null
  has_more: boolean
  events?: SyncChangeEvent[]
  surveys?: SyncChangeSurvey[]
  attachments?: SyncChangeAttachment[]
}
