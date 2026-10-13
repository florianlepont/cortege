import { useCallback, useEffect, useMemo, useState } from "react"
import { useDebouncedValue } from "../../hooks/useDebouncedValue"
import type { MapLayerKey } from "../../map/layers"
import { listAreaLayers } from "../../map/offline-packs"
import { availableLayers, regionBounds, boundsContain } from "../../map/view-availability"
import type { ViewRegion } from "../../map/view-availability"
import type { OfflineAreaSummary } from "../../storage/offline-map"

/** The view settles this long (ms) before availability follows it: no flicker while panning. */
export const VIEW_AVAILABILITY_DEBOUNCE_MS = 300

type Input = {
  areas: readonly OfflineAreaSummary[]
  region: ViewRegion
  isOffline: boolean
}

export type LayerAvailability = {
  /** Can this layer draw the visible view? Online everything can; offline it needs its pack. */
  isAvailable: (key: MapLayerKey) => boolean
  /** A ready offline area holds the whole view. */
  areaAtView: boolean
}

/**
 * Which layers can show in the visible view (owner rule, UI-SPEC 3b): `availableLayers` over the
 * native pack metadata of the ready areas (`listAreaLayers`, reloaded when the set of ready areas
 * changes) and the settled viewport. It feeds the swipe cycle, the side tags, the comparison and
 * the labels' offline markers; nothing switches by itself.
 */
export function useLayerAvailability({ areas, region, isOffline }: Input): LayerAvailability {
  const readyAreas = useMemo(() => areas.filter((area) => area.status === "ready"), [areas])
  const readyIds = readyAreas
    .map((area) => area.id)
    .sort()
    .join("|")
  const [packs, setPacks] = useState<Map<string, Set<MapLayerKey>>>(() => new Map())

  useEffect(() => {
    let active = true
    listAreaLayers()
      .then((found) => {
        if (active) setPacks(found)
      })
      .catch(() => {
        // Unreadable pack metadata: no layer counts as downloaded.
        if (active) setPacks(new Map())
      })
    return () => {
      active = false
    }
  }, [readyIds])

  const view = useDebouncedValue(region, VIEW_AVAILABILITY_DEBOUNCE_MS)
  const layers = useMemo(
    () => availableLayers({ isOffline, areas: readyAreas, packs, view }),
    [isOffline, readyAreas, packs, view],
  )
  const areaAtView = useMemo(() => {
    const box = regionBounds(view)
    return readyAreas.some((area) => boundsContain(area.bounds, box))
  }, [readyAreas, view])
  const isAvailable = useCallback((key: MapLayerKey) => layers.has(key), [layers])

  return useMemo(() => ({ isAvailable, areaAtView }), [isAvailable, areaAtView])
}
