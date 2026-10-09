// Wire types of the public map endpoints, shared by the API and the app.

/**
 * Replaces API `PublicMapItem` (public-map.utils.ts) and mobile `PublicMapItem` (app/types.ts).
 * `display_location` is the exact centre of the survey's linked parcels, not rounded (owner
 * decision 2026-10-08; it was rounded to 2 decimals before).
 */
export type PublicMapItem = {
  survey_id: string
  display_location: { lat: number; lng: number }
  survey_date: string
  region_code: string
  ibp_total: number
  ibp_method_version?: string | null
  ibp_cas?: number | null
}

/**
 * Replaces API `PublicParcelStatusItem` (public-map.service.ts) and mobile `PublicParcelStatusItem`
 * (app/types.ts). `geometry` is the GeoJSON object the API sends; the app narrows it.
 */
export type PublicParcelStatusItem = {
  parcel_id: string
  study_status: "studied" | "not_studied"
  latest_submitted_survey_id?: string | null
  latest_observation_year?: number | null
  latest_ibp_total?: number | null
  latest_ibp_method_version?: string | null
  geometry?: Record<string, unknown>
}

/**
 * One finished survey in the community search (`GET /public/community-surveys`): every member sees
 * every submitted survey (association-only sharing), with its site name and its author's name.
 */
export type CommunitySurveyItem = {
  survey_id: string
  site_name: string
  /** The author's display name; null once the author deleted their account. */
  author_name: string | null
  /** ISO timestamp of the submission. */
  submitted_at: string
  ibp_total: number
  ibp_method_version?: string | null
}

/** One survey of the same parcel(s) in a community survey's history, the survey itself included. */
export type CommunitySurveyHistoryItem = {
  survey_id: string
  site_name: string
  author_name: string | null
  observation_year: number | null
  version_number: number | null
  /** The survey's IBP method version tag; null means v3.0. Absent on an older server. */
  ibp_method_version?: string | null
  ibp_total: number
  submitted_at: string
  /** True for the survey the page is about. */
  is_current: boolean
}

/**
 * A finished survey of any member (`GET /public/community-surveys/:id`), read-only. For now every
 * member sees its parcels and its exact position (internal use by the association), the same point
 * as its public map item (owner decision 2026-10-08). To revisit before the app opens to people
 * outside the association.
 */
export type CommunitySurveyDetail = {
  survey_id: string
  site_name: string
  author_name: string | null
  submitted_at: string
  observation_year: number | null
  version_number: number | null
  region_version: string | null
  vegetation_stage: string | null
  ibp_method_version: string | null
  ibp_cas: number | null
  ibp_cas3_scale: boolean
  scores: Record<string, unknown>
  factor_results: Record<string, unknown>
  parcel_ids: string[]
  display_location: { lat: number; lng: number } | null
  history: CommunitySurveyHistoryItem[]
}

/** A file of a community survey (`GET /public/community-surveys/:id/attachments`). */
export type CommunitySurveyAttachment = {
  id: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}
