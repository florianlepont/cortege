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
import type { BasemapKey } from "../../map/basemaps"
import { CadastreLayer } from "../../map/maplibre/CadastreLayer"
import { ParcelPolygonsLayer } from "../../map/maplibre/ParcelPolygonsLayer"
import { boundsFromRegion, regionFromViewChange } from "../../map/maplibre/regions"
import { useMapStyle } from "../../hooks/useMapStyle"
import { useLatestCallback } from "../../state/useLatestCallback"
import { ClusterMarker } from "./ClusterMarker"
import { screenStyles } from "./styles"
import { SurveyMarker } from "./SurveyMarker"
import { useMapClusters } from "./useMapClusters"
import { DEFAULT_MAP_REGION, regionForZoom } from "./useMapViewport"

const NO_PARCELS: PublicParcelStatusItem[] = []

export type MapCanvasProps = {
  cameraRef: RefObject<CameraRef | null>
  items: PublicMapItem[]
  /** OA-59: the ids of `items` that are the author's own drafts (drawn dashed). */
  draftIds?: ReadonlySet<string>
  region: MapRegion
  selectedId: string | null
  parcelStatuses: PublicParcelStatusItem[]
  parcelLayerRenderable: boolean
  onRegionChangeComplete: (region: MapRegion, details?: { isGesture: boolean }) => void
  onSelectSurvey: (id: string) => void
  onSelectParcel: (parcelId: string) => void
  onZoomTo: (region: MapRegion) => void
  onOpenClusterList: (items: PublicMapItem[]) => void
  /** REQ-D-basemap-switch (08-CONTEXT D-01). */
  basemap?: BasemapKey
  /** Bumped after an offline download or delete so the style choice is re-checked. */
  styleRefreshKey?: number
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
  onRegionChangeComplete,
  onSelectSurvey,
  onSelectParcel,
  onZoomTo,
  onOpenClusterList,
  basemap = "map",
  styleRefreshKey = 0,
}: MapCanvasProps) {
  const { mapStyle, cadastreInStyle } = useMapStyle(basemap, styleRefreshKey)
  const { clusters, resolveClusterPress } = useMapClusters({ items, region })

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
    },
  )

  return (
    <MapLibreMap
      style={screenStyles.map}
      mapStyle={mapStyle}
      attribution={false}
      logo={false}
      onRegionDidChange={handleRegionDidChange}
    >
      <Camera ref={cameraRef} initialViewState={{ bounds: boundsFromRegion(DEFAULT_MAP_REGION) }} />
      {/* MAP-04: the device's own position is the native halo, not a marker kept by the app. */}
      <UserLocation />
      <CadastreLayer enabled={parcelLayerRenderable && !cadastreInStyle} />
      <ParcelPolygonsLayer
        items={parcelLayerRenderable ? parcelStatuses : NO_PARCELS}
        onParcelPress={onSelectParcel}
      />
      {clusters.map((entry) => {
        if (entry.kind === "cluster") {
          return (
            <ClusterMarker
              // The count is part of the key: the custom view is not redrawn (tracksViewChanges false).
              key={`${entry.key}-${entry.count}`}
              clusterId={entry.clusterId}
              coordinate={{ latitude: entry.latitude, longitude: entry.longitude }}
              count={entry.count}
              onPress={handleClusterPress}
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
            onSelect={onSelectSurvey}
          />
        )
      })}
    </MapLibreMap>
  )
})
