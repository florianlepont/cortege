// Wire types of the public map endpoints, shared by the API and the app.

/** Replaces API `PublicMapItem` (public-map.utils.ts) and mobile `PublicMapItem` (app/types.ts). */
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
