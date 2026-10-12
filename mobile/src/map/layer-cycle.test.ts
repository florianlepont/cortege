import {
  availableCycle,
  BASEMAP_CYCLE,
  cycleIndex,
  neighbourLayer,
  canCompare,
  skippedCount,
} from "./layer-cycle"
import { BASE_LAYER_KEYS } from "./layers"
import type { BaseLayerKey } from "./layers"

const all = () => true
const without =
  (...missing: BaseLayerKey[]) =>
  (key: BaseLayerKey) =>
    !missing.includes(key)

describe("BASEMAP_CYCLE", () => {
  it("is the catalogue order: Plan, Satellite, Carte d'état-major, Carte de 1950, Photos 1950", () => {
    expect(BASEMAP_CYCLE).toEqual(BASE_LAYER_KEYS)
    expect(BASEMAP_CYCLE).toEqual(["map", "satellite", "etat-major", "carte-1950", "photos-1950"])
  })
})

describe("availableCycle", () => {
  it("keeps the cycle order of the available layers", () => {
    expect(availableCycle(all)).toEqual(BASEMAP_CYCLE)
    expect(availableCycle(without("etat-major"))).toEqual([
      "map",
      "satellite",
      "carte-1950",
      "photos-1950",
    ])
  })

  it("leaves out the excluded layer", () => {
    expect(availableCycle(all, "satellite")).toEqual([
      "map",
      "etat-major",
      "carte-1950",
      "photos-1950",
    ])
  })
})

describe("neighbourLayer", () => {
  it("goes to the next layer and wraps at both ends", () => {
    expect(neighbourLayer("map", 1, { isAvailable: all })).toBe("satellite")
    expect(neighbourLayer("map", -1, { isAvailable: all })).toBe("photos-1950")
    expect(neighbourLayer("photos-1950", 1, { isAvailable: all })).toBe("map")
    expect(neighbourLayer("etat-major", -1, { isAvailable: all })).toBe("satellite")
  })

  it("skips an unavailable layer in both directions", () => {
    const isAvailable = without("etat-major")
    expect(neighbourLayer("satellite", 1, { isAvailable })).toBe("carte-1950")
    expect(neighbourLayer("carte-1950", -1, { isAvailable })).toBe("satellite")
  })

  it("skips the layer shown on the other side of a comparison", () => {
    expect(neighbourLayer("map", 1, { isAvailable: all, exclude: "satellite" })).toBe("etat-major")
    expect(neighbourLayer("etat-major", -1, { isAvailable: all, exclude: "satellite" })).toBe("map")
    expect(neighbourLayer("map", -1, { isAvailable: all, exclude: "photos-1950" })).toBe(
      "carte-1950",
    )
  })

  it("is null when no other layer qualifies", () => {
    const onlyMap = (key: BaseLayerKey) => key === "map"
    expect(neighbourLayer("map", 1, { isAvailable: onlyMap })).toBeNull()
    expect(neighbourLayer("map", -1, { isAvailable: onlyMap })).toBeNull()
    const mapAndSatellite = (key: BaseLayerKey) => key === "map" || key === "satellite"
    expect(
      neighbourLayer("map", 1, { isAvailable: mapAndSatellite, exclude: "satellite" }),
    ).toBeNull()
  })

  it("searches from the cycle position of a current layer that is itself unavailable", () => {
    const isAvailable = without("etat-major")
    expect(neighbourLayer("etat-major", 1, { isAvailable })).toBe("carte-1950")
    expect(neighbourLayer("etat-major", -1, { isAvailable })).toBe("satellite")
  })
})

describe("skippedCount", () => {
  it("counts the layers the cycle skips", () => {
    expect(skippedCount(all)).toBe(0)
    expect(skippedCount(without("etat-major"))).toBe(1)
    expect(skippedCount(without("etat-major", "photos-1950"))).toBe(2)
  })
})

describe("cycleIndex", () => {
  it("is the 1 based position, for 'fond n sur 5'", () => {
    expect(cycleIndex("map")).toBe(1)
    expect(cycleIndex("etat-major")).toBe(3)
    expect(cycleIndex("photos-1950")).toBe(5)
  })
})

describe("canCompare", () => {
  test("needs two available bases", () => {
    expect(canCompare(() => true)).toBe(true)
    expect(canCompare((key) => key === "map" || key === "satellite")).toBe(true)
    expect(canCompare((key) => key === "map")).toBe(false)
    expect(canCompare(() => false)).toBe(false)
  })
})
