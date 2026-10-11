// The basemap cycle of the swipe mode (UI-SPEC U-04): Plan, Satellite, Carte d'état-major,
// Carte de 1950, Photos 1950, wrapping around. A layer that is not available (offline, no pack for
// the area) is skipped, and so is the layer shown on the other side of a comparison (never the same
// layer on both sides). Reference: `swNeighbor` of the sketch engine (map-layers-kit.js).
// Pure: no import but types and the catalogue order.

import { BASE_LAYER_KEYS } from "./layers"
import type { BaseLayerKey } from "./layers"

export type LayerAvailability = (key: BaseLayerKey) => boolean

/** The cycle order, one definition: the catalogue's. */
export const BASEMAP_CYCLE: readonly BaseLayerKey[] = BASE_LAYER_KEYS

/** The cycle without the unavailable layers and the excluded one, in cycle order. */
export function availableCycle(
  isAvailable: LayerAvailability,
  exclude?: BaseLayerKey,
): BaseLayerKey[] {
  return BASEMAP_CYCLE.filter((key) => key !== exclude && isAvailable(key))
}

/**
 * The layer a swipe uncovers: the next one (`dir` 1, the finger goes left) or the previous one
 * (`dir` -1) from `current`, wrapping, skipping unavailable layers and `exclude`. Searched from the
 * cycle position of `current` even when `current` is itself unavailable. Null when no other layer
 * qualifies.
 */
export function neighbourLayer(
  current: BaseLayerKey,
  dir: 1 | -1,
  { isAvailable, exclude }: { isAvailable: LayerAvailability; exclude?: BaseLayerKey },
): BaseLayerKey | null {
  const size = BASEMAP_CYCLE.length
  const from = BASEMAP_CYCLE.indexOf(current)
  for (let step = 1; step < size; step += 1) {
    const candidate = BASEMAP_CYCLE[(from + dir * step + size * size) % size]
    if (candidate !== exclude && isAvailable(candidate)) return candidate
  }
  return null
}

/** How many layers the cycle skips (the "N fonds non téléchargés sont ignorés" notice). */
export function skippedCount(isAvailable: LayerAvailability): number {
  return BASEMAP_CYCLE.filter((key) => !isAvailable(key)).length
}

/** The 1 based position of a layer in the cycle ("fond n sur 5"). */
export function cycleIndex(key: BaseLayerKey): number {
  return BASEMAP_CYCLE.indexOf(key) + 1
}
