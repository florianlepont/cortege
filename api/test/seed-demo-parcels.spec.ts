import { geometryCenter } from "../src/surveys/cadastre-provider.service"
import {
  buildParcelKey,
  normalizeParcelPartToDigits,
  normalizeParcelSection,
  parseParcelIdentifier,
} from "../src/surveys/surveys-normalize.utils"

// The pure part of the demo seed (api/scripts/lib/demo-parcels.js): every demo survey sits on real
// IGN parcels. The module reads the API helpers from api/dist; jest.unit.config.js maps that path
// to api/src, so these tests run against the same helpers as the API.

type Point = { lat: number; lng: number }
type Geometry = { type: string; coordinates: unknown }
type Parcel = {
  parcelId: string
  communeCode: string
  section: string
  number: string
  communeName: string | null
  areaM2: number | null
  centroid: Point
  geometry: Geometry
}
type Site = { key: string; label: string; point: Point; wanted: number; random: () => number }
type Settings = { wfsUrl: string; wfsTypename: string; timeoutMs: number }
type SurveyPlan = { status: string; when: Date; parcelIds: string[] }
type DemoParcelsModule = {
  DEMO_PARCEL_SOURCE: string
  IDU_SHAPE: RegExp
  assignVersions: (surveys: SurveyPlan[], existingMax?: Map<string, number>) => (number | null)[]
  cadastreSettings: (env: Record<string, string | undefined>) => Settings
  centreOf: (parcels: Array<{ centroid: Point }>) => Point
  geometryContains: (geometry: Geometry, point: Point) => boolean
  isRealIdu: (parcelId: unknown) => boolean
  makeRandom: (seed: number) => () => number
  parcelRegistrationRow: (parcel: Parcel) => Record<string, unknown>
  parseWfsParcels: (payload: unknown) => Parcel[]
  pickSiteParcels: (
    parcels: Parcel[],
    point: Point,
    wanted: number,
    used?: Set<string>,
    commune?: string | null,
  ) => Parcel[]
  planDemoParcelRemoval: (rows: Array<{ parcel_id: string; shared: boolean }>) => {
    remove: string[]
    keptShared: string[]
    legacyRemoved: number
  }
  resolveSites: (
    sites: Site[],
    options: {
      settings?: Settings
      fetchJson?: (url: URL, timeoutMs: number) => Promise<unknown>
      sleep?: (ms: number) => Promise<void>
      maxAttempts?: number
    },
  ) => Promise<{
    resolved: Map<string, Parcel[]>
    failures: Array<{ key: string; label: string; reason: string }>
  }>
  retryPoint: (base: Point, attempt: number, random: () => number, spread?: number) => Point
  sitePoint: (place: [string, number, number, { spread?: number }?], random: () => number) => Point
  wfsUrlAround: (settings: Settings, point: Point, scale?: number) => URL
}

const demo = jest.requireActual<DemoParcelsModule>("../scripts/lib/demo-parcels")

/** A square parcel of `size` degrees whose south-west corner is (lng, lat), as the WFS draws it. */
function square(lng: number, lat: number, size = 0.001): Geometry {
  return {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [lng, lat],
          [lng + size, lat],
          [lng + size, lat + size],
          [lng, lat + size],
          [lng, lat],
        ],
      ],
    ],
  }
}

function feature(
  idu: string,
  properties: Record<string, unknown>,
  geometry: Geometry = square(2.69, 48.4),
): Record<string, unknown> {
  return { type: "Feature", geometry, properties: { idu, ...properties } }
}

const FONTAINEBLEAU = { code_insee: "77186", nom_com: "Fontainebleau" }

describe("seed demo parcels (real IGN parcels)", () => {
  describe("seeded points", () => {
    it("gives the same site point for the same seed, close to its place", () => {
      const place: [string, number, number] = ["Fontainebleau", 48.4, 2.69]
      const a = demo.sitePoint(place, demo.makeRandom(42))
      const b = demo.sitePoint(place, demo.makeRandom(42))
      expect(a).toEqual(b)
      expect(Math.abs(a.lat - 48.4)).toBeLessThanOrEqual(0.015)
      expect(Math.abs(a.lng - 2.69)).toBeLessThanOrEqual(0.02)
      expect(demo.sitePoint(place, demo.makeRandom(43))).not.toEqual(a)
    })

    it("narrows a site point and its retries with the place's spread", () => {
      const point = demo.sitePoint(
        ["Vincennes", 48.8435, 2.4365, { spread: 0.1 }],
        demo.makeRandom(3),
      )
      expect(Math.abs(point.lat - 48.8435)).toBeLessThanOrEqual(0.0015)
      expect(Math.abs(point.lng - 2.4365)).toBeLessThanOrEqual(0.002)
      const retry = demo.retryPoint(point, 4, demo.makeRandom(4), 0.1)
      expect(Math.abs(retry.lat - point.lat)).toBeLessThanOrEqual(0.0016)
    })

    it("moves a retry point further at each attempt, at 6 decimals", () => {
      const base = { lat: 48.4, lng: 2.69 }
      for (const attempt of [1, 2, 5]) {
        const point = demo.retryPoint(base, attempt, demo.makeRandom(attempt))
        expect(Math.abs(point.lat - base.lat)).toBeLessThanOrEqual(0.004 * attempt)
        expect(Math.abs(point.lng - base.lng)).toBeLessThanOrEqual(0.004 * attempt)
        expect(point.lat).toBe(Number(point.lat.toFixed(6)))
      }
    })
  })

  describe("IGN settings and request", () => {
    it("uses the API defaults and the CADASTRE_* overrides", () => {
      expect(demo.cadastreSettings({})).toEqual({
        wfsUrl: "https://data.geopf.fr/wfs/ows",
        wfsTypename: "CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle",
        timeoutMs: 10000,
      })
      expect(
        demo.cadastreSettings({
          CADASTRE_IGN_WFS_URL: "https://wfs.example/ows",
          CADASTRE_IGN_WFS_TYPENAME: "x:parcelle",
          CADASTRE_PROVIDER_TIMEOUT_MS: "2500",
        }),
      ).toEqual({ wfsUrl: "https://wfs.example/ows", wfsTypename: "x:parcelle", timeoutMs: 2500 })
      expect(demo.cadastreSettings({ CADASTRE_PROVIDER_TIMEOUT_MS: "soon" }).timeoutMs).toBe(10000)
    })

    it("asks the WFS for a small lng,lat bbox around the point, like the API tiles", () => {
      const url = demo.wfsUrlAround(demo.cadastreSettings({}), { lat: 48.4, lng: 2.69 })
      expect(url.origin + url.pathname).toBe("https://data.geopf.fr/wfs/ows")
      expect(url.searchParams.get("request")).toBe("GetFeature")
      expect(url.searchParams.get("typeNames")).toBe(
        "CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle",
      )
      expect(url.searchParams.get("outputFormat")).toBe("application/json")
      expect(url.searchParams.get("bbox")).toBe("2.689100,48.399400,2.690900,48.400600,EPSG:4326")
      const wide = demo.wfsUrlAround(demo.cadastreSettings({}), { lat: 48.4, lng: 2.69 }, 3)
      expect(wide.searchParams.get("bbox")).toBe("2.687300,48.398200,2.692700,48.401800,EPSG:4326")
    })
  })

  describe("parseWfsParcels", () => {
    it("reads a parcel with the keys of the app registration and of the Explorer polygons", () => {
      const geometry = square(2.69, 48.4)
      const [parcel] = demo.parseWfsParcels({
        features: [
          feature(
            "771860000K0311",
            { ...FONTAINEBLEAU, section: "0K", numero: "311", contenance: 8211 },
            geometry,
          ),
        ],
      })
      const registered = parseParcelIdentifier(parcel.parcelId)
      expect(parcel).toMatchObject({
        parcelId: "771860000K0311",
        communeCode: "77186",
        section: "K",
        number: "0311",
        communeName: "Fontainebleau",
        areaM2: 8211,
      })
      // The app's registration of this id and the Explorer's key of this polygon agree.
      expect(registered).toEqual({ communeCode: "77186", section: "K", number: "0311" })
      expect(buildParcelKey(registered.communeCode, registered.section, registered.number)).toBe(
        buildParcelKey(
          normalizeParcelPartToDigits("77186", 5) ?? "",
          normalizeParcelSection("0K") ?? "",
          normalizeParcelPartToDigits("311", 4) ?? "",
        ),
      )
      const centre = geometryCenter(geometry)
      expect(parcel.centroid).toEqual({
        lat: Number(centre?.lat.toFixed(6)),
        lng: Number(centre?.lng.toFixed(6)),
      })
      expect(parcel.geometry).toBe(geometry)
    })

    it("keeps Alsace-Moselle and arrondissement parcels with the Explorer's key", () => {
      const parcels = demo.parseWfsParcels({
        features: [
          // Alsace-Moselle: a numbered section keeps its two digits.
          feature("67392000090001", {
            code_dep: "67",
            code_com: "392",
            code_arr: "000",
            code_insee: "67392",
            section: "09",
            numero: "0001",
          }),
          // Paris: the IDU carries the arrondissement, code_insee the city.
          feature("75112000BL0010", {
            code_dep: "75",
            code_com: "056",
            code_arr: "112",
            code_insee: "75056",
            section: "BL",
            numero: "0010",
          }),
        ],
      })
      expect(
        parcels.map(({ parcelId, communeCode, section, number }) => [
          parcelId,
          communeCode,
          section,
          number,
        ]),
      ).toEqual([
        ["67392000090001", "67392", "09", "0001"],
        ["75112000BL0010", "75112", "BL", "0010"],
      ])
      for (const parcel of parcels) {
        const registered = parseParcelIdentifier(parcel.parcelId)
        expect(buildParcelKey(registered.communeCode, registered.section, registered.number)).toBe(
          buildParcelKey(parcel.communeCode, parcel.section, parcel.number),
        )
      }
    })

    it("drops features without an IGN id, non-polygons and duplicates", () => {
      const parcels = demo.parseWfsParcels({
        features: [
          // Not an IDU the app can register (Corsica, or an id from elsewhere).
          feature("2A004000AB0012", { code_insee: "2A004", section: "AB", numero: "0012" }),
          feature("", { ...FONTAINEBLEAU, section: "AS", numero: "0141" }),
          feature("77186000AS0142", { ...FONTAINEBLEAU, section: "AS", numero: "0142" }),
          feature("77186000AS0142", { ...FONTAINEBLEAU, section: "AS", numero: "0142" }),
          { geometry: { type: "Point", coordinates: [2.69, 48.4] }, properties: {} },
          {
            geometry: { type: "Polygon", coordinates: [] },
            properties: { idu: "77186000AS0143", ...FONTAINEBLEAU, section: "AS", numero: "0143" },
          },
          null,
        ],
      })
      expect(parcels.map((parcel) => parcel.parcelId)).toEqual(["77186000AS0142"])
      expect(demo.parseWfsParcels({})).toEqual([])
      expect(demo.parseWfsParcels(null)).toEqual([])
    })
  })

  describe("pickSiteParcels", () => {
    const parcel = (idu: string, lng: number, lat: number, communeCode = "77186"): Parcel => ({
      parcelId: idu,
      communeCode,
      section: "AS",
      number: idu.slice(-4),
      communeName: null,
      areaM2: null,
      centroid: { lat: lat + 0.0005, lng: lng + 0.0005 },
      geometry: square(lng, lat),
    })
    const under = parcel("77186000AS0001", 2.69, 48.4)
    const east = parcel("77186000AS0002", 2.691, 48.4)
    const north = parcel("77186000AS0003", 2.69, 48.401)
    const farOtherCommune = parcel("77999000AS0004", 2.688, 48.4, "77999")
    const all = [north, farOtherCommune, east, under]
    const point = { lat: 48.4004, lng: 2.6904 }

    it("takes the parcel under the point first, then the nearest of the same commune", () => {
      expect(demo.pickSiteParcels(all, point, 1).map((p) => p.parcelId)).toEqual([under.parcelId])
      expect(demo.pickSiteParcels(all, point, 3).map((p) => p.parcelId)).toEqual([
        under.parcelId,
        east.parcelId,
        north.parcelId,
      ])
    })

    it("keeps to the site's commune when it has one", () => {
      expect(
        demo.pickSiteParcels(all, point, 3, new Set(), "77999").map((p) => p.parcelId),
      ).toEqual([farOtherCommune.parcelId])
      expect(demo.pickSiteParcels(all, point, 3, new Set(), "94080")).toEqual([])
    })

    it("falls back to the nearest parcel and never reuses a parcel of another site", () => {
      const used = new Set([under.parcelId])
      expect(demo.pickSiteParcels(all, point, 1, used)[0].parcelId).not.toBe(under.parcelId)
      expect(demo.pickSiteParcels([under], point, 2, used)).toEqual([])
      expect(demo.pickSiteParcels([], point, 2)).toEqual([])
    })

    it("knows when a polygon holds a point, holes excepted", () => {
      const withHole: Geometry = {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          [
            [4, 4],
            [6, 4],
            [6, 6],
            [4, 6],
            [4, 4],
          ],
        ],
      }
      expect(demo.geometryContains(withHole, { lng: 2, lat: 2 })).toBe(true)
      expect(demo.geometryContains(withHole, { lng: 5, lat: 5 })).toBe(false)
      expect(demo.geometryContains(withHole, { lng: 12, lat: 5 })).toBe(false)
      expect(
        demo.geometryContains({ type: "Point", coordinates: [2, 2] }, { lng: 2, lat: 2 }),
      ).toBe(false)
    })
  })

  it("places a survey at the average of its parcels' centroids", () => {
    expect(
      demo.centreOf([
        { centroid: { lat: 48.1, lng: 2.1 } },
        { centroid: { lat: 48.2, lng: 2.3 } },
        { centroid: { lat: 48.3, lng: 2.2 } },
      ]),
    ).toEqual({ lat: 48.2, lng: 2.2 })
  })

  it("builds the parcels row like the app registration, marked demo", () => {
    const geometry = square(2.69, 48.4)
    const row = demo.parcelRegistrationRow({
      parcelId: "94080000AB0012",
      communeCode: "94080",
      section: "AB",
      number: "0012",
      communeName: "Vincennes",
      areaM2: 1636,
      centroid: { lat: 48.4005, lng: 2.6905 },
      geometry,
    })
    expect(row).toEqual({
      parcel_id: "94080000AB0012",
      commune_code: "94080",
      section: "AB",
      number: "0012",
      geometry,
      centroid: { lat: 48.4005, lng: 2.6905 },
      area_m2: 1636,
      source: "demo",
    })
    const registered = parseParcelIdentifier(String(row.parcel_id))
    expect([row.commune_code, row.section, row.number]).toEqual([
      registered.communeCode,
      registered.section,
      registered.number,
    ])
    expect(demo.DEMO_PARCEL_SOURCE).toBe("demo")
  })

  describe("removal", () => {
    it("tells IGN parcel ids from the invented 12.1 ids", () => {
      expect(demo.isRealIdu("771860000K0311")).toBe(true)
      expect(demo.isRealIdu("94080000AB0012")).toBe(true)
      expect(demo.isRealIdu("DEMO0902")).toBe(false)
      expect(demo.isRealIdu("2A004000AB0012")).toBe(false)
      expect(demo.isRealIdu(null)).toBe(false)
    })

    it("never deletes a demo parcel that a survey other than a demo survey links", () => {
      expect(
        demo.planDemoParcelRemoval([
          { parcel_id: "DEMO0001", shared: false },
          { parcel_id: "DEMO0902", shared: false },
          { parcel_id: "771860000K0311", shared: false },
          { parcel_id: "77186000AS0142", shared: true },
          { parcel_id: "DEMO0003", shared: true },
        ]),
      ).toEqual({
        remove: ["DEMO0001", "DEMO0902", "771860000K0311"],
        keptShared: ["77186000AS0142", "DEMO0003"],
        legacyRemoved: 2,
      })
      expect(demo.planDemoParcelRemoval([])).toEqual({
        remove: [],
        keptShared: [],
        legacyRemoved: 0,
      })
    })
  })

  describe("assignVersions", () => {
    const at = (year: number, month = 3) => new Date(Date.UTC(year, month, 1))

    it("numbers the finished surveys of each parcel in date order, drafts get none", () => {
      const versions = demo.assignVersions([
        { status: "submitted", when: at(2025), parcelIds: ["A"] },
        { status: "submitted", when: at(2023), parcelIds: ["A"] },
        { status: "draft", when: at(2024), parcelIds: ["A"] },
        { status: "submitted", when: at(2024), parcelIds: ["B"] },
      ])
      expect(versions).toEqual([2, 1, null, 1])
    })

    it("gives a multi-parcel survey the next version of all its parcels, after existing ones", () => {
      const versions = demo.assignVersions(
        [
          { status: "submitted", when: at(2023), parcelIds: ["A"] },
          { status: "submitted", when: at(2024), parcelIds: ["A", "B"] },
          { status: "submitted", when: at(2025), parcelIds: ["B"] },
        ],
        new Map([["B", 4]]),
      )
      expect(versions).toEqual([1, 5, 6])
    })
  })

  describe("resolveSites", () => {
    const settings = { wfsUrl: "https://wfs.example/ows", wfsTypename: "x:parcelle", timeoutMs: 50 }
    const site = (key: string, lng: number, lat: number, wanted = 2): Site => ({
      key,
      label: key,
      point: { lat: lat + 0.0005, lng: lng + 0.0005 },
      wanted,
      random: demo.makeRandom(1),
    })
    const payloadAt = (lng: number, lat: number) => ({
      features: [
        feature(
          "77186000AS0001",
          { ...FONTAINEBLEAU, section: "AS", numero: "1" },
          square(lng, lat),
        ),
        feature(
          "77186000AS0002",
          { ...FONTAINEBLEAU, section: "AS", numero: "2" },
          square(lng + 0.001, lat),
        ),
      ],
    })
    const noSleep = jest.fn(async () => undefined)

    it("retries a failed or empty point, then resolves; two sites never share a parcel", async () => {
      const answers: Array<unknown> = [
        new Error("HTTP 503"),
        { features: [] },
        { features: payloadAt(2.69, 48.4).features.slice(0, 1) },
        payloadAt(2.69, 48.4),
      ]
      const fetchJson = jest.fn(async (url: URL, timeoutMs: number) => {
        expect(url.origin).toBe("https://wfs.example")
        expect(timeoutMs).toBe(50)
        const answer = answers.shift()
        if (answer instanceof Error) throw answer
        return answer
      })
      const { resolved, failures } = await demo.resolveSites(
        [site("one", 2.69, 48.4, 1), site("two", 2.691, 48.4, 2)],
        { settings, fetchJson, sleep: noSleep },
      )
      expect(failures).toEqual([])
      expect(fetchJson).toHaveBeenCalledTimes(4)
      expect(resolved.get("one")?.map((p) => p.parcelId)).toEqual(["77186000AS0001"])
      expect(resolved.get("two")?.map((p) => p.parcelId)).toEqual(["77186000AS0002"])
      expect(noSleep).toHaveBeenCalled()
    })

    it("lists the sites that never resolve instead of inventing parcels", async () => {
      const fetchJson = jest.fn(async () => {
        throw new Error("fetch failed")
      })
      const { resolved, failures } = await demo.resolveSites([site("lost", 2.69, 48.4)], {
        settings,
        fetchJson,
        sleep: noSleep,
        maxAttempts: 3,
      })
      expect(fetchJson).toHaveBeenCalledTimes(3)
      expect(resolved.size).toBe(0)
      expect(failures).toEqual([{ key: "lost", label: "lost", reason: "fetch failed" }])
    })
  })
})
