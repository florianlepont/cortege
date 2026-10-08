import { useEffect, useState } from "react"
import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import { useBrandTheme } from "../app/theme"
import type { BasemapKey } from "../map/basemaps"
import { fetchDarkPlanIgnStyle } from "../map/maplibre/plan-ign-style"
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
 * The style a map shows. Online, the published remote style (and the separate cadastre overlay); in
 * the dark theme the plan basemap is the recoloured style (the published one shows until it is
 * ready). Offline with a downloaded area, the composite style file written with the packs (its dark
 * variant in the dark theme): its sources are served from the native offline cache. `refreshKey`
 * re-checks after a download or a delete.
 */
export function useMapStyle(basemap: BasemapKey, refreshKey = 0): MapStyleChoice {
  const offline = useIsOffline()
  const dark = useBrandTheme().scheme === "dark" && basemap === "map"
  const [offlineUri, setOfflineUri] = useState<string | null>(null)
  const [darkStyle, setDarkStyle] = useState<StyleSpecification | null>(null)

  useEffect(() => {
    if (!dark || offline) return undefined
    let active = true
    fetchDarkPlanIgnStyle()
      .then((style) => {
        if (active) setDarkStyle(style)
      })
      .catch(() => {
        // The published (light) style stays: a failed recolouring never blanks the map.
      })
    return () => {
      active = false
    }
  }, [dark, offline])

  useEffect(() => {
    let active = true
    const documentDirectory = tryGetOfflineDocumentDirectory()
    if (!isOfflineMapsEnabled() || !offline || documentDirectory === null) {
      setOfflineUri(null)
      return undefined
    }
    void (async () => {
      const ready = (await listOfflineAreas()).some((area) => area.status === "ready")
      let useDark = dark
      if (useDark && !(await offlineStyleExists(documentDirectory, basemap, true))) {
        // A pack downloaded before the dark variant existed: the light style keeps working.
        useDark = false
      }
      const usable = ready && (await offlineStyleExists(documentDirectory, basemap, useDark))
      if (active) {
        setOfflineUri(usable ? offlineStyleUri(documentDirectory, basemap, useDark) : null)
      }
    })()
    return () => {
      active = false
    }
  }, [basemap, dark, offline, refreshKey])

  if (offlineUri) return { mapStyle: offlineUri, cadastreInStyle: true }
  if (dark && darkStyle) return { mapStyle: darkStyle, cadastreInStyle: false }
  return { mapStyle: mapStyleFor(basemap), cadastreInStyle: false }
}
