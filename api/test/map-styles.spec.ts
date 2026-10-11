import { NotFoundException, ServiceUnavailableException } from "@nestjs/common"
import {
  MAP_STYLE_CACHE_TTL_MS,
  MapStylesService,
  withCadastre,
} from "../src/surveys/map-styles.service"

const PLAN = { version: 8, sources: { plan_ign: { type: "vector" } }, layers: [{ id: "bg" }] }

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

describe("MapStylesService", () => {
  it("builds the satellite style with no network call", async () => {
    const fetchSpy = mockFetch(() => Promise.reject(new Error("no network expected")))
    const style = (await new MapStylesService().getStyle("satellite")) as { layers: unknown[] }
    expect(style.layers).toHaveLength(2)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

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

  it("rejects an unknown style name", async () => {
    await expect(new MapStylesService().getStyle("hybrid")).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })
})
