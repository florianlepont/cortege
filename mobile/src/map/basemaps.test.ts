import { BASEMAP_KEYS, offlineAreaDir, offlineTilesRootDir } from "./basemaps"

describe("basemaps", () => {
  test("the two basemaps", () => {
    expect(BASEMAP_KEYS).toEqual(["map", "satellite"])
  })

  test("legacy tile directories sit under the document directory", () => {
    expect(offlineTilesRootDir("file:///docs/")).toBe("file:///docs/offline-tiles/")
    expect(offlineAreaDir("file:///docs/", "a1")).toBe("file:///docs/offline-tiles/a1/")
  })
})
