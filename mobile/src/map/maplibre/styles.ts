import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import type { BasemapKey } from "../basemaps"

const GEOPF = "https://data.geopf.fr"

/**
 * Plan IGN, the vector map of the Géoplateforme (no key needed), in its colour "standard" variant.
 * IGN publishes no dark style: the dark theme recolours this one (`dark-style.ts`).
 */
export const PLAN_IGN_STYLE_URL = `${GEOPF}/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json`

const ORTHO_TILES = `${GEOPF}/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`

/** The IGN aerial photographs as a one-layer style. */
export const ORTHO_STYLE: StyleSpecification = {
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

/** The cadastre parcels, a transparent raster laid over either basemap from zoom 15. */
export const CADASTRE_TILES = `${GEOPF}/tms/1.0.0/CADASTRALPARCELS.PARCELS/{z}/{x}/{y}.png`

export function mapStyleFor(basemap: BasemapKey): string | StyleSpecification {
  return basemap === "satellite" ? ORTHO_STYLE : PLAN_IGN_STYLE_URL
}
