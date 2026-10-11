import { computeRegionBounds } from "../app/map-viewport"
import {
  CADASTRE_SOURCE,
  LAYER_CATALOGUE,
  PACK_ORDER,
  PLAN_VECTOR_SOURCE,
  type TileSource,
} from "./layers"
import {
  POLICY_REFERENCE_POINT,
  coveringZoomRange,
  estimateAreaLayers,
  estimateLayerDownload,
  estimateSourceDownload,
  layersForPolicy,
  referenceAreaBytes,
} from "./offline-estimate"
import { regionAround } from "./offline-coverage"
import { OFFLINE_MAX_ZOOM, OFFLINE_MIN_ZOOM } from "./offline-packs"
import { MAX_TILES_PER_AREA, countTilesForBounds, countTilesForZoom } from "./tile-math"

const source = (key: keyof typeof LAYER_CATALOGUE): TileSource => LAYER_CATALOGUE[key].sources[0]
const FONTAINEBLEAU = computeRegionBounds(regionAround(POLICY_REFERENCE_POINT, 2))

describe("coveringZoomRange", () => {
  it("reads 256 px raster sources one zoom above the pack, clamped to their zooms", () => {
    expect(coveringZoomRange(13, 17, source("satellite"))).toEqual([14, 18])
    expect(coveringZoomRange(13, 17, CADASTRE_SOURCE)).toEqual([15, 18])
    expect(coveringZoomRange(13, 17, source("etat-major"))).toEqual([14, 15])
  })

  it("reads the 512 px vector plan at the pack zoom", () => {
    expect(coveringZoomRange(13, 17, PLAN_VECTOR_SOURCE)).toEqual([13, 17])
  })

  it("applies the offline cap of the 1950 photographs only offline", () => {
    expect(coveringZoomRange(13, 17, source("photos-1950"))).toEqual([14, 17])
    expect(coveringZoomRange(13, 17, source("photos-1950"), { offline: true })).toEqual([14, 17])
    expect(coveringZoomRange(13, 17, source("photos-1950"), { offline: false })).toEqual([14, 18])
  })

  it("returns null when the source starts above the range", () => {
    expect(coveringZoomRange(5, 8, CADASTRE_SOURCE)).toBeNull()
  })

  it("keeps the default pack zooms equal to the pack's", () => {
    expect([OFFLINE_MIN_ZOOM, OFFLINE_MAX_ZOOM]).toEqual([13, 17])
    const explicit = estimateSourceDownload(FONTAINEBLEAU, source("satellite"), 13, 17)
    expect(estimateSourceDownload(FONTAINEBLEAU, source("satellite"))).toEqual(explicit)
  })
})

describe("estimateSourceDownload", () => {
  it("weighs each tile zoom with its measured average", () => {
    const estimate = estimateSourceDownload(FONTAINEBLEAU, source("satellite"))
    let tiles = 0
    let bytes = 0
    for (let z = 14; z <= 18; z += 1) {
      const count = countTilesForZoom(FONTAINEBLEAU, z)
      tiles += count
      bytes += count * (source("satellite").avgTileBytes[z] as number)
    }
    expect(estimate).toEqual({ tiles, bytes })
  })

  it("is empty for a source out of the pack's zooms", () => {
    expect(estimateSourceDownload(FONTAINEBLEAU, CADASTRE_SOURCE, 5, 8)).toEqual({
      tiles: 0,
      bytes: 0,
    })
  })

  it("weighs a zoom with no measure with the source's largest weight", () => {
    const synthetic: TileSource = {
      id: "synthetic",
      type: "raster",
      tileSize: 256,
      minTileZoom: 14,
      maxTileZoom: 15,
      offlineMaxTileZoom: 15,
      avgTileBytes: { 14: 1_000, 99: 5_000 },
    }
    const z14 = countTilesForZoom(FONTAINEBLEAU, 14)
    const z15 = countTilesForZoom(FONTAINEBLEAU, 15)
    expect(estimateSourceDownload(FONTAINEBLEAU, synthetic).bytes).toBe(z14 * 1_000 + z15 * 5_000)
  })
})

describe("estimateLayerDownload", () => {
  it("includes the fixed part and the cadastre tiles of the plan", () => {
    const plan = estimateLayerDownload(FONTAINEBLEAU, "map")
    const tilesOnly =
      estimateSourceDownload(FONTAINEBLEAU, PLAN_VECTOR_SOURCE).bytes +
      estimateSourceDownload(FONTAINEBLEAU, CADASTRE_SOURCE).bytes
    expect(plan.fixedBytes).toBe(4_300_000)
    expect(plan.bytes).toBe(4_300_000 + tilesOnly)
    expect(plan.tier).toBe("base")
    expect(plan.tiles).toBe(
      estimateSourceDownload(FONTAINEBLEAU, PLAN_VECTOR_SOURCE).tiles +
        estimateSourceDownload(FONTAINEBLEAU, CADASTRE_SOURCE).tiles,
    )
  })

  it("has no fixed part for a raster layer", () => {
    expect(estimateLayerDownload(FONTAINEBLEAU, "etat-major")).toMatchObject({
      key: "etat-major",
      tier: "extra",
      fixedBytes: 0,
    })
  })
})

describe("layersForPolicy", () => {
  it("keeps the Plan and the Satellite for base, every layer for all", () => {
    expect(layersForPolicy("base")).toEqual(["map", "satellite"])
    expect(layersForPolicy("all")).toEqual(PACK_ORDER)
    expect(layersForPolicy("all")).not.toBe(PACK_ORDER)
  })
})

describe("estimateAreaLayers (Fontainebleau, 4 x 4 km)", () => {
  it("weighs about 53 MB for the base layers", () => {
    const estimate = estimateAreaLayers(FONTAINEBLEAU, "base")
    expect(estimate.policy).toBe("base")
    expect(estimate.estimatedBytes).toBeGreaterThan(48e6)
    expect(estimate.estimatedBytes).toBeLessThan(58e6)
    expect(estimate.extraBytes).toBe(0)
    expect(estimate.exceedsCap).toBe(false)
  })

  it("weighs about 84 MB for all layers, the 1950 photographs capped at 17", () => {
    const estimate = estimateAreaLayers(FONTAINEBLEAU, "all")
    expect(estimate.estimatedBytes).toBeGreaterThan(76e6)
    expect(estimate.estimatedBytes).toBeLessThan(92e6)
    const bytes = (key: string): number =>
      estimate.layers.find((layer) => layer.key === key)?.bytes as number
    expect(bytes("photos-1950")).toBeGreaterThan(25e6)
    expect(bytes("photos-1950")).toBeLessThan(32e6)
    for (const key of ["etat-major", "carte-1950", "types-foret"]) {
      expect(bytes(key)).toBeLessThan(1.5e6)
    }
    expect(estimate.baseBytes + estimate.extraBytes).toBe(estimate.estimatedBytes)
    expect(estimate.totalTileCount).toBe(estimate.layers.reduce((sum, l) => sum + l.tiles, 0))
  })

  it("flags an area over the viewport cap exactly like the tile count", () => {
    const wide = computeRegionBounds(regionAround(POLICY_REFERENCE_POINT, 15))
    const estimate = estimateAreaLayers(wide, "base")
    expect(estimate.exceedsCap).toBe(countTilesForBounds(wide) > MAX_TILES_PER_AREA)
    expect(estimate.exceedsCap).toBe(true)
  })
})

describe("referenceAreaBytes", () => {
  it("is the estimate of the reference area for each policy", () => {
    expect(referenceAreaBytes("all")).toBeGreaterThan(76e6)
    expect(referenceAreaBytes("all")).toBeLessThan(92e6)
    expect(referenceAreaBytes("base")).toBeGreaterThan(48e6)
    expect(referenceAreaBytes("base")).toBeLessThan(58e6)
    expect(referenceAreaBytes("all")).toBe(estimateAreaLayers(FONTAINEBLEAU, "all").estimatedBytes)
  })
})
