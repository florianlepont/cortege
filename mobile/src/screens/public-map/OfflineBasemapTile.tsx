import { UrlTile } from "react-native-maps"
import { type BasemapKey, offlineTileUrlTemplate, remoteTileUrlTemplate } from "../../map/basemaps"
import { resolveOfflineAreaForPoint } from "../../map/tile-math"
import { MAX_TILE_ZOOM, MIN_TILE_ZOOM } from "../../map/tile-math"
import type { OfflineAreaSummary } from "../../storage/offline-map"
import { tryGetOfflineDocumentDirectory } from "../../storage/offline-map"

export type OfflineBasemapTileProps = {
  basemap: BasemapKey
  isOffline: boolean
  areas: OfflineAreaSummary[]
  centerLat: number
  centerLng: number
  zIndex?: number
}

/**
 * The app-owned raster basemap (08-CONTEXT D-01): the remote IGN tile layer online, or the most
 * recently downloaded ready area's local tiles offline (D-02). Renders nothing offline outside
 * any downloaded area — no promise of global offline coverage, only "the area you downloaded".
 */
export function OfflineBasemapTile({
  basemap,
  isOffline,
  areas,
  centerLat,
  centerLng,
  zIndex = -1,
}: OfflineBasemapTileProps) {
  if (!isOffline) {
    return (
      <UrlTile
        urlTemplate={remoteTileUrlTemplate(basemap)}
        minimumZ={MIN_TILE_ZOOM}
        maximumZ={MAX_TILE_ZOOM}
        tileSize={256}
        zIndex={zIndex}
        flipY={false}
      />
    )
  }

  const documentDirectory = tryGetOfflineDocumentDirectory()
  const area = documentDirectory ? resolveOfflineAreaForPoint(areas, centerLat, centerLng) : null
  if (!documentDirectory || !area) {
    return null
  }

  return (
    <UrlTile
      urlTemplate={offlineTileUrlTemplate(documentDirectory, area.id, basemap)}
      minimumZ={area.minZoom}
      maximumZ={area.maxZoom}
      tileSize={256}
      zIndex={zIndex}
      flipY={false}
    />
  )
}
