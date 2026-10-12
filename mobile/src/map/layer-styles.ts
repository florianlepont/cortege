// Raster styles of the map layers (Phase 28): one source per layer, built only from the catalogue,
// so no user input ever reaches a tile URL. Pure: no React, no react-native, no i18n.
import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import { LAYER_CATALOGUE } from "./layers"
import type { BaseLayerKey, RasterLayerKey } from "./layers"

/** The forest types are drawn over a base: translucent enough to keep the base readable. */
export const FOREST_TYPES_OPACITY = 0.55

const ATTRIBUTION = "Source : IGN"

type RasterSourceSpec = {
  type: "raster"
  tiles: string[]
  tileSize: 256
  minzoom: number
  maxzoom: number
  attribution: string
}

function rasterTemplate(key: RasterLayerKey): string {
  // A raster layer always has a template: only the vector Plan carries `null`.
  return LAYER_CATALOGUE[key].tiles as string
}

/**
 * The raster source of a layer. `minzoom` and `maxzoom` are always declared (Pitfall 2): past the
 * cap MapLibre scales the last tile instead of asking IGN for tiles it answers 404 to, so the map
 * never goes blank. `offline` applies the lower cap of an offline pack (the 1950 photographs).
 */
export function rasterSourceSpec(
  key: RasterLayerKey,
  { offline }: { offline: boolean },
): RasterSourceSpec {
  const source = LAYER_CATALOGUE[key].sources[0]
  return {
    type: "raster",
    tiles: [rasterTemplate(key)],
    tileSize: 256,
    minzoom: source.minTileZoom,
    maxzoom: offline ? source.offlineMaxTileZoom : source.maxTileZoom,
    attribution: ATTRIBUTION,
  }
}

/**
 * A one-layer style for a raster base. `brightnessMax` below 1 dims the layer (the two old maps in
 * dark mode); at 1 the layer carries no `paint`, so the satellite style equals `ORTHO_STYLE`.
 */
export function rasterStyleFor(
  key: RasterLayerKey,
  { offline, brightnessMax = 1 }: { offline: boolean; brightnessMax?: number },
): StyleSpecification {
  const layer: StyleSpecification["layers"][number] =
    brightnessMax < 1
      ? {
          id: LAYER_CATALOGUE[key].sources[0].id,
          type: "raster",
          source: LAYER_CATALOGUE[key].sources[0].id,
          paint: { "raster-brightness-max": brightnessMax },
        }
      : {
          id: LAYER_CATALOGUE[key].sources[0].id,
          type: "raster",
          source: LAYER_CATALOGUE[key].sources[0].id,
        }
  return {
    version: 8,
    sources: { [LAYER_CATALOGUE[key].sources[0].id]: rasterSourceSpec(key, { offline }) },
    layers: [layer],
  }
}

/** Props of the forest types `RasterSource` child (an overlay never swaps the base style). */
export function overlaySourceProps({ offline }: { offline: boolean }): {
  id: string
  tiles: string[]
  tileSize: 256
  minzoom: number
  maxzoom: number
  opacity: number
} {
  const spec = rasterSourceSpec("types-foret", { offline })
  return {
    id: LAYER_CATALOGUE["types-foret"].sources[0].id,
    tiles: spec.tiles,
    tileSize: spec.tileSize,
    minzoom: spec.minzoom,
    maxzoom: spec.maxzoom,
    opacity: FOREST_TYPES_OPACITY,
  }
}

/**
 * The dark-mode dimming of a base: only the pastel old maps are dimmed (`raster-brightness-max`).
 * Satellite and the 1950 photographs are never recoloured (UI-SPEC Color).
 */
export function baseLayerBrightnessMax(key: BaseLayerKey, darkDim: number): number {
  return LAYER_CATALOGUE[key].dimInDark ? darkDim : 1
}
