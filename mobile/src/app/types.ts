import type {
  FactorCanonical,
  IbpScores,
  PublicMapItem as DomainPublicMapItem,
  PublicParcelStatusItem as DomainPublicParcelStatusItem,
  SurveyDetail,
} from "@cortege/ibp-domain"

export type AuthUser = {
  id: string
  email: string
  display_name: string
  role: string
  first_name: string
  last_name: string
  profile_picture_url: string | null
}

// IBP domain and wire types come from the shared package (phase 01.8, D-06): the app and the API
// read the same definitions.
export type {
  CnpfFactorAGenusCode,
  FactorAGenusInput,
  FactorCanonical,
  FactorClass,
  FactorKey,
  FactorRetainedScore,
  IbpScores,
  RegionVersion,
  VegetationStage,
} from "@cortege/ibp-domain"

/** A survey as `GET /surveys/:id` returns it (the package's wire type, name kept for the app). */
export type SurveyDetailResponse = SurveyDetail

export type SurveyDetailTab = "summary" | "events" | "debug"

export type SurveyEventItem = {
  id: string
  survey_id?: string
  actor_id?: string | null
  event_type: string
  payload?: Record<string, unknown> | null
  created_at: string
}

export type SurveyEventsResponse = {
  items?: SurveyEventItem[]
}

/** One past submitted survey of a parcel, as `GET /parcels/:parcelId/surveys/history` returns it. */
export type ParcelSurveyHistoryItem = {
  survey_id: string
  observation_year: number | null
  version_number: number | null
  scores: IbpScores
  factor_results: Record<string, FactorCanonical>
  submitted_at: string
}

export type ParcelSurveyHistoryResponse = {
  parcel_id: string
  items: ParcelSurveyHistoryItem[]
}

export type PublicMapItem = DomainPublicMapItem

export type GpsCaptureResult = {
  lat: number
  lng: number
  collected_at: string
}

export type GeoJsonGeometry = {
  type: "Polygon" | "MultiPolygon"
  coordinates: unknown
}

/** The package's parcel status, with the GeoJSON geometry the app draws narrowed. */
export type PublicParcelStatusItem = Omit<DomainPublicParcelStatusItem, "geometry"> & {
  geometry?: GeoJsonGeometry
}

export type SurveyStatusFilter = "all" | "draft" | "submitted"
export type SurveyVisibilityFilter = "all" | "private" | "public"
export type SurveySyncFilter = "all" | "pending" | "synced" | "failed"
export type SurveyBlockedFilter = "all" | "blocked" | "unblocked"
export type SurveyAttachmentFilter = "all" | "with" | "without"
export type SurveySort = "updated_desc" | "updated_asc" | "site_asc"
export type AppScreen = "list" | "create" | "edit" | "public_map" | "profile"
/** Per-factor completion, computed by screens/survey-form/FactorsList.tsx's computeFactorProgress. */
export type FactorProgress = { complete: boolean; filled: number; total: number; invalid: number }

export type FactorField = {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string | null
  /** FLOW-02: whether the field was left once or submission was attempted — gates error display. */
  touched: boolean
  onTouch: () => void
}

export type SurveyListFilters = {
  surveyQuery: string
  surveyFromDate: string
  surveyToDate: string
  statusFilter: SurveyStatusFilter
  visibilityFilter: SurveyVisibilityFilter
  syncFilter: SurveySyncFilter
  blockedFilter: SurveyBlockedFilter
  attachmentFilter: SurveyAttachmentFilter
  sortMode: SurveySort
}

export type SurveyStats = {
  total: number
  draft: number
  submitted: number
  pending: number
  synced: number
  failed: number
  blocked: number
}

export type SubmitBlockReason =
  | "not_found"
  | "already_submitted"
  | "survey_blocked"
  | "name_required"
  | null
