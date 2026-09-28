import { memo, useMemo, type RefObject } from "react"
import MapView, { type Details, type LatLng, type Region } from "react-native-maps"
import type { PublicMapItem, PublicParcelStatusItem } from "../../app/types"
import { IgnCadastreTileOverlay } from "../../components/IgnCadastreTileOverlay"
import { ParcelOverlayPolygons } from "../../components/ParcelOverlayPolygons"
import type { BasemapKey } from "../../map/basemaps"
import type { OfflineAreaSummary } from "../../storage/offline-map"
import { useLatestCallback } from "../../state/useLatestCallback"
import { ClusterMarker } from "./ClusterMarker"
import { OfflineBasemapTile } from "./OfflineBasemapTile"
import { screenStyles } from "./styles"
import { SurveyMarker } from "./SurveyMarker"
import { useMapClusters } from "./useMapClusters"
import { DEFAULT_MAP_REGION, regionForZoom } from "./useMapViewport"

const NO_PARCELS: PublicParcelStatusItem[] = []
const NO_OFFLINE_AREAS: OfflineAreaSummary[] = []

export type MapCanvasProps = {
  mapRef: RefObject<MapView | null>
  items: PublicMapItem[]
  region: Region
  selectedId: string | null
  parcelStatuses: PublicParcelStatusItem[]
  parcelLayerRenderable: boolean
  onRegionChangeComplete: (region: Region, details?: Details) => void
  onSelectSurvey: (id: string) => void
  onSelectParcel: (parcelId: string) => void
  onZoomTo: (region: Region) => void
  onOpenClusterList: (items: PublicMapItem[]) => void
  /** REQ-D-basemap-switch / REQ-D-offline-map (08-CONTEXT D-01/D-02). */
  basemap?: BasemapKey
  isOffline?: boolean
  offlineAreas?: OfflineAreaSummary[]
}

/**
 * The map itself (D-05): the clusters of the current region, memoised markers
 * whose presses report ids, the cadastre overlay and the device position.
 * A cluster press zooms to where it splits, or lists its surveys when it
 * cannot split (Pitfall 7).
 */
export const MapCanvas = memo(function MapCanvas({
  mapRef,
  items,
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
  isOffline = false,
  offlineAreas = NO_OFFLINE_AREAS,
}: MapCanvasProps) {
  const { clusters, resolveClusterPress } = useMapClusters({ items, region })

  const clusterCenters = useMemo(() => {
    const centers = new Map<number, LatLng>()
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

  return (
    <MapView
      ref={mapRef}
      style={screenStyles.map}
      initialRegion={DEFAULT_MAP_REGION}
      onRegionChangeComplete={onRegionChangeComplete}
      // MAP-04: the device's own position is the native halo (accuracy ring included), not a
      // custom Marker maintained by the app.
      showsUserLocation
      showsMyLocationButton={false}
    >
      <OfflineBasemapTile
        basemap={basemap}
        isOffline={isOffline}
        areas={offlineAreas}
        centerLat={region.latitude}
        centerLng={region.longitude}
        zIndex={-1}
      />
      <IgnCadastreTileOverlay enabled={parcelLayerRenderable} zIndex={0} />
      <ParcelOverlayPolygons
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
        return (
          <SurveyMarker
            // `selected` is part of the key too (tracksViewChanges false, MAP-03): a selection
            // change remounts the marker instead of re-tracking its view every frame.
            key={`${entry.key}-${selected}`}
            id={entry.item.survey_id}
            coordinate={{ latitude: entry.latitude, longitude: entry.longitude }}
            ibpTotal={entry.item.ibp_total}
            selected={selected}
            onSelect={onSelectSurvey}
          />
        )
      })}
    </MapView>
  )
})
