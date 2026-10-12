import { useMemo } from "react"
import { computeRegionZoom } from "../../app/map-viewport"
import type { MapRegion } from "../../app/map-viewport"
import type { AreaDownloadStatus } from "../../hooks/useOfflineAreas"
import { fr } from "../../i18n"
import type { BasemapKey } from "../../map/basemaps"
import { skippedCount } from "../../map/layer-cycle"
import { attributionLayerKeys } from "../../map/layer-notices"
import { LAYER_CATALOGUE } from "../../map/layers"
import type { MapLayerKey } from "../../map/layers"
import type { OfflineAreaSummary } from "../../storage/offline-map"
import { MAP_PILL_HEIGHT } from "./MapChips"
import { buildMapNotices } from "./map-notices"
import type { MapNotice } from "./map-notices"
import { capsuleButtonCenterY, capsuleHeight } from "./styles"
import { useLayerAvailability } from "./useLayerAvailability"
import type { LayerAvailability } from "./useLayerAvailability"
import { useMapLayersState } from "./useMapLayersState"
import type { MapLayers } from "./useMapLayersState"

const sources = fr.mapLayers.sources
const layerTexts = fr.mapLayers.layers

/** Gap between the capsule and the overlay button (UI-SPEC section 2), and under the chip's row. */
const BELOW_GAP = 8
/** The download button's index in the capsule (the globe is 0). */
const DOWNLOAD_BUTTON_INDEX = 1

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
  /** The capsule's top, from the top of the map. */
  capsuleTop: number
  /** How many buttons the capsule has (the download button needs offline maps). */
  capsuleButtons: number
  /** The swipe mode is on: the cycle's skipped layers get their notice. */
  showSkipped: boolean
}

export type ExplorerLayers = LayerAvailability & {
  layers: MapLayers
  surveyParcelIds: ReadonlySet<string>
  capsuleTop: number
  /** Layers with no pack at the view centre that the swipe cycle skips. */
  skipped: number
  /**
   * The chip of the offline download is on screen: a status exists, the card is not open and the
   * swipe mode is off. Derived here from the layers state, never from a later hook.
   */
  chipShown: boolean
  notices: MapNotice[]
  /** The notices column's top: the capsule's top, or below the chip's row while a chip shows. */
  noticesTop: number
  /** The overlay button's top: under the capsule. */
  overlayButtonTop: number
  /** The source lines of the legend, or null in the default display (the existing text stays). */
  legendLines: string[] | null
}

/**
 * Everything the Explorer derives from the layers state: availability at the view centre, the
 * chip's visibility, the notices column and its position, the overlay button's position and the
 * legend's source lines. It never calls the swipe hook (`showSkipped` is its
 * input), so the render order has no cycle.
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
  capsuleTop,
  capsuleButtons,
  showSkipped,
}: Input): ExplorerLayers {
  const layers = useMapLayersState({ savedBasemap, saveBasemap })
  const center = useMemo(
    () => ({ lat: region.latitude, lng: region.longitude }),
    [region.latitude, region.longitude],
  )
  const availability = useLayerAvailability({ areas, center, isOffline })
  const { isAvailable } = availability
  const { state } = layers

  const skipped = showSkipped ? skippedCount(isAvailable) : 0
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
        skippedCount: skipped,
      }),
    [
      layers.shownBases,
      state.overlay,
      mapZoom,
      center,
      isOffline,
      isAvailable,
      failedLayer,
      skipped,
    ],
  )

  const chipShown = downloadStatus !== null && !cardOpen && !state.swipeMode
  const noticesTop = chipShown
    ? capsuleButtonCenterY(capsuleTop, DOWNLOAD_BUTTON_INDEX) + MAP_PILL_HEIGHT / 2 + BELOW_GAP
    : capsuleTop
  const overlayButtonTop = capsuleTop + capsuleHeight(capsuleButtons) + BELOW_GAP

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
    layers,
    surveyParcelIds,
    capsuleTop,
    skipped,
    chipShown,
    notices,
    noticesTop,
    overlayButtonTop,
    legendLines,
  }
}
