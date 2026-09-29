import { boundsFromRegion, boundsToRegion, regionFromViewChange } from "./regions"

describe("MapLibre regions", () => {
  test("a view change becomes a centre and a span", () => {
    expect(regionFromViewChange({ center: [4.84, 45.76], bounds: [4.8, 45.7, 4.9, 45.8] })).toEqual(
      {
        latitude: 45.76,
        longitude: 4.84,
        latitudeDelta: expect.closeTo(0.1, 6),
        longitudeDelta: expect.closeTo(0.1, 6),
      },
    )
  })

  test("the spans are positive whatever the order of the corners", () => {
    const region = regionFromViewChange({ center: [0, 0], bounds: [1, 1, -1, -1] })
    expect(region.latitudeDelta).toBe(2)
    expect(region.longitudeDelta).toBe(2)
  })

  test("a region becomes the bounds that show it", () => {
    expect(
      boundsFromRegion({ latitude: 45, longitude: 5, latitudeDelta: 2, longitudeDelta: 4 }),
    ).toEqual([3, 44, 7, 46])
  })

  test("bounds and region round trip", () => {
    const region = { latitude: 45.1, longitude: 5.2, latitudeDelta: 0.012, longitudeDelta: 0.02 }
    const back = boundsToRegion(boundsFromRegion(region))
    expect(back.latitude).toBeCloseTo(region.latitude, 9)
    expect(back.longitude).toBeCloseTo(region.longitude, 9)
    expect(back.latitudeDelta).toBeCloseTo(region.latitudeDelta, 9)
    expect(back.longitudeDelta).toBeCloseTo(region.longitudeDelta, 9)
  })
})
