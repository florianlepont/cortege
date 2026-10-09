// Wire types of the global search endpoints, shared by the API and the app.

import type { CommunitySurveyItem } from "./public-map"

/**
 * One member in the community search (`GET /v1/search/community`). One row per display name, with
 * no user id, email or first/last name on the wire (privacy, D-17).
 */
export type SearchMemberItem = {
  author_name: string
  /** Number of submitted surveys of the members carrying this display name. */
  survey_count: number
}

/** Response of `GET /v1/search/community`: matching members and matching submitted surveys. */
export type SearchCommunityResponse = {
  members: SearchMemberItem[]
  surveys: CommunitySurveyItem[]
}

/**
 * Kind of a place found by `GET /v1/search/places`. "address" is a house number; "other" is an IGN
 * point of interest such as a forest, a summit or a lieu-dit.
 */
export type SearchPlaceKind = "municipality" | "locality" | "street" | "address" | "other"

/** One place or address resolved to a map position (`GET /v1/search/places`). */
export type SearchPlaceItem = {
  id: string
  name: string
  kind: SearchPlaceKind
  /** A short locating line (commune, postcode), when the provider gives one. */
  context: string | null
  lat: number
  lng: number
  /** Provider confidence between 0 and 1. */
  score: number
}

/** Response of `GET /v1/search/places`. */
export type SearchPlacesResponse = {
  items: SearchPlaceItem[]
}

/** One cadastral parcel found by number (`GET /v1/search/parcels`). */
export type SearchParcelItem = {
  parcel_id: string
  commune_code: string
  commune_name: string | null
  section: string
  number: string
  centroid: { lat: number; lng: number }
  /** Bounding box in the order west, south, east, north; null when the geometry is unknown. */
  bbox: [number, number, number, number] | null
  /** Number of submitted surveys on this parcel. */
  survey_count: number
}

/** Response of `GET /v1/search/parcels`. */
export type SearchParcelsResponse = {
  items: SearchParcelItem[]
}
