import type { PublicMapItem, PublicParcelStatusItem } from "../../app/types"
import { markerItemsAtParcelZoom } from "./parcel-coverage"

// A square parcel around (2.45, 48.84), with a square hole in its middle.
const OUTER: Array<[number, number]> = [
  [2.44, 48.83],
  [2.46, 48.83],
  [2.46, 48.85],
  [2.44, 48.85],
  [2.44, 48.83],
]
const HOLE: Array<[number, number]> = [
  [2.449, 48.839],
  [2.451, 48.839],
  [2.451, 48.841],
  [2.449, 48.841],
  [2.449, 48.839],
]

function survey(id: string, lng = 2.445, lat = 48.845, total = 27): PublicMapItem {
  return {
    survey_id: id,
    display_location: { lat, lng },
    survey_date: "2026-10-01",
    region_code: "IDF",
    ibp_total: total,
  }
}

function parcel(overrides: Partial<PublicParcelStatusItem> = {}): PublicParcelStatusItem {
  return {
    parcel_id: "94080000AB0012",
    study_status: "studied",
    latest_submitted_survey_id: "other",
    latest_ibp_total: 27,
    geometry: { type: "Polygon", coordinates: [OUTER] },
    ...overrides,
  }
}

const ids = (items: PublicMapItem[]) => items.map((item) => item.survey_id)

describe("markerItemsAtParcelZoom (12.2-19: a score never vanishes at zoom 15)", () => {
  test("a survey shown by a scored parcel of its own loses its marker", () => {
    const shown = parcel({ latest_submitted_survey_id: "s1" })
    // Matched by survey id, wherever its display position falls.
    expect(ids(markerItemsAtParcelZoom([survey("s1", 5, 45)], [shown]))).toEqual([])
    // A parcel without a polygon is not drawn, so it shows nothing: the marker stays.
    const undrawn = parcel({ latest_submitted_survey_id: "s1", geometry: undefined })
    expect(ids(markerItemsAtParcelZoom([survey("s1", 5, 45)], [undrawn]))).toEqual(["s1"])
  })

  test("a survey inside a scored parcel loses its marker (a newer survey of the parcel)", () => {
    expect(ids(markerItemsAtParcelZoom([survey("old")], [parcel()]))).toEqual([])
    const withoutId = parcel({ latest_submitted_survey_id: undefined })
    expect(ids(markerItemsAtParcelZoom([survey("old")], [withoutId]))).toEqual([])
  })

  test("a survey keeps its marker when no parcel shows its score", () => {
    const items = [survey("s1")]
    // No parcel loaded yet (or an offline cache without it).
    expect(ids(markerItemsAtParcelZoom(items, []))).toEqual(["s1"])
    // The parcel drawn there carries no score: not studied, or studied without a total.
    for (const unscored of [
      parcel({ study_status: "not_studied", latest_ibp_total: null }),
      parcel({ latest_ibp_total: null, latest_submitted_survey_id: "s1" }),
      parcel({ latest_ibp_total: Number.NaN, latest_submitted_survey_id: "s1" }),
      parcel({ latest_ibp_total: undefined }),
    ]) {
      expect(ids(markerItemsAtParcelZoom(items, [unscored]))).toEqual(["s1"])
    }
  })

  test("a survey outside every scored parcel, or in its hole, keeps its marker", () => {
    const withHole = parcel({ geometry: { type: "Polygon", coordinates: [OUTER, HOLE] } })
    expect(ids(markerItemsAtParcelZoom([survey("out", 2.5, 48.9)], [withHole]))).toEqual(["out"])
    expect(ids(markerItemsAtParcelZoom([survey("hole", 2.45, 48.84)], [withHole]))).toEqual([
      "hole",
    ])
    expect(ids(markerItemsAtParcelZoom([survey("in", 2.442, 48.832)], [withHole]))).toEqual([])
  })

  test("multipolygons count each part; unusable geometries cover nothing", () => {
    const far: Array<[number, number]> = [
      [3, 49],
      [3.01, 49],
      [3.01, 49.01],
      [3, 49],
    ]
    const multi = parcel({ geometry: { type: "MultiPolygon", coordinates: [[far], [OUTER]] } })
    expect(ids(markerItemsAtParcelZoom([survey("s1")], [multi]))).toEqual([])
    for (const geometry of [
      { type: "Polygon" as const, coordinates: [] },
      { type: "Polygon" as const, coordinates: "nope" },
      { type: "Polygon" as const, coordinates: ["nope"] },
      { type: "Polygon" as const, coordinates: [[[2.44, 48.83]]] },
      { type: "MultiPolygon" as const, coordinates: [[], "x"] },
      {
        type: "Point",
        coordinates: [2.445, 48.845],
      } as unknown as PublicParcelStatusItem["geometry"],
    ]) {
      expect(ids(markerItemsAtParcelZoom([survey("s1")], [parcel({ geometry })]))).toEqual(["s1"])
    }
  })

  test("the author's own drafts always keep their marker", () => {
    const shown = parcel({ latest_submitted_survey_id: "d1" })
    expect(ids(markerItemsAtParcelZoom([survey("d1")], [shown], new Set(["d1"])))).toEqual(["d1"])
  })

  test("keeps the order of the surveys", () => {
    const items = [survey("a", 2.5, 48.9), survey("b"), survey("c", 2.6, 48.9)]
    expect(ids(markerItemsAtParcelZoom(items, [parcel()]))).toEqual(["a", "c"])
  })
})
