import {
  hasIbpSurvey,
  isOldBase,
  parcelCasingVisible,
  parcelFillFactor,
  PARCELS_MODES,
  parcelsRendering,
} from "./parcels-visibility"
import { BASE_LAYER_KEYS } from "./layers"

describe("PARCELS_MODES", () => {
  it("lists the three Parcelles states in control order", () => {
    expect(PARCELS_MODES).toEqual(["all", "withIbp", "none"])
  })
})

describe("parcelsRendering", () => {
  it("Toutes draws the cadastre lines and every polygon, as today", () => {
    expect(parcelsRendering("all")).toEqual({ cadastre: true, polygonFilter: null, tappable: true })
  })

  it("Avec IBP draws no cadastre, only polygons with a survey (or a search focus)", () => {
    const rendering = parcelsRendering("withIbp")
    expect(rendering.cadastre).toBe(false)
    expect(rendering.tappable).toBe(true)
    expect(rendering.polygonFilter).toEqual([
      "any",
      ["==", ["get", "hasSurvey"], true],
      ["==", ["get", "selected"], true],
    ])
  })

  it("Aucune draws only a search focus and makes parcels not tappable", () => {
    const rendering = parcelsRendering("none")
    expect(rendering.cadastre).toBe(false)
    expect(rendering.tappable).toBe(false)
    expect(rendering.polygonFilter).toEqual(["==", ["get", "selected"], true])
  })
})

describe("hasIbpSurvey", () => {
  it("is true for a studied parcel", () => {
    expect(hasIbpSurvey({ parcel_id: "abc", study_status: "studied" }, new Set())).toBe(true)
  })

  it("is false for a parcel not studied and not in the author's own survey parcels", () => {
    expect(hasIbpSurvey({ parcel_id: "abc", study_status: "not_studied" }, new Set())).toBe(false)
    expect(hasIbpSurvey({ parcel_id: "abc", study_status: "not_studied" }, new Set(["XYZ"]))).toBe(
      false,
    )
  })

  it("is true for a not studied parcel with an own survey (draft included), id normalised", () => {
    const own = new Set(["77001000AB0012"])
    expect(hasIbpSurvey({ parcel_id: " 77001000ab0012 ", study_status: "not_studied" }, own)).toBe(
      true,
    )
  })
})

describe("old bases", () => {
  it("isOldBase is true for the three old bases only", () => {
    expect(BASE_LAYER_KEYS.filter(isOldBase)).toEqual(["etat-major", "carte-1950", "photos-1950"])
  })

  it("parcelFillFactor lightens the fill on the old bases only", () => {
    expect(parcelFillFactor("carte-1950", 0.6)).toBe(0.6)
    expect(parcelFillFactor("etat-major", 0.6)).toBe(0.6)
    expect(parcelFillFactor("photos-1950", 0.6)).toBe(0.6)
    expect(parcelFillFactor("satellite", 0.6)).toBe(1)
    expect(parcelFillFactor("map", 0.6)).toBe(1)
  })

  it("parcelCasingVisible shows on the old bases and with the forest overlay", () => {
    expect(parcelCasingVisible("photos-1950", false)).toBe(true)
    expect(parcelCasingVisible("map", true)).toBe(true)
    expect(parcelCasingVisible("satellite", true)).toBe(true)
    expect(parcelCasingVisible("map", false)).toBe(false)
    expect(parcelCasingVisible("satellite", false)).toBe(false)
  })
})
