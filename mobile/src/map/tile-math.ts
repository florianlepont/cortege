// Slippy-map tile math (OSM/TMS "Web Mercator" scheme, origin top-left, flipY=false — the same
// scheme IgnCadastreTileOverlay already assumes for the IGN Geoplateforme TMS endpoint).

export type TileCoordinate = { z: number; x: number; y: number }
export type LatLngBounds = { minLat: number; minLng: number; maxLat: number; maxLng: number }

/** Regional orientation to close-in parcel navigation (08-CONTEXT D-05); not user-configurable. */
export const MIN_TILE_ZOOM = 13
export const MAX_TILE_ZOOM = 17

/** A documented assumption, not a measured average (08-CONTEXT D-06). */
export const AVERAGE_TILE_BYTES = 20_000

/** Hard cap per basemap layer; a bigger request is rejected, not truncated (08-CONTEXT D-07). */
export const MAX_TILES_PER_AREA = 3000

export function lonToTileX(lon: number, z: number): number {
  const clamped = Math.max(-180, Math.min(180, lon))
  return Math.floor(((clamped + 180) / 360) * 2 ** z)
}

export function latToTileY(lat: number, z: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const latRad = (clamped * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** z,
  )
}

/** Parses the `minLng,minLat,maxLng,maxLat` bbox string this app uses (`computeRegionBbox`). */
export function parseBbox(bbox: string): LatLngBounds | null {
  const parts = bbox.split(",").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return null
  }
  const [minLng, minLat, maxLng, maxLat] = parts
  return { minLat, minLng, maxLat, maxLng }
}

function tileRangeForZoom(
  bounds: LatLngBounds,
  z: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const minX = lonToTileX(bounds.minLng, z)
  const maxX = lonToTileX(bounds.maxLng, z)
  // Latitude and tile-Y move in opposite directions.
  const minY = latToTileY(bounds.maxLat, z)
  const maxY = latToTileY(bounds.minLat, z)
  return { minX, maxX, minY, maxY }
}

/** Every tile covering `bounds` at one zoom level. */
export function tilesForZoom(bounds: LatLngBounds, z: number): TileCoordinate[] {
  const { minX, maxX, minY, maxY } = tileRangeForZoom(bounds, z)

  const tiles: TileCoordinate[] = []
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      tiles.push({ z, x, y })
    }
  }
  return tiles
}

/** Every tile covering `bounds` across `minZoom..maxZoom` inclusive. */
export function tilesForBounds(
  bounds: LatLngBounds,
  minZoom: number = MIN_TILE_ZOOM,
  maxZoom: number = MAX_TILE_ZOOM,
): TileCoordinate[] {
  const tiles: TileCoordinate[] = []
  for (let z = minZoom; z <= maxZoom; z += 1) {
    for (const tile of tilesForZoom(bounds, z)) {
      tiles.push(tile)
    }
  }
  return tiles
}

/**
 * The tile count `tilesForZoom` would produce, without materialising the array — used for the
 * download-size estimate and the cap check so a huge bbox cannot exhaust memory before the cap
 * even gets checked.
 */
export function countTilesForZoom(bounds: LatLngBounds, z: number): number {
  const { minX, maxX, minY, maxY } = tileRangeForZoom(bounds, z)
  return Math.max(0, maxX - minX + 1) * Math.max(0, maxY - minY + 1)
}

export function countTilesForBounds(
  bounds: LatLngBounds,
  minZoom: number = MIN_TILE_ZOOM,
  maxZoom: number = MAX_TILE_ZOOM,
): number {
  let total = 0
  for (let z = minZoom; z <= maxZoom; z += 1) {
    total += countTilesForZoom(bounds, z)
  }
  return total
}

export type AreaDownloadEstimate = {
  tileCountPerBasemap: number
  totalTileCount: number
  estimatedBytes: number
  exceedsCap: boolean
}

/** The estimate shown before the surveyor confirms a download (criterion 3), no network call. */
export function estimateAreaDownload(
  bounds: LatLngBounds,
  basemapCount: number,
): AreaDownloadEstimate {
  const tileCountPerBasemap = countTilesForBounds(bounds)
  const totalTileCount = tileCountPerBasemap * basemapCount
  return {
    tileCountPerBasemap,
    totalTileCount,
    estimatedBytes: totalTileCount * AVERAGE_TILE_BYTES,
    exceedsCap: tileCountPerBasemap > MAX_TILES_PER_AREA,
  }
}

export function pointInBounds(lat: number, lng: number, bounds: LatLngBounds): boolean {
  return (
    lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng
  )
}

type ReadyAreaLike = { bounds: LatLngBounds; status: string; createdAt: string }

/**
 * The most recently downloaded ready area covering `(lat, lng)`, from an in-memory area list
 * (08-CONTEXT D-02) — the render-time counterpart of `findReadyOfflineAreaForPoint`'s SQLite
 * query, for a component that already has the list loaded and cannot await a query per frame.
 */
export function resolveOfflineAreaForPoint<T extends ReadyAreaLike>(
  areas: T[],
  lat: number,
  lng: number,
): T | null {
  let best: T | null = null
  for (const area of areas) {
    if (area.status !== "ready" || !pointInBounds(lat, lng, area.bounds)) {
      continue
    }
    if (!best || area.createdAt > best.createdAt) {
      best = area
    }
  }
  return best
}
