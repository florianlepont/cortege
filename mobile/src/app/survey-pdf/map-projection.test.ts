import { OFFLINE_MAX_ZOOM, OFFLINE_MIN_ZOOM } from "../../map/offline-packs"
import type { PublicParcelStatusItem } from "../types"
import {
  OFFLINE_ZOOM_RANGE,
  WORLD_SIZE_PX,
  boundsOfRings,
  chooseScaleBar,
  fitFrameToBounds,
  latToWorldY,
  lngToWorldX,
  metresPerPixel,
  parcelPolygonsFrom,
  projectToFrame,
  ringsToPathD,
  worldYToLat,
  type LngLat,
  type LngLatBounds,
  type MapFrame,
} from "./map-projection"

// About 365 m by 330 m around (2.70, 48.40).
const BBOX: LngLatBounds = { west: 2.6975, south: 48.3985, east: 2.7025, north: 48.4015 }
const SIZE = { width: 520, height: 320 }

function projectCorners(bounds: LngLatBounds, frame: MapFrame) {
  const corners: LngLat[] = [
    [bounds.west, bounds.south],
    [bounds.west, bounds.north],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
  ]
  return corners.map((corner) => projectToFrame(corner, frame))
}

describe("constants", () => {
  test("the world is 512 px and the zoom range is the offline pack range", () => {
    expect(WORLD_SIZE_PX).toBe(512)
    expect(OFFLINE_ZOOM_RANGE).toEqual({ min: OFFLINE_MIN_ZOOM, max: OFFLINE_MAX_ZOOM })
  })
})

describe("Web Mercator world pixels", () => {
  test("the origin sits at the middle of the 512 px world", () => {
    expect(lngToWorldX(0, 0)).toBeCloseTo(256, 9)
    expect(latToWorldY(0, 0)).toBeCloseTo(256, 9)
    expect(lngToWorldX(180, 1)).toBeCloseTo(1024, 9)
  })

  test("worldYToLat inverts latToWorldY", () => {
    expect(worldYToLat(latToWorldY(48.4, 15), 15)).toBeCloseTo(48.4, 9)
    expect(worldYToLat(latToWorldY(-33.9, 3), 3)).toBeCloseTo(-33.9, 9)
  })

  test("metresPerPixel follows the latitude", () => {
    expect(metresPerPixel(0, 0)).toBeCloseTo(78271.517, 2)
    expect(metresPerPixel(60, 0)).toBeCloseTo(78271.517 / 2, 2)
  })
})

describe("projectToFrame", () => {
  const frame: MapFrame = { centerLng: 2.7, centerLat: 48.4, zoom: 15, width: 520, height: 320 }

  test("the centre lands in the middle of the frame", () => {
    const point = projectToFrame([2.7, 48.4], frame)
    expect(point.x).toBeCloseTo(260, 9)
    expect(point.y).toBeCloseTo(160, 9)
  })

  test("east is larger x and north is smaller y", () => {
    const east = projectToFrame([2.701, 48.4], frame)
    const north = projectToFrame([2.7, 48.401], frame)
    expect(east.x).toBeGreaterThan(260)
    expect(north.y).toBeLessThan(160)
  })
})

describe("boundsOfRings", () => {
  test("is null without a finite point", () => {
    expect(boundsOfRings([])).toBeNull()
    expect(boundsOfRings([[[Number.NaN, 1]]])).toBeNull()
  })

  test("covers every ring and ignores non finite points", () => {
    expect(
      boundsOfRings([
        [
          [1, 2],
          [3, 4],
          [Number.NaN, 9],
        ],
        [[-1, 5]],
      ]),
    ).toEqual({ west: -1, south: 2, east: 3, north: 5 })
  })
})

describe("fitFrameToBounds", () => {
  test("a 365 m parcel in a 520 x 320 frame gives zoom 15 with the corners inside", () => {
    const frame = fitFrameToBounds(BBOX, SIZE, {
      paddingRatio: 0.1,
      zoomRange: { min: 13, max: 17 },
    })
    expect(frame.zoom).toBe(15)
    expect(frame.width).toBe(520)
    expect(frame.height).toBe(320)
    for (const point of projectCorners(BBOX, frame)) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(520)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(320)
    }
  })

  test("a tiny parcel is clamped to the highest zoom, a huge bbox to the lowest", () => {
    const tiny: LngLatBounds = { west: 2.7, south: 48.4, east: 2.70027, north: 48.40018 }
    const huge: LngLatBounds = { west: 2.5, south: 48.3, east: 2.9, north: 48.55 }
    const range = { min: 13, max: 17 }
    expect(fitFrameToBounds(tiny, SIZE, { paddingRatio: 0.1, zoomRange: range }).zoom).toBe(17)
    expect(fitFrameToBounds(huge, SIZE, { paddingRatio: 0.1, zoomRange: range }).zoom).toBe(13)
  })

  test("a continuous fit has a fractional zoom and still holds the corners", () => {
    const frame = fitFrameToBounds(BBOX, SIZE, { paddingRatio: 0.1, zoomRange: null })
    expect(Number.isInteger(frame.zoom)).toBe(false)
    for (const point of projectCorners(BBOX, frame)) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(520)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(320)
    }
  })

  test("a single point falls back to a finite zoom", () => {
    const point: LngLatBounds = { west: 2.7, south: 48.4, east: 2.7, north: 48.4 }
    const clamped = fitFrameToBounds(point, SIZE, {
      paddingRatio: 0.1,
      zoomRange: { min: 13, max: 17 },
    })
    expect(clamped.zoom).toBe(17)
    const free = fitFrameToBounds(point, SIZE, { paddingRatio: 0.1, zoomRange: null })
    expect(Number.isFinite(free.zoom)).toBe(true)
  })
})

describe("chooseScaleBar", () => {
  test("takes the largest round distance within a quarter of the width", () => {
    const bar = chooseScaleBar(1.57, 520)
    expect(bar.metres).toBe(200)
    expect(bar.px).toBeCloseTo(127.4, 1)
  })

  test("never goes below the smallest step", () => {
    expect(chooseScaleBar(0.5, 40).metres).toBe(10)
  })

  test("never goes above the largest step", () => {
    expect(chooseScaleBar(100, 520).metres).toBe(5000)
  })
})

describe("ringsToPathD", () => {
  const frame: MapFrame = { centerLng: 2.7, centerLat: 48.4, zoom: 15, width: 520, height: 320 }

  test("one M ... Z subpath per ring, one decimal, no NaN", () => {
    const d = ringsToPathD(
      [
        [
          [2.7, 48.4],
          [2.701, 48.4],
          [2.701, 48.401],
        ],
        [
          [2.7, 48.4],
          [Number.NaN, 48.4],
          [2.7005, 48.4005],
          [2.7, 48.4004],
        ],
      ],
      frame,
    )
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
    expect(d).not.toContain("NaN")
    expect(d).toMatch(/^M260\.0 160\.0 L/)
    expect(d).toMatch(/\d+\.\d(?=[ZL ])/)
    for (const number of d.match(/-?\d+\.\d+/g) ?? []) {
      expect(number).toMatch(/^-?\d+\.\d$/)
    }
  })

  test("a ring without any finite point is left out", () => {
    expect(ringsToPathD([[[Number.NaN, 1]]], frame)).toBe("")
  })
})

describe("parcelPolygonsFrom", () => {
  const RING_A = [
    [2.7, 48.4],
    [2.701, 48.4],
    [2.701, 48.401],
    [2.7, 48.4],
  ]
  const RING_B = [
    [2.71, 48.41],
    [2.711, 48.41],
    [2.711, 48.411],
    [2.71, 48.41],
  ]
  const item = (id: string, geometry: unknown): PublicParcelStatusItem =>
    ({ parcel_id: id, study_status: "not_studied", geometry }) as unknown as PublicParcelStatusItem

  test("keeps only the wanted parcels, case insensitive, and skips items with no geometry", () => {
    const polygons = parcelPolygonsFrom(
      [
        item("77186000AB0123", { type: "Polygon", coordinates: [RING_A] }),
        item("77186000AB0124", { type: "Polygon", coordinates: [RING_B] }),
        item("77186000AB0125", undefined),
      ],
      ["77186000ab0123", "77186000AB0125"],
    )
    expect(polygons).toEqual([{ parcelId: "77186000AB0123", rings: [RING_A] }])
  })

  test("flattens a MultiPolygon into one entry per polygon", () => {
    const polygons = parcelPolygonsFrom(
      [item("P1", { type: "MultiPolygon", coordinates: [[RING_A], [RING_B]] })],
      ["P1"],
    )
    expect(polygons).toEqual([
      { parcelId: "P1", rings: [RING_A] },
      { parcelId: "P1", rings: [RING_B] },
    ])
  })
})
