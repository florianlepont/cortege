import {
  attributionLayerKeys,
  isOutsideCoverage,
  isOverzoomed,
  overzoomNotice,
} from "./layer-notices"

describe("isOverzoomed", () => {
  it("starts at the last tile zoom + 1 for the old maps", () => {
    expect(isOverzoomed("etat-major", 15.9, false)).toBe(false)
    expect(isOverzoomed("etat-major", 16, false)).toBe(true)
    expect(isOverzoomed("carte-1950", 15.9, false)).toBe(false)
    expect(isOverzoomed("carte-1950", 16, false)).toBe(true)
  })

  it("uses the lower offline cap of the 1950 photographs", () => {
    expect(isOverzoomed("photos-1950", 18.9, false)).toBe(false)
    expect(isOverzoomed("photos-1950", 19, false)).toBe(true)
    expect(isOverzoomed("photos-1950", 18, true)).toBe(true)
    expect(isOverzoomed("photos-1950", 17.9, true)).toBe(false)
  })

  it("covers the overlay, the satellite and the vector plan", () => {
    expect(isOverzoomed("types-foret", 17, false)).toBe(true)
    expect(isOverzoomed("types-foret", 16.9, false)).toBe(false)
    expect(isOverzoomed("satellite", 19.5, false)).toBe(false)
    expect(isOverzoomed("satellite", 20, false)).toBe(true)
    expect(isOverzoomed("map", 22, false)).toBe(false)
  })
})

describe("overzoomNotice", () => {
  it("lets the base text win over the overlay text", () => {
    expect(overzoomNotice({ bases: ["map", "etat-major"], overlay: true }, 16.5, false)).toBe(
      "base",
    )
  })

  it("names the overlay when only the overlay is scaled", () => {
    expect(overzoomNotice({ bases: ["satellite"], overlay: true }, 17, false)).toBe("overlay")
  })

  it("shows nothing when no shown layer is scaled", () => {
    expect(overzoomNotice({ bases: ["satellite"], overlay: false }, 17, false)).toBeNull()
    expect(overzoomNotice({ bases: [], overlay: true }, 16, false)).toBeNull()
  })
})

describe("isOutsideCoverage", () => {
  it("flags a point outside the box of a layer that has one", () => {
    expect(isOutsideCoverage("etat-major", { lat: 16.25, lng: -61.55 })).toBe(true)
    expect(isOutsideCoverage("etat-major", { lat: 48.4, lng: 2.69 })).toBe(false)
    expect(isOutsideCoverage("types-foret", { lat: 16.25, lng: -61.55 })).toBe(true)
  })

  it("never flags a layer with no coverage box", () => {
    expect(isOutsideCoverage("photos-1950", { lat: 0, lng: 0 })).toBe(false)
    expect(isOutsideCoverage("carte-1950", { lat: 0, lng: 0 })).toBe(false)
    expect(isOutsideCoverage("map", { lat: 0, lng: 0 })).toBe(false)
  })
})

describe("attributionLayerKeys", () => {
  it("is null for the default display", () => {
    expect(attributionLayerKeys({ left: "map", right: null, overlay: false })).toBeNull()
    expect(attributionLayerKeys({ left: "satellite", right: null, overlay: false })).toBeNull()
  })

  it("lists the shown layers left to right then the overlay", () => {
    expect(
      attributionLayerKeys({ left: "etat-major", right: "photos-1950", overlay: true }),
    ).toEqual(["etat-major", "photos-1950", "types-foret"])
    expect(attributionLayerKeys({ left: "map", right: "satellite", overlay: false })).toEqual([
      "map",
      "satellite",
    ])
  })

  it("lists a single old map or an overlay over a default base", () => {
    expect(attributionLayerKeys({ left: "carte-1950", right: null, overlay: false })).toEqual([
      "carte-1950",
    ])
    expect(attributionLayerKeys({ left: "map", right: null, overlay: true })).toEqual([
      "map",
      "types-foret",
    ])
  })

  it("names a layer once when both sides show it", () => {
    expect(attributionLayerKeys({ left: "satellite", right: "satellite", overlay: false })).toEqual(
      ["satellite"],
    )
  })
})
