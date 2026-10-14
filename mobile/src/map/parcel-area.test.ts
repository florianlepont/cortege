import type { PublicParcelStatusItem } from "../app/types"
import { parcelAreaHa, polygonAreaM2, ringAreaM2 } from "./parcel-area"

type Ring = Array<[number, number]>

const M_PER_DEG_LAT = 111320

// A rectangle of widthM by heightM metres at the given latitude, lower left corner at (lng, lat).
function rectangle(lng: number, lat: number, widthM: number, heightM: number): Ring {
  const dLat = heightM / M_PER_DEG_LAT
  const dLng = widthM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180))
  return [
    [lng, lat],
    [lng + dLng, lat],
    [lng + dLng, lat + dLat],
    [lng, lat + dLat],
    [lng, lat],
  ]
}

const square100 = (lng = 2) => rectangle(lng, 46, 100, 100)

function polygonParcel(id: string, rings: Ring[]): PublicParcelStatusItem {
  return {
    parcel_id: id,
    study_status: "not_studied",
    geometry: { type: "Polygon", coordinates: rings },
  }
}

function multiParcel(id: string, polygons: Ring[][]): PublicParcelStatusItem {
  return {
    parcel_id: id,
    study_status: "not_studied",
    geometry: { type: "MultiPolygon", coordinates: polygons },
  }
}

describe("ringAreaM2", () => {
  it("gives 10000 m2 within 1 % for a 100 m square at latitude 46", () => {
    const area = ringAreaM2(square100())
    expect(Math.abs(area - 10000) / 10000).toBeLessThan(0.01)
  })

  it("is the same in clockwise and counter-clockwise order", () => {
    const ring = square100()
    expect(ringAreaM2([...ring].reverse())).toBeCloseTo(ringAreaM2(ring), 6)
  })

  it("accepts a ring that is not closed", () => {
    expect(ringAreaM2(square100().slice(0, 4))).toBeCloseTo(ringAreaM2(square100()), 6)
  })

  it("is 0 for fewer than 3 points", () => {
    expect(ringAreaM2([])).toBe(0)
    expect(ringAreaM2([[2, 46]])).toBe(0)
    expect(
      ringAreaM2([
        [2, 46],
        [2.001, 46.001],
      ]),
    ).toBe(0)
  })

  it("is 0 for a ring of 2 distinct points", () => {
    expect(
      ringAreaM2([
        [2, 46],
        [2.001, 46.001],
        [2, 46],
      ]),
    ).toBeCloseTo(0, 6)
  })
})

describe("polygonAreaM2", () => {
  it("is 0 for no ring", () => {
    expect(polygonAreaM2([])).toBe(0)
  })

  it("is the area of the outer ring when there is no hole", () => {
    expect(polygonAreaM2([square100()])).toBeCloseTo(ringAreaM2(square100()), 6)
  })

  it("subtracts the holes from the outer ring", () => {
    const outer = rectangle(2, 46, 100, 100)
    const hole = rectangle(2.0003, 46.0003, 20, 20)
    expect(polygonAreaM2([outer, hole])).toBeCloseTo(ringAreaM2(outer) - ringAreaM2(hole), 6)
  })

  it("never goes below 0", () => {
    const small = rectangle(2, 46, 10, 10)
    const big = rectangle(2, 46, 100, 100)
    expect(polygonAreaM2([small, big])).toBe(0)
  })
})

describe("parcelAreaHa", () => {
  it("gives 1 hectare for a 100 m square within 1 %", () => {
    const ha = parcelAreaHa([polygonParcel("P1", [square100()])], ["P1"]) as number
    expect(Math.abs(ha - 1)).toBeLessThan(0.01)
  })

  it("sums the wanted parcels and ignores the others", () => {
    const items = [
      polygonParcel("P1", [square100(2)]),
      polygonParcel("P2", [square100(3)]),
      polygonParcel("P3", [square100(4)]),
    ]
    const both = parcelAreaHa(items, ["P1", "P2"]) as number
    const one = parcelAreaHa(items, ["P1"]) as number
    expect(both).toBeCloseTo(2 * one, 6)
  })

  it("sums every polygon of a MultiPolygon", () => {
    const multi = multiParcel("M1", [[square100(2)], [square100(3)]])
    const single = parcelAreaHa([polygonParcel("P1", [square100(2)])], ["P1"]) as number
    expect(parcelAreaHa([multi], ["M1"])).toBeCloseTo(2 * single, 6)
  })

  it("subtracts the holes of a parcel", () => {
    const outer = rectangle(2, 46, 100, 100)
    const hole = rectangle(2.0003, 46.0003, 20, 20)
    const full = parcelAreaHa([polygonParcel("P1", [outer])], ["P1"]) as number
    const holed = parcelAreaHa([polygonParcel("P1", [outer, hole])], ["P1"]) as number
    expect(holed).toBeCloseTo(full * 0.96, 3)
  })

  it("matches the ids without regard to case", () => {
    const items = [polygonParcel("AB123", [square100()])]
    expect(parcelAreaHa(items, [" ab123 "])).toBeCloseTo(
      parcelAreaHa(items, ["AB123"]) as number,
      9,
    )
    expect(parcelAreaHa(items, ["ab123"])).not.toBeNull()
  })

  it("is null when no wanted parcel has geometry", () => {
    const noGeometry: PublicParcelStatusItem = { parcel_id: "P1", study_status: "not_studied" }
    expect(parcelAreaHa([], ["P1"])).toBeNull()
    expect(parcelAreaHa([noGeometry], ["P1"])).toBeNull()
    expect(parcelAreaHa([polygonParcel("P1", [square100()])], [])).toBeNull()
    expect(parcelAreaHa([polygonParcel("P1", [square100()])], ["P9"])).toBeNull()
  })

  it("is null when the sum is 0", () => {
    const flat: Ring = [
      [2, 46],
      [2.001, 46],
      [2.002, 46],
      [2, 46],
    ]
    expect(parcelAreaHa([polygonParcel("P1", [flat])], ["P1"])).toBeNull()
  })
})
