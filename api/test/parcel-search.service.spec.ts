import { Logger, ServiceUnavailableException } from "@nestjs/common"
import { DatabaseService } from "../src/database/database.service"
import { CadastreProviderService } from "../src/surveys/cadastre-provider.service"
import { GeocoderService } from "../src/surveys/geocoder.service"
import {
  buildParcelByKeyQuery,
  buildParcelSurveyCountQuery,
  buildParcelsBySectionNumberQuery,
} from "../src/surveys/parcel-search.queries"
import { ParcelSearchService, PARCEL_SEARCH_LIMIT } from "../src/surveys/parcel-search.service"
import { buildTestConfigService } from "./config-helper"

type Rows = { rows: unknown[] }
type Found = {
  idu: string
  communeName: string | null
  centroid: { lat: number; lng: number }
  bbox: [number, number, number, number]
}

function flat(sql: string): string {
  return sql.replace(/\s+/g, " ").trim()
}

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  parcel_id: "77186000AB0123",
  commune_code: "77186",
  section: "AB",
  number: "0123",
  centroid_lat: 48.4,
  centroid_lng: 2.7,
  ...overrides,
})

/** Answers by the shape of the SQL: the count query unnests keys, the section query is lateral. */
function buildDb(answers: { byKey?: Rows[]; bySection?: Rows; counts?: Rows } = {}): {
  query: jest.Mock
} {
  const byKey = [...(answers.byKey ?? [])]
  return {
    query: jest.fn(async (text: string): Promise<Rows> => {
      const sql = flat(text)
      if (sql.includes("unnest(")) return answers.counts ?? { rows: [] }
      if (sql.includes("LEFT JOIN LATERAL")) return answers.bySection ?? { rows: [] }
      return byKey.shift() ?? { rows: [] }
    }),
  }
}

const found = (overrides: Partial<Found> = {}): Found => ({
  idu: "77186000AB0123",
  communeName: "Fontainebleau",
  centroid: { lat: 48.4003, lng: 2.7002 },
  bbox: [2.7001, 48.4001, 2.7003, 48.4005],
  ...overrides,
})

function build(
  parts: {
    db?: { query: jest.Mock }
    lookup?: jest.Mock
    resolveCommunes?: jest.Mock
  } = {},
) {
  const db = parts.db ?? buildDb()
  const cadastre = { lookupParcelByKey: parts.lookup ?? jest.fn().mockResolvedValue(null) }
  const geocoder = { resolveCommunes: parts.resolveCommunes ?? jest.fn().mockResolvedValue([]) }
  const service = new ParcelSearchService(
    db as unknown as DatabaseService,
    cadastre as unknown as CadastreProviderService,
    geocoder as unknown as GeocoderService,
  )
  return { service, db, cadastre, geocoder }
}

describe("ParcelSearchService", () => {
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("answers an empty list with no call for text that is not a parcel reference", async () => {
    const { service, db, cadastre, geocoder } = build()

    await expect(service.search("Fontainebleau")).resolves.toEqual({ items: [] })
    await expect(service.search("")).resolves.toEqual({ items: [] })

    expect(db.query).not.toHaveBeenCalled()
    expect(cadastre.lookupParcelByKey).not.toHaveBeenCalled()
    expect(geocoder.resolveCommunes).not.toHaveBeenCalled()
  })

  describe("a commune code, section and number", () => {
    it("takes the parcel from IGN API Carto and counts its finished public surveys", async () => {
      const db = buildDb({
        counts: {
          rows: [{ commune_code: "77186", section: "AB", number: "0123", survey_count: "3" }],
        },
      })
      const { service, cadastre } = build({ db, lookup: jest.fn().mockResolvedValue(found()) })

      const result = await service.search("77186 ab 123")

      expect(result).toEqual({
        items: [
          {
            parcel_id: "77186000AB0123",
            commune_code: "77186",
            commune_name: "Fontainebleau",
            section: "AB",
            number: "0123",
            centroid: { lat: 48.4003, lng: 2.7002 },
            bbox: [2.7001, 48.4001, 2.7003, 48.4005],
            survey_count: 3,
          },
        ],
      })
      expect(cadastre.lookupParcelByKey).toHaveBeenCalledWith("77186", "AB", "0123")
      // IGN answered: the registered parcel is not read, only the counts are.
      expect(db.query).toHaveBeenCalledTimes(1)
      const [text, values] = db.query.mock.calls[0]
      expect(flat(text)).toContain("unnest(")
      expect(values).toEqual([["77186"], ["AB"], ["0123"]])
    })

    it("has a survey count of 0 when no survey is finished on the parcel", async () => {
      const { service } = build({ lookup: jest.fn().mockResolvedValue(found()) })

      const result = await service.search("77186 AB 123")

      expect(result.items[0].survey_count).toBe(0)
    })

    it("falls back on the registered parcel when IGN has none", async () => {
      const db = buildDb({
        byKey: [{ rows: [dbRow()] }],
        counts: {
          rows: [{ commune_code: "77186", section: "AB", number: "0123", survey_count: 1 }],
        },
      })
      const { service } = build({ db })

      const result = await service.search("77186 AB 123")

      expect(result.items).toEqual([
        {
          parcel_id: "77186000AB0123",
          commune_code: "77186",
          commune_name: null,
          section: "AB",
          number: "0123",
          centroid: { lat: 48.4, lng: 2.7 },
          bbox: null,
          survey_count: 1,
        },
      ])
      expect(db.query.mock.calls[0][1]).toEqual(["77186", "AB", "0123"])
    })

    it("answers nothing when neither IGN nor the database knows the parcel", async () => {
      const unplaced = buildDb({ byKey: [{ rows: [dbRow({ centroid_lat: null })] }] })

      await expect(build().service.search("77186 AB 123")).resolves.toEqual({ items: [] })
      await expect(build({ db: unplaced }).service.search("77186 AB 123")).resolves.toEqual({
        items: [],
      })
    })

    it("serves the registered parcel when IGN fails, without caching that answer", async () => {
      const db = buildDb({ byKey: [{ rows: [dbRow()] }, { rows: [dbRow()] }] })
      const lookup = jest.fn().mockRejectedValue(new Error("cadastre provider returned HTTP 503"))
      const { service } = build({ db, lookup })

      const first = await service.search("77186 AB 123")
      await service.search("77186 AB 123")

      expect(first.items).toHaveLength(1)
      expect(first.items[0].bbox).toBeNull()
      expect(lookup).toHaveBeenCalledTimes(2)
    })

    it("answers 503 search_provider_unavailable when IGN fails and nothing is registered", async () => {
      const lookup = jest.fn().mockRejectedValue(new Error("The operation timed out"))
      const { service } = build({ lookup })

      const failure = await service.search("77186 AB 123").catch((error: unknown) => error)

      expect(failure).toBeInstanceOf(ServiceUnavailableException)
      expect((failure as ServiceUnavailableException).getResponse()).toMatchObject({
        code: "search_provider_unavailable",
      })
    })

    it("logs the failure message and never the typed text", async () => {
      const lookup = jest.fn().mockRejectedValue(new Error("cadastre provider returned HTTP 500"))
      const { service } = build({ db: buildDb({ byKey: [{ rows: [dbRow()] }] }), lookup })

      await service.search("77186 AB 123")

      expect(warnSpy).toHaveBeenCalledTimes(1)
      const logged = String(warnSpy.mock.calls[0][0])
      expect(logged).toContain("HTTP 500")
      for (const part of ["77186", "123", "AB"]) expect(logged).not.toContain(part)
    })

    it("accepts an error that is not an Error object", async () => {
      const lookup = jest.fn().mockRejectedValue("boom")
      const { service } = build({ db: buildDb({ byKey: [{ rows: [dbRow()] }] }), lookup })

      await expect(service.search("77186 AB 123")).resolves.toMatchObject({
        items: [{ parcel_id: "77186000AB0123" }],
      })
      expect(String(warnSpy.mock.calls[0][0])).toContain("boom")
    })
  })

  describe("a commune name, section and number", () => {
    it("resolves the name, then looks each commune up, in the geocoder's order", async () => {
      const resolveCommunes = jest.fn().mockResolvedValue([
        { code: "77186", name: "Fontainebleau" },
        { code: "91228", name: "Fontainebleau-sur-X" },
      ])
      const lookup = jest
        .fn()
        .mockResolvedValueOnce(found())
        .mockResolvedValueOnce(
          found({ idu: "91228000AB0123", communeName: "Autre", centroid: { lat: 48.5, lng: 2.3 } }),
        )
      const { service, db } = build({ lookup, resolveCommunes })

      const result = await service.search("Fontainebleau AB 123")

      expect(resolveCommunes).toHaveBeenCalledWith("Fontainebleau")
      expect(lookup.mock.calls).toEqual([
        ["77186", "AB", "0123"],
        ["91228", "AB", "0123"],
      ])
      expect(result.items.map((item) => [item.commune_code, item.commune_name])).toEqual([
        ["77186", "Fontainebleau"],
        ["91228", "Autre"],
      ])
      expect(db.query.mock.calls[0][1]).toEqual([
        ["77186", "91228"],
        ["AB", "AB"],
        ["0123", "0123"],
      ])
    })

    it("lets a failing name resolution through as the 503", async () => {
      const failure = new ServiceUnavailableException({ code: "search_provider_unavailable" })
      const { service, cadastre } = build({ resolveCommunes: jest.fn().mockRejectedValue(failure) })

      await expect(service.search("Fontainebleau AB 123")).rejects.toBe(failure)

      expect(cadastre.lookupParcelByKey).not.toHaveBeenCalled()
    })

    it("answers nothing, with no lookup, when the name matches no commune", async () => {
      const { service, cadastre } = build()

      await expect(service.search("Nulle-part AB 123")).resolves.toEqual({ items: [] })

      expect(cadastre.lookupParcelByKey).not.toHaveBeenCalled()
    })

    it("keeps the communes that answered when another fails, and does not cache it", async () => {
      const resolveCommunes = jest.fn().mockResolvedValue([
        { code: "77186", name: "A" },
        { code: "91228", name: "B" },
      ])
      const lookup = jest
        .fn()
        .mockResolvedValueOnce(found())
        .mockRejectedValueOnce(new Error("cadastre provider returned HTTP 502"))
        .mockResolvedValueOnce(found())
        .mockRejectedValueOnce(new Error("cadastre provider returned HTTP 502"))
      const { service } = build({ lookup, resolveCommunes })

      const first = await service.search("Fontainebleau AB 123")
      await service.search("Fontainebleau AB 123")

      expect(first.items.map((item) => item.commune_code)).toEqual(["77186"])
      expect(lookup).toHaveBeenCalledTimes(4)
    })
  })

  describe("a section and number alone", () => {
    it("lists the registered parcels, never calling IGN", async () => {
      const db = buildDb({
        bySection: {
          rows: [
            dbRow(),
            dbRow({ parcel_id: "ghost", commune_code: "91228", centroid_lat: null }),
            dbRow({ parcel_id: "91228000AB0123", commune_code: "91228" }),
          ],
        },
        counts: {
          rows: [{ commune_code: "91228", section: "AB", number: "0123", survey_count: 2 }],
        },
      })
      const { service, cadastre, geocoder } = build({ db })

      const result = await service.search("AB 123")

      expect(result.items.map((item) => [item.parcel_id, item.survey_count])).toEqual([
        ["77186000AB0123", 0],
        ["91228000AB0123", 2],
      ])
      expect(db.query.mock.calls[0][1]).toEqual(["AB", "0123", PARCEL_SEARCH_LIMIT])
      expect(cadastre.lookupParcelByKey).not.toHaveBeenCalled()
      expect(geocoder.resolveCommunes).not.toHaveBeenCalled()
    })

    it("narrows to the department typed before it", async () => {
      const db = buildDb({ bySection: { rows: [dbRow()] } })

      await build({ db }).service.search("77 AB 0123")

      expect(db.query.mock.calls[0][1]).toEqual(["AB", "0123", "77", PARCEL_SEARCH_LIMIT])
    })

    it("answers nothing when no parcel is registered", async () => {
      await expect(build().service.search("AB 123")).resolves.toEqual({ items: [] })
    })

    it("keeps at most PARCEL_SEARCH_LIMIT parcels", async () => {
      const rows = Array.from({ length: PARCEL_SEARCH_LIMIT + 3 }, (_, index) =>
        dbRow({ parcel_id: `p${index}`, commune_code: `77${String(index).padStart(3, "0")}` }),
      )
      const { service } = build({ db: buildDb({ bySection: { rows } }) })

      const result = await service.search("AB 123")

      expect(result.items).toHaveLength(PARCEL_SEARCH_LIMIT)
    })
  })

  describe("with the synthetic provider", () => {
    it("serves only what the database knows and never calls out", async () => {
      const fetchMock = jest.fn()
      const originalFetch = global.fetch
      global.fetch = fetchMock as unknown as typeof global.fetch
      try {
        const cadastre = new CadastreProviderService(
          buildTestConfigService({ CADASTRE_PROVIDER: "synthetic" }),
        )
        const db = buildDb({ byKey: [{ rows: [dbRow()] }, { rows: [] }] })
        const service = new ParcelSearchService(db as unknown as DatabaseService, cadastre, {
          resolveCommunes: jest.fn(),
        } as unknown as GeocoderService)

        const known = await service.search("77186 AB 123")
        const unknown = await service.search("77186 CD 456")

        expect(known.items).toMatchObject([{ parcel_id: "77186000AB0123", bbox: null }])
        expect(unknown).toEqual({ items: [] })
        expect(fetchMock).not.toHaveBeenCalled()
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  describe("the cache", () => {
    it("serves a repeated query, in any spelling of the same key, without a second lookup", async () => {
      const lookup = jest.fn().mockResolvedValue(found())
      const { service, db } = build({ lookup })

      const first = await service.search("77186 AB 0123")
      const second = await service.search("77186ab123")
      const third = await service.search("parcelle 77186 AB n° 123")

      expect(second).toEqual(first)
      expect(third).toEqual(first)
      expect(lookup).toHaveBeenCalledTimes(1)
      expect(db.query).toHaveBeenCalledTimes(1)
    })

    it("does not share an entry between two different keys", async () => {
      const lookup = jest.fn().mockResolvedValue(found())
      const { service } = build({ lookup })

      await service.search("77186 AB 123")
      await service.search("77186 AB 124")

      expect(lookup).toHaveBeenCalledTimes(2)
    })

    it("does not cache a 503", async () => {
      const lookup = jest.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue(found())
      const { service } = build({ lookup })

      await expect(service.search("77186 AB 123")).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      )
      const retry = await service.search("77186 AB 123")

      expect(retry.items).toHaveLength(1)
    })
  })
})

describe("parcel search queries", () => {
  it("looks a parcel up by bound commune, section and number", () => {
    const query = buildParcelByKeyQuery("77186", "AB", "0123")

    expect(flat(query.text)).toContain("p.commune_code = $1 AND p.section = $2 AND p.number = $3")
    expect(query.values).toEqual(["77186", "AB", "0123"])
  })

  it("counts finished public surveys only, grouped by key", () => {
    const query = buildParcelSurveyCountQuery([
      { communeCode: "77186", section: "AB", number: "0123" },
      { communeCode: "75112", section: "BL", number: "0010" },
    ])
    const sql = flat(query.text)

    expect(sql).toContain("s.status = 'submitted'")
    expect(sql).toContain("s.deleted_at IS NULL")
    expect(sql).toContain("s.submitted_at IS NOT NULL")
    expect(sql).toContain("COUNT(DISTINCT s.id)")
    expect(sql).toContain("GROUP BY p.commune_code, p.section, p.number")
    expect(query.values).toEqual([
      ["77186", "75112"],
      ["AB", "BL"],
      ["0123", "0010"],
    ])
  })

  it("binds the department as a LIKE prefix, never in the text", () => {
    const withDepartment = buildParcelsBySectionNumberQuery({
      section: "AB",
      number: "0123",
      departmentPrefix: "2A",
      limit: 10,
    })
    const without = buildParcelsBySectionNumberQuery({
      section: "AB",
      number: "0123",
      departmentPrefix: null,
      limit: 10,
    })

    expect(flat(withDepartment.text)).toContain("p.commune_code LIKE $3 || '%'")
    expect(flat(withDepartment.text)).toContain("LIMIT $4")
    expect(withDepartment.text).not.toContain("2A")
    expect(withDepartment.values).toEqual(["AB", "0123", "2A", 10])
    expect(flat(without.text)).not.toContain("LIKE")
    expect(flat(without.text)).toContain("LIMIT $3")
    expect(flat(without.text)).toContain("ORDER BY studied.last_studied_at DESC NULLS LAST")
    expect(without.values).toEqual(["AB", "0123", 10])
  })
})
