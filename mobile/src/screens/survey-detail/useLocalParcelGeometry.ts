import { useEffect, useState } from "react"
import { parcelBoundsFrom } from "../../app/parcel-frame"
import type { LngLatBounds } from "../../app/survey-pdf/map-projection"
import type { PublicParcelStatusItem } from "../../app/types"
import { getCachedParcelById } from "../../storage/offline-map"
import { loadWeatherPoint } from "../../storage/weather"

/** What the phone itself knows of where a survey's parcels are (D-36). */
export type LocalParcelGeometry = {
  /** The centre point kept when the parcels were chosen (`weather_point:<id>`), null if none. */
  point: { lat: number; lng: number } | null
  /** The bounding box of the parcels found in the downloaded areas, null if none is cached. */
  bounds: LngLatBounds | null
}

const NONE: LocalParcelGeometry = { point: null, bounds: null }

/**
 * Reads, once per survey and set of parcels, the two local sources of a draft's position: the
 * point stored by the parcel selection and the cached geometry of the downloaded areas. A draft
 * that never synced has no server `display_location`, so these are what frames its map. A failed
 * read counts as nothing known.
 */
export function useLocalParcelGeometry(
  surveyId: string | undefined,
  parcelIds: readonly string[],
  /**
   * Read again when it changes. The point is written just after the parcel choice, possibly after
   * the page first read it: the survey row's `updated_at` moves when the weather lookup lands.
   */
  refreshKey?: string,
): LocalParcelGeometry {
  const [geometry, setGeometry] = useState<LocalParcelGeometry>(NONE)
  const idsKey = parcelIds.join("|")

  useEffect(() => {
    if (!surveyId || parcelIds.length === 0) {
      setGeometry(NONE)
      return undefined
    }
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const [point, cached] = await Promise.all([
          loadWeatherPoint(surveyId),
          Promise.all(parcelIds.map((id) => getCachedParcelById<PublicParcelStatusItem>(id))),
        ])
        if (cancelled) return
        const items = cached.filter((item): item is PublicParcelStatusItem => item !== null)
        setGeometry({ point, bounds: parcelBoundsFrom(items, [...parcelIds]) })
      } catch (_error) {
        if (!cancelled) setGeometry(NONE)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
    // The ids are compared by value through `idsKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, idsKey, refreshKey])

  return geometry
}
