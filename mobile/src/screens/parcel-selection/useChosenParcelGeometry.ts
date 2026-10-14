import { useCallback, useMemo, useRef } from "react"
import type { PublicParcelStatusItem } from "../../app/types"

// Phase 30, device check RC-01: the surface estimate of the route step was missing the first time a
// parcel was chosen. The selection is made on the map tiles while the geometry comes from the
// list read for the visible region (debounced, replaced on every pan, emptied when a read fails),
// so at "Continuer" the chosen parcel could be missing from the list: not loaded yet, or dropped by
// a newer read. Two measures, neither of which blocks offline: the geometry of every parcel seen is
// remembered for the life of the screen, and "Continuer" waits a short, bounded time for the chosen
// parcels only while a read for the region is still pending.

/** The longest "Continuer" waits for the geometry of the chosen parcels. */
export const GEOMETRY_WAIT_MS = 2000
const POLL_MS = 100
/** The geometry of this many parcels at most is remembered (a few screens of the map). */
const MEMORY_LIMIT = 600

const key = (parcelId: string): string => parcelId.trim().toUpperCase()

/** The chosen ids with no geometry in the list (ids compared without regard to case). */
export function parcelIdsWithoutGeometry(
  items: readonly PublicParcelStatusItem[],
  parcelIds: readonly string[],
): string[] {
  const known = new Set(
    items
      .filter((item) => item.geometry && Array.isArray(item.geometry.coordinates))
      .map((item) => key(item.parcel_id)),
  )
  return parcelIds.filter((id) => !known.has(key(id)))
}

/**
 * Remembers the geometry of the parcels the list showed (the newest read wins) and answers
 * `waitForGeometry`: the parcels, remembered ones included, once every chosen parcel has geometry,
 * or when the pending read is over, or after `GEOMETRY_WAIT_MS`, whichever comes first. With no
 * read pending (offline, signed out, read failed) it answers at once.
 */
export function useChosenParcelGeometry(input: {
  items: PublicParcelStatusItem[]
  /** No read is pending for the current region (see `useParcelStatuses`). */
  settled: boolean
  selectedParcelIds: string[]
}): { items: PublicParcelStatusItem[]; waitForGeometry: () => Promise<PublicParcelStatusItem[]> } {
  const { items: listed, settled, selectedParcelIds } = input
  const memory = useRef(new Map<string, PublicParcelStatusItem>())

  const items = useMemo(() => {
    const remembered = memory.current
    for (const item of listed) {
      if (!item.geometry) continue
      const id = key(item.parcel_id)
      remembered.delete(id)
      remembered.set(id, item)
    }
    while (remembered.size > MEMORY_LIMIT) {
      const oldest = remembered.keys().next().value
      if (oldest === undefined) break
      remembered.delete(oldest)
    }
    const listedIds = new Set(listed.map((item) => key(item.parcel_id)))
    return [...listed, ...[...remembered].filter(([id]) => !listedIds.has(id)).map(([, v]) => v)]
  }, [listed])

  const latest = useRef({ items, settled, selectedParcelIds })
  latest.current = { items, settled, selectedParcelIds }

  const waitForGeometry = useCallback(async () => {
    const startedAt = Date.now()
    for (;;) {
      const { items: current, settled: done, selectedParcelIds: ids } = latest.current
      const complete = parcelIdsWithoutGeometry(current, ids).length === 0
      if (complete || done || Date.now() - startedAt >= GEOMETRY_WAIT_MS) return current
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_MS))
    }
  }, [])

  return { items, waitForGeometry }
}
