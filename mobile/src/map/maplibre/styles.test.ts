import { CADASTRE_TILES, ORTHO_STYLE, PLAN_IGN_STYLE_URL, mapStyleFor } from "./styles"

describe("map styles", () => {
  test("the plan basemap is the IGN vector style URL", () => {
    expect(mapStyleFor("map")).toBe(PLAN_IGN_STYLE_URL)
    expect(PLAN_IGN_STYLE_URL).toMatch(/^https:\/\/data\.geopf\.fr\/.*PLAN\.IGN\/gris\.json$/)
  })

  test("the satellite basemap is the IGN orthophoto raster style", () => {
    expect(mapStyleFor("satellite")).toBe(ORTHO_STYLE)
    const source = ORTHO_STYLE.sources.ortho
    expect(source).toMatchObject({ type: "raster", tileSize: 256 })
    expect((source as { tiles: string[] }).tiles[0]).toContain("ORTHOIMAGERY.ORTHOPHOTOS")
    expect(ORTHO_STYLE.layers).toEqual([{ id: "ortho", type: "raster", source: "ortho" }])
  })

  test("the cadastre tiles come from the same provider", () => {
    expect(CADASTRE_TILES).toBe(
      "https://data.geopf.fr/tms/1.0.0/CADASTRALPARCELS.PARCELS/{z}/{x}/{y}.png",
    )
  })
})
