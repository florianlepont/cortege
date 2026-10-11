import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common"
import { fetchIgnJson } from "./ign-http"

export const OFFLINE_STYLE_NAMES = ["map", "satellite"] as const
export type OfflineStyleName = (typeof OFFLINE_STYLE_NAMES)[number]

type JsonRecord = Record<string, unknown>

const GEOPF = "https://data.geopf.fr"
const PLAN_IGN_STYLE_URL = `${GEOPF}/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json`
const CADASTRE_TILES = `${GEOPF}/tms/1.0.0/CADASTRALPARCELS.PARCELS/{z}/{x}/{y}.png`
const ORTHO_TILES = `${GEOPF}/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`
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

const ORTHO_STYLE: JsonRecord = {
  version: 8,
  sources: {
    ortho: {
      type: "raster",
      tiles: [ORTHO_TILES],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Source : IGN",
    },
  },
  layers: [{ id: "ortho", type: "raster", source: "ortho" }],
}

/**
 * The composite basemap styles (basemap + cadastre) the offline packs are created from. MapLibre
 * Native on Android only reads a pack style from an http(s) URL (it rejects `file://` and inline
 * JSON), so the API publishes them. Nothing here depends on the user.
 */
@Injectable()
export class MapStylesService {
  private planStyle: { value: JsonRecord; at: number } | null = null

  async getStyle(name: string, now: number = Date.now()): Promise<JsonRecord> {
    if (name === "satellite") {
      return withCadastre(ORTHO_STYLE)
    }
    if (name !== "map") {
      throw new NotFoundException("unknown_map_style")
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
