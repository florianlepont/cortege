import type { StyleSpecification } from "@maplibre/maplibre-react-native"
import type { BasemapKey } from "../basemaps"
import { CADASTRE_TILES, ORTHO_TILES } from "../layers"

const GEOPF = "https://data.geopf.fr"

/**
 * Plan IGN, the vector map of the Géoplateforme (no key needed), in its colour "standard" variant.
 * IGN publishes no dark style: the dark theme recolours this one (`dark-style.ts`).
 */
export const PLAN_IGN_STYLE_URL = `${GEOPF}/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json`

/** The IGN aerial photographs as a one-layer style. */
export const ORTHO_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    ortho: {
      type: "raster",
      tiles: [ORTHO_TILES],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: "Source : IGN",
    },
  },
  layers: [{ id: "ortho", type: "raster", source: "ortho" }],
}

// The tile templates live in the layer catalogue (`../layers`); the cadastre stays importable here.
export { CADASTRE_TILES }

export function mapStyleFor(basemap: BasemapKey): string | StyleSpecification {
  return basemap === "satellite" ? ORTHO_STYLE : PLAN_IGN_STYLE_URL
}
