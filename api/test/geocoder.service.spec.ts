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
