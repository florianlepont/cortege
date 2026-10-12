// The honest offline estimate (Phase 28, research Pitfall 1). MapLibre Native downloads a 256 px
// raster source one zoom level above the pack zoom (512 px vector tiles at the pack zoom), so a
// 13 to 17 pack reads raster tiles 14 to 18. The estimate counts those tiles and weighs each tile
// zoom with the average measured in the catalogue; the old flat 20 kB per tile is not used.
// The default pack zoom is the tile-math range (13 to 17), pinned equal to the pack's by a test, so
// this module stays free of the native MapLibre import. Pure: no React, no react-native, no i18n.
import { computeRegionBounds } from "../app/map-viewport"
import { LAYER_CATALOGUE, PACK_ORDER } from "./layers"
import type { LayerTier, MapLayerKey, TileSource } from "./layers"
import type { OfflineLayersPolicy } from "../storage/offline-layers-policy"
import { regionAround } from "./offline-coverage"
import {
  MAX_TILES_PER_AREA,
  MAX_TILE_ZOOM,
  MIN_TILE_ZOOM,
  countTilesForBounds,
  countTilesForZoom,
} from "./tile-math"
import type { LatLngBounds } from "./tile-math"

export type LayerDownloadEstimate = {
  key: MapLayerKey
  tier: LayerTier
  tiles: number
  /** Tiles weighed, plus the fixed part (style, sprite, glyphs) counted each time. */
  bytes: number
  fixedBytes: number
}

export type AreaLayersEstimate = {
  policy: OfflineLayersPolicy
  layers: LayerDownloadEstimate[]
  totalTileCount: number
  estimatedBytes: number
  /** The bytes of the layers every area keeps ("base" tier). */
  baseBytes: number
  /** The bytes only the "all layers" policy adds ("extra" tier). */
  extraBytes: number
  exceedsCap: boolean
}

/** The point and radius of the reference area of the settings sheet (4 x 4 km at Fontainebleau). */
export const POLICY_REFERENCE_POINT = { lat: 48.4073, lng: 2.6917 }
const REFERENCE_RADIUS_KM = 2

/**
 * The tile zooms a source is read at for a pack of `packMin` to `packMax`: the maplibre-native
 * `coveringZoomLevel` rule (offset log2(512 / tileSize); raster rounds, vector floors), clamped to
 * the source's zooms. `null` when the source has no tile in that range. `offline: false` reads the
 * online cap instead of the lower offline one.
 */
export function coveringZoomRange(
  packMin: number,
  packMax: number,
  source: TileSource,
  { offline = true }: { offline?: boolean } = {},
): [number, number] | null {
  const offset = Math.log2(512 / source.tileSize)
  const round = source.type === "raster" ? Math.round : Math.floor
  const min = Math.max(round(packMin + offset), source.minTileZoom)
  const max = Math.min(
    round(packMax + offset),
    offline ? source.offlineMaxTileZoom : source.maxTileZoom,
  )
  return min > max ? null : [min, max]
}

function largestWeight(source: TileSource): number {
  return Math.max(...Object.values(source.avgTileBytes))
}

/** Tiles and bytes of one source over `bounds` (the fixed part of its layer is not included). */
export function estimateSourceDownload(
  bounds: LatLngBounds,
  source: TileSource,
  packMin: number = MIN_TILE_ZOOM,
  packMax: number = MAX_TILE_ZOOM,
): { tiles: number; bytes: number } {
  const range = coveringZoomRange(packMin, packMax, source)
  if (!range) {
    return { tiles: 0, bytes: 0 }
  }
  let tiles = 0
  let bytes = 0
  for (let z = range[0]; z <= range[1]; z += 1) {
    const count = countTilesForZoom(bounds, z)
    tiles += count
    // A reachable zoom without a measure is weighed with the heaviest measured tile (cautious).
    bytes += count * (source.avgTileBytes[z] ?? largestWeight(source))
  }
  return { tiles, bytes }
}

/**
 * One layer over `bounds`. The fixed part (style, sprite, glyphs) is counted in full each time:
 * honest for a first download, a few MB too high for the next ones. Weights vary by place (the
 * cadastre and the photographs up to 3 times in a city), so this is an order of magnitude.
 */
export function estimateLayerDownload(
  bounds: LatLngBounds,
  key: MapLayerKey,
): LayerDownloadEstimate {
  const entry = LAYER_CATALOGUE[key]
  let tiles = 0
  let bytes = entry.fixedBytes
  for (const source of entry.sources) {
    const estimate = estimateSourceDownload(bounds, source)
    tiles += estimate.tiles
    bytes += estimate.bytes
  }
  return { key, tier: entry.tier, tiles, bytes, fixedBytes: entry.fixedBytes }
}

/** Base maps only: the Plan (which carries the cadastre) and the Satellite; all: every layer. */
export function layersForPolicy(policy: OfflineLayersPolicy): MapLayerKey[] {
  return policy === "all"
    ? [...PACK_ORDER]
    : PACK_ORDER.filter((key) => LAYER_CATALOGUE[key].tier === "base")
}

/** The estimate shown before a download, with the viewport cap kept (no network call). */
export function estimateAreaLayers(
  bounds: LatLngBounds,
  policy: OfflineLayersPolicy,
): AreaLayersEstimate {
  const layers = layersForPolicy(policy).map((key) => estimateLayerDownload(bounds, key))
  const bytesOfTier = (tier: LayerTier): number =>
    layers.filter((layer) => layer.tier === tier).reduce((sum, layer) => sum + layer.bytes, 0)
  const baseBytes = bytesOfTier("base")
  const extraBytes = bytesOfTier("extra")
  return {
    policy,
    layers,
    totalTileCount: layers.reduce((sum, layer) => sum + layer.tiles, 0),
    estimatedBytes: baseBytes + extraBytes,
    baseBytes,
    extraBytes,
    exceedsCap: countTilesForBounds(bounds) > MAX_TILES_PER_AREA,
  }
}

/** What the settings sheet shows for a policy: the 4 x 4 km reference area at Fontainebleau. */
export function referenceAreaBytes(policy: OfflineLayersPolicy): number {
  const bounds = computeRegionBounds(regionAround(POLICY_REFERENCE_POINT, REFERENCE_RADIUS_KM))
  return estimateAreaLayers(bounds, policy).estimatedBytes
}
