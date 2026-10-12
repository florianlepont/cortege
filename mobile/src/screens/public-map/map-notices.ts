// The notices column of the Explorer (Phase 28, UI-SPEC section 8): what to say about the layers
// shown, in the order from the top. Pure: the screen passes what it knows, this builds the list.
import { fr } from "../../i18n"
import { LAYER_CATALOGUE } from "../../map/layers"
import type { BaseLayerKey, MapLayerKey } from "../../map/layers"
import { isOutsideCoverage, overzoomNotice } from "../../map/layer-notices"

/** The kinds double as the test ids (`map-notice-<kind>`). */
export type MapNoticeKind = "outside" | "offline" | "error" | "overzoom"

export type MapNotice = {
  /** Stable per kind and layer, so a notice is announced once while it stays. */
  id: string
  kind: MapNoticeKind
  text: string
  icon: "alert-circle-outline" | "cloud-offline-outline" | "information-circle-outline"
  danger?: boolean
  retry?: boolean
}

export type MapNoticeInput = {
  /** The bases on screen: one, or two in a comparison. */
  shownBases: readonly BaseLayerKey[]
  overlay: boolean
  mapZoom: number
  center: { lat: number; lng: number }
  isOffline: boolean
  isAvailable: (key: MapLayerKey) => boolean
  /** The layer whose tiles failed to load online, if any. */
  failedLayer: MapLayerKey | null
}

const layerName = (key: MapLayerKey): string =>
  fr.mapLayers.layers[LAYER_CATALOGUE[key].i18nKey].name

export function buildMapNotices(input: MapNoticeInput): MapNotice[] {
  const { shownBases, overlay, mapZoom, center, isOffline, isAvailable, failedLayer } = input
  const shown: MapLayerKey[] = [...new Set<MapLayerKey>(shownBases)]
  if (overlay) {
    shown.push("types-foret")
  }
  const notices: MapNotice[] = []

  for (const key of shown) {
    if (isOutsideCoverage(key, center)) {
      notices.push({
        id: `outside-${key}`,
        kind: "outside",
        text: fr.mapLayers.notice.outside(layerName(key)),
        icon: "alert-circle-outline",
      })
    }
  }
  // Offline, a layer that is not downloaded for this view says so on its label; the column keeps
  // a single pill for the whole view.
  if (isOffline && shown.some((key) => !isAvailable(key))) {
    notices.push({
      id: "offline",
      kind: "offline",
      text: fr.mapLayers.notice.offlineHere,
      icon: "cloud-offline-outline",
    })
  }
  if (failedLayer !== null) {
    notices.push({
      id: `error-${failedLayer}`,
      kind: "error",
      text: fr.mapLayers.notice.loadError(layerName(failedLayer)),
      icon: "alert-circle-outline",
      danger: true,
      retry: true,
    })
  }
  const overzoom = overzoomNotice({ bases: shownBases, overlay }, mapZoom, isOffline)
  if (overzoom !== null) {
    notices.push({
      id: "overzoom",
      kind: "overzoom",
      text:
        overzoom === "base"
          ? fr.mapLayers.notice.overzoomBase
          : fr.mapLayers.notice.overzoomOverlay,
      icon: "information-circle-outline",
    })
  }
  return notices
}
