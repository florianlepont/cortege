import { brandMapTokens } from "../../app/brand-tokens"
import type { PublicParcelStatusItem } from "../../app/types"
import { buildParcelFeatureCollection } from "./parcel-features"

const RING = [
  [4.8, 45.7],
  [4.9, 45.7],
  [4.9, 45.8],
  [4.8, 45.7],
]
const HOLE = [
  [4.83, 45.72],
  [4.85, 45.72],
  [4.85, 45.74],
  [4.83, 45.72],
]

function parcel(
  id: string,
  geometry: unknown,
  study_status: "studied" | "not_studied" = "not_studied",
): PublicParcelStatusItem {
  return { parcel_id: id, study_status, geometry } as unknown as PublicParcelStatusItem
}

describe("buildParcelFeatureCollection", () => {
  test("a polygon keeps its outer ring and its holes", () => {
    const { features } = buildParcelFeatureCollection([
      parcel("P1", { type: "Polygon", coordinates: [RING, HOLE] }),
    ])
    expect(features).toHaveLength(1)
    expect(features[0].geometry).toEqual({ type: "Polygon", coordinates: [RING, HOLE] })
    expect(features[0].properties.parcel_id).toBe("P1")
  })

  test("a multipolygon keeps its usable polygons only", () => {
    const { features } = buildParcelFeatureCollection([
      parcel("P2", {
        type: "MultiPolygon",
        coordinates: [[RING], [[[4.8, 45.7]]], "nope", []],
      }),
    ])
    expect(features[0].geometry).toEqual({ type: "MultiPolygon", coordinates: [[RING]] })
  })

  test("colours follow selected, then studied, then neutral", () => {
    const geometry = { type: "Polygon", coordinates: [RING] }
    const { features } = buildParcelFeatureCollection(
      [
        parcel("SEL", geometry, "studied"),
        parcel("STU", geometry, "studied"),
        parcel("NEU", geometry),
      ],
      [" sel "],
    )
    const byId = Object.fromEntries(
      features.map((feature) => [feature.properties.parcel_id, feature.properties]),
    )
    expect(byId.SEL).toMatchObject({
      fill: brandMapTokens.parcelSelectedFill,
      stroke: brandMapTokens.parcelSelected,
      strokeWidth: brandMapTokens.strokeWidthSelected,
    })
    expect(byId.STU).toMatchObject({
      fill: brandMapTokens.parcelStudiedFill,
      stroke: brandMapTokens.parcelStudied,
      strokeWidth: brandMapTokens.strokeWidthDefault,
    })
    expect(byId.NEU).toMatchObject({
      fill: brandMapTokens.parcelNeutralFill,
      stroke: brandMapTokens.parcelNeutral,
    })
  })

  test("unusable geometries are dropped without breaking the rest", () => {
    const { features } = buildParcelFeatureCollection([
      parcel("NONE", null),
      parcel("NOCOORDS", { type: "Polygon" }),
      parcel("EMPTY", { type: "Polygon", coordinates: [] }),
      parcel("SHORT", { type: "Polygon", coordinates: [[[4.8, 45.7]]] }),
      parcel("NOTARRAY", { type: "Polygon", coordinates: [RING.map(() => "x")] }),
      parcel("OUTOFRANGE", {
        type: "Polygon",
        coordinates: [
          [
            [400, 45],
            [4.9, 95],
            [4.9, 45],
            [4.8, 45],
          ],
        ],
      }),
      parcel("BADRING", { type: "Polygon", coordinates: ["nope"] }),
      parcel("POINT", { type: "Point", coordinates: [4.8, 45.7] }),
      parcel("ALLBAD", { type: "MultiPolygon", coordinates: [] }),
      parcel("GOOD", { type: "Polygon", coordinates: [RING, ["bad"]] }),
    ])
    expect(features.map((feature) => feature.properties.parcel_id)).toEqual(["GOOD"])
    expect(features[0].geometry).toEqual({ type: "Polygon", coordinates: [RING] })
  })

  test("no items gives an empty collection", () => {
    expect(buildParcelFeatureCollection([])).toEqual({ type: "FeatureCollection", features: [] })
  })
})
