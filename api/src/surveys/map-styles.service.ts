import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common"
import { fetchIgnJson } from "./ign-http"

/**
 * The six pack styles. MapLibre Native on Android only creates an offline pack from an http(s)
 * style URL (it rejects `file://` and inline JSON), so the API publishes one style per layer that
 * can be downloaded: the Plan IGN style with the cadastre (`map`) and one raster style for each
 * other layer. The WMTS templates below are copied from `mobile/src/map/layers.ts`; the spec
 * `api/test/map-styles.spec.ts` reads that file and finds each template verbatim.
 */
export const OFFLINE_STYLE_NAMES = [
  "map",
  "satellite",
  "etat-major",
  "carte-1950",
  "photos-1950",
  "types-foret",
] as const
export type OfflineStyleName = (typeof OFFLINE_STYLE_NAMES)[number]

type JsonRecord = Record<string, unknown>

const GEOPF = "https://data.geopf.fr"
const PLAN_IGN_STYLE_URL = `${GEOPF}/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json`
const CADASTRE_TILES = `${GEOPF}/tms/1.0.0/CADASTRALPARCELS.PARCELS/{z}/{x}/{y}.png`
/** Same id and zoom floor as `mobile/src/map/offline-styles.ts`, so a pack and the map agree. */
const CADASTRE_SOURCE_ID = "ign-cadastre"
const CADASTRE_MIN_ZOOM = 15

/** The Plan IGN style is large and changes rarely: one fetch an hour is plenty. */
export const MAP_STYLE_CACHE_TTL_MS = 60 * 60 * 1000
/** The style is a few hundred kilobytes, well above the 2.5 s of the small cadastre calls. */
const STYLE_FETCH_TIMEOUT_MS = 10_000

/** Adds the IGN cadastre raster (source and layer) on top of a style. Pure. */
export function withCadastre(style: JsonRecord): JsonRecord {
  return {
    ...style,
    sources: {
      ...(style.sources as JsonRecord | undefined),
      [CADASTRE_SOURCE_ID]: {
        type: "raster",
        tiles: [CADASTRE_TILES],
        tileSize: 256,
        minzoom: CADASTRE_MIN_ZOOM,
        maxzoom: 20,
        attribution: "Source : IGN",
      },
    },
    layers: [
      ...((style.layers as unknown[] | undefined) ?? []),
      {
        id: CADASTRE_SOURCE_ID,
        type: "raster",
        source: CADASTRE_SOURCE_ID,
        paint: { "raster-opacity": 0.9 },
      },
    ],
  }
}

const STYLE_NAMES: ReadonlySet<string> = new Set(OFFLINE_STYLE_NAMES)

type RasterPackName = Exclude<OfflineStyleName, "map">

/** One raster source per layer, at its offline zoom cap (28-RESEARCH "Offline cost"). */
export const RASTER_PACK_STYLES: Record<
  RasterPackName,
  { sourceId: string; tiles: string; maxzoom: number }
> = {
  satellite: {
    sourceId: "ortho",
    tiles:
      "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    maxzoom: 19,
  },
  "etat-major": {
    sourceId: "etat-major",
    tiles:
      "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    maxzoom: 15,
  },
  "carte-1950": {
    sourceId: "carte-1950",
    tiles:
      "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    maxzoom: 15,
  },
  "photos-1950": {
    sourceId: "photos-1950",
    tiles:
      "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS.1950-1965&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    maxzoom: 17,
  },
  "types-foret": {
    sourceId: "types-foret",
    tiles:
      "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=LANDCOVER.FORESTINVENTORY.V2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    maxzoom: 16,
  },
}

/** The style of one raster layer pack: one source, one layer, no cadastre. Pure. */
export function rasterPackStyle(name: RasterPackName): JsonRecord {
  const { sourceId, tiles, maxzoom } = RASTER_PACK_STYLES[name]
  return {
    version: 8,
    sources: {
      [sourceId]: {
        type: "raster",
        tiles: [tiles],
        tileSize: 256,
        minzoom: 0,
        maxzoom,
        attribution: "Source : IGN",
      },
    },
    layers: [{ id: sourceId, type: "raster", source: sourceId }],
  }
}

/**
 * The styles the Android offline packs are created from (see `OFFLINE_STYLE_NAMES`). Nothing here
 * depends on the user. The cadastre travels only in the `map` style: MapLibre stores a tile once
 * by URL, so the Plan pack already covers it for every other layer.
 */
@Injectable()
export class MapStylesService {
  private planStyle: { value: JsonRecord; at: number } | null = null

  async getStyle(name: string, now: number = Date.now()): Promise<JsonRecord> {
    if (!STYLE_NAMES.has(name)) {
      throw new NotFoundException("unknown_map_style")
    }
    if (name !== "map") {
      return rasterPackStyle(name as RasterPackName)
    }
    if (!this.planStyle || now - this.planStyle.at > MAP_STYLE_CACHE_TTL_MS) {
      try {
        const fetched = (await fetchIgnJson(new URL(PLAN_IGN_STYLE_URL), {
          timeoutMs: STYLE_FETCH_TIMEOUT_MS,
          label: "map-style",
        })) as JsonRecord
        this.planStyle = { value: withCadastre(fetched), at: now }
      } catch {
        if (!this.planStyle) {
          throw new ServiceUnavailableException("map_style_unavailable")
        }
        // A stale copy beats no copy: the IGN style barely changes.
      }
    }
    return this.planStyle.value
  }
}
