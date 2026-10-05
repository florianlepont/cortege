import { useEffect, useState } from "react"
import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import type { BasemapKey } from "../map/basemaps"
import { mapStyleFor } from "../map/maplibre/styles"
import { offlineStyleExists, offlineStyleUri } from "../map/offline-styles"
import { listOfflineAreas, tryGetOfflineDocumentDirectory } from "../storage/offline-map"
import { useIsOffline } from "./useIsOffline"

export type MapStyleChoice = {
  mapStyle: string | StyleSpecification
  /** The offline style already carries the cadastre layer: the separate overlay must not be added. */
  cadastreInStyle: boolean
}

/**
 * The style a map shows. Online, the published remote style (and the separate cadastre overlay).
 * Offline with a downloaded area, the composite style file written with the packs: its sources
 * are served from the native offline cache. `refreshKey` re-checks after a download or a delete.
 */
export function useMapStyle(basemap: BasemapKey, refreshKey = 0): MapStyleChoice {
  const offline = useIsOffline()
  const [offlineUri, setOfflineUri] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const documentDirectory = tryGetOfflineDocumentDirectory()
    if (!isOfflineMapsEnabled() || !offline || documentDirectory === null) {
      setOfflineUri(null)
      return undefined
    }
    void (async () => {
      const ready = (await listOfflineAreas()).some((area) => area.status === "ready")
      const usable = ready && (await offlineStyleExists(documentDirectory, basemap))
      if (active) setOfflineUri(usable ? offlineStyleUri(documentDirectory, basemap) : null)
    })()
    return () => {
      active = false
    }
  }, [basemap, offline, refreshKey])

  return offlineUri
    ? { mapStyle: offlineUri, cadastreInStyle: true }
    : { mapStyle: mapStyleFor(basemap), cadastreInStyle: false }
}
