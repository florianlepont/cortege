import type { SearchParcelItem, SearchPlaceItem, SearchPlaceKind } from "@cortege/ibp-domain"
import { buildFocusedMapRegion, type MapRegion } from "../../app/map-viewport"
import type { PublicMapFocus } from "../../navigation/types"

/**
 * A parcel focus frames the parcel bounds enlarged by this factor on each axis: the margin around
 * the parcel is a quarter of its span on each side, about 48 pt on a phone-wide map (tuned at the
 * owner check, D-06).
 */
export const PARCEL_FOCUS_SPAN_FACTOR = 1.5
// A parcel focus never frames less than the span of zoom 18, so a tiny or degenerate box still
// shows the neighbourhood (T-25-21).
const MIN_PARCEL_ZOOM = 18
// Without bounds the parcel is shown at this zoom, centred on its centroid (D-06).
const PARCEL_CENTROID_ZOOM = 17

/** Zoom a place is shown at: a commune or locality 13, a street or address 17, the rest 14 (D-05). */
export function placeZoom(kind: SearchPlaceKind): number {
  switch (kind) {
    case "municipality":
    case "locality":
      return 13
    case "street":
    case "address":
      return 17
    default:
      return 14
  }
}

function spanForZoom(zoom: number): number {
  return 360 / 2 ** zoom
}

function squareRegion(latitude: number, longitude: number, zoom: number): MapRegion {
  const delta = spanForZoom(zoom)
  return { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta }
}

function parcelRegion(focus: Extract<PublicMapFocus, { kind: "parcel" }>): MapRegion {
  if (!focus.bbox) return squareRegion(focus.lat, focus.lng, PARCEL_CENTROID_ZOOM)
  const [west, south, east, north] = focus.bbox
  const minSpan = spanForZoom(MIN_PARCEL_ZOOM)
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: Math.max((north - south) * PARCEL_FOCUS_SPAN_FACTOR, minSpan),
    longitudeDelta: Math.max((east - west) * PARCEL_FOCUS_SPAN_FACTOR, minSpan),
  }
}

/**
 * The region Explorer moves to for a focus. A survey is centred a little north of its marker so
 * it clears the sheet (OA-59); a place is centred at the zoom of its kind; a parcel is framed.
 */
export function focusRegionFor(focus: PublicMapFocus): MapRegion {
  switch (focus.kind) {
    case "survey": {
      const target = buildFocusedMapRegion(focus)
      return { ...target, latitude: target.latitude - target.latitudeDelta * 0.22 }
    }
    case "place":
      return squareRegion(focus.lat, focus.lng, placeZoom(focus.placeKind))
    case "parcel":
      return parcelRegion(focus)
  }
}

/** The parcels a focus draws selected: the survey's own, the found parcel, none for a place. */
export function focusParcelIds(focus: PublicMapFocus | undefined): string[] | undefined {
  if (!focus) return undefined
  switch (focus.kind) {
    case "survey":
      return focus.parcelIds
    case "parcel":
      return [focus.parcelId]
    case "place":
      return undefined
  }
}

/** The focus that shows a place search result. */
export function placeFocus(item: SearchPlaceItem, nonce: number): PublicMapFocus {
  return { kind: "place", lat: item.lat, lng: item.lng, placeKind: item.kind, nonce }
}

/** The focus that shows a parcel search result. */
export function parcelFocus(item: SearchParcelItem, nonce: number): PublicMapFocus {
  return {
    kind: "parcel",
    parcelId: item.parcel_id,
    lat: item.centroid.lat,
    lng: item.centroid.lng,
    bbox: item.bbox,
    nonce,
  }
}
