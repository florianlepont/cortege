import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Logger } from "@nestjs/common"
import { WEATHER_RANGES, WEATHER_SKY_CODES } from "@cortege/ibp-domain"
import { MeteoFranceHttp, MeteoFranceHttpError } from "../src/surveys/meteofrance-http"
import {
  MeteoFranceWeatherProvider,
  parseHourlyReading,
  parseStationList,
  parseSynopReports,
  skyFromSynop,
} from "../src/surveys/meteofrance-provider"
import { WeatherService } from "../src/surveys/weather.service"
import { createWeatherProvider } from "../src/surveys/weather-provider"
import { buildTestConfig, buildTestConfigService } from "./config-helper"

// The mapping is proven on the real responses the owner captured in plan 27-22.
const FIXTURES = join(__dirname, "fixtures", "meteofrance")

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as T
}

type StationExcerpt = {
  columns: string[]
  points: Array<{
    label: string
    lat: number
    lng: number
    nearest: Array<{ id: string; name: string; latitude: number; longitude: number }>
  }>
}
type HourlyCapture = {
  requested_at: string
  responses: Array<{ station_id: string; body: unknown[] }>
}
type SynopSample = { row_count: number; sample: Array<Record<string, unknown>> }

const excerpt = fixture<StationExcerpt>("liste-stations.excerpt.json")
const recent = fixture<HourlyCapture>("station-horaire.recent.json")
const old = fixture<HourlyCapture>("station-horaire.old.json")
const synop = fixture<SynopSample>("synop.sample.json")

const POINTS = Object.fromEntries(excerpt.points.map((point) => [point.label, point]))
const FONTAINEBLEAU = POINTS.Fontainebleau
const VOSGES = POINTS["Vosges (Gerardmer)"]
const LANDES = POINTS["Landes (Mimizan)"]

/** The station list as the provider serves it (CSV, the real column names), from the excerpt. */
function stationCsv(delimiter = ";"): string {
  const seen = new Map<string, StationExcerpt["points"][number]["nearest"][number]>()
  for (const point of excerpt.points) {
    for (const station of point.nearest) seen.set(station.id, station)
  }
  const rows = [...seen.values()].map((station) =>
    [
      station.id,
      "",
      station.name,
      station.latitude,
      station.longitude,
      80,
      "1990-01-01",
      "Pack",
    ].join(delimiter),
  )
  return [excerpt.columns.join(delimiter), ...rows].join("\n")
}

const HOUR = new Date("2026-10-12T04:00:00Z")

describe("parseStationList", () => {
  it("reads the station list built from the real excerpt, ids as strings", () => {
    const stations = parseStationList(stationCsv())
    const unique = new Set(
      excerpt.points.flatMap((point) => point.nearest.map((station) => station.id)),
    )
    expect(stations).toHaveLength(unique.size)
    expect(stations).toContainEqual({
      id: "77186002",
      name: "FONTAINEBLEAU_SAPC",
      lat: 48.406,
      lng: 2.6785,
    })
    for (const station of stations) {
      expect(typeof station.id).toBe("string")
      expect(Number.isFinite(station.lat)).toBe(true)
      expect(Number.isFinite(station.lng)).toBe(true)
    }
  })

  it("keeps leading zeros and gives a short numeric id its zeros back", () => {
    const csv = [
      "Id_station;Id_omm;Nom_usuel;Latitude;Longitude",
      "01014002;;ARBENT;46.278;5.669",
      "1015001;;SHORT;46;5",
    ].join("\n")
    expect(parseStationList(csv).map((station) => station.id)).toEqual(["01014002", "01015001"])
  })

  it("accepts a comma delimiter, quoted names and CRLF line ends", () => {
    const csv =
      'Id_station,Nom_usuel,Latitude,Longitude\r\n77186002,"FONTAINEBLEAU, SAPC",48.406,2.6785\r\n'
    expect(parseStationList(csv)).toEqual([
      { id: "77186002", name: "FONTAINEBLEAU, SAPC", lat: 48.406, lng: 2.6785 },
    ])
  })

  it("accepts a decimal comma, a byte order mark and a missing name column", () => {
    const csv = `${String.fromCharCode(0xfeff)}Id_station;Latitude;Longitude\n77186002;48,406;2,6785\n`
    expect(parseStationList(csv)).toEqual([
      { id: "77186002", name: null, lat: 48.406, lng: 2.6785 },
    ])
  })

  it("skips rows with a missing id, a missing or non-finite position", () => {
    const csv = [
      "Id_station;Nom_usuel;Latitude;Longitude",
      ";NOID;48;2",
      "11111111;NOLAT;;2",
      "22222222;NOLNG;48;",
      "33333333;TEXT;north;east",
      "44444444;OUT;95;2",
      "55555555;OUT2;48;200",
      "66666666;OK;48.5;2.5",
    ].join("\n")
    expect(parseStationList(csv)).toEqual([{ id: "66666666", name: "OK", lat: 48.5, lng: 2.5 }])
  })

  it("gives no station for anything that is not a station CSV", () => {
    expect(parseStationList(undefined)).toEqual([])
    expect(parseStationList({ rows: [] })).toEqual([])
    expect(parseStationList("")).toEqual([])
    expect(parseStationList("Id_station;Nom_usuel;Latitude;Longitude")).toEqual([])
    expect(parseStationList("Nom;Ville\nA;B")).toEqual([])
  })
})

describe("parseHourlyReading on the real captures", () => {
  it("converts Kelvin to degrees C and keeps the provider's own time", () => {
    const expected = [2.3, 3.9, 15.7]
    recent.responses.forEach((response, index) => {
      expect(parseHourlyReading(response.body, HOUR)).toEqual({
        observed_at: "2026-10-12T04:00:00Z",
        temperature_c: expected[index],
        wind_kmh: null,
        rain_24h_mm: null,
        sky: null,
      })
    })
  })

  it("reads the 30 hour old capture as the reading it holds (its own time)", () => {
    const reading = parseHourlyReading(old.responses[0].body, HOUR)
    expect(reading?.observed_at).toBe("2026-10-11T00:00:00Z")
    expect(reading?.temperature_c).toBe(9.6)
  })

  const base = (patch: Record<string, unknown>) => [
    { validity_time: "2026-10-12T04:00:00Z", t: null, ff: null, ...patch },
  ]

  it("rounds to one decimal: 283.15 K is 10, 2 m/s is 7.2 km/h", () => {
    expect(parseHourlyReading(base({ t: 283.15, ff: 2 }))).toMatchObject({
      temperature_c: 10,
      wind_kmh: 7.2,
    })
    expect(parseHourlyReading(base({ t: 275.45, ff: 1.3 }))).toMatchObject({
      temperature_c: 2.3,
      wind_kmh: 4.7,
    })
  })

  it("never returns negative zero", () => {
    expect(Object.is(parseHourlyReading(base({ t: 273.15 }))?.temperature_c, 0)).toBe(true)
  })

  it("drops a value outside the ranges, such as a temperature already in degrees C", () => {
    const reading = parseHourlyReading(base({ t: 12, ff: 200 }))
    expect(reading?.temperature_c).toBeNull()
    expect(reading?.wind_kmh).toBeNull()
    const hot = parseHourlyReading(base({ t: 400 }))
    expect(hot?.temperature_c).toBeNull()
    const limits = parseHourlyReading(base({ t: 273.15 + WEATHER_RANGES.temperature_c.max }))
    expect(limits?.temperature_c).toBe(WEATHER_RANGES.temperature_c.max)
  })

  it("keeps null as null and ignores a value that is not a number", () => {
    const reading = parseHourlyReading(base({ t: "275.45", ff: Number.NaN }))
    expect(reading).toMatchObject({ temperature_c: null, wind_kmh: null })
  })

  it("never reads sky or 24 h rain from the hourly product (D-21)", () => {
    const reading = parseHourlyReading(base({ t: 280, n: 100, rr1: 4 }))
    expect(reading).toMatchObject({ sky: null, rain_24h_mm: null })
  })

  it("is null for an empty, unreadable or time-less answer", () => {
    expect(parseHourlyReading([])).toBeNull()
    expect(parseHourlyReading(null)).toBeNull()
    expect(parseHourlyReading({ t: 280 })).toBeNull()
    expect(parseHourlyReading([{ t: 280 }, null, 3])).toBeNull()
    expect(parseHourlyReading([{ validity_time: "not a time", t: 280 }])).toBeNull()
  })

  it("keeps the row nearest the requested hour when several come back", () => {
    const rows = [
      { validity_time: "2026-10-12T02:00:00Z", t: 270 },
      { validity_time: "2026-10-12T04:00:00Z", t: 280.15 },
      { validity_time: "2026-10-12T06:00:00Z", t: 290 },
    ]
    expect(parseHourlyReading(rows, HOUR)?.temperature_c).toBe(7)
    expect(parseHourlyReading(rows)?.temperature_c).toBe(-3.1)
  })
})

describe("skyFromSynop", () => {
  it.each([
    [95, "thunderstorm"],
    [99, "thunderstorm"],
    [17, "thunderstorm"],
    [50, "rain"],
    [63, "rain"],
    [69, "rain"],
    [80, "rain"],
    [84, "rain"],
    [91, "rain"],
    [70, "snow"],
    [79, "snow"],
    [85, "snow"],
    [86, "snow"],
    [93, "snow"],
    [41, "fog"],
    [45, "fog"],
    [49, "fog"],
  ])("maps present weather %i to %s whatever the cloud cover", (ww, expected) => {
    expect(skyFromSynop(ww, 20)).toBe(expected)
    expect(skyFromSynop(ww, null)).toBe(expected)
  })

  it.each([
    [0, "clear"],
    [25, "clear"],
    [25.1, "partly_cloudy"],
    [50, "partly_cloudy"],
    [50.1, "cloudy"],
    [87.5, "cloudy"],
    [87.6, "overcast"],
    [100, "overcast"],
  ])("cuts a cloud cover of %f percent into %s when no phenomenon is reported", (n, expected) => {
    expect(skyFromSynop(0, n)).toBe(expected)
    expect(skyFromSynop(null, n)).toBe(expected)
  })

  it.each([0, 3, 10, 40, 87, 90, 100, 120, 510, -1, 5.5, "63", null, undefined])(
    "reads present weather %p as no phenomenon and falls back to the cloud cover",
    (ww) => {
      expect(skyFromSynop(ww, 100)).toBe("overcast")
    },
  )

  it("is null when nothing says anything: the sky is never invented", () => {
    expect(skyFromSynop(0, null)).toBeNull()
    expect(skyFromSynop(null, null)).toBeNull()
    expect(skyFromSynop(undefined, undefined)).toBeNull()
    expect(skyFromSynop(0, 101)).toBeNull()
    expect(skyFromSynop(0, -5)).toBeNull()
    expect(skyFromSynop(0, "100")).toBeNull()
    expect(skyFromSynop(0, Number.NaN)).toBeNull()
  })

  it("only ever returns one of the app's sky codes", () => {
    for (let ww = -2; ww <= 105; ww += 1) {
      for (const n of [null, 0, 30, 60, 100]) {
        const sky = skyFromSynop(ww, n)
        expect(sky === null || WEATHER_SKY_CODES.includes(sky)).toBe(true)
      }
    }
  })
})

describe("parseSynopReports on the real sample", () => {
  const reports = parseSynopReports(synop.sample, new Date("2026-10-12T06:00:00Z"))
  const byId = new Map(reports.map((report) => [report.station.id, report]))

  it("reads one report per sampled station, WMO ids as 5 digit strings with their position", () => {
    expect(reports).toHaveLength(synop.sample.length)
    expect(byId.get("07247")).toEqual({
      station: { id: "07247", name: "ROMORANTIN", lat: 47.319667, lng: 1.6875 },
      observed_at: "2026-10-12T06:00:00Z",
      rain_24h_mm: 0,
      sky: "overcast",
    })
  })

  it("leaves the sky null where n and ww give nothing, and reads rr24 where present", () => {
    expect(byId.get("07197")).toMatchObject({ sky: null, rain_24h_mm: 0 })
    expect(byId.get("07288")).toMatchObject({ sky: null, rain_24h_mm: 0 })
    expect(byId.get("07245")).toMatchObject({ sky: "overcast", rain_24h_mm: 0 })
  })

  it("reads the trace value -0.1 of rr24 as 0 mm", () => {
    expect(synop.sample.find((row) => row.geo_id_wmo === "07292")?.rr24).toBe(-0.1)
    expect(byId.get("07292")?.rain_24h_mm).toBe(0)
  })

  it("never copies a raw provider field", () => {
    for (const report of reports) {
      expect(Object.keys(report).sort()).toEqual(["observed_at", "rain_24h_mm", "sky", "station"])
      expect(Object.keys(report.station).sort()).toEqual(["id", "lat", "lng", "name"])
    }
  })

  const row = (patch: Record<string, unknown>) => ({
    geo_id_wmo: "07100",
    name: "X",
    lat: 48,
    lon: 2,
    validity_time: "2026-10-12T06:00:00Z",
    rr24: 1.26,
    ww: 61,
    n: null,
    ...patch,
  })
  const at = new Date("2026-10-12T06:00:00Z")

  it("rounds rain to one decimal, maps rain by ww, and drops an out of range total", () => {
    expect(parseSynopReports([row({})], at)[0]).toMatchObject({ rain_24h_mm: 1.3, sky: "rain" })
    expect(parseSynopReports([row({ rr24: 5000 })], at)[0].rain_24h_mm).toBeNull()
    expect(parseSynopReports([row({ rr24: null })], at)[0].rain_24h_mm).toBeNull()
    expect(parseSynopReports([row({ rr24: "3" })], at)[0].rain_24h_mm).toBeNull()
  })

  it("accepts a numeric WMO id and pads it to 5 digits", () => {
    expect(parseSynopReports([row({ geo_id_wmo: 7100 })], at)[0].station.id).toBe("07100")
  })

  it("skips rows with no id, no position or no readable time, and non-array answers", () => {
    const rows = [
      row({ geo_id_wmo: null }),
      row({ geo_id_wmo: -3 }),
      row({ lat: null }),
      row({ lon: "2" }),
      row({ lat: 120 }),
      row({ validity_time: null }),
      row({ validity_time: "later" }),
      null,
      "text",
      row({ geo_id_wmo: "07101" }),
    ]
    expect(parseSynopReports(rows, at).map((report) => report.station.id)).toEqual(["07101"])
    expect(parseSynopReports({ rows }, at)).toEqual([])
    expect(parseSynopReports(null, at)).toEqual([])
  })

  it("keeps, per station, the report nearest the hour", () => {
    const rows = [
      row({ validity_time: "2026-10-12T03:00:00Z", rr24: 9 }),
      row({ validity_time: "2026-10-12T06:00:00Z", rr24: 2 }),
      row({ validity_time: "2026-10-12T09:00:00Z", rr24: 7 }),
    ]
    const result = parseSynopReports(rows, at)
    expect(result).toHaveLength(1)
    expect(result[0].rain_24h_mm).toBe(2)
    expect(parseSynopReports(rows.reverse(), at)[0].rain_24h_mm).toBe(2)
  })
})

describe("MeteoFranceWeatherProvider", () => {
  function fakeHttp(answers: { text?: string; json?: unknown } = {}) {
    return {
      getText: jest.fn().mockResolvedValue(answers.text ?? stationCsv()),
      getJson: jest.fn().mockResolvedValue(answers.json ?? []),
    }
  }
  const asHttp = (http: ReturnType<typeof fakeHttp>) => http as unknown as MeteoFranceHttp

  it("lists the stations from the CSV endpoint", async () => {
    const http = fakeHttp()
    const stations = await new MeteoFranceWeatherProvider(asHttp(http)).listStations()
    expect(http.getText).toHaveBeenCalledWith("liste-stations", { format: "csv" }, "stations")
    expect(stations.some((station) => station.id === "77186002")).toBe(true)
  })

  it("treats an empty station list as a failure, not as 'no station'", async () => {
    const http = fakeHttp({ text: "Id_station;Latitude;Longitude\n" })
    await expect(new MeteoFranceWeatherProvider(asHttp(http)).listStations()).rejects.toMatchObject(
      { name: "MeteoFranceHttpError", message: "meteofrance stations returned no station" },
    )
  })

  it("reads one hourly reading with the recorded parameters", async () => {
    const http = fakeHttp({ json: recent.responses[0].body })
    const reading = await new MeteoFranceWeatherProvider(asHttp(http)).readHourly("77186002", HOUR)
    expect(http.getJson).toHaveBeenCalledWith(
      "station/horaire",
      { id_station: "77186002", date: "2026-10-12T04:00:00Z", format: "json" },
      "hourly",
    )
    expect(reading).toMatchObject({ observed_at: "2026-10-12T04:00:00Z", temperature_c: 2.3 })
  })

  it("returns null for an empty hourly answer", async () => {
    const http = fakeHttp({ json: [] })
    await expect(
      new MeteoFranceWeatherProvider(asHttp(http)).readHourly("77186002", HOUR),
    ).resolves.toBeNull()
  })

  it("does not call the provider with a station id that is not a plain id", async () => {
    const http = fakeHttp()
    const provider = new MeteoFranceWeatherProvider(asHttp(http))
    await expect(provider.readHourly("../liste-stations?x=", HOUR)).resolves.toBeNull()
    await expect(provider.readHourly("", HOUR)).resolves.toBeNull()
    expect(http.getJson).not.toHaveBeenCalled()
  })

  it("reads the SYNOP reports in a window of 90 minutes around the hour", async () => {
    const http = fakeHttp({ json: synop.sample })
    const reports = await new MeteoFranceWeatherProvider(asHttp(http)).readSynopReports(
      new Date("2026-10-12T06:00:00Z"),
    )
    expect(http.getJson).toHaveBeenCalledWith(
      "synop",
      { format: "json", date_debut: "2026-10-12T04:30:00Z", date_fin: "2026-10-12T07:30:00Z" },
      "synop",
    )
    expect(reports).toHaveLength(synop.sample.length)
  })

  it("lets a provider failure through, as the error the service turns into a 503", async () => {
    const http = fakeHttp()
    http.getJson.mockRejectedValue(new MeteoFranceHttpError("hourly", 429))
    await expect(
      new MeteoFranceWeatherProvider(asHttp(http)).readHourly("77186002", HOUR),
    ).rejects.toMatchObject({ status: 429 })
  })
})

describe("createWeatherProvider for meteofrance", () => {
  it("builds the Météo-France provider from a credential", () => {
    const config = buildTestConfig({
      WEATHER_PROVIDER: "meteofrance",
      METEOFRANCE_API_KEY: "an-application-id",
    }).weather
    expect(createWeatherProvider(config)).toBeInstanceOf(MeteoFranceWeatherProvider)
  })

  it.each(["", "   ", "CHANGE_ME", "change-me-later"])(
    "returns null for the blank or example credential %p (the service answers disabled)",
    (key) => {
      const config = buildTestConfig({
        WEATHER_PROVIDER: "meteofrance",
        METEOFRANCE_API_KEY: key,
      }).weather
      expect(createWeatherProvider(config)).toBeNull()
    },
  )
})

describe("WeatherService over the Météo-France provider and the real captures", () => {
  beforeEach(() => {
    // 05:20Z: the survey time 05:05Z rounds to the 05:00 hour, 65 minutes from the 04:00 hourly
    // readings and 55 minutes from the 06:00 SYNOP reports, both inside the 90 minute tolerance.
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-12T05:20:00Z"))
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  /** A mocked http that answers like the provider, from the captured files. */
  function serviceOver(capture: HourlyCapture, overrides: Record<string, string> = {}) {
    const getText = jest.fn().mockResolvedValue(stationCsv())
    const getJson = jest.fn(async (path: string, query: Record<string, string>) => {
      if (path === "synop") return synop.sample
      const found = capture.responses.find((response) => response.station_id === query.id_station)
      return found ? found.body : []
    })
    const provider = new MeteoFranceWeatherProvider({
      getText,
      getJson,
    } as unknown as MeteoFranceHttp)
    const service = new WeatherService(
      buildTestConfigService({ WEATHER_PROVIDER: "meteofrance", ...overrides }),
      provider,
    )
    return { service, getText, getJson }
  }

  const at = "2026-10-12T05:05:00Z"

  it("serves temperature from the hourly station and rain from the nearest SYNOP station", async () => {
    const { service } = serviceOver(recent)
    const response = await service.lookup({ lat: VOSGES.lat, lng: VOSGES.lng, at })
    expect(response.observation).toEqual({
      sky: null,
      temperature_c: 3.9,
      wind_kmh: null,
      rain_24h_mm: 0,
      observed_at: "2026-10-12T04:00:00Z",
      source: "meteo_france",
      station: { id: "88196009", name: "GERARDMER", distance_km: 2.7 },
    })
  })

  it("serves a Landes survey 25.13 km from its nearest station with the 30 km default cap", async () => {
    const { service } = serviceOver(recent)
    const response = await service.lookup({ lat: LANDES.lat, lng: LANDES.lng, at })
    expect(response.observation?.temperature_c).toBe(15.7)
    expect(response.observation?.station.id).toBe("40134001")
  })

  it("leaves the weather empty beyond the caps, with no error (25 km cap: Landes is empty)", async () => {
    const { service } = serviceOver(recent, { WEATHER_MAX_STATION_DISTANCE_KM: "25" })
    await expect(service.lookup({ lat: LANDES.lat, lng: LANDES.lng, at })).resolves.toEqual({
      observation: null,
      reason: "no_station",
    })
  })

  it("serves sky and rain over 24 h alone where only a SYNOP station is in range (Blois)", async () => {
    const { service } = serviceOver(recent)
    const response = await service.lookup({ lat: 47.59, lng: 1.33, at })
    expect(response.observation).toMatchObject({
      sky: "overcast",
      rain_24h_mm: 0,
      temperature_c: null,
      wind_kmh: null,
      observed_at: "2026-10-12T06:00:00Z",
      station: { id: "07245", name: "BLOIS" },
    })
  })

  it("answers no_data for the 30 hour old capture: its own time is too far from the survey", async () => {
    const { service } = serviceOver(old)
    const response = await service.lookup({ lat: FONTAINEBLEAU.lat, lng: FONTAINEBLEAU.lng, at })
    expect(response).toEqual({ observation: null, reason: "no_data" })
  })

  it("answers no_station where neither an hourly nor a SYNOP station is in range", async () => {
    const { service } = serviceOver(recent)
    // The English Channel, far from every station of the captures.
    await expect(service.lookup({ lat: 50.5, lng: -1.5, at })).resolves.toEqual({
      observation: null,
      reason: "no_station",
    })
  })

  it("answers no_data when a SYNOP station is in range but all its reports are too old", async () => {
    const { service, getJson } = serviceOver(old)
    getJson.mockImplementation(async (path: string) =>
      path === "synop"
        ? synop.sample.map((row) => ({ ...row, validity_time: "2026-10-11T06:00:00Z" }))
        : [],
    )
    await expect(service.lookup({ lat: 47.59, lng: 1.33, at })).resolves.toEqual({
      observation: null,
      reason: "no_data",
    })
  })

  it("asks the provider once for the station list and once for the SYNOP reports of an hour", async () => {
    const { service, getText, getJson } = serviceOver(recent)
    await service.lookup({ lat: VOSGES.lat, lng: VOSGES.lng, at })
    await service.lookup({ lat: FONTAINEBLEAU.lat, lng: FONTAINEBLEAU.lng, at })
    expect(getText).toHaveBeenCalledTimes(1)
    const synopCalls = getJson.mock.calls.filter((call) => call[0] === "synop")
    expect(synopCalls).toHaveLength(1)
  })

  it("turns a failed SYNOP call into the 503 of the contract, without the credential", async () => {
    const { service, getJson } = serviceOver(recent)
    getJson.mockImplementation(async (path: string) => {
      if (path === "synop") throw new MeteoFranceHttpError("synop", 429)
      return []
    })
    await expect(service.lookup({ lat: VOSGES.lat, lng: VOSGES.lng, at })).rejects.toMatchObject({
      response: { code: "weather_provider_unavailable" },
    })
  })
})
