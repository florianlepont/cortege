export type BasemapKey = "map" | "satellite"

export const BASEMAP_KEYS: BasemapKey[] = ["map", "satellite"]

/** Root directory of the tile files of the earlier (pre-MapLibre) offline areas. */
export function offlineTilesRootDir(documentDirectory: string): string {
  return `${documentDirectory}offline-tiles/`
}

/** Where an area's tile files used to live: still removed with the area. */
export function offlineAreaDir(documentDirectory: string, areaId: string): string {
  return `${offlineTilesRootDir(documentDirectory)}${areaId}/`
}
