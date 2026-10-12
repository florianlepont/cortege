import { memo, useMemo, type RefObject } from "react"
import {
  Camera,
  Map as MapLibreMap,
  UserLocation,
  type CameraRef,
  type ViewStateChangeEvent,
} from "@maplibre/maplibre-react-native"
import type { NativeSyntheticEvent } from "react-native"
import type { MapCoordinate, MapRegion } from "../../app/map-viewport"
import type { PublicMapItem, PublicParcelStatusItem } from "../../app/types"
import type { BaseLayerKey } from "../../map/layers"
import { markerItemsAtParcelZoom } from "../../map/maplibre/parcel-coverage"
import type { ParcelsMode } from "../../map/parcels-visibility"
import { PlacePinLayer } from "../../map/maplibre/PlacePinLayer"
import { boundsFromRegion, regionFromViewChange } from "../../map/maplibre/regions"
import { useMapStyle } from "../../hooks/useMapStyle"
import { useLatestCallback } from "../../state/useLatestCallback"
import { ClusterMarker } from "./ClusterMarker"
import { MapContentLayers, shownParcelsFor } from "./MapContentLayers"
import { screenStyles } from "./styles"
import { SurveyMarker } from "./SurveyMarker"
import { useMapClusters } from "./useMapClusters"
import { DEFAULT_MAP_REGION, regionForZoom } from "./useMapViewport"

// A frozen map (Phase 28 swipe mode) hands nothing to a marker, cluster or parcel press.
const NOOP = () => undefined

/** The props the swipe mode and the comparison drive on the Explorer map (`useExplorerSwipe`). */
export type SwipeCanvasKey =
  | "frozen"
  | "onViewChange"
  | "rotationLocked"
  | "hideMarkers"
  | "androidView"
  | "onRenderedFully"
  | "onViewSettled"
  | "bare"

export type MapCanvasProps = {
  cameraRef: RefObject<CameraRef | null>
  items: PublicMapItem[]
  /** OA-59: the ids of `items` that are the author's own drafts (drawn dashed). */
  draftIds?: ReadonlySet<string>
  region: MapRegion
  selectedId: string | null
  parcelStatuses: PublicParcelStatusItem[]
  /** From zoom 15: the cadastre, the scored parcels replacing the markers. */
  parcelLayerRenderable: boolean
  /** From zoom 12: the studied parcels alone, filled by score, under the markers. */
  studiedParcelsRenderable: boolean
  onRegionChangeComplete: (region: MapRegion, details?: { isGesture: boolean }) => void
  onSelectSurvey: (id: string) => void
  onSelectParcel: (parcelId: string) => void
  onZoomTo: (region: MapRegion) => void
  onOpenClusterList: (items: PublicMapItem[]) => void
  /** REQ-D-basemap-switch (08-CONTEXT D-01), widened to the five bases of Phase 28. */
  basemap?: BaseLayerKey
  /** Phase 28: the forest types overlay, drawn over the base and under the cadastre and parcels. */
  forestOverlay?: boolean
  /** Phase 28 Parcelles state: cadastre lines and parcel polygons (default "all", as before). */
  parcelsMode?: ParcelsMode
  /** The parcels of the author's own surveys (trimmed, upper case): "Avec IBP" keeps them. */
  surveyParcelIds?: ReadonlySet<string>
  /** Bumped by a "Réessayer": the style is asked again (`useMapStyle`). */
  styleRetryKey?: number
  /** The style finished loading (a base, an offline file). */
  onStyleLoaded?: () => void
  /** The camera settled (`onRegionDidChange`): the stacked maps align to it before they show. */
  onViewSettled?: (event: NativeSyntheticEvent<ViewStateChangeEvent>) => void
  /** The map finished rendering what it shows (`onDidFinishRenderingMapFully`). */
  onRenderedFully?: () => void
  /** The basemap change mode: bare basemaps, with no forest types, cadastre or parcels. */
  bare?: boolean
  /** The style failed to load (offline without a pack, a refused tile server). */
  onStyleFailed?: () => void
  /** The parcels of the survey shown from its page, drawn highlighted (OA-116). */
  highlightedParcelIds?: string[]
  /** D-05: the place a search result centred the map on, drawn as one static pin. */
  placePin?: { lat: number; lng: number } | null
  /** Where the camera starts (a survey to show, OA-59); France by default. */
  initialRegion?: MapRegion
  /** Bumped after an offline download or delete so the style choice is re-checked. */
  styleRefreshKey?: number
  /**
   * Phase 28 swipe mode: the map takes no pan, zoom, rotation, pitch or double tap, and markers,
   * clusters and parcels take no press. Off by default.
   */
  frozen?: boolean
  /**
   * Phase 28: told the view while the camera moves and again when it settles, so the stacked maps
   * of a wipe or a comparison follow this one (`useMapSync`).
   */
  onViewChange?: (event: NativeSyntheticEvent<ViewStateChangeEvent>) => void
  /** Phase 28 comparison: north up and flat, so only the centre and zoom are synchronised. */
  rotationLocked?: boolean
  /** Phase 28 comparison: no cluster or survey marker (a marker belongs to one map only). */
  hideMarkers?: boolean
  /** Android only: `texture` lets a parent clip the map; the default is the faster surface. */
  androidView?: "surface" | "texture"
}

/**
 * The map itself (D-05): the clusters of the current region, memoised markers
 * whose presses report ids, the cadastre overlay and the device position.
 * A cluster press zooms to where it splits, or lists its surveys when it
 * cannot split (Pitfall 7).
 */
export const MapCanvas = memo(function MapCanvas({
  cameraRef,
  items,
  draftIds,
  region,
  selectedId,
  parcelStatuses,
  parcelLayerRenderable,
  studiedParcelsRenderable,
  onRegionChangeComplete,
  onSelectSurvey,
  onSelectParcel,
  onZoomTo,
  onOpenClusterList,
  basemap = "map",
  forestOverlay = false,
  parcelsMode = "all",
  surveyParcelIds,
  styleRetryKey = 0,
  onStyleLoaded,
  onRenderedFully,
  onViewSettled,
  bare,
  onStyleFailed,
  initialRegion = DEFAULT_MAP_REGION,
  highlightedParcelIds,
  placePin,
  styleRefreshKey = 0,
  frozen = false,
  onViewChange,
  rotationLocked = false,
  hideMarkers = false,
  androidView,
}: MapCanvasProps) {
  const { mapStyle, cadastreInStyle, cadastreOpacity } = useMapStyle(
    basemap,
    styleRefreshKey,
    styleRetryKey,
  )
  // From zoom 15 the parcels, filled by score, replace the markers (OA-126), except the author's
  // own drafts and any survey no scored parcel shows yet: its score never vanishes (12.2-19).
  const markerItems = useMemo(
    () =>
      parcelLayerRenderable ? markerItemsAtParcelZoom(items, parcelStatuses, draftIds) : items,
    [draftIds, items, parcelLayerRenderable, parcelStatuses],
  )
  // Between zoom 12 and 15 only the studied parcels are drawn, from 15 every parcel of the view.
  const shownParcels = useMemo(
    () => shownParcelsFor(parcelStatuses, parcelLayerRenderable, studiedParcelsRenderable),
    [parcelLayerRenderable, parcelStatuses, studiedParcelsRenderable],
  )
  const { clusters, resolveClusterPress } = useMapClusters({ items: markerItems, region })

  const clusterCenters = useMemo(() => {
    const centers = new Map<number, MapCoordinate>()
    for (const entry of clusters) {
      if (entry.kind === "cluster") {
        centers.set(entry.clusterId, { latitude: entry.latitude, longitude: entry.longitude })
      }
    }
    return centers
  }, [clusters])

  const handleClusterPress = useLatestCallback((clusterId: number) => {
    const target = resolveClusterPress(clusterId)
    if (target.kind === "leaves") {
      onOpenClusterList(target.items)
      return
    }
    const center = clusterCenters.get(clusterId)
    if (center) {
      onZoomTo(regionForZoom(center, target.zoom, region))
    }
  })

  const handleRegionDidChange = useLatestCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, bounds, userInteraction } = event.nativeEvent
      onRegionChangeComplete(regionFromViewChange({ center, bounds }), {
        isGesture: userInteraction,
      })
      onViewChange?.(event)
      onViewSettled?.(event)
    },
  )

  return (
    <MapLibreMap
      style={screenStyles.map}
      mapStyle={mapStyle}
      attribution={false}
      logo={false}
      androidView={androidView}
      dragPan={frozen ? false : undefined}
      touchZoom={frozen ? false : undefined}
      doubleTapZoom={frozen ? false : undefined}
      touchRotate={frozen || rotationLocked ? false : undefined}
      touchPitch={frozen || rotationLocked ? false : undefined}
      onRegionIsChanging={onViewChange}
      onRegionDidChange={handleRegionDidChange}
      onDidFinishLoadingStyle={onStyleLoaded}
      onDidFinishRenderingMapFully={onRenderedFully}
      onDidFailLoadingMap={onStyleFailed}
    >
      <Camera ref={cameraRef} initialViewState={{ bounds: boundsFromRegion(initialRegion) }} />
      <MapContentLayers
        base={basemap}
        forestOverlay={forestOverlay}
        parcelsMode={parcelsMode}
        cadastreEnabled={parcelLayerRenderable}
        cadastreInStyle={cadastreInStyle}
        cadastreOpacity={cadastreOpacity}
        parcels={shownParcels}
        selectedParcelIds={highlightedParcelIds}
        surveyParcelIds={surveyParcelIds}
        interactive={!frozen}
        onParcelPress={onSelectParcel}
        bare={bare}
      />
      {/* MAP-04: the device's own position is the native halo, not a marker kept by the app. It is
          added after the content so it draws over the cadastre lines and the parcels. */}
      <UserLocation key="user-location" />
      <PlacePinLayer pin={placePin ?? null} />
      {(hideMarkers || parcelsMode === "none" ? [] : clusters).map((entry) => {
        if (entry.kind === "cluster") {
          return (
            <ClusterMarker
              // The count is part of the key: the custom view is not redrawn (tracksViewChanges false).
              key={`${entry.key}-${entry.count}`}
              clusterId={entry.clusterId}
              coordinate={{ latitude: entry.latitude, longitude: entry.longitude }}
              count={entry.count}
              onPress={frozen ? NOOP : handleClusterPress}
            />
          )
        }
        const selected = entry.item.survey_id === selectedId
        const draft = draftIds?.has(entry.item.survey_id) ?? false
        return (
          <SurveyMarker
            // `selected` is part of the key too (tracksViewChanges false, MAP-03): a selection
            // change remounts the marker instead of re-tracking its view every frame.
            key={`${entry.key}-${selected}-${draft}`}
            id={entry.item.survey_id}
            coordinate={{ latitude: entry.latitude, longitude: entry.longitude }}
            ibpTotal={entry.item.ibp_total}
            selected={selected}
            draft={draft}
            onSelect={frozen ? NOOP : onSelectSurvey}
          />
        )
      })}
    </MapLibreMap>
  )
})
