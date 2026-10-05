import { regionAround } from "./offline-coverage"

describe("regionAround", () => {
  test("spans about 4 km north to south around the point", () => {
    const region = regionAround({ lat: 0, lng: 10 })
    expect(region.latitude).toBe(0)
    expect(region.longitude).toBe(10)
    expect(region.latitudeDelta * 111.32).toBeCloseTo(4, 5)
    expect(region.longitudeDelta).toBeCloseTo(region.latitudeDelta, 8)
  })

  test("widens the longitude span with the latitude so the area stays square", () => {
    const region = regionAround({ lat: 60, lng: 2 }, 1)
    expect(region.longitudeDelta).toBeCloseTo(region.latitudeDelta * 2, 5)
  })

  test("stays finite at the poles", () => {
    expect(Number.isFinite(regionAround({ lat: 90, lng: 0 }).longitudeDelta)).toBe(true)
  })
})
