import { useMemo } from "react"
import { computeRegionZoom } from "../../app/map-viewport"
import type { MapRegion } from "../../app/map-viewport"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import type { BasemapKey } from "../../map/basemaps"
import { attributionLayerKeys } from "../../map/layer-notices"
import { LAYER_CATALOGUE } from "../../map/layers"
import type { MapLayerKey } from "../../map/layers"
import type { OfflineAreaSummary } from "../../storage/offline-map"
import { MAP_PILL_HEIGHT } from "./MapChips"
import { buildMapNotices } from "./map-notices"
import type { MapNotice } from "./map-notices"
import {
  CAPSULE_BUTTON_SIZE,
  MAP_BUTTON_GAP,
  downloadButtonTopOf,
  overlaySlotTopOf,
} from "./styles"
import { useLayerAvailability } from "./useLayerAvailability"
import type { LayerAvailability } from "./useLayerAvailability"
import { useMapLayersState } from "./useMapLayersState"
import type { MapLayers } from "./useMapLayersState"

const sources = fr.mapLayers.sources
const layerTexts = fr.mapLayers.layers

type Input = {
  savedBasemap: BasemapKey
  saveBasemap: (basemap: BasemapKey) => void
  region: MapRegion
  areas: readonly OfflineAreaSummary[]
  isOffline: boolean
  /** The parcels of the author's own surveys, handed back for the map and the stacked maps. */
  surveyParcelIds: ReadonlySet<string>
  downloadStatus: AreaDownloadStatus | null
  /** The download card is open (the chip is then not shown, the card says it). */
  cardOpen: boolean
  /** The overlay bubble is open (the chip is then not shown, the bubble covers its band). */
  bubbleOpen: boolean
  /** The capsule's top, from the top of the map. */
  capsuleTop: number
}

export type ExplorerLayers = LayerAvailability & {
  /** No network: the labels carry downloaded markers and the comparison cards appear. */
  isOffline: boolean
  layers: MapLayers
  surveyParcelIds: ReadonlySet<string>
  capsuleTop: number
  /**
   * The chip of the offline download is on screen: a status exists, the card and the bubble are
   * not open and the swipe mode is off. Derived here from the layers state, never from a later
   * hook.
   */
  chipShown: boolean
  notices: MapNotice[]
  /** The notices column's top: the capsule's top, or below the chip's row while a chip shows. */
  noticesTop: number
  /** The round download button's top: 8 pt under the capsule (UI-SPEC section 1). */
  downloadButtonTop: number
  /** The overlay bubble's top: level with the overlay button, the capsule's second button. */
  overlayBubbleTop: number
  /** The source lines of the legend, or null in the default display (the existing text stays). */
  legendLines: string[] | null
}

/**
 * Everything the Explorer derives from the layers state: availability at the view centre, the
 * chip's visibility, the notices column and its position, the download button's and the bubble's
 * positions and the legend's source lines. It never calls the swipe hook, so the render order has
 * no cycle.
 */
export function useExplorerLayers({
  savedBasemap,
  saveBasemap,
  region,
  areas,
  isOffline,
  surveyParcelIds,
  downloadStatus,
  cardOpen,
  bubbleOpen,
  capsuleTop,
}: Input): ExplorerLayers {
  const layers = useMapLayersState({ savedBasemap, saveBasemap })
  const center = useMemo(
    () => ({ lat: region.latitude, lng: region.longitude }),
    [region.latitude, region.longitude],
  )
  const availability = useLayerAvailability({ areas, region, isOffline })
  const { isAvailable } = availability
  const { state } = layers

  const mapZoom = computeRegionZoom(region)
  const comparing = state.compare !== null
  const failedLayer = state.failedLayer
  const notices = useMemo(
    () =>
      buildMapNotices({
        shownBases: layers.shownBases,
        overlay: state.overlay,
        mapZoom,
        center,
        isOffline,
        isAvailable,
        failedLayer,
      }),
    [layers.shownBases, state.overlay, mapZoom, center, isOffline, isAvailable, failedLayer],
  )

  const chipShown = downloadStatus !== null && !cardOpen && !bubbleOpen && !state.swipeMode
  // The chip is centred on the download button; the notices start under its row.
  const downloadButtonTop = downloadButtonTopOf(capsuleTop)
  const noticesTop = chipShown
    ? downloadButtonTop + CAPSULE_BUTTON_SIZE / 2 + MAP_PILL_HEIGHT / 2 + MAP_BUTTON_GAP
    : capsuleTop
  const overlayBubbleTop = overlaySlotTopOf(capsuleTop)

  const displayed = layers.displayedBase
  const second = comparing ? layers.layerOfSide("right") : null
  const left = comparing ? layers.layerOfSide("left") : displayed
  const overlay = state.overlay
  const parcels = state.parcels
  const legendLines = useMemo(() => {
    const keys = attributionLayerKeys({ left, right: second, overlay })
    if (keys === null) return null
    const lines: string[] = keys.map(
      (key: MapLayerKey) => layerTexts[LAYER_CATALOGUE[key].i18nKey].source,
    )
    if (parcels === "all") lines.push(layerTexts.cadastreSource)
    lines.push(sources.common)
    return lines
  }, [left, second, overlay, parcels])

  return {
    ...availability,
    isOffline,
    layers,
    surveyParcelIds,
    capsuleTop,
    chipShown,
    notices,
    noticesTop,
    downloadButtonTop,
    overlayBubbleTop,
    legendLines,
  }
}
