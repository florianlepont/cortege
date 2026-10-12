import type { MapRegion } from "./map-viewport"
import { boundsOfRings, parcelPolygonsFrom, type LngLatBounds } from "./survey-pdf/map-projection"
import type { PublicParcelStatusItem } from "./types"

// D-36: the region a survey's parcel map is framed on. Pure, so the framing is tested without a
// map. The parcels' own bounding box comes first; without geometry the centre point is shown in a
// fixed window; with neither there is no frame (the caller draws no live map, never France).

/** The side of the window shown around a centre point when no parcel geometry is known (degrees). */
export const PARCEL_WINDOW_DEGREES = 0.01

/** The bounding box is enlarged by this factor on each axis, leaving a margin of a fifth of the span. */
export const PARCEL_FRAME_SPAN_FACTOR = 1.4

/** A single small parcel never frames less than this span (about zoom 17), so it keeps its surroundings. */
export const MIN_PARCEL_FRAME_SPAN = 0.003

export type Centre = { lat: number; lng: number }

/** The fixed window around a point: the fallback when no parcel geometry is on the phone. */
export function windowRegion(centre: Centre, delta = PARCEL_WINDOW_DEGREES): MapRegion {
  return {
    latitude: centre.lat,
    longitude: centre.lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  }
}

/** The region that holds a bounding box with a small margin, never smaller than the minimum span. */
export function regionForBounds(bounds: LngLatBounds): MapRegion {
  return {
    latitude: (bounds.south + bounds.north) / 2,
    longitude: (bounds.west + bounds.east) / 2,
    latitudeDelta: Math.max(
      (bounds.north - bounds.south) * PARCEL_FRAME_SPAN_FACTOR,
      MIN_PARCEL_FRAME_SPAN,
    ),
    longitudeDelta: Math.max(
      (bounds.east - bounds.west) * PARCEL_FRAME_SPAN_FACTOR,
      MIN_PARCEL_FRAME_SPAN,
    ),
  }
}

/** The centre of a bounding box. */
export function boundsCentre(bounds: LngLatBounds): Centre {
  return { lat: (bounds.south + bounds.north) / 2, lng: (bounds.west + bounds.east) / 2 }
}

/** The bounding box of the wanted parcels among some items (matched without regard to case). */
export function parcelBoundsFrom(
  items: PublicParcelStatusItem[],
  parcelIds: string[],
): LngLatBounds | null {
  if (items.length === 0 || parcelIds.length === 0) return null
  return boundsOfRings(parcelPolygonsFrom(items, parcelIds).flatMap(({ rings }) => rings))
}

/** The union of two bounding boxes; either may be absent. */
export function mergeBounds(a: LngLatBounds | null, b: LngLatBounds | null): LngLatBounds | null {
  if (!a) return b
  if (!b) return a
  return {
    west: Math.min(a.west, b.west),
    south: Math.min(a.south, b.south),
    east: Math.max(a.east, b.east),
    north: Math.max(a.north, b.north),
  }
}

/**
 * The region of a survey's parcel map. The parcels' bounding box fits first; else the window
 * around the best known centre (the server position, then the point kept on the phone); else null:
 * nothing is known, so the caller draws no live map. Never the whole of France.
 */
export function parcelFrameRegion(input: {
  bounds: LngLatBounds | null
  centre: Centre | null
}): MapRegion | null {
  if (input.bounds) return regionForBounds(input.bounds)
  return input.centre ? windowRegion(input.centre) : null
}
