// The layers available for the visible view (owner rule "règle simple complète"): offline, the app
// offers only what can be displayed. Online every layer is. Offline a layer is available when the
// whole viewport lies inside a ready offline area that owns a complete pack of that layer; the Plan
// and the Satellite follow the same rule as the old maps and the overlays. Pure: no import but types.

import { LAYER_CATALOGUE } from "./layers"
import type { MapLayerKey } from "./layers"
import type { LatLngBounds } from "./tile-math"

/** A map region as the Explorer keeps it (centre and span in degrees). */
export type ViewRegion = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export type AvailabilityArea = { id: string; bounds: LatLngBounds }

export type ViewAvailabilityInput = {
  isOffline: boolean
  /** The ready offline areas. */
  areas: readonly AvailabilityArea[]
  /** The layers each area owns a pack for. */
  packs: ReadonlyMap<string, ReadonlySet<MapLayerKey>>
  view: ViewRegion
}

const ALL_LAYERS = Object.keys(LAYER_CATALOGUE) as MapLayerKey[]

/** The box a region covers. */
export function regionBounds(region: ViewRegion): LatLngBounds {
  const halfLat = Math.abs(region.latitudeDelta) / 2
  const halfLng = Math.abs(region.longitudeDelta) / 2
  return {
    minLat: region.latitude - halfLat,
    maxLat: region.latitude + halfLat,
    minLng: region.longitude - halfLng,
    maxLng: region.longitude + halfLng,
  }
}

/** `inner` lies entirely inside `outer` (edges included). */
export function boundsContain(outer: LatLngBounds, inner: LatLngBounds): boolean {
  return (
    inner.minLat >= outer.minLat &&
    inner.maxLat <= outer.maxLat &&
    inner.minLng >= outer.minLng &&
    inner.maxLng <= outer.maxLng
  )
}

/** The layers that can draw the view: all of them online, else those packed by an area around it. */
export function availableLayers(input: ViewAvailabilityInput): ReadonlySet<MapLayerKey> {
  if (!input.isOffline) return new Set(ALL_LAYERS)
  const view = regionBounds(input.view)
  const found = new Set<MapLayerKey>()
  for (const area of input.areas) {
    if (!boundsContain(area.bounds, view)) continue
    for (const key of input.packs.get(area.id) ?? []) found.add(key)
  }
  return found
}
