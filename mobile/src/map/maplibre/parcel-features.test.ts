import { brandMapTokens } from "../../app/brand-tokens"
import { contrastRatio } from "../../app/contrast"
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

describe("by score (the Explorer, OA-126)", () => {
  const scored = (id: string, total: number | null | undefined, status = "studied") =>
    ({
      parcel_id: id,
      study_status: status,
      latest_ibp_total: total,
      geometry: { type: "Polygon", coordinates: [RING] },
    }) as unknown as PublicParcelStatusItem

  const fillOf = (item: PublicParcelStatusItem, selected: string[] = [], byScore = true) =>
    buildParcelFeatureCollection([item], selected, { byScore }).features[0].properties

  test("a studied parcel takes the fill and outline of the band of its total", () => {
    expect(fillOf(scored("L", 8)).fill).toBe(brandMapTokens.scoreParcelFill.low)
    expect(fillOf(scored("L", 8)).stroke).toBe(brandMapTokens.scoreMarker.low)
    expect(fillOf(scored("M", 27)).fill).toBe(brandMapTokens.scoreParcelFill.mid)
    expect(fillOf(scored("H", 45)).fill).toBe(brandMapTokens.scoreParcelFill.high)
  })

  test("the survey shown keeps its score colour with the heavy dark outline", () => {
    const properties = fillOf(scored("H", 45), ["h"])
    expect(properties.fill).toBe(brandMapTokens.scoreParcelFill.high)
    expect(properties.stroke).toBe(brandMapTokens.scoreMarkerSelectedBorder)
    expect(properties.strokeWidth).toBe(brandMapTokens.strokeWidthSelected)
  })

  test("a parcel without a usable total, or never studied, is the warm grey, never green", () => {
    const unscored = {
      fill: brandMapTokens.parcelUnscoredFill,
      stroke: brandMapTokens.parcelUnscored,
      strokeWidth: brandMapTokens.strokeWidthDefault,
    }
    expect(fillOf(scored("N", null))).toMatchObject(unscored)
    expect(fillOf(scored("N", Number.NaN))).toMatchObject(unscored)
    expect(fillOf(scored("N", undefined))).toMatchObject(unscored)
    expect(fillOf(scored("U", 40, "not_studied"))).toMatchObject(unscored)
    expect(fillOf(scored("U", null, "not_studied"))).toMatchObject(unscored)
  })

  test("a selected parcel without a score keeps the selected paint", () => {
    expect(fillOf(scored("N", null), ["n"])).toMatchObject({
      fill: brandMapTokens.parcelSelectedFill,
      stroke: brandMapTokens.parcelSelected,
      strokeWidth: brandMapTokens.strokeWidthSelected,
    })
  })

  test("the warm grey is neither green nor any score colour", () => {
    const greens = [
      brandMapTokens.parcelStudied,
      brandMapTokens.parcelNeutral,
      brandMapTokens.parcelStudiedFill,
      brandMapTokens.parcelNeutralFill,
      ...Object.values(brandMapTokens.scoreMarker),
      ...Object.values(brandMapTokens.scoreParcelFill),
    ]
    expect(greens).not.toContain(brandMapTokens.parcelUnscored)
    expect(greens).not.toContain(brandMapTokens.parcelUnscoredFill)
    // A warm grey: red over green over blue, with green never the strongest channel.
    const [r, g, b] = [1, 3, 5].map((at) =>
      parseInt(brandMapTokens.parcelUnscored.slice(at, at + 2), 16),
    )
    expect(r).toBeGreaterThanOrEqual(g)
    expect(g).toBeGreaterThanOrEqual(b)
    expect(r - b).toBeLessThan(32)
  })

  test("the grey outline reads on the light plan and on the dark orthophoto (3:1)", () => {
    // Stand-ins for the two basemaps: white and the IGN plan's beige, a dark forest orthophoto.
    for (const background of ["#FFFFFF", "#F2EFE9", "#2E3A24"]) {
      expect(contrastRatio(brandMapTokens.parcelUnscored, background)).toBeGreaterThanOrEqual(3)
    }
  })

  test("the parcel picker keeps the status colours whatever the total", () => {
    expect(fillOf(scored("H", 45), [], false).fill).toBe(brandMapTokens.parcelStudiedFill)
    expect(fillOf(scored("N", null), [], false).fill).toBe(brandMapTokens.parcelStudiedFill)
    expect(fillOf(scored("U", null, "not_studied"), [], false).fill).toBe(
      brandMapTokens.parcelNeutralFill,
    )
  })
})
