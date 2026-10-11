import { useEffect, useMemo, useState } from "react"
import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { isOfflineMapsEnabled } from "../app/feature-flags"
import { useBrandTheme } from "../app/theme"
import { baseLayerBrightnessMax, rasterStyleFor } from "../map/layer-styles"
import { LAYER_CATALOGUE } from "../map/layers"
import type { BaseLayerKey, RasterLayerKey } from "../map/layers"
import { fetchDarkPlanIgnStyle } from "../map/maplibre/plan-ign-style"
import { ORTHO_STYLE, PLAN_IGN_STYLE_URL } from "../map/maplibre/styles"
import {
  offlineDisplayStyleExists,
  offlineDisplayStyleUri,
  offlineStyleExists,
  offlineStyleUri,
} from "../map/offline-styles"
import { listOfflineAreas, tryGetOfflineDocumentDirectory } from "../storage/offline-map"
import { useIsOffline } from "./useIsOffline"

export type MapStyleChoice = {
  mapStyle: string | StyleSpecification
  /**
   * The style already carries the cadastre layer (only a Plan pack file written before Phase 28):
   * the separate child layer must not be added.
   */
  cadastreInStyle: boolean
  /** Opacity of the cadastre lines over this base: 0.9, and 0.7 on the two old maps. */
  cadastreOpacity: number
}

type OfflinePlan = { uri: string; cadastreInStyle: boolean }

/** What the offline storage allows: a ready area, and for the Plan the style file to display. */
type OfflineState = { ready: boolean; plan: OfflinePlan | null }

const NO_OFFLINE: OfflineState = { ready: false, plan: null }

/**
 * The Plan style file to display offline, newest format first: the display file without the
 * cadastre (the child layer draws it, 28-07), then the pack files written before Phase 28 (which
 * carry the cadastre), the dark one first in the dark scheme.
 */
async function offlinePlanStyle(directory: string, dark: boolean): Promise<OfflinePlan | null> {
  if (await offlineDisplayStyleExists(directory, dark)) {
    return { uri: offlineDisplayStyleUri(directory, dark), cadastreInStyle: false }
  }
  if (dark && (await offlineStyleExists(directory, "map", true))) {
    return { uri: offlineStyleUri(directory, "map", true), cadastreInStyle: true }
  }
  if (await offlineStyleExists(directory, "map")) {
    return { uri: offlineStyleUri(directory, "map"), cadastreInStyle: true }
  }
  return null
}

/**
 * The style a map shows, for any base of the cycle. Online: the Plan's published remote style (the
 * recoloured one in the dark scheme, the published one shows until it is ready) or the inline
 * raster style of the other four bases (the two old maps dimmed in dark). Offline with a ready
 * area: the Plan's display file (dark variant in dark), or the raster style built inline with its
 * lower offline zoom cap, whose tiles the native cache serves by URL. The cadastre is never part of
 * a displayed style: it is a child layer (`CadastreLayer`) on every map, offline too. `refreshKey`
 * re-checks after a download or a delete; `retryKey` forces a new style load (a static file only
 * reloads when its URL changes, a raster style when its object does).
 */
export function useMapStyle(layer: BaseLayerKey, refreshKey = 0, retryKey = 0): MapStyleChoice {
  const offline = useIsOffline()
  const theme = useBrandTheme()
  const isPlan = layer === "map"
  const dark = theme.scheme === "dark" && isPlan
  const brightnessMax = baseLayerBrightnessMax(layer, theme.visual.mapRaster.dimBrightnessMax)
  const [offlineState, setOfflineState] = useState<OfflineState>(NO_OFFLINE)
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
  }, [dark, offline, retryKey])

  useEffect(() => {
    let active = true
    const documentDirectory = tryGetOfflineDocumentDirectory()
    if (!isOfflineMapsEnabled() || !offline || documentDirectory === null) {
      setOfflineState(NO_OFFLINE)
      return undefined
    }
    void (async () => {
      const ready = (await listOfflineAreas()).some((area) => area.status === "ready")
      const plan = ready && isPlan ? await offlinePlanStyle(documentDirectory, dark) : null
      if (active) setOfflineState({ ready, plan })
    })()
    return () => {
      active = false
    }
  }, [dark, isPlan, offline, refreshKey])

  // Offline with a ready area the raster is built with the offline zoom caps.
  const offlineRaster = offline && offlineState.ready
  const rasterStyle = useMemo(
    () => {
      if (isPlan) return null
      // The published orthophoto style, as the parcel picker has always held it (one constant).
      if (layer === "satellite" && !offlineRaster && retryKey === 0) return ORTHO_STYLE
      return rasterStyleFor(layer as RasterLayerKey, { offline: offlineRaster, brightnessMax })
    },
    // `retryKey` makes a new object on purpose: MapLibre reloads a style when the object changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layer, isPlan, offlineRaster, brightnessMax, retryKey],
  )

  const cadastreOpacity = LAYER_CATALOGUE[layer].cadastreOpacity
  if (rasterStyle) return { mapStyle: rasterStyle, cadastreInStyle: false, cadastreOpacity }
  if (offline && offlineState.plan) {
    return {
      mapStyle: offlineState.plan.uri,
      cadastreInStyle: offlineState.plan.cadastreInStyle,
      cadastreOpacity,
    }
  }
  if (dark && darkStyle) return { mapStyle: darkStyle, cadastreInStyle: false, cadastreOpacity }
  return {
    mapStyle: retryKey > 0 ? `${PLAN_IGN_STYLE_URL}?retry=${retryKey}` : PLAN_IGN_STYLE_URL,
    cadastreInStyle: false,
    cadastreOpacity,
  }
}
