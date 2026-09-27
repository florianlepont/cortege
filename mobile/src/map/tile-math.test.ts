import {
  AVERAGE_TILE_BYTES,
  MAX_TILES_PER_AREA,
  countTilesForBounds,
  countTilesForZoom,
  estimateAreaDownload,
  latToTileY,
  lonToTileX,
  parseBbox,
  pointInBounds,
  resolveOfflineAreaForPoint,
  tilesForBounds,
  tilesForZoom,
} from "./tile-math"

describe("lonToTileX / latToTileY", () => {
  test("map the world origin to the single tile at zoom 0", () => {
    expect(lonToTileX(0, 0)).toBe(0)
    expect(latToTileY(0, 0)).toBe(0)
  })

  test("clamp out-of-range longitude and latitude instead of throwing", () => {
    expect(lonToTileX(200, 4)).toBe(lonToTileX(180, 4))
    expect(lonToTileX(-200, 4)).toBe(lonToTileX(-180, 4))
    expect(latToTileY(90, 4)).toBe(latToTileY(85.05112878, 4))
    expect(latToTileY(-90, 4)).toBe(latToTileY(-85.05112878, 4))
  })

  test("increase x with longitude and increase y as latitude decreases", () => {
    expect(lonToTileX(10, 10)).toBeGreaterThan(lonToTileX(-10, 10))
    expect(latToTileY(-10, 10)).toBeGreaterThan(latToTileY(10, 10))
  })
})

describe("parseBbox", () => {
  test("parses a valid minLng,minLat,maxLng,maxLat string", () => {
    expect(parseBbox("1.0,45.0,2.0,46.0")).toEqual({
      minLng: 1.0,
      minLat: 45.0,
      maxLng: 2.0,
      maxLat: 46.0,
    })
  })

  test("rejects the wrong number of parts", () => {
    expect(parseBbox("1.0,45.0,2.0")).toBeNull()
  })

  test("rejects non-numeric parts", () => {
    expect(parseBbox("1.0,x,2.0,46.0")).toBeNull()
  })
})

describe("tilesForZoom / tilesForBounds", () => {
  const smallBounds = { minLat: 46.0, minLng: 1.0, maxLat: 46.01, maxLng: 1.01 }

  test("returns at least one tile for a tiny bbox", () => {
    const tiles = tilesForZoom(smallBounds, 15)
    expect(tiles.length).toBeGreaterThan(0)
    for (const tile of tiles) {
      expect(tile.z).toBe(15)
    }
  })

  test("covers every zoom level in the requested range", () => {
    const tiles = tilesForBounds(smallBounds, 13, 15)
    const zooms = new Set(tiles.map((tile) => tile.z))
    expect(zooms).toEqual(new Set([13, 14, 15]))
  })

  test("a wider bbox yields more tiles than a narrower one at the same zoom", () => {
    const wide = tilesForZoom({ minLat: 46.0, minLng: 1.0, maxLat: 46.5, maxLng: 1.5 }, 13)
    const narrow = tilesForZoom(smallBounds, 13)
    expect(wide.length).toBeGreaterThanOrEqual(narrow.length)
  })
})

describe("countTilesForZoom / countTilesForBounds", () => {
  const smallBounds = { minLat: 46.0, minLng: 1.0, maxLat: 46.01, maxLng: 1.01 }

  test("matches the length of the materialised tile list", () => {
    expect(countTilesForZoom(smallBounds, 15)).toBe(tilesForZoom(smallBounds, 15).length)
    expect(countTilesForBounds(smallBounds, 13, 15)).toBe(
      tilesForBounds(smallBounds, 13, 15).length,
    )
  })

  test("stays cheap for a huge bbox at a high zoom (no array materialised)", () => {
    const huge = { minLat: -80, minLng: -179, maxLat: 80, maxLng: 179 }
    expect(countTilesForZoom(huge, 17)).toBeGreaterThan(MAX_TILES_PER_AREA)
  })
})

describe("estimateAreaDownload", () => {
  const bounds = { minLat: 46.0, minLng: 1.0, maxLat: 46.01, maxLng: 1.01 }

  test("multiplies the per-basemap tile count by the requested basemap count", () => {
    const estimate = estimateAreaDownload(bounds, 2)
    expect(estimate.totalTileCount).toBe(estimate.tileCountPerBasemap * 2)
    expect(estimate.estimatedBytes).toBe(estimate.totalTileCount * AVERAGE_TILE_BYTES)
  })

  test("flags exceedsCap only when the per-basemap count is over the limit", () => {
    const small = estimateAreaDownload(bounds, 1)
    expect(small.exceedsCap).toBe(false)

    const huge = estimateAreaDownload({ minLat: -80, minLng: -179, maxLat: -70, maxLng: -170 }, 1)
    expect(huge.tileCountPerBasemap).toBeGreaterThan(MAX_TILES_PER_AREA)
    expect(huge.exceedsCap).toBe(true)
  })
})

describe("pointInBounds", () => {
  const bounds = { minLat: 46.0, minLng: 1.0, maxLat: 47.0, maxLng: 2.0 }

  test("true for a point inside, including on the edge", () => {
    expect(pointInBounds(46.5, 1.5, bounds)).toBe(true)
    expect(pointInBounds(46.0, 1.0, bounds)).toBe(true)
  })

  test("false for a point outside", () => {
    expect(pointInBounds(50, 1.5, bounds)).toBe(false)
    expect(pointInBounds(46.5, 5, bounds)).toBe(false)
  })
})

describe("resolveOfflineAreaForPoint", () => {
  const bounds = { minLat: 46.0, minLng: 1.0, maxLat: 47.0, maxLng: 2.0 }

  test("returns null when no area covers the point", () => {
    const areas = [{ bounds, status: "ready", createdAt: "2026-01-01T00:00:00.000Z" }]
    expect(resolveOfflineAreaForPoint(areas, 10, 10)).toBeNull()
  })

  test("ignores an area that is not ready", () => {
    const areas = [{ bounds, status: "downloading", createdAt: "2026-01-01T00:00:00.000Z" }]
    expect(resolveOfflineAreaForPoint(areas, 46.5, 1.5)).toBeNull()
  })

  test("picks the most recently created ready area when several cover the point", () => {
    const older = {
      bounds,
      status: "ready" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "older",
    }
    const newer = {
      bounds,
      status: "ready" as const,
      createdAt: "2026-02-01T00:00:00.000Z",
      id: "newer",
    }
    expect(resolveOfflineAreaForPoint([older, newer], 46.5, 1.5)).toEqual(newer)
    expect(resolveOfflineAreaForPoint([newer, older], 46.5, 1.5)).toEqual(newer)
  })
})
