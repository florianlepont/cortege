// The rules behind the notices column and the legend of the Explorer (Phase 28, UI-SPEC sections
// 8 and 9): when a layer is scaled too far, when the map is outside a layer's coverage, and which
// layers the legend and the attribution name. Pure: no React, no react-native, no i18n.
import { LAYER_CATALOGUE } from "./layers"
import type { BaseLayerKey, MapLayerKey } from "./layers"
import { pointInBounds } from "./tile-math"

/**
 * True when the layer is scaled 4 times or more. 256 px tiles are read one level above the map
 * zoom, so past the layer's last tile zoom the map scales that last tile: from `cap + 1` on, the
 * scale is 4. The cap is the offline one when offline. The Plan is vector, drawn sharp at any zoom.
 */
export function isOverzoomed(key: MapLayerKey, mapZoom: number, offline: boolean): boolean {
  const entry = LAYER_CATALOGUE[key]
  if (entry.tiles === null) {
    return false
  }
  const source = entry.sources[0]
  const cap = offline ? source.offlineMaxTileZoom : source.maxTileZoom
  return mapZoom >= cap + 1
}

/** The over-zoom pill to show: the base text wins over the overlay text (UI-SPEC section 8). */
export function overzoomNotice(
  shown: { bases: readonly BaseLayerKey[]; overlay: boolean },
  mapZoom: number,
  offline: boolean,
): "base" | "overlay" | null {
  if (shown.bases.some((key) => isOverzoomed(key, mapZoom, offline))) {
    return "base"
  }
  if (shown.overlay && isOverzoomed("types-foret", mapZoom, offline)) {
    return "overlay"
  }
  return null
}

/** True when the layer has a coverage box and the point lies outside it (the service says 404). */
export function isOutsideCoverage(key: MapLayerKey, point: { lat: number; lng: number }): boolean {
  const coverage = LAYER_CATALOGUE[key].coverage
  return coverage !== null && !pointInBounds(point.lat, point.lng, coverage)
}

/**
 * The layers the legend and the attribution list, left to right then the overlay. `null` for the
 * default display (Plan or Satellite alone, no overlay, no comparison): nothing to add there.
 */
export function attributionLayerKeys(shown: {
  left: BaseLayerKey
  right: BaseLayerKey | null
  overlay: boolean
}): MapLayerKey[] | null {
  const isDefaultBase = shown.left === "map" || shown.left === "satellite"
  if (isDefaultBase && shown.right === null && !shown.overlay) {
    return null
  }
  const keys: MapLayerKey[] = [shown.left]
  if (shown.right !== null && shown.right !== shown.left) {
    keys.push(shown.right)
  }
  if (shown.overlay) {
    keys.push("types-foret")
  }
  return keys
}
