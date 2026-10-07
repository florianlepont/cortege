import type {
  IbpMethodFields,
  SyncChangeAttachment,
  SyncChangeSurvey,
  SyncChangesResponse as SharedSyncChangesResponse,
  SyncOperation,
  SyncOperationResult,
  SyncResultError,
} from "@cortege/ibp-domain"

export type LocalSurvey = {
  id: string
  site_name: string
  status: string
  visibility: "private" | "public"
  sync_version: number
  sync_state: "pending" | "synced" | "failed"
  last_sync_error: string | null
  last_sync_error_code: string | null
  last_sync_error_at: string | null
  sync_blocked: number
  created_at: string
  updated_at: string
  completion_rate: number
  /**
   * The IBP total (/50) the server last reported for a submitted survey, read from the local payload
   * by `listLocalSurveys` (12.2-14). Null when there is none; absent on a survey returned by a write.
   */
  ibp_total?: number | null
}

export type QueueOpType =
  | "survey_upsert"
  | "survey_delete"
  | "survey_visibility"
  | "attachment_upload"
  | "attachment_delete"
  | "unknown"

// "unavailable" = the server has no downloadable bytes for a pulled attachment
// (404/409), set by plan 06. "missing" is set later by plans 06/11.
export type AttachmentFileState = "local" | "remote" | "missing" | "unavailable"

export type LocalAttachment = {
  id: string
  survey_id: string
  local_uri: string
  mime_type: string
  size_bytes: number
  sync_state: "pending" | "synced" | "failed"
  remote_attachment_id: string | null
  storage_key: string | null
  upload_url: string | null
  confirm_url: string | null
  last_sync_error: string | null
  last_sync_error_code: string | null
  last_sync_error_at: string | null
  updated_at: string
  file_state: AttachmentFileState
}

export type QueueRow = {
  id: number
  survey_id: string
  payload: string
  status: "pending" | "failed"
  retry_count: number
  next_retry_at: string | null
  op_type: QueueOpType | null
}

export type AttachmentQueuePayload = {
  kind: "attachment_upload"
  local_attachment_id: string
  survey_id: string
  local_uri: string
  mime_type: string
  size_bytes: number
  captured_at?: string
  metadata?: Record<string, unknown>
}

export type AttachmentDeleteQueuePayload = {
  kind: "attachment_delete"
  survey_id: string
  attachment_id: string
}

// Survey payload written to `local_surveys.payload_json` and to the queued upsert. The method
// fields (01.8, D-10 amended) live only here: no SQLite column, SCHEMA_VERSION stays 2. A payload
// without `ibp_method_version` is a legacy v3.0 draft and is never stamped.
export type SurveyQueuePayload = IbpMethodFields & {
  id?: string
  sync_version?: number
  site_name?: string
  status?: string
  visibility?: string
  parcel_ids?: string[]
  // Server-assigned (phase 10, D-01): the mobile app never sets these when writing a draft, only
  // caches whatever the server last reported, so a PDF export can read them with no API call.
  observation_year?: number
  version_number?: number
  region_version?: string
  vegetation_stage?: string
  factors?: Record<string, unknown>
  scores?: Record<string, unknown>
}

export type SurveyDeleteQueuePayload = {
  kind: "survey_delete"
  survey_id: string
}

export type SurveyVisibilityQueuePayload = {
  kind: "survey_visibility_update"
  survey_id: string
  visibility: "private" | "public"
}

export type UploadTargetResponse = {
  attachment_id: string
  storage_key: string
  upload_url: string
  confirm_url?: string
}

// Sync wire types come from the shared contract (01.8 criterion 1). Local narrowings:
// - an outgoing operation always carries a client_ref and a payload on the phone;
// - an error read from the server is read defensively, so code and message stay optional.
export type SyncBatchOperation = SyncOperation & {
  client_ref: string
  payload: Record<string, unknown>
}

export type SyncBatchError = Partial<SyncResultError>

export type SyncBatchResult = Omit<SyncOperationResult, "error"> & {
  error?: SyncBatchError
}

export type SyncBatchResponse = {
  results?: SyncBatchResult[]
}

export type RemoteSurvey = SyncChangeSurvey

export type RemoteAttachment = SyncChangeAttachment

export type SyncChangesResponse = SharedSyncChangesResponse

// A v3.2 draft has no region or stage (D-08 amended): both are optional. The method fields are
// written only when the caller gives them (see applyMethodFields in utils.ts).
export type DraftInput = IbpMethodFields & {
  site_name: string
  region_version?: "ACA" | "M"
  vegetation_stage?: string
  parcel_ids: string[]
  factors: Record<string, unknown>
}

export type UpdateDraftInput = IbpMethodFields & {
  survey_id: string
  site_name: string
  region_version?: "ACA" | "M"
  vegetation_stage?: string
  parcel_ids: string[]
  factors: Record<string, unknown>
  visibility?: "private" | "public"
}

export type LocalAttachmentInput = {
  survey_id: string
  local_uri: string
  mime_type: string
  size_bytes: number
  captured_at?: string
  metadata?: Record<string, unknown>
}
