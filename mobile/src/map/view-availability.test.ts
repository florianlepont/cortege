import { availableLayers, boundsContain, regionBounds } from "./view-availability"
import type { MapLayerKey } from "./layers"

const AREA = { id: "a", bounds: { minLat: 48, maxLat: 49, minLng: 2, maxLng: 3 } }
const OTHER = { id: "b", bounds: { minLat: 48.4, maxLat: 48.6, minLng: 2.4, maxLng: 2.6 } }
const INSIDE = { latitude: 48.5, longitude: 2.5, latitudeDelta: 0.1, longitudeDelta: 0.1 }
const packs = new Map<string, Set<MapLayerKey>>([
  ["a", new Set<MapLayerKey>(["map", "satellite", "etat-major"])],
  ["b", new Set<MapLayerKey>(["map", "photos-1950"])],
])

describe("regionBounds and boundsContain", () => {
  test("a region is its centre plus and minus half the span", () => {
    expect(regionBounds(INSIDE)).toEqual({
      minLat: 48.45,
      maxLat: 48.55,
      minLng: 2.45,
      maxLng: 2.55,
    })
    expect(regionBounds({ ...INSIDE, latitudeDelta: -0.2 }).maxLat).toBeCloseTo(48.6, 6)
  })

  test("contains only a box entirely inside, edges included", () => {
    expect(boundsContain(AREA.bounds, regionBounds(INSIDE))).toBe(true)
    expect(boundsContain(AREA.bounds, AREA.bounds)).toBe(true)
    expect(boundsContain(AREA.bounds, regionBounds({ ...INSIDE, latitude: 48.99 }))).toBe(false)
    expect(boundsContain(AREA.bounds, regionBounds({ ...INSIDE, latitude: 48.01 }))).toBe(false)
    expect(boundsContain(AREA.bounds, regionBounds({ ...INSIDE, longitude: 2.99 }))).toBe(false)
    expect(boundsContain(AREA.bounds, regionBounds({ ...INSIDE, longitude: 2.01 }))).toBe(false)
  })
})

describe("availableLayers", () => {
  test("online every layer is available, whatever the areas", () => {
    const all = availableLayers({ isOffline: false, areas: [], packs: new Map(), view: INSIDE })
    expect([...all].sort()).toEqual(
      ["carte-1950", "etat-major", "map", "photos-1950", "satellite", "types-foret"].sort(),
    )
  })

  test("offline the layers packed by the area around the whole view, Plan and Satellite included", () => {
    const set = availableLayers({ isOffline: true, areas: [AREA], packs, view: INSIDE })
    expect([...set].sort()).toEqual(["etat-major", "map", "satellite"])
  })

  test("offline the layers of every area that holds the view are added together", () => {
    const set = availableLayers({ isOffline: true, areas: [AREA, OTHER], packs, view: INSIDE })
    expect([...set].sort()).toEqual(["etat-major", "map", "photos-1950", "satellite"])
  })

  test("offline nothing is available when the view leaves the area, or has no pack metadata", () => {
    const out = { ...INSIDE, latitude: 50 }
    expect(availableLayers({ isOffline: true, areas: [AREA], packs, view: out }).size).toBe(0)
    expect(
      availableLayers({ isOffline: true, areas: [AREA], packs: new Map(), view: INSIDE }).size,
    ).toBe(0)
    expect(availableLayers({ isOffline: true, areas: [], packs, view: INSIDE }).size).toBe(0)
  })
})
