import { Logger, ServiceUnavailableException } from "@nestjs/common"
import { GeocoderService, mapGeocoderFeature } from "../src/surveys/geocoder.service"
import { buildTestConfigService } from "./config-helper"

const SEARCH_URL = "https://geocoder.test/search"

function point(lng: number, lat: number) {
  return { type: "Point", coordinates: [lng, lat] }
}

// Recorded shapes (RESEARCH "IGN geocoding", live 2026-10-09), trimmed to the fields we read.
const municipality = {
  type: "Feature",
  geometry: point(2.7, 48.4),
  properties: {
    _type: "address",
    id: "77186",
    name: "Fontainebleau",
    label: "Fontainebleau 77300",
    score: 0.97,
    type: "municipality",
    city: "Fontainebleau",
    citycode: "77186",
    depcode: "77",
    context: "77, Seine-et-Marne, Île-de-France",
  },
}

const street = {
  type: "Feature",
  geometry: point(2.701, 48.401),
  properties: {
    _type: "address",
    id: "77186_1234",
    name: "Rue de la Paix",
    score: 0.88,
    type: "street",
    city: "Fontainebleau",
    citycode: "77186",
    context: "77, Seine-et-Marne, Île-de-France",
  },
}

const housenumber = {
  type: "Feature",
  geometry: point(2.702, 48.402),
  properties: {
    _type: "address",
    id: "77186_1234_12",
    name: "12 Rue de la Paix",
    score: 0.96,
    type: "housenumber",
    city: "Fontainebleau",
    citycode: "77186",
    context: "77, Seine-et-Marne, Île-de-France",
  },
}

const locality = {
  type: "Feature",
  geometry: point(2.5, 48.3),
  properties: {
    _type: "address",
    id: "77186_lieudit",
    name: "La Croix du Grand Veneur",
    score: 0.7,
    type: "locality",
    city: "Fontainebleau",
    citycode: "77186",
    context: "77, Seine-et-Marne, Île-de-France",
  },
}

function poi(overrides: Record<string, unknown> = {}, lngLat: [number, number] = [1.8, 48.6]) {
  return {
    type: "Feature",
    geometry: point(lngLat[0], lngLat[1]),
    properties: {
      _type: "poi",
      name: ["Forêt Domaniale de Rambouillet"],
      toponym: "Forêt Domaniale de Rambouillet",
      category: ["bois", "élément topographique ou forestier"],
      city: ["Rambouillet"],
      postcode: ["78120"],
      citycode: ["78517"],
      depcode: ["78"],
      score: 0.9,
      extrafields: { cleabs: "TOPONYM0000000001" },
      ...overrides,
    },
  }
}

function collection(...features: unknown[]) {
  return { type: "FeatureCollection", features }
}

type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> }

function okResponse(body: unknown): FetchResponse {
  return { ok: true, status: 200, json: async () => body }
}

function buildService(overrides: Record<string, string | undefined> = {}): GeocoderService {
  return new GeocoderService(
    buildTestConfigService({
      CADASTRE_PROVIDER: "ign",
      GEOCODING_IGN_SEARCH_URL: SEARCH_URL,
      ...overrides,
    }),
  )
}

describe("mapGeocoderFeature", () => {
  it("maps an address municipality", () => {
    expect(mapGeocoderFeature(municipality)).toEqual({
      id: "77186",
      name: "Fontainebleau",
      kind: "municipality",
      context: "Seine-et-Marne (77)",
      lat: 48.4,
      lng: 2.7,
      score: 0.97,
    })
  })

  it("maps a street with its city in the context", () => {
    expect(mapGeocoderFeature(street)).toMatchObject({
      name: "Rue de la Paix",
      kind: "street",
      context: "Fontainebleau, Seine-et-Marne (77)",
      lat: 48.401,
      lng: 2.701,
    })
  })

  it("maps a house number to the address kind", () => {
    expect(mapGeocoderFeature(housenumber)).toMatchObject({
      name: "12 Rue de la Paix",
      kind: "address",
      context: "Fontainebleau, Seine-et-Marne (77)",
    })
  })

  it("maps a locality", () => {
    expect(mapGeocoderFeature(locality)).toMatchObject({
      kind: "locality",
      context: "Fontainebleau, Seine-et-Marne (77)",
    })
  })

  it("maps a POI whose fields are arrays, naming it from the toponym", () => {
    expect(mapGeocoderFeature(poi())).toEqual({
      id: "TOPONYM0000000001",
      name: "Forêt Domaniale de Rambouillet",
      kind: "other",
      context: "Rambouillet (78)",
      lat: 48.6,
      lng: 1.8,
      score: 0.9,
    })
  })

  it("names a POI from name[0] without a toponym and builds an id from name and city code", () => {
    const mapped = mapGeocoderFeature(
      poi({ toponym: undefined, name: ["Mont Ventoux"], extrafields: undefined }),
    )
    expect(mapped).toMatchObject({ name: "Mont Ventoux", kind: "other", id: "Mont Ventoux:78517" })
  })

  it("keeps a POI context to the department when the city is missing, and null with neither", () => {
    expect(mapGeocoderFeature(poi({ city: undefined }))?.context).toBe("78")
    expect(mapGeocoderFeature(poi({ city: [], depcode: [] }))?.context).toBeNull()
    expect(mapGeocoderFeature(poi({ depcode: undefined }))?.context).toBe("Rambouillet")
  })

  it("falls back to the department code when the address context has no name", () => {
    const feature = {
      ...municipality,
      properties: { ...municipality.properties, context: undefined, depcode: "77" },
    }
    expect(mapGeocoderFeature(feature)?.context).toBe("77")
    const noDepartment = {
      ...municipality,
      properties: { ...municipality.properties, context: undefined, depcode: undefined },
    }
    expect(mapGeocoderFeature(noDepartment)?.context).toBeNull()
  })

  it("falls back to a built id and a zero score when the provider gives neither", () => {
    const feature = {
      ...municipality,
      properties: { ...municipality.properties, id: undefined, score: "high" },
    }
    expect(mapGeocoderFeature(feature)).toMatchObject({ id: "Fontainebleau:77186", score: 0 })
  })

  it("drops a feature without a name or with a bad coordinate", () => {
    expect(
      mapGeocoderFeature({ ...municipality, properties: { ...municipality.properties, name: "" } }),
    ).toBeNull()
    expect(mapGeocoderFeature(poi({ name: [], toponym: undefined }))).toBeNull()
    expect(mapGeocoderFeature({ ...municipality, geometry: point(Number.NaN, 48) })).toBeNull()
    expect(mapGeocoderFeature({ ...municipality, geometry: point(2, 91) })).toBeNull()
    expect(mapGeocoderFeature({ ...municipality, geometry: point(181, 48) })).toBeNull()
    expect(
      mapGeocoderFeature({ ...municipality, geometry: { coordinates: ["a", "b"] } }),
    ).toBeNull()
    expect(mapGeocoderFeature({ ...municipality, geometry: { coordinates: [1] } })).toBeNull()
    expect(mapGeocoderFeature({ ...municipality, geometry: null })).toBeNull()
  })

  it("drops an unknown feature type, an unknown address type and non-objects", () => {
    expect(
      mapGeocoderFeature({ ...municipality, properties: { _type: "parcel", name: "x" } }),
    ).toBeNull()
    expect(
      mapGeocoderFeature({
        ...municipality,
        properties: { ...municipality.properties, type: "district" },
      }),
    ).toBeNull()
    expect(mapGeocoderFeature(null)).toBeNull()
    expect(mapGeocoderFeature("feature")).toBeNull()
    expect(mapGeocoderFeature({ geometry: point(1, 1) })).toBeNull()
  })
})

describe("GeocoderService.searchPlaces", () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock<Promise<FetchResponse>, [URL, RequestInit?]>
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    fetchMock = jest.fn<Promise<FetchResponse>, [URL, RequestInit?]>()
    global.fetch = fetchMock as unknown as typeof fetch
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("calls the configured URL once with a cleaned q, the address,poi index and the limit", async () => {
    fetchMock.mockResolvedValue(okResponse(collection(municipality)))

    const result = await buildService().searchPlaces("  - forêt   de rambouillet", 10)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0][0]
    expect(url.origin + url.pathname).toBe(SEARCH_URL)
    expect(url.searchParams.get("q")).toBe("forêt de rambouillet")
    expect(url.searchParams.get("index")).toBe("address,poi")
    expect(url.searchParams.get("limit")).toBe("10")
    expect(result.items).toHaveLength(1)
  })

  it("sends special characters encoded in one q value and no extra parameter (T-25-13)", async () => {
    fetchMock.mockResolvedValue(okResponse(collection()))

    await buildService().searchPlaces("l'été 100% & index=parcel#x", 10)

    const url = fetchMock.mock.calls[0][0]
    expect(url.searchParams.get("q")).toBe("l'été 100% & index=parcel#x")
    expect([...url.searchParams.keys()].sort()).toEqual(["index", "limit", "q"])
    expect(url.searchParams.get("index")).toBe("address,poi")
    expect(url.hash).toBe("")
  })

  it("answers an empty list with no outbound call for a query that is too short or bare punctuation", async () => {
    const service = buildService()

    await expect(service.searchPlaces("ab", 10)).resolves.toEqual({ items: [] })
    await expect(service.searchPlaces("--", 10)).resolves.toEqual({ items: [] })
    await expect(service.searchPlaces("   ", 10)).resolves.toEqual({ items: [] })
    await expect(service.searchPlaces("-- a", 10)).resolves.toEqual({ items: [] })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("answers an empty list with no outbound call for a query over 100 characters", async () => {
    await expect(buildService().searchPlaces("a".repeat(101), 10)).resolves.toEqual({ items: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("accepts a query of exactly 100 characters", async () => {
    fetchMock.mockResolvedValue(okResponse(collection()))
    await buildService().searchPlaces("a".repeat(100), 10)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("answers an empty list with no outbound call when the provider is synthetic", async () => {
    const service = buildService({ CADASTRE_PROVIDER: "synthetic" })

    await expect(service.searchPlaces("Fontainebleau", 10)).resolves.toEqual({ items: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("de-duplicates POIs on name and city code keeping the best score, in provider order", async () => {
    fetchMock.mockResolvedValue(
      okResponse(
        collection(
          poi({ score: 0.6, extrafields: { cleabs: "A" } }),
          municipality,
          poi({ score: 0.9, extrafields: { cleabs: "B" } }),
          poi({ citycode: ["78000"], city: ["Autre"], extrafields: { cleabs: "C" } }),
        ),
      ),
    )

    const { items } = await buildService().searchPlaces("rambouillet", 10)

    expect(items.map((item) => item.id)).toEqual(["B", "77186", "C"])
    expect(items[0].score).toBe(0.9)
  })

  it("keeps a lower-scored duplicate out and skips features it cannot map", async () => {
    fetchMock.mockResolvedValue(
      okResponse(
        collection(
          poi({ score: 0.9, extrafields: { cleabs: "A" } }),
          poi({ score: 0.5, extrafields: { cleabs: "B" } }),
          { properties: { _type: "address" } },
        ),
      ),
    )

    const { items } = await buildService().searchPlaces("rambouillet", 10)

    expect(items.map((item) => item.id)).toEqual(["A"])
  })

  it("caps the result at the limit", async () => {
    fetchMock.mockResolvedValue(okResponse(collection(municipality, street, housenumber, locality)))

    const { items } = await buildService().searchPlaces("fontainebleau", 2)

    expect(items.map((item) => item.kind)).toEqual(["municipality", "street"])
  })

  it("answers an empty list when the payload has no feature list", async () => {
    fetchMock.mockResolvedValue(okResponse({ error: "x" }))
    await expect(buildService().searchPlaces("fontainebleau", 10)).resolves.toEqual({ items: [] })
    fetchMock.mockResolvedValue(okResponse(null))
    await expect(buildService().searchPlaces("fontainebleau2", 10)).resolves.toEqual({ items: [] })
  })

  it.each([
    ["a rejected fetch", () => fetchMock.mockRejectedValue(new Error("socket hang up"))],
    ["a timeout", () => fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"))],
    [
      "an HTTP 500",
      () => fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    ],
    [
      "an HTTP 429",
      () => fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }),
    ],
  ])("answers 503 search_provider_unavailable on %s without logging the query", async (_n, arm) => {
    arm()

    const error = await buildService()
      .searchPlaces("12 rue secrète de Paris", 10)
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ServiceUnavailableException)
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
      code: "search_provider_unavailable",
    })
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const logged = String(warnSpy.mock.calls[0][0])
    expect(logged).toContain("IGN geocoder failed: ")
    expect(JSON.stringify(warnSpy.mock.calls)).not.toMatch(/secr/i)
    expect(JSON.stringify(warnSpy.mock.calls)).not.toMatch(/rue/i)
  })

  it("logs a non-Error rejection without throwing a different error", async () => {
    fetchMock.mockRejectedValue("boom")
    await expect(buildService().searchPlaces("fontainebleau", 10)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    expect(String(warnSpy.mock.calls[0][0])).toContain("boom")
  })
})

// lru-cache reads performance.now() for its TTLs, which jest fake timers do not move.
// It also keeps a "now" for up to 1 ms of real time, which advance() waits out.
function advanceableClock(): { advance: (ms: number) => Promise<void> } {
  let offset = 0
  const realNow = performance.now.bind(performance)
  jest.spyOn(performance, "now").mockImplementation(() => realNow() + offset)
  return {
    advance: async (ms) => {
      offset += ms
      await new Promise((resolve) => setTimeout(resolve, 5))
    },
  }
}

describe("GeocoderService protection in front of IGN (D-15)", () => {
  const originalFetch = global.fetch
  let fetchMock: jest.Mock<Promise<FetchResponse>, [URL, RequestInit?]>

  beforeEach(() => {
    fetchMock = jest.fn<Promise<FetchResponse>, [URL, RequestInit?]>()
    global.fetch = fetchMock as unknown as typeof fetch
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("serves repeated and folded queries from one call, and caches an empty answer", async () => {
    fetchMock.mockResolvedValue(okResponse(collection(municipality)))
    const service = buildService()

    const first = await service.searchPlaces("Fontainebleau", 10)
    const second = await service.searchPlaces("Fontainebleau", 10)
    const third = await service.searchPlaces("fontainébleau ", 10)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
    expect(third).toEqual(first)

    fetchMock.mockResolvedValue(okResponse(collection()))
    await service.searchPlaces("Nulle part", 10)
    await service.searchPlaces("nulle part", 10)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("keys the cache on the limit too", async () => {
    fetchMock.mockResolvedValue(okResponse(collection(municipality)))
    const service = buildService()

    await service.searchPlaces("Fontainebleau", 10)
    await service.searchPlaces("Fontainebleau", 5)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("expires a cached place answer after 10 minutes", async () => {
    const clock = advanceableClock()
    fetchMock.mockResolvedValue(okResponse(collection(municipality)))
    const service = buildService()

    await service.searchPlaces("Fontainebleau", 10)
    await clock.advance(9 * 60 * 1000)
    await service.searchPlaces("Fontainebleau", 10)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await clock.advance(2 * 60 * 1000)
    await service.searchPlaces("Fontainebleau", 10)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("shares one call between identical concurrent queries", async () => {
    let release: (value: FetchResponse) => void = () => undefined
    fetchMock.mockReturnValue(new Promise<FetchResponse>((resolve) => (release = resolve)))
    const service = buildService()

    const a = service.searchPlaces("Fontainebleau", 10)
    const b = service.searchPlaces("fontainebleau", 10)
    release(okResponse(collection(municipality)))
    const [first, second] = await Promise.all([a, b])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(first.items).toHaveLength(1)
    expect(second).toEqual(first)
  })

  it("does not cache a failure: the next call fetches again", async () => {
    const service = buildService()
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    await expect(service.searchPlaces("Fontainebleau", 10)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )

    fetchMock.mockResolvedValueOnce(okResponse(collection(municipality)))
    const retry = await service.searchPlaces("Fontainebleau", 10)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(retry.items).toHaveLength(1)
  })

  it("lets both concurrent callers fail together, then fetches again", async () => {
    let fail: (reason: Error) => void = () => undefined
    fetchMock.mockReturnValueOnce(new Promise<FetchResponse>((_resolve, reject) => (fail = reject)))
    const service = buildService()

    const a = service.searchPlaces("Fontainebleau", 10).catch((error: unknown) => error)
    const b = service.searchPlaces("Fontainebleau", 10).catch((error: unknown) => error)
    fail(new Error("socket hang up"))

    expect(await a).toBeInstanceOf(ServiceUnavailableException)
    expect(await b).toBeInstanceOf(ServiceUnavailableException)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fetchMock.mockResolvedValueOnce(okResponse(collection(municipality)))
    await service.searchPlaces("Fontainebleau", 10)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("answers 503 without a call when 8 outbound calls are already pending, then recovers", async () => {
    const releases: Array<(value: FetchResponse) => void> = []
    fetchMock.mockImplementation(
      () => new Promise<FetchResponse>((resolve) => releases.push(resolve)),
    )
    const service = buildService()

    const pending = Array.from({ length: 8 }, (_unused, index) =>
      service.searchPlaces(`requete ${index}`, 10),
    )
    expect(fetchMock).toHaveBeenCalledTimes(8)

    const error = await service.searchPlaces("requete neuf", 10).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ServiceUnavailableException)
    expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
      code: "search_provider_unavailable",
    })
    expect(fetchMock).toHaveBeenCalledTimes(8)

    releases.forEach((release) => release(okResponse(collection())))
    await Promise.all(pending)

    fetchMock.mockImplementation(async () => okResponse(collection()))
    await expect(service.searchPlaces("requete neuf", 10)).resolves.toEqual({ items: [] })
  })

  it("still shares an in-flight call at the cap instead of refusing it", async () => {
    const releases: Array<(value: FetchResponse) => void> = []
    fetchMock.mockImplementation(
      () => new Promise<FetchResponse>((resolve) => releases.push(resolve)),
    )
    const service = buildService()

    const pending = Array.from({ length: 8 }, (_unused, index) =>
      service.searchPlaces(`requete ${index}`, 10),
    )
    const duplicate = service.searchPlaces("requete 0", 10)

    releases.forEach((release) => release(okResponse(collection())))
    await expect(duplicate).resolves.toEqual({ items: [] })
    await Promise.all(pending)
    expect(fetchMock).toHaveBeenCalledTimes(8)
  })

  describe("resolveCommunes", () => {
    function commune(name: string, citycode: string, score: number) {
      return {
        type: "Feature",
        geometry: point(2.7, 48.4),
        properties: { _type: "address", type: "municipality", name, citycode, score },
      }
    }

    it("asks for municipalities and keeps at most 3 codes scoring 0.8 or more", async () => {
      fetchMock.mockResolvedValue(
        okResponse(
          collection(
            commune("Fontainebleau", "77186", 0.97),
            commune("Fontaine", "38169", 0.85),
            commune("Fontaines", "71200", 0.79),
            commune("Fontainebleau-bis", "99999", 0.81),
            commune("Fontainebleau-ter", "88888", 0.9),
          ),
        ),
      )

      const communes = await buildService().resolveCommunes("Fontainebleau")

      const url = fetchMock.mock.calls[0][0]
      expect(url.origin + url.pathname).toBe(SEARCH_URL)
      expect(url.searchParams.get("q")).toBe("Fontainebleau")
      expect(url.searchParams.get("index")).toBe("address")
      expect(url.searchParams.get("type")).toBe("municipality")
      expect(url.searchParams.get("limit")).toBe("3")
      expect(communes).toEqual([
        { code: "77186", name: "Fontainebleau" },
        { code: "38169", name: "Fontaine" },
        { code: "99999", name: "Fontainebleau-bis" },
      ])
    })

    it("skips candidates without a code or a name and repeated codes", async () => {
      const noCode = commune("Sans code", "", 0.9)
      const noName = commune("", "11111", 0.9)
      fetchMock.mockResolvedValue(
        okResponse(
          collection(
            noCode,
            noName,
            commune("Une", "22222", 0.9),
            commune("Une encore", "22222", 0.9),
            { properties: { _type: "poi" } },
          ),
        ),
      )

      await expect(buildService().resolveCommunes("Une commune")).resolves.toEqual([
        { code: "22222", name: "Une" },
      ])
    })

    it("caches for 30 minutes", async () => {
      const clock = advanceableClock()
      fetchMock.mockResolvedValue(okResponse(collection(commune("Fontainebleau", "77186", 0.97))))
      const service = buildService()

      await service.resolveCommunes("Fontainebleau")
      await clock.advance(25 * 60 * 1000)
      await service.resolveCommunes("fontainébleau")
      expect(fetchMock).toHaveBeenCalledTimes(1)

      await clock.advance(10 * 60 * 1000)
      await service.resolveCommunes("Fontainebleau")
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("does not share its cache entry with the place search of the same text", async () => {
      fetchMock.mockResolvedValue(okResponse(collection(commune("Fontainebleau", "77186", 0.97))))
      const service = buildService()

      await service.searchPlaces("Fontainebleau", 3)
      await service.resolveCommunes("Fontainebleau")

      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("answers [] with no call for the synthetic provider or a short query", async () => {
      await expect(
        buildService({ CADASTRE_PROVIDER: "synthetic" }).resolveCommunes("Fontainebleau"),
      ).resolves.toEqual([])
      await expect(buildService().resolveCommunes("ab")).resolves.toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it("answers 503 on a provider failure and does not cache it", async () => {
      const service = buildService()
      fetchMock.mockRejectedValueOnce(new Error("timeout"))
      await expect(service.resolveCommunes("Fontainebleau")).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      )

      fetchMock.mockResolvedValueOnce(
        okResponse(collection(commune("Fontainebleau", "77186", 0.9))),
      )
      await expect(service.resolveCommunes("Fontainebleau")).resolves.toHaveLength(1)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
