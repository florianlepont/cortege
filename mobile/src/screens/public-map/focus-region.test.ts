import type { SearchParcelItem, SearchPlaceItem } from "@cortege/ibp-domain"
import { computeRegionZoom } from "../../app/map-viewport"
import {
  PARCEL_FOCUS_SPAN_FACTOR,
  focusParcelIds,
  focusRegionFor,
  parcelFocus,
  placeFocus,
  placeZoom,
} from "./focus-region"

describe("placeZoom (D-05)", () => {
  test.each([
    ["municipality", 13],
    ["locality", 13],
    ["street", 17],
    ["address", 17],
    ["other", 14],
  ] as const)("%s is shown at zoom %i", (kind, zoom) => {
    expect(placeZoom(kind)).toBe(zoom)
  })
})

describe("focusRegionFor", () => {
  test("a survey keeps today's region, the marker moved 22 percent of the span above centre", () => {
    const region = focusRegionFor({
      kind: "survey",
      surveyId: "s",
      lat: 46,
      lng: 2,
      parcelIds: [],
      nonce: 1,
    })
    expect(region.longitude).toBe(2)
    expect(region.latitudeDelta).toBe(0.015)
    expect(region.longitudeDelta).toBe(0.015)
    expect(region.latitude).toBeCloseTo(46 - 0.015 * 0.22, 10)
  })

  test("a place is centred on itself at the zoom of its kind", () => {
    for (const [kind, zoom] of [
      ["municipality", 13],
      ["street", 17],
      ["other", 14],
    ] as const) {
      const region = focusRegionFor({
        kind: "place",
        lat: 45.1,
        lng: 4.2,
        placeKind: kind,
        nonce: 1,
      })
      expect(region.latitude).toBe(45.1)
      expect(region.longitude).toBe(4.2)
      expect(computeRegionZoom(region)).toBe(zoom)
    }
  })

  test("a parcel with bounds is framed with a margin around its box", () => {
    const region = focusRegionFor({
      kind: "parcel",
      parcelId: "P",
      lat: 0,
      lng: 0,
      bbox: [2, 45, 2.01, 45.004],
      nonce: 1,
    })
    expect(region.longitude).toBeCloseTo(2.005, 10)
    expect(region.latitude).toBeCloseTo(45.002, 10)
    expect(region.longitudeDelta).toBeCloseTo(0.01 * PARCEL_FOCUS_SPAN_FACTOR, 10)
    expect(region.latitudeDelta).toBeCloseTo(0.004 * PARCEL_FOCUS_SPAN_FACTOR, 10)
  })

  test("a tiny or degenerate box never frames less than the span of zoom 18", () => {
    const region = focusRegionFor({
      kind: "parcel",
      parcelId: "P",
      lat: 0,
      lng: 0,
      bbox: [2, 45, 2, 45],
      nonce: 1,
    })
    expect(region.longitudeDelta).toBeCloseTo(360 / 2 ** 18, 10)
    expect(region.latitudeDelta).toBeCloseTo(360 / 2 ** 18, 10)
  })

  test("a parcel without bounds is centred on its centroid at zoom 17", () => {
    const region = focusRegionFor({
      kind: "parcel",
      parcelId: "P",
      lat: 46.2,
      lng: 3.3,
      bbox: null,
      nonce: 1,
    })
    expect(region.latitude).toBe(46.2)
    expect(region.longitude).toBe(3.3)
    expect(computeRegionZoom(region)).toBe(17)
  })
})

describe("focusParcelIds", () => {
  test("is the survey's parcels, the found parcel, or nothing", () => {
    expect(
      focusParcelIds({
        kind: "survey",
        surveyId: "s",
        lat: 1,
        lng: 1,
        parcelIds: ["A", "B"],
        nonce: 1,
      }),
    ).toEqual(["A", "B"])
    expect(
      focusParcelIds({ kind: "parcel", parcelId: "P", lat: 1, lng: 1, bbox: null, nonce: 1 }),
    ).toEqual(["P"])
    expect(
      focusParcelIds({ kind: "place", lat: 1, lng: 1, placeKind: "address", nonce: 1 }),
    ).toBeUndefined()
    expect(focusParcelIds(undefined)).toBeUndefined()
  })
})

describe("focus builders", () => {
  test("placeFocus carries the position and the kind of the result", () => {
    const item: SearchPlaceItem = {
      id: "x",
      name: "Lyon",
      kind: "municipality",
      context: null,
      lat: 45.7,
      lng: 4.8,
      score: 0.9,
    }
    expect(placeFocus(item, 7)).toEqual({
      kind: "place",
      lat: 45.7,
      lng: 4.8,
      placeKind: "municipality",
      nonce: 7,
    })
  })

  test("parcelFocus carries the id, the centroid and the bounds of the result", () => {
    const item: SearchParcelItem = {
      parcel_id: "69123000AB0012",
      commune_code: "69123",
      commune_name: "Lyon",
      section: "AB",
      number: "12",
      centroid: { lat: 45.7, lng: 4.8 },
      bbox: [4.79, 45.69, 4.81, 45.71],
      survey_count: 2,
    }
    expect(parcelFocus(item, 8)).toEqual({
      kind: "parcel",
      parcelId: "69123000AB0012",
      lat: 45.7,
      lng: 4.8,
      bbox: [4.79, 45.69, 4.81, 45.71],
      nonce: 8,
    })
  })
})
