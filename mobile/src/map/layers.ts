// The layer catalogue of the Explorer (Phase 28): one description of every base and overlay, read
// by the styles, the offline estimate, the swipe cycle, the packs, the notices and the legend.
// Nothing outside this file switches on "map" | "satellite" by hand. Pure: no import but types.
//
// Sources: 28-RESEARCH.md ("IGN layers: verified facts", "Real tile weights", "Offline cost") and
// the 28-02 SUMMARY ("Verified records": capabilities boxes read on 2026-10-11). The API keeps one
// copy of the templates (it cannot import this file); 28-06 pins both copies to the literal table
// of `layers.test.ts`.

import type { LatLngBounds } from "./tile-math"

export type BaseLayerKey = "map" | "satellite" | "etat-major" | "carte-1950" | "photos-1950"
export type OverlayLayerKey = "types-foret"
export type MapLayerKey = BaseLayerKey | OverlayLayerKey
/** Every layer that is a raster tile source of its own (the plan is a vector style). */
export type RasterLayerKey = Exclude<MapLayerKey, "map">
/** "base": downloaded with every area; "extra": only when the policy asks for all layers. */
export type LayerTier = "base" | "extra"

export type TileSource = {
  id: string
  type: "raster" | "vector"
  tileSize: 256 | 512
  minTileZoom: number
  maxTileZoom: number
  /** The cap of the offline style: the one layer capped lower offline is the 1950 photographs. */
  offlineMaxTileZoom: number
  /** Measured average weight of one tile, in bytes, by tile zoom (sample comment below). */
  avgTileBytes: Readonly<Record<number, number>>
}

export type LayerEntry = {
  key: MapLayerKey
  role: "base" | "overlay"
  tier: LayerTier
  /** The WMTS template of a raster layer, `null` for the vector plan. */
  tiles: string | null
  sources: readonly TileSource[]
  /** Style, sprite and glyphs, stored once and shared by every area. */
  fixedBytes: number
  /** Opacity of the cadastre lines drawn over this base. */
  cadastreOpacity: number
  /** The pastel old maps are dimmed in the dark scheme (the numbers live in `theme-visual.ts`). */
  dimInDark: boolean
  /** The box outside which the service answers 404, `null` when it is too wide to test a point. */
  coverage: LatLngBounds | null
  /** A key of `fr.mapLayers.layers`. */
  i18nKey: "map" | "satellite" | "etatMajor" | "carte1950" | "photos1950" | "forestTypes"
  icon: string
}

// Verified on data.geopf.fr on 2026-10-11 (curl, Fontainebleau z14 x=8314 y=5667). Each template is
// one full literal so the API spec of 28-06 finds it verbatim. A wrong FORMAT answers 400.
export const ORTHO_TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
export const ETAT_MAJOR_TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
export const CARTE_1950_TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
export const PHOTOS_1950_TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS.1950-1965&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
export const FOREST_TYPES_TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=LANDCOVER.FORESTINVENTORY.V2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"

/** The cadastre parcels, a transparent raster laid over every base from zoom 15. */
export const CADASTRE_TILES =
  "https://data.geopf.fr/tms/1.0.0/CADASTRALPARCELS.PARCELS/{z}/{x}/{y}.png"

// Weights: 14 random tiles per tile zoom in a 4 x 4 km area of the Fontainebleau forest, measured
// by curl on 2026-10-11. Cadastre and orthophoto vary up to 3 times in a city (28-RESEARCH).
// Tile zoom is the pack zoom + 1 for 256 px raster sources, so a 13 to 17 pack reads 14 to 18.

/** Plan IGN, vector tiles of 512 px, read at tile zoom 13 to 17 by a 13 to 17 pack. */
export const PLAN_VECTOR_SOURCE: TileSource = {
  id: "plan-ign",
  type: "vector",
  tileSize: 512,
  minTileZoom: 0,
  maxTileZoom: 18,
  offlineMaxTileZoom: 18,
  avgTileBytes: { 13: 99_000, 14: 73_000, 15: 26_000, 16: 7_700, 17: 3_600 },
}

/** The cadastre raster, carried by the plan's pack (and shared by every other area pack). */
export const CADASTRE_SOURCE: TileSource = {
  id: "cadastre",
  type: "raster",
  tileSize: 256,
  minTileZoom: 15,
  maxTileZoom: 20,
  offlineMaxTileZoom: 20,
  avgTileBytes: { 15: 12_100, 16: 18_500, 17: 10_600, 18: 5_600 },
}

const SATELLITE_SOURCE: TileSource = {
  id: "ortho",
  type: "raster",
  tileSize: 256,
  minTileZoom: 0,
  maxTileZoom: 19,
  offlineMaxTileZoom: 19,
  avgTileBytes: { 14: 15_400, 15: 16_000, 16: 17_100, 17: 15_000, 18: 12_900 },
}

const ETAT_MAJOR_SOURCE: TileSource = {
  id: "etat-major",
  type: "raster",
  tileSize: 256,
  minTileZoom: 0,
  maxTileZoom: 15,
  offlineMaxTileZoom: 15,
  avgTileBytes: { 14: 16_400, 15: 13_500 },
}

const CARTE_1950_SOURCE: TileSource = {
  id: "carte-1950",
  type: "raster",
  tileSize: 256,
  minTileZoom: 0,
  maxTileZoom: 15,
  offlineMaxTileZoom: 15,
  avgTileBytes: { 14: 24_800, 15: 17_900 },
}

// 96 MB of the 151 MB "all layers" area (4 x 4 km) are these PNG photographs at tile zoom 18:
// the offline style stops at 17 (about 84 MB in all), the map scales the last tile one level.
const PHOTOS_1950_SOURCE: TileSource = {
  id: "photos-1950",
  type: "raster",
  tileSize: 256,
  minTileZoom: 0,
  maxTileZoom: 18,
  offlineMaxTileZoom: 17,
  avgTileBytes: { 14: 53_700, 15: 55_600, 16: 53_900, 17: 51_300, 18: 42_000 },
}

const FOREST_TYPES_SOURCE: TileSource = {
  id: "types-foret",
  type: "raster",
  tileSize: 256,
  minTileZoom: 0,
  maxTileZoom: 16,
  offlineMaxTileZoom: 16,
  avgTileBytes: { 14: 15_600, 15: 8_000, 16: 5_400 },
}

// WGS84BoundingBox of the Géoplateforme capabilities (read 2026-10-11). Carte de 1950 spans the
// whole globe (-179.5 -75 179.5 75) and the 1950 photographs span mainland and overseas
// (-67.7 -21.4 55.8 51.1): too wide to test a point, so `null`; their text states the coverage.
const ETAT_MAJOR_COVERAGE: LatLngBounds = {
  minLat: 41.1844,
  minLng: -6.08889,
  maxLat: 51.2745,
  maxLng: 10.961,
}
const FOREST_TYPES_COVERAGE: LatLngBounds = {
  minLat: 41.3252,
  minLng: -5.15047,
  maxLat: 51.0991,
  maxLng: 9.57054,
}

export const LAYER_CATALOGUE: Readonly<Record<MapLayerKey, LayerEntry>> = {
  map: {
    key: "map",
    role: "base",
    tier: "base",
    tiles: null,
    sources: [PLAN_VECTOR_SOURCE, CADASTRE_SOURCE],
    fixedBytes: 4_300_000,
    cadastreOpacity: 0.9,
    dimInDark: false,
    coverage: null,
    i18nKey: "map",
    icon: "map-outline",
  },
  satellite: {
    key: "satellite",
    role: "base",
    tier: "base",
    tiles: ORTHO_TILES,
    sources: [SATELLITE_SOURCE],
    fixedBytes: 0,
    cadastreOpacity: 0.9,
    dimInDark: false,
    coverage: null,
    i18nKey: "satellite",
    icon: "earth-outline",
  },
  "etat-major": {
    key: "etat-major",
    role: "base",
    tier: "extra",
    tiles: ETAT_MAJOR_TILES,
    sources: [ETAT_MAJOR_SOURCE],
    fixedBytes: 0,
    cadastreOpacity: 0.7,
    dimInDark: true,
    coverage: ETAT_MAJOR_COVERAGE,
    i18nKey: "etatMajor",
    icon: "compass-outline",
  },
  "carte-1950": {
    key: "carte-1950",
    role: "base",
    tier: "extra",
    tiles: CARTE_1950_TILES,
    sources: [CARTE_1950_SOURCE],
    fixedBytes: 0,
    cadastreOpacity: 0.7,
    dimInDark: true,
    coverage: null,
    i18nKey: "carte1950",
    icon: "document-text-outline",
  },
  "photos-1950": {
    key: "photos-1950",
    role: "base",
    tier: "extra",
    tiles: PHOTOS_1950_TILES,
    sources: [PHOTOS_1950_SOURCE],
    fixedBytes: 0,
    cadastreOpacity: 0.9,
    dimInDark: false,
    coverage: null,
    i18nKey: "photos1950",
    icon: "camera-outline",
  },
  "types-foret": {
    key: "types-foret",
    role: "overlay",
    tier: "extra",
    tiles: FOREST_TYPES_TILES,
    sources: [FOREST_TYPES_SOURCE],
    fixedBytes: 0,
    // An overlay is drawn over a base and never carries cadastre lines of its own.
    cadastreOpacity: 0.9,
    dimInDark: false,
    coverage: FOREST_TYPES_COVERAGE,
    i18nKey: "forestTypes",
    icon: "leaf-outline",
  },
}

/** The basemap swipe cycle (UI-SPEC U-04), wrapping around. */
export const BASE_LAYER_KEYS: readonly BaseLayerKey[] = [
  "map",
  "satellite",
  "etat-major",
  "carte-1950",
  "photos-1950",
]

export const OVERLAY_LAYER_KEYS: readonly OverlayLayerKey[] = ["types-foret"]

/** The old bases: session-only, never written as the saved basemap. */
export const OLD_BASE_KEYS: readonly BaseLayerKey[] = ["etat-major", "carte-1950", "photos-1950"]

/** Download order: the required packs first, the heaviest extra (1950 photographs) last. */
export const PACK_ORDER: readonly MapLayerKey[] = [
  "map",
  "satellite",
  "etat-major",
  "carte-1950",
  "types-foret",
  "photos-1950",
]

export function layerEntry(key: MapLayerKey): LayerEntry {
  return LAYER_CATALOGUE[key]
}

export function isMapLayerKey(value: unknown): value is MapLayerKey {
  return (
    typeof value === "string" &&
    ([...BASE_LAYER_KEYS, ...OVERLAY_LAYER_KEYS] as readonly string[]).includes(value)
  )
}

export function isBaseLayerKey(value: unknown): value is BaseLayerKey {
  return typeof value === "string" && (BASE_LAYER_KEYS as readonly string[]).includes(value)
}
