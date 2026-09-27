import { useCallback, useEffect, useState } from "react"
import type { BasemapKey } from "../map/basemaps"
import {
  DEFAULT_BASEMAP,
  loadBasemapPreference,
  saveBasemapPreference,
} from "../storage/map-preference"

/**
 * The Satellite/Map basemap choice (REQ-D-basemap-switch), persisted to local_meta so it survives
 * both navigation within the session and an app relaunch (08-CONTEXT D-15).
 */
export function useBasemapPreference(): {
  basemap: BasemapKey
  setBasemap: (basemap: BasemapKey) => void
} {
  const [basemap, setBasemapState] = useState<BasemapKey>(DEFAULT_BASEMAP)

  useEffect(() => {
    let mounted = true
    void loadBasemapPreference().then((stored) => {
      if (mounted) {
        setBasemapState(stored)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const setBasemap = useCallback((next: BasemapKey) => {
    setBasemapState(next)
    void saveBasemapPreference(next)
  }, [])

  return { basemap, setBasemap }
}
