import { readFileSync } from "fs"
import * as path from "path"
import { NotFoundException, ServiceUnavailableException } from "@nestjs/common"
import {
  MAP_STYLE_CACHE_TTL_MS,
  MapStylesService,
  OFFLINE_STYLE_NAMES,
  RASTER_PACK_STYLES,
  rasterPackStyle,
  withCadastre,
} from "../src/surveys/map-styles.service"

const PLAN = { version: 8, sources: { plan_ign: { type: "vector" } }, layers: [{ id: "bg" }] }

// Offline tile zoom caps, the same literal table as `ZOOM_CAPS` (offline column) of
// `mobile/src/map/layers.test.ts`.
const OFFLINE_CAPS = {
  satellite: 19,
  "etat-major": 15,
  "carte-1950": 15,
  "photos-1950": 17,
  "types-foret": 16,
}
const RASTER_NAMES = Object.keys(OFFLINE_CAPS) as Array<keyof typeof OFFLINE_CAPS>

type RasterStyle = {
  version: number
  sources: Record<
    string,
    { type: string; tiles: string[]; tileSize: number; minzoom: number; maxzoom: number }
  >
  layers: Array<{ id: string; type: string; source: string }>
}

function mockFetch(impl: () => Promise<unknown>) {
  return jest.spyOn(global, "fetch").mockImplementation(impl as typeof fetch)
}

afterEach(() => jest.restoreAllMocks())

describe("withCadastre", () => {
  it("adds the cadastre source and a top layer, keeping the base", () => {
    const style = withCadastre(PLAN) as { sources: object; layers: Array<{ id: string }> }
    expect(Object.keys(style.sources)).toEqual(["plan_ign", "ign-cadastre"])
    expect(style.layers.map((layer) => layer.id)).toEqual(["bg", "ign-cadastre"])
    expect(PLAN.layers).toHaveLength(1)
  })
})

describe("pack styles", () => {
  it("lists exactly the six names", () => {
    expect([...OFFLINE_STYLE_NAMES]).toEqual(["map", ...RASTER_NAMES])
  })

  it.each(RASTER_NAMES)("builds the %s style with no network call", async (name) => {
    const fetchSpy = mockFetch(() => Promise.reject(new Error("no network expected")))
    const style = (await new MapStylesService().getStyle(name)) as RasterStyle
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(style.version).toBe(8)
    const sources = Object.values(style.sources)
    expect(sources).toHaveLength(1)
    expect(style.layers).toHaveLength(1)
    expect(style.layers[0]).toMatchObject({ type: "raster", source: Object.keys(style.sources)[0] })
    expect(sources[0]).toMatchObject({
      type: "raster",
      tileSize: 256,
      minzoom: 0,
      maxzoom: OFFLINE_CAPS[name],
      tiles: [RASTER_PACK_STYLES[name].tiles],
    })
  })

  it("keeps the satellite source id and no cadastre", () => {
    const style = rasterPackStyle("satellite") as RasterStyle
    expect(Object.keys(style.sources)).toEqual(["ortho"])
    expect(JSON.stringify(style)).not.toContain("CADASTRALPARCELS")
  })

  it("has the offline cap table of the mobile test", () => {
    const caps = Object.fromEntries(
      RASTER_NAMES.map((name) => [name, RASTER_PACK_STYLES[name].maxzoom]),
    )
    expect(caps).toEqual(OFFLINE_CAPS)
  })

  it("finds each API template verbatim in the mobile catalogue", () => {
    const catalogue = readFileSync(path.join(__dirname, "../../mobile/src/map/layers.ts"), "utf8")
    for (const name of RASTER_NAMES) {
      expect(catalogue).toContain(`"${RASTER_PACK_STYLES[name].tiles}"`)
    }
  })
})

describe("MapStylesService", () => {
  it("fetches the Plan IGN style once, adds the cadastre and caches it", async () => {
    const fetchSpy = mockFetch(async () => ({ ok: true, json: async () => PLAN }))
    const service = new MapStylesService()
    const first = (await service.getStyle("map", 1000)) as { layers: unknown[] }
    await service.getStyle("map", 2000)
    expect(first.layers).toHaveLength(2)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    await service.getStyle("map", 1000 + MAP_STYLE_CACHE_TTL_MS + 1)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it("keeps serving the stale copy when a refresh fails, and 503 without any copy", async () => {
    const service = new MapStylesService()
    mockFetch(async () => ({ ok: false, status: 500 }))
    await expect(service.getStyle("map", 0)).rejects.toBeInstanceOf(ServiceUnavailableException)
    mockFetch(async () => ({ ok: true, json: async () => PLAN }))
    await service.getStyle("map", 0)
    mockFetch(async () => ({ ok: false, status: 500 }))
    await expect(service.getStyle("map", MAP_STYLE_CACHE_TTL_MS + 1)).resolves.toBeDefined()
  })

  it.each([
    "hybrid",
    "MAP",
    "../map",
    "map.json",
    "",
    "photos-1950.png",
    "__proto__",
    "constructor",
  ])("rejects the name %p with a 404 and no fetch", async (name) => {
    const fetchSpy = mockFetch(() => Promise.reject(new Error("no network expected")))
    await expect(new MapStylesService().getStyle(name)).rejects.toBeInstanceOf(NotFoundException)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
