import {
  MIN_PARCEL_FRAME_SPAN,
  PARCEL_FRAME_SPAN_FACTOR,
  PARCEL_WINDOW_DEGREES,
  boundsCentre,
  mergeBounds,
  parcelBoundsFrom,
  parcelFrameRegion,
  regionForBounds,
  windowRegion,
} from "./parcel-frame"
import type { PublicParcelStatusItem } from "./types"

type Ring = Array<[number, number]>

const square = (west: number, south: number, east: number, north: number): Ring => [
  [west, south],
  [east, south],
  [east, north],
  [west, north],
  [west, south],
]

function parcel(id: string, rings: Ring[]): PublicParcelStatusItem {
  return {
    parcel_id: id,
    study_status: "not_studied",
    geometry: { type: "Polygon", coordinates: rings },
  }
}

const P1 = parcel("P1", [square(2.0, 46.0, 2.2, 46.4)])
const P2 = parcel("P2", [square(2.3, 46.1, 2.5, 46.2)])

describe("windowRegion", () => {
  it("is the fixed 0.01 degree window on the point", () => {
    expect(windowRegion({ lat: 46.5, lng: 2.5 })).toEqual({
      latitude: 46.5,
      longitude: 2.5,
      latitudeDelta: PARCEL_WINDOW_DEGREES,
      longitudeDelta: PARCEL_WINDOW_DEGREES,
    })
    expect(PARCEL_WINDOW_DEGREES).toBe(0.01)
  })
})

describe("regionForBounds", () => {
  it("centres on the box and enlarges each span by the margin factor", () => {
    const region = regionForBounds({ west: 2.0, south: 46.0, east: 2.2, north: 46.4 })
    expect(region.latitude).toBeCloseTo(46.2, 9)
    expect(region.longitude).toBeCloseTo(2.1, 9)
    expect(region.latitudeDelta).toBeCloseTo(0.4 * PARCEL_FRAME_SPAN_FACTOR, 9)
    expect(region.longitudeDelta).toBeCloseTo(0.2 * PARCEL_FRAME_SPAN_FACTOR, 9)
  })

  it("never frames less than the minimum span, so a tiny parcel keeps its surroundings", () => {
    const region = regionForBounds({ west: 2.0, south: 46.0, east: 2.0004, north: 46.0003 })
    expect(region.latitudeDelta).toBe(MIN_PARCEL_FRAME_SPAN)
    expect(region.longitudeDelta).toBe(MIN_PARCEL_FRAME_SPAN)
  })

  it("keeps a degenerate box (one point) on the minimum span", () => {
    const region = regionForBounds({ west: 2, south: 46, east: 2, north: 46 })
    expect(region).toEqual({
      latitude: 46,
      longitude: 2,
      latitudeDelta: MIN_PARCEL_FRAME_SPAN,
      longitudeDelta: MIN_PARCEL_FRAME_SPAN,
    })
  })
})

describe("boundsCentre", () => {
  it("is the middle of the box", () => {
    expect(boundsCentre({ west: 0, south: 10, east: 4, north: 20 })).toEqual({ lat: 15, lng: 2 })
  })
})

describe("parcelBoundsFrom", () => {
  it("is null with no item, no wanted id or no match", () => {
    expect(parcelBoundsFrom([], ["P1"])).toBeNull()
    expect(parcelBoundsFrom([P1], [])).toBeNull()
    expect(parcelBoundsFrom([P1], ["P9"])).toBeNull()
  })

  it("covers the chosen parcels only, ids matched without regard to case", () => {
    const other = parcel("P3", [square(10, 10, 11, 11)])
    expect(parcelBoundsFrom([P1, P2, other], ["p1", "P2"])).toEqual({
      west: 2.0,
      south: 46.0,
      east: 2.5,
      north: 46.4,
    })
  })
})

describe("mergeBounds", () => {
  const a = { west: 0, south: 0, east: 1, north: 1 }
  const b = { west: -1, south: 0.5, east: 0.5, north: 3 }

  it("returns the one that exists", () => {
    expect(mergeBounds(null, null)).toBeNull()
    expect(mergeBounds(a, null)).toBe(a)
    expect(mergeBounds(null, b)).toBe(b)
  })

  it("is the union of both boxes", () => {
    expect(mergeBounds(a, b)).toEqual({ west: -1, south: 0, east: 1, north: 3 })
  })
})

describe("parcelFrameRegion", () => {
  const bounds = { west: 2.0, south: 46.0, east: 2.2, north: 46.4 }
  const centre = { lat: 40, lng: 3 }

  it("fits the parcels' bounding box first, even when a centre is known", () => {
    expect(parcelFrameRegion({ bounds, centre })).toEqual(regionForBounds(bounds))
  })

  it("falls back to the 0.01 window on the centre", () => {
    expect(parcelFrameRegion({ bounds: null, centre })).toEqual(windowRegion(centre))
  })

  it("is null when nothing is known, never a France-wide region", () => {
    expect(parcelFrameRegion({ bounds: null, centre: null })).toBeNull()
  })
})
