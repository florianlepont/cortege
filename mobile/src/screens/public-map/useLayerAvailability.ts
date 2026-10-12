import { useCallback, useEffect, useMemo, useState } from "react"
import type { MapLayerKey } from "../../map/layers"
import { listAreaLayers } from "../../map/offline-packs"
import { resolveOfflineAreaForPoint } from "../../map/tile-math"
import type { OfflineAreaSummary } from "../../storage/offline-map"

type Input = {
  areas: readonly OfflineAreaSummary[]
  center: { lat: number; lng: number }
  isOffline: boolean
}

export type LayerAvailability = {
  /** Can this layer draw at the view centre? Online everything can; offline it needs its pack. */
  isAvailable: (key: MapLayerKey) => boolean
  /** A ready offline area covers the view centre. */
  areaAtCenter: boolean
}

/** The Plan and the Satellite are always listed offline (UI-SPEC 3b); extras need their pack. */
const ALWAYS_LISTED: readonly MapLayerKey[] = ["map", "satellite"]

/**
 * Which layers can show at the view centre (UI-SPEC section 3b and U-14). Offline, this reads the
 * native pack metadata of the ready area under the centre (`listAreaLayers`), reloaded when the set
 * of ready areas changes. It feeds the swipe cycle's skips and the offline notices; nothing
 * switches by itself.
 */
export function useLayerAvailability({ areas, center, isOffline }: Input): LayerAvailability {
  const readyIds = areas
    .filter((area) => area.status === "ready")
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
        // Unreadable pack metadata: no extra layer counts as downloaded.
        if (active) setPacks(new Map())
      })
    return () => {
      active = false
    }
  }, [readyIds])

  const area = useMemo(
    () => resolveOfflineAreaForPoint([...areas], center.lat, center.lng),
    [areas, center.lat, center.lng],
  )
  const areaId = area?.id ?? null

  const isAvailable = useCallback(
    (key: MapLayerKey): boolean => {
      if (!isOffline || ALWAYS_LISTED.includes(key)) return true
      return areaId !== null && (packs.get(areaId)?.has(key) ?? false)
    },
    [isOffline, areaId, packs],
  )

  return useMemo(() => ({ isAvailable, areaAtCenter: areaId !== null }), [isAvailable, areaId])
}
