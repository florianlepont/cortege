import type { TileCoordinate } from "./tile-math"

export type BasemapKey = "map" | "satellite"

export const BASEMAP_KEYS: BasemapKey[] = ["map", "satellite"]

/**
 * IGN Géoplateforme TMS layers (08-CONTEXT D-01), the same `data.geopf.fr` endpoint family the
 * cadastre overlay already uses (`IgnCadastreTileOverlay.tsx`).
 */
export const BASEMAP_REMOTE_LAYER: Record<BasemapKey, string> = {
  map: "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2",
  satellite: "ORTHOIMAGERY.ORTHOPHOTOS",
}

export function remoteTileUrlTemplate(basemap: BasemapKey): string {
  return `https://data.geopf.fr/tms/1.0.0/${BASEMAP_REMOTE_LAYER[basemap]}/{z}/{x}/{y}.png`
}

export function remoteTileUrl(basemap: BasemapKey, tile: TileCoordinate): string {
  return `https://data.geopf.fr/tms/1.0.0/${BASEMAP_REMOTE_LAYER[basemap]}/${tile.z}/${tile.x}/${tile.y}.png`
}

/** Root directory holding every downloaded area's tiles, under the app's document directory. */
export function offlineTilesRootDir(documentDirectory: string): string {
  return `${documentDirectory}offline-tiles/`
}

export function offlineAreaDir(documentDirectory: string, areaId: string): string {
  return `${offlineTilesRootDir(documentDirectory)}${areaId}/`
}

export function offlineBasemapDir(
  documentDirectory: string,
  areaId: string,
  basemap: BasemapKey,
): string {
  return `${offlineAreaDir(documentDirectory, areaId)}${basemap}/`
}

export function offlineTileLocalPath(
  documentDirectory: string,
  areaId: string,
  basemap: BasemapKey,
  tile: TileCoordinate,
): string {
  return `${offlineBasemapDir(documentDirectory, areaId, basemap)}${tile.z}/${tile.x}/${tile.y}.png`
}

/** The `file://` UrlTile template for a downloaded, ready area (08-CONTEXT D-02). */
export function offlineTileUrlTemplate(
  documentDirectory: string,
  areaId: string,
  basemap: BasemapKey,
): string {
  return `${offlineBasemapDir(documentDirectory, areaId, basemap)}{z}/{x}/{y}.png`
}
