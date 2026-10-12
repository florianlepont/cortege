import { LAYER_CATALOGUE } from "./layers"
import type { RasterLayerKey } from "./layers"
import {
  FOREST_TYPES_OPACITY,
  baseLayerBrightnessMax,
  overlaySourceProps,
  rasterSourceSpec,
  rasterStyleFor,
} from "./layer-styles"
import { ORTHO_STYLE } from "./maplibre/styles"

const RASTER_KEYS: RasterLayerKey[] = [
  "satellite",
  "etat-major",
  "carte-1950",
  "photos-1950",
  "types-foret",
]

describe("rasterStyleFor", () => {
  it("builds the satellite style equal to ORTHO_STYLE", () => {
    expect(rasterStyleFor("satellite", { offline: false })).toEqual(ORTHO_STYLE)
  })

  it("caps the 1950 photographs at 17 offline and 18 online", () => {
    const offline = rasterStyleFor("photos-1950", { offline: true })
    const online = rasterStyleFor("photos-1950", { offline: false })
    expect((offline.sources["photos-1950"] as { maxzoom: number }).maxzoom).toBe(17)
    expect((online.sources["photos-1950"] as { maxzoom: number }).maxzoom).toBe(18)
  })

  it.each(RASTER_KEYS)("declares tile size, zoom range and attribution for %s", (key) => {
    for (const offline of [false, true]) {
      const spec = rasterSourceSpec(key, { offline })
      const source = LAYER_CATALOGUE[key].sources[0]
      expect(spec).toEqual({
        type: "raster",
        tiles: [LAYER_CATALOGUE[key].tiles],
        tileSize: 256,
        minzoom: 0,
        maxzoom: offline ? source.offlineMaxTileZoom : source.maxTileZoom,
        attribution: "Source : IGN",
      })
    }
  })

  it("dims a layer through raster-brightness-max only below 1", () => {
    const dimmed = rasterStyleFor("etat-major", { offline: false, brightnessMax: 0.8 })
    expect(dimmed.layers).toEqual([
      {
        id: "etat-major",
        type: "raster",
        source: "etat-major",
        paint: { "raster-brightness-max": 0.8 },
      },
    ])
    for (const style of [
      rasterStyleFor("etat-major", { offline: false }),
      rasterStyleFor("etat-major", { offline: false, brightnessMax: 1 }),
    ]) {
      expect(style.layers).toEqual([{ id: "etat-major", type: "raster", source: "etat-major" }])
      expect(style.layers[0]).not.toHaveProperty("paint")
    }
    expect(dimmed.version).toBe(8)
  })
})

describe("overlaySourceProps", () => {
  it("describes the forest types source, capped at 16", () => {
    expect(FOREST_TYPES_OPACITY).toBe(0.55)
    expect(overlaySourceProps({ offline: true })).toEqual({
      id: "types-foret",
      tiles: [LAYER_CATALOGUE["types-foret"].tiles],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 16,
      opacity: 0.55,
    })
    expect(overlaySourceProps({ offline: false }).maxzoom).toBe(16)
  })
})

describe("baseLayerBrightnessMax", () => {
  it("dims only the two old maps", () => {
    expect(baseLayerBrightnessMax("carte-1950", 0.8)).toBe(0.8)
    expect(baseLayerBrightnessMax("etat-major", 0.8)).toBe(0.8)
    expect(baseLayerBrightnessMax("photos-1950", 0.8)).toBe(1)
    expect(baseLayerBrightnessMax("satellite", 0.8)).toBe(1)
    expect(baseLayerBrightnessMax("map", 0.8)).toBe(1)
  })
})
