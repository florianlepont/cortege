import { WEATHER_RANGES } from "@cortege/ibp-domain"
import {
  haversineKm,
  isWithinTolerance,
  mergeStationReadings,
  nearestUtcHour,
  rankStations,
  roundOneDecimal,
  type RankedStation,
} from "../src/surveys/weather-stations"
import type { WeatherReading, WeatherStation } from "../src/surveys/weather-provider"

const PARIS = { lat: 48.8566, lng: 2.3522 }
const LYON = { lat: 45.764, lng: 4.8357 }

function station(id: string, lat: number, lng: number, name: string | null = id): WeatherStation {
  return { id, name, lat, lng }
}

function ranked(id: string, distance_km: number, name: string | null = id): RankedStation {
  return { id, name, lat: 0, lng: 0, distance_km }
}

function reading(overrides: Partial<WeatherReading> = {}): WeatherReading {
  return {
    observed_at: "2026-10-11T08:00:00.000Z",
    temperature_c: null,
    wind_kmh: null,
    rain_24h_mm: null,
    sky: null,
    ...overrides,
  }
}

describe("haversineKm", () => {
  it("measures Paris to Lyon within 1 km of 392", () => {
    expect(Math.abs(haversineKm(PARIS, LYON) - 392)).toBeLessThan(1)
  })

  it("is zero for the same point and symmetric", () => {
    expect(haversineKm(PARIS, PARIS)).toBe(0)
    expect(haversineKm(PARIS, LYON)).toBeCloseTo(haversineKm(LYON, PARIS), 9)
  })
})

describe("roundOneDecimal", () => {
  it("rounds to one decimal and never returns negative zero", () => {
    expect(roundOneDecimal(12.34)).toBe(12.3)
    expect(roundOneDecimal(18.04)).toBe(18)
    expect(roundOneDecimal(-0.04)).toBe(0)
    expect(Object.is(roundOneDecimal(-0.04), 0)).toBe(true)
  })
})

describe("rankStations", () => {
  const point = { lat: 48.4, lng: 2.7 }
  const near = station("N", 48.41, 2.7)
  const mid = station("M", 48.5, 2.7)
  const far = station("F", 48.6, 2.7)
  const outside = station("O", 49.4, 2.7)

  it("keeps stations within the cap, nearest first, at most the limit", () => {
    const result = rankStations([far, outside, near, mid], point, 25, 3)
    expect(result.map((entry) => entry.id)).toEqual(["N", "M", "F"])
    for (const entry of result) {
      expect(entry.distance_km).toBeLessThanOrEqual(25)
      expect(entry.distance_km).toBe(roundOneDecimal(entry.distance_km))
    }
  })

  it("applies the limit", () => {
    const result = rankStations([far, near, mid], point, 25, 2)
    expect(result.map((entry) => entry.id)).toEqual(["N", "M"])
  })

  it("returns an empty list when no station is within the cap", () => {
    expect(rankStations([outside], point, 25, 3)).toEqual([])
    expect(rankStations([], point, 25, 3)).toEqual([])
  })

  it("keeps the station fields and adds the distance", () => {
    const [first] = rankStations([near], point, 25, 3)
    expect(first).toMatchObject({ id: "N", name: "N", lat: 48.41, lng: 2.7 })
    expect(first.distance_km).toBe(1.1)
  })
})

describe("nearestUtcHour", () => {
  it("rounds to the nearest UTC hour", () => {
    expect(nearestUtcHour(new Date("2026-10-11T08:29:59Z")).toISOString()).toBe(
      "2026-10-11T08:00:00.000Z",
    )
    expect(nearestUtcHour(new Date("2026-10-11T08:30:00Z")).toISOString()).toBe(
      "2026-10-11T09:00:00.000Z",
    )
  })

  it("does not mutate its argument", () => {
    const at = new Date("2026-10-11T08:40:00Z")
    nearestUtcHour(at)
    expect(at.toISOString()).toBe("2026-10-11T08:40:00.000Z")
  })
})

describe("isWithinTolerance", () => {
  const at = new Date("2026-10-11T09:20:00Z")

  it("accepts a reading inside the tolerance", () => {
    expect(isWithinTolerance("2026-10-11T08:00:00Z", at, 90)).toBe(true)
  })

  it("rejects a reading beyond the tolerance, on either side", () => {
    expect(isWithinTolerance("2026-10-11T08:00:00Z", new Date("2026-10-11T09:31:00Z"), 90)).toBe(
      false,
    )
    expect(isWithinTolerance("2026-10-11T11:00:00Z", at, 90)).toBe(false)
  })

  it("rejects an unparsable time", () => {
    expect(isWithinTolerance("hier", at, 90)).toBe(false)
    expect(isWithinTolerance("", at, 90)).toBe(false)
  })
})

describe("mergeStationReadings", () => {
  it("takes each value from the nearest station that has it", () => {
    const merged = mergeStationReadings([
      {
        station: ranked("A", 3, "Station A"),
        reading: reading({ temperature_c: 12.34, observed_at: "2026-10-11T08:00:00.000Z" }),
      },
      {
        station: ranked("B", 9, "Station B"),
        reading: reading({
          temperature_c: 11,
          wind_kmh: 18.04,
          rain_24h_mm: 0.2,
          sky: "rain",
          observed_at: "2026-10-11T07:00:00.000Z",
        }),
      },
    ])
    expect(merged).toEqual({
      sky: "rain",
      temperature_c: 12.3,
      wind_kmh: 18,
      rain_24h_mm: 0.2,
      observed_at: "2026-10-11T08:00:00.000Z",
      source: "meteo_france",
      station: { id: "A", name: "Station A", distance_km: 3 },
    })
  })

  it("takes observed_at and station from the nearest station that contributed a value", () => {
    const merged = mergeStationReadings([
      { station: ranked("A", 3), reading: reading() },
      {
        station: ranked("B", 9, null),
        reading: reading({ temperature_c: 10, observed_at: "2026-10-11T07:00:00.000Z" }),
      },
    ])
    expect(merged?.station).toEqual({ id: "B", name: null, distance_km: 9 })
    expect(merged?.observed_at).toBe("2026-10-11T07:00:00.000Z")
  })

  it("returns null when every reading is empty or there is none", () => {
    expect(mergeStationReadings([])).toBeNull()
    expect(
      mergeStationReadings([
        { station: ranked("A", 3), reading: reading() },
        { station: ranked("B", 5), reading: reading() },
      ]),
    ).toBeNull()
  })

  it("drops a value outside its range instead of returning it", () => {
    const merged = mergeStationReadings([
      {
        station: ranked("A", 3),
        reading: reading({
          temperature_c: 80,
          wind_kmh: -4,
          rain_24h_mm: 5000,
          sky: "clear",
        }),
      },
    ])
    expect(merged).toMatchObject({
      sky: "clear",
      temperature_c: null,
      wind_kmh: null,
      rain_24h_mm: null,
    })
  })

  it("falls through to the next station when the nearest value is out of range", () => {
    const merged = mergeStationReadings([
      { station: ranked("A", 3), reading: reading({ temperature_c: 80, sky: "fog" }) },
      { station: ranked("B", 9), reading: reading({ temperature_c: 14 }) },
    ])
    expect(merged?.temperature_c).toBe(14)
    expect(merged?.sky).toBe("fog")
  })

  it("returns null when the only value is out of range", () => {
    expect(
      mergeStationReadings([{ station: ranked("A", 3), reading: reading({ temperature_c: 80 }) }]),
    ).toBeNull()
  })

  it("ignores a sky code that is not in the catalogue", () => {
    const merged = mergeStationReadings([
      {
        station: ranked("A", 3),
        reading: reading({ sky: "hail" as unknown as WeatherReading["sky"], wind_kmh: 5 }),
      },
    ])
    expect(merged?.sky).toBeNull()
    expect(merged?.wind_kmh).toBe(5)
  })

  it("ignores non-finite numbers", () => {
    const merged = mergeStationReadings([
      {
        station: ranked("A", 3),
        reading: reading({ temperature_c: Number.NaN, wind_kmh: Number.POSITIVE_INFINITY }),
      },
    ])
    expect(merged).toBeNull()
  })

  it("keeps values on the range bounds", () => {
    const merged = mergeStationReadings([
      {
        station: ranked("A", 3),
        reading: reading({
          temperature_c: WEATHER_RANGES.temperature_c.min,
          wind_kmh: WEATHER_RANGES.wind_kmh.max,
          rain_24h_mm: 0,
        }),
      },
    ])
    expect(merged).toMatchObject({ temperature_c: -40, wind_kmh: 350, rain_24h_mm: 0 })
  })
})
