import {
  BASEMAP_KEYS,
  offlineAreaDir,
  offlineBasemapDir,
  offlineTileLocalPath,
  offlineTileUrlTemplate,
  offlineTilesRootDir,
  remoteTileUrl,
  remoteTileUrlTemplate,
} from "./basemaps"

const DOCS = "file:///mock/documents/"

describe("remote tile URLs", () => {
  test("builds a URL template with placeholders for every basemap", () => {
    for (const basemap of BASEMAP_KEYS) {
      const template = remoteTileUrlTemplate(basemap)
      expect(template).toContain("{z}")
      expect(template).toContain("{x}")
      expect(template).toContain("{y}")
      expect(template.startsWith("https://data.geopf.fr/tms/1.0.0/")).toBe(true)
    }
  })

  test("resolves a concrete tile URL", () => {
    const url = remoteTileUrl("satellite", { z: 15, x: 1, y: 2 })
    expect(url).toBe("https://data.geopf.fr/tms/1.0.0/ORTHOIMAGERY.ORTHOPHOTOS/15/1/2.png")
  })
})

describe("local path builders", () => {
  test("nest area under the shared offline-tiles root, basemap under area", () => {
    const root = offlineTilesRootDir(DOCS)
    const areaDir = offlineAreaDir(DOCS, "area-1")
    const basemapDir = offlineBasemapDir(DOCS, "area-1", "map")

    expect(areaDir.startsWith(root)).toBe(true)
    expect(basemapDir.startsWith(areaDir)).toBe(true)
  })

  test("builds a concrete local tile path ending in the tile coordinates", () => {
    const path = offlineTileLocalPath(DOCS, "area-1", "map", { z: 15, x: 3, y: 4 })
    expect(path).toBe(`${DOCS}offline-tiles/area-1/map/15/3/4.png`)
  })

  test("the local UrlTile template keeps the {z}/{x}/{y} placeholders", () => {
    const template = offlineTileUrlTemplate(DOCS, "area-1", "satellite")
    expect(template).toBe(`${DOCS}offline-tiles/area-1/satellite/{z}/{x}/{y}.png`)
  })
})
