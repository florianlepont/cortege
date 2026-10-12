import { fr } from "../i18n"
import {
  BASE_LAYER_KEYS,
  CADASTRE_SOURCE,
  CADASTRE_TILES,
  LAYER_CATALOGUE,
  OLD_BASE_KEYS,
  ORTHO_TILES,
  OVERLAY_LAYER_KEYS,
  PACK_ORDER,
  PLAN_VECTOR_SOURCE,
  isBaseLayerKey,
  isMapLayerKey,
  layerEntry,
} from "./layers"
import type { MapLayerKey, RasterLayerKey, TileSource } from "./layers"

const WMTS = "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile"
const TAIL = "&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"

// The verified list of 28-RESEARCH ("Tile URL templates"), copied in the API spec of 28-06.
const VERIFIED_TEMPLATES: Record<RasterLayerKey, string> = {
  satellite: `${WMTS}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg${TAIL}`,
  "etat-major": `${WMTS}&LAYER=GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40&STYLE=normal&FORMAT=image/jpeg${TAIL}`,
  "carte-1950": `${WMTS}&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950&STYLE=normal&FORMAT=image/jpeg${TAIL}`,
  "photos-1950": `${WMTS}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS.1950-1965&STYLE=normal&FORMAT=image/png${TAIL}`,
  "types-foret": `${WMTS}&LAYER=LANDCOVER.FORESTINVENTORY.V2&STYLE=normal&FORMAT=image/png${TAIL}`,
}

// Tile zoom caps: [online, offline] (28-RESEARCH "Offline cost"; photos capped at 17 offline).
const ZOOM_CAPS: Record<RasterLayerKey, [number, number]> = {
  satellite: [19, 19],
  "etat-major": [15, 15],
  "carte-1950": [15, 15],
  "photos-1950": [18, 17],
  "types-foret": [16, 16],
}

const ALL_KEYS: MapLayerKey[] = [
  "map",
  "satellite",
  "etat-major",
  "carte-1950",
  "photos-1950",
  "types-foret",
]

describe("tile templates", () => {
  test.each(Object.keys(VERIFIED_TEMPLATES) as RasterLayerKey[])(
    "%s uses the verified template, character for character",
    (key) => {
      expect(LAYER_CATALOGUE[key].tiles).toBe(VERIFIED_TEMPLATES[key])
    },
  )

  test("the map entry has no raster template (it is a vector style)", () => {
    expect(LAYER_CATALOGUE.map.tiles).toBeNull()
  })

  test("the orthophoto template is the catalogue's one", () => {
    expect(ORTHO_TILES).toBe(VERIFIED_TEMPLATES.satellite)
    expect(LAYER_CATALOGUE.satellite.tiles).toBe(ORTHO_TILES)
  })

  test("the cadastre tiles come from the same provider", () => {
    expect(CADASTRE_TILES).toBe(
      "https://data.geopf.fr/tms/1.0.0/CADASTRALPARCELS.PARCELS/{z}/{x}/{y}.png",
    )
  })
})

describe("tile zoom caps", () => {
  test.each(Object.keys(ZOOM_CAPS) as RasterLayerKey[])("%s online and offline caps", (key) => {
    const [online, offline] = ZOOM_CAPS[key]
    const [source] = LAYER_CATALOGUE[key].sources
    expect(source.maxTileZoom).toBe(online)
    expect(source.offlineMaxTileZoom).toBe(offline)
    expect(source.minTileZoom).toBe(0)
    expect(source.type).toBe("raster")
    expect(source.tileSize).toBe(256)
  })

  test("the plan is a 512 vector source, the cadastre a 256 raster from zoom 15", () => {
    expect(PLAN_VECTOR_SOURCE).toMatchObject({
      type: "vector",
      tileSize: 512,
      minTileZoom: 0,
      maxTileZoom: 18,
    })
    expect(CADASTRE_SOURCE).toMatchObject({
      type: "raster",
      tileSize: 256,
      minTileZoom: 15,
      maxTileZoom: 20,
    })
    expect(LAYER_CATALOGUE.map.sources).toEqual([PLAN_VECTOR_SOURCE, CADASTRE_SOURCE])
    expect(LAYER_CATALOGUE.map.fixedBytes).toBe(4_300_000)
  })
})

describe("orders", () => {
  test("the swipe cycle", () => {
    expect(BASE_LAYER_KEYS).toEqual(["map", "satellite", "etat-major", "carte-1950", "photos-1950"])
  })

  test("the old bases", () => {
    expect(OLD_BASE_KEYS).toEqual(["etat-major", "carte-1950", "photos-1950"])
  })

  test("the overlays", () => {
    expect(OVERLAY_LAYER_KEYS).toEqual(["types-foret"])
  })

  test("the download order", () => {
    expect(PACK_ORDER).toEqual([
      "map",
      "satellite",
      "etat-major",
      "carte-1950",
      "types-foret",
      "photos-1950",
    ])
  })
})

describe("entries", () => {
  test("every key has an entry whose key matches", () => {
    for (const key of ALL_KEYS) expect(LAYER_CATALOGUE[key].key).toBe(key)
    expect(Object.keys(LAYER_CATALOGUE).sort()).toEqual([...ALL_KEYS].sort())
  })

  test("tiers and roles", () => {
    expect(LAYER_CATALOGUE.map.tier).toBe("base")
    expect(LAYER_CATALOGUE.satellite.tier).toBe("base")
    for (const key of ["etat-major", "carte-1950", "photos-1950", "types-foret"] as const) {
      expect(LAYER_CATALOGUE[key].tier).toBe("extra")
    }
    for (const key of BASE_LAYER_KEYS) expect(LAYER_CATALOGUE[key].role).toBe("base")
    expect(LAYER_CATALOGUE["types-foret"].role).toBe("overlay")
  })

  test("cadastre opacity per base and dark dimming", () => {
    expect(LAYER_CATALOGUE.map.cadastreOpacity).toBe(0.9)
    expect(LAYER_CATALOGUE.satellite.cadastreOpacity).toBe(0.9)
    expect(LAYER_CATALOGUE["photos-1950"].cadastreOpacity).toBe(0.9)
    expect(LAYER_CATALOGUE["etat-major"].cadastreOpacity).toBe(0.7)
    expect(LAYER_CATALOGUE["carte-1950"].cadastreOpacity).toBe(0.7)
    const dimmed = ALL_KEYS.filter((key) => LAYER_CATALOGUE[key].dimInDark)
    expect(dimmed).toEqual(["etat-major", "carte-1950"])
  })

  test("coverage boxes: read from the capabilities for two layers, none for the wide ones", () => {
    expect(LAYER_CATALOGUE["etat-major"].coverage).toEqual({
      minLat: 41.1844,
      minLng: -6.08889,
      maxLat: 51.2745,
      maxLng: 10.961,
    })
    expect(LAYER_CATALOGUE["types-foret"].coverage).toEqual({
      minLat: 41.3252,
      minLng: -5.15047,
      maxLat: 51.0991,
      maxLng: 9.57054,
    })
    for (const key of ["map", "satellite", "carte-1950", "photos-1950"] as const) {
      expect(LAYER_CATALOGUE[key].coverage).toBeNull()
    }
  })

  test("each i18n key is a key of the French catalogue, each icon an outline glyph", () => {
    for (const key of ALL_KEYS) {
      const entry = LAYER_CATALOGUE[key]
      expect(Object.keys(fr.mapLayers.layers)).toContain(entry.i18nKey)
      expect(entry.icon).toMatch(/-outline$/)
    }
  })

  test("the pure measured weights cover every tile zoom a pack can reach", () => {
    const reach: [TileSource, number, number][] = [
      [PLAN_VECTOR_SOURCE, 13, 17],
      [CADASTRE_SOURCE, 15, 18],
      [LAYER_CATALOGUE.satellite.sources[0], 14, 18],
      [LAYER_CATALOGUE["etat-major"].sources[0], 14, 15],
      [LAYER_CATALOGUE["carte-1950"].sources[0], 14, 15],
      [LAYER_CATALOGUE["photos-1950"].sources[0], 14, 18],
      [LAYER_CATALOGUE["types-foret"].sources[0], 14, 16],
    ]
    for (const [source, from, to] of reach) {
      for (let zoom = from; zoom <= to; zoom += 1) {
        expect({ id: source.id, zoom, bytes: source.avgTileBytes[zoom] > 0 }).toEqual({
          id: source.id,
          zoom,
          bytes: true,
        })
      }
    }
  })

  test("only the plan carries fixed bytes (style, sprite, glyphs)", () => {
    for (const key of ALL_KEYS) {
      expect(LAYER_CATALOGUE[key].fixedBytes).toBe(key === "map" ? 4_300_000 : 0)
    }
  })
})

describe("lookups and guards", () => {
  test("layerEntry returns the catalogue entry", () => {
    expect(layerEntry("photos-1950")).toBe(LAYER_CATALOGUE["photos-1950"])
  })

  test("isMapLayerKey", () => {
    expect(isMapLayerKey("photos-1950")).toBe(true)
    expect(isMapLayerKey("types-foret")).toBe(true)
    expect(isMapLayerKey("hybrid")).toBe(false)
    expect(isMapLayerKey(undefined)).toBe(false)
    expect(isMapLayerKey("toString")).toBe(false)
  })

  test("isBaseLayerKey", () => {
    expect(isBaseLayerKey("map")).toBe(true)
    expect(isBaseLayerKey("photos-1950")).toBe(true)
    expect(isBaseLayerKey("types-foret")).toBe(false)
    expect(isBaseLayerKey("hybrid")).toBe(false)
  })
})
