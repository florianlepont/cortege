import type { SurveyWeather, WeatherObservation } from "@cortege/ibp-domain"
import {
  canonicalWeather,
  editWeatherSky,
  formatObservationDate,
  formatObservationTime,
  formatWeatherLine,
  formatWeatherNumber,
  hasWeatherValues,
  isObserverSky,
  mergeWeatherObservation,
  needsWeatherLookup,
  observationStamp,
  roundWeatherCoordinate,
  weatherRequestTime,
  showsProviderAttribution,
  weatherCardMention,
  weatherSourceLine,
  weatherViewState,
} from "./weather"

const NOW = new Date("2026-10-11T12:00:00.000Z")
const HOUR = 60 * 60 * 1000
const ago = (hours: number) => new Date(NOW.getTime() - hours * HOUR).toISOString()

const observation = (overrides: Partial<WeatherObservation> = {}): WeatherObservation => ({
  sky: null,
  temperature_c: null,
  wind_kmh: null,
  rain_24h_mm: null,
  observed_at: "2026-10-11T11:00:00.000Z",
  source: "meteo_france",
  station: { id: "77186001", name: "Melun", distance_km: 4.2 },
  ...overrides,
})

describe("formatWeatherNumber", () => {
  it("uses the French comma and at most one decimal", () => {
    expect(formatWeatherNumber(14.5)).toBe("14,5")
    expect(formatWeatherNumber(12)).toBe("12")
    expect(formatWeatherNumber(-3.25)).toBe("-3,3")
    expect(formatWeatherNumber(2.0)).toBe("2")
    expect(formatWeatherNumber(0)).toBe("0")
    expect(formatWeatherNumber(-0.04)).toBe("0")
  })
})

describe("formatWeatherLine", () => {
  it("joins the values that exist, with the catalogue parts", () => {
    const line = formatWeatherLine({
      sky: "cloudy",
      temperature_c: 14,
      wind_kmh: 12,
      rain_24h_mm: 2,
    })
    expect(line).toBe("Nuageux, 14 °C, vent 12 km/h, pluie 2 mm sur 24 h")
  })

  it("skips missing values and returns null when nothing is left", () => {
    expect(formatWeatherLine({ temperature_c: 9.5, wind_kmh: null })).toBe("9,5 °C")
    expect(formatWeatherLine({ rain_24h_mm: 0 })).toBe("pluie 0 mm sur 24 h")
    expect(formatWeatherLine({ requested_at: ago(1), observed_at: ago(1) })).toBeNull()
    expect(formatWeatherLine(null)).toBeNull()
  })

  it("never shows a sky code the app does not know", () => {
    const stored = { sky: "hail", temperature_c: 3 } as unknown as SurveyWeather
    expect(formatWeatherLine(stored)).toBe("3 °C")
  })
})

describe("observation time", () => {
  it("formats the local HH:mm of an ISO string", () => {
    const iso = "2026-10-11T08:12:41.000Z"
    const local = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    expect(formatObservationTime(iso)).toBe(`${pad(local.getHours())}:${pad(local.getMinutes())}`)
    expect(formatObservationTime(null)).toBeNull()
    expect(formatObservationTime(undefined)).toBeNull()
    expect(formatObservationTime("garbage")).toBeNull()
  })
})

describe("hasWeatherValues and the attribution", () => {
  it("counts the sky and the three numbers", () => {
    expect(hasWeatherValues(null)).toBe(false)
    expect(hasWeatherValues({ requested_at: ago(1) })).toBe(false)
    expect(hasWeatherValues({ temperature_c: null, sky: null })).toBe(false)
    expect(hasWeatherValues({ rain_24h_mm: 0 })).toBe(true)
    expect(hasWeatherValues({ sky: "fog" })).toBe(true)
  })

  it("knows when the sky shown is the observer's (D-37)", () => {
    expect(isObserverSky({ sky: "rain", edited: ["sky"], source: "manual" })).toBe(true)
    expect(isObserverSky({ sky: "rain", edited: ["sky"], source: "meteo_france" })).toBe(true)
    // A cleared sky shows nothing, so there is no sky to attribute.
    expect(isObserverSky({ sky: null, edited: ["sky"] })).toBe(false)
    expect(isObserverSky({ sky: "rain", source: "meteo_france" })).toBe(false)
    expect(isObserverSky(null)).toBe(false)
  })

  it("shows the attribution while the provider's numbers or an untouched sky are shown", () => {
    expect(showsProviderAttribution(null)).toBe(false)
    expect(showsProviderAttribution({ sky: "rain", source: "meteo_france" })).toBe(true)
    expect(showsProviderAttribution({ temperature_c: 9, source: "meteo_france" })).toBe(true)
    expect(showsProviderAttribution({ rain_24h_mm: 0, source: "meteo_france" })).toBe(true)
    // The observer's sky beside the provider's numbers: the numbers still are.
    expect(
      showsProviderAttribution({
        sky: "rain",
        temperature_c: 9,
        source: "meteo_france",
        edited: ["sky"],
      }),
    ).toBe(true)
    // The observer's sky alone, or on a manual weather, is never Météo-France's.
    expect(showsProviderAttribution({ sky: "rain", source: "meteo_france", edited: ["sky"] })).toBe(
      false,
    )
    expect(showsProviderAttribution({ sky: "rain", source: "manual", edited: ["sky"] })).toBe(false)
    expect(
      showsProviderAttribution({
        source: "meteo_france",
        sky: null,
        temperature_c: null,
        observed_at: ago(1),
      }),
    ).toBe(false)
  })
})

describe("mergeWeatherObservation", () => {
  const requested = ago(2)

  it("fills only what is empty and untouched", () => {
    const current: SurveyWeather = {
      requested_at: requested,
      sky: "fog",
      edited: ["sky"],
      source: "manual",
    }
    const merged = mergeWeatherObservation(
      current,
      observation({ sky: "clear", temperature_c: 12.34, wind_kmh: 18, rain_24h_mm: null }),
    )
    expect(merged.sky).toBe("fog")
    expect(merged.temperature_c).toBe(12.3)
    expect(merged.wind_kmh).toBe(18)
    expect(merged.rain_24h_mm).toBeNull()
    expect(merged.observed_at).toBe("2026-10-11T11:00:00.000Z")
    expect(merged.source).toBe("meteo_france")
    expect(merged.requested_at).toBe(requested)
    expect(merged.edited).toEqual(["sky"])
  })

  it("keeps a sky the observer cleared, and a present value", () => {
    const cleared = mergeWeatherObservation(
      { requested_at: requested, sky: null, edited: ["sky"] },
      observation({ sky: "clear", wind_kmh: 30, temperature_c: 11.26 }),
    )
    expect(cleared.sky).toBeNull()
    expect(cleared.wind_kmh).toBe(30)
    expect(cleared.temperature_c).toBe(11.3)

    const present = mergeWeatherObservation(
      { requested_at: requested, wind_kmh: 5 },
      observation({ wind_kmh: 30 }),
    )
    expect(present.wind_kmh).toBe(5)
  })

  it("starts from nothing and rounds to one decimal", () => {
    const merged = mergeWeatherObservation(
      null,
      observation({ sky: "overcast", temperature_c: 14.449, rain_24h_mm: 0.04 }),
    )
    expect(merged).toMatchObject({
      sky: "overcast",
      temperature_c: 14.4,
      rain_24h_mm: 0,
      source: "meteo_france",
    })
  })

  it("never stores a sky code it does not know", () => {
    const merged = mergeWeatherObservation(
      { requested_at: requested },
      observation({ sky: "hail" as unknown as WeatherObservation["sky"], wind_kmh: 3 }),
    )
    expect(merged.sky).toBeNull()
    expect(merged.wind_kmh).toBe(3)
  })

  it("marks the answer as merged even when every value was protected", () => {
    const merged = mergeWeatherObservation(
      { requested_at: requested, edited: ["sky"] },
      observation({ sky: "rain" }),
    )
    expect(merged.source).toBe("meteo_france")
    expect(hasWeatherValues(merged)).toBe(false)
    expect(needsWeatherLookup(merged, NOW)).toBe(false)
  })
})

describe("editWeatherSky (D-37: the sky is the only value the observer edits)", () => {
  it("sets the sky, lists it as edited and makes the weather manual when it was not the provider's", () => {
    expect(editWeatherSky({ requested_at: ago(1) }, "rain")).toEqual({
      requested_at: ago(1),
      sky: "rain",
      edited: ["sky"],
      source: "manual",
    })
    expect(editWeatherSky(null, "fog")).toEqual({ sky: "fog", edited: ["sky"], source: "manual" })
  })

  it("keeps the provider as the source of its numbers", () => {
    const weather = editWeatherSky(
      { temperature_c: 9, source: "meteo_france", observed_at: ago(2) },
      "clear",
    )
    expect(weather).toEqual({
      temperature_c: 9,
      observed_at: ago(2),
      sky: "clear",
      edited: ["sky"],
      source: "meteo_france",
    })
  })

  it("counts a clearing as an edit", () => {
    const weather = editWeatherSky({ sky: "rain", source: "meteo_france", wind_kmh: 3 }, null)
    expect(weather.sky).toBeNull()
    expect(weather.edited).toEqual(["sky"])
    expect(weather.source).toBe("meteo_france")
  })

  it("never lets another key into edited, and clears on a code it does not know", () => {
    const weather = editWeatherSky(
      { wind_kmh: 4, edited: ["wind_kmh"] } as unknown as SurveyWeather,
      "hail" as unknown as "rain",
    )
    expect(weather.sky).toBeNull()
    expect(weather.edited).toEqual(["sky"])
  })

  it("leaves the provider's numbers and observation time untouched", () => {
    const stored: SurveyWeather = {
      temperature_c: 16.9,
      wind_kmh: 7.2,
      rain_24h_mm: 0,
      observed_at: "2026-10-12T10:00:00Z",
      source: "meteo_france",
    }
    expect(editWeatherSky(stored, "overcast")).toMatchObject(stored)
  })
})

describe("canonicalWeather", () => {
  it("rounds, orders and drops undefined keys", () => {
    const canonical = canonicalWeather({
      edited: ["wind_kmh", "sky", "sky"],
      wind_kmh: 12.34,
      temperature_c: -0.04,
      sky: "cloudy",
      requested_at: ago(1),
      rain_24h_mm: undefined,
      source: "manual",
    })
    expect(canonical).toEqual({
      sky: "cloudy",
      temperature_c: 0,
      wind_kmh: 12.3,
      requested_at: ago(1),
      source: "manual",
      edited: ["sky"],
    })
    expect(Object.keys(canonical as object)).toEqual([
      "sky",
      "temperature_c",
      "wind_kmh",
      "requested_at",
      "source",
      "edited",
    ])
  })

  it("keeps explicit nulls and omits an empty edited list", () => {
    expect(
      canonicalWeather({ requested_at: ago(1), sky: null, edited: [], wind_kmh: Number.NaN }),
    ).toEqual({ requested_at: ago(1), sky: null, wind_kmh: null })
  })

  it("keeps the hour and the request time", () => {
    expect(
      canonicalWeather({ observed_at: "2026-10-11T11:00:00.000Z", requested_at: ago(2) }),
    ).toEqual({ observed_at: "2026-10-11T11:00:00.000Z", requested_at: ago(2) })
  })

  it("is idempotent", () => {
    const once = canonicalWeather({ requested_at: ago(1), wind_kmh: 4.44, edited: ["sky"] })
    expect(canonicalWeather(once)).toEqual(once)
  })

  it("returns null for nothing worth storing", () => {
    expect(canonicalWeather(null)).toBeNull()
    expect(canonicalWeather(undefined)).toBeNull()
    expect(canonicalWeather({})).toBeNull()
    // A cleared sky is worth keeping: it protects the observer's choice from a later answer.
    expect(canonicalWeather({ sky: null, edited: ["sky"] })).toEqual({ sky: null, edited: ["sky"] })
    expect(canonicalWeather({ requested_at: ago(1) })).toEqual({ requested_at: ago(1) })
    expect(canonicalWeather({ wind_kmh: 0 })).toEqual({ wind_kmh: 0 })
  })

  it("drops edited keys it does not know", () => {
    const stored = { requested_at: ago(1), edited: ["sky", "mood"] } as unknown as SurveyWeather
    expect(canonicalWeather(stored)).toEqual({ requested_at: ago(1), edited: ["sky"] })
  })
})

describe("needsWeatherLookup", () => {
  it("is true for a fresh request that no provider answered", () => {
    expect(needsWeatherLookup({ requested_at: ago(2) }, NOW)).toBe(true)
    expect(needsWeatherLookup({ requested_at: ago(24) }, NOW)).toBe(true)
    expect(needsWeatherLookup({ requested_at: ago(2), edited: ["sky"] }, NOW.getTime())).toBe(true)
  })

  it("is false once a provider answer was merged", () => {
    expect(needsWeatherLookup({ requested_at: ago(2), source: "meteo_france" }, NOW)).toBe(false)
  })

  it("is false past the 24 h window", () => {
    expect(needsWeatherLookup({ requested_at: ago(25) }, NOW)).toBe(false)
  })

  it("is false without weather, without a request time, or with an unreadable one", () => {
    expect(needsWeatherLookup(null, NOW)).toBe(false)
    expect(needsWeatherLookup({ sky: "fog" }, NOW)).toBe(false)
    expect(needsWeatherLookup({ requested_at: "never" }, NOW)).toBe(false)
  })
})

describe("weatherViewState", () => {
  const base = { hasParcel: true, online: true, inFlight: false, unavailable: false }

  it("covers each row of the UI-SPEC table", () => {
    expect(weatherViewState({ ...base, hasParcel: false, weather: null })).toBe("noParcel")
    expect(weatherViewState({ ...base, hasParcel: false, online: false, weather: null })).toBe(
      "noParcel",
    )
    expect(weatherViewState({ ...base, inFlight: true, weather: { requested_at: ago(1) } })).toBe(
      "loading",
    )
    expect(
      weatherViewState({ ...base, weather: { temperature_c: 9, source: "meteo_france" } }),
    ).toBe("prefilled")
    expect(weatherViewState({ ...base, online: false, weather: { requested_at: ago(1) } })).toBe(
      "offline",
    )
    expect(weatherViewState({ ...base, weather: { requested_at: ago(1) } })).toBe("unavailable")
    expect(weatherViewState({ ...base, unavailable: true, weather: null })).toBe("unavailable")
  })

  it("shows the measurements over a request in flight or a lost connection", () => {
    const weather: SurveyWeather = { wind_kmh: 4, source: "meteo_france" }
    expect(weatherViewState({ ...base, inFlight: true, weather })).toBe("prefilled")
    expect(weatherViewState({ ...base, online: false, weather })).toBe("prefilled")
  })

  it("does not let the observer's sky change the line (D-37)", () => {
    const sky: SurveyWeather = { sky: "fog", edited: ["sky"], source: "manual" }
    expect(weatherViewState({ ...base, hasParcel: false, weather: sky })).toBe("noParcel")
    expect(weatherViewState({ ...base, online: false, weather: sky })).toBe("offline")
    expect(weatherViewState({ ...base, inFlight: true, weather: sky })).toBe("loading")
    expect(weatherViewState({ ...base, weather: sky })).toBe("unavailable")
  })

  it("stays prefilled when the observer cleared the sky of a provider weather", () => {
    expect(
      weatherViewState({
        ...base,
        weather: { sky: null, temperature_c: 16.9, source: "meteo_france", edited: ["sky"] },
      }),
    ).toBe("prefilled")
  })

  it("is never an error: a provider that answered with nothing reads as unavailable", () => {
    expect(
      weatherViewState({
        ...base,
        weather: { source: "meteo_france", sky: null, requested_at: ago(1) },
      }),
    ).toBe("unavailable")
  })
})

describe("roundWeatherCoordinate", () => {
  it("keeps four decimals", () => {
    expect(roundWeatherCoordinate(48.400049)).toBe(48.4)
    expect(roundWeatherCoordinate(2.73456789)).toBe(2.7346)
    expect(roundWeatherCoordinate(-1.23456)).toBe(-1.2346)
  })
})

describe("the date of the data next to the source (D-31)", () => {
  // 04:00 on 12 October 2026 on the phone's own clock, whatever the time zone of the machine.
  const MEASURED = new Date(2026, 9, 12, 4, 0).toISOString()

  it("formats the local dd/mm/yyyy of an ISO string, null when there is none", () => {
    expect(formatObservationDate(MEASURED)).toBe("12/10/2026")
    expect(formatObservationDate(new Date(2026, 0, 5, 23, 59).toISOString())).toBe("05/01/2026")
    expect(formatObservationDate(null)).toBeNull()
    expect(formatObservationDate(undefined)).toBeNull()
    expect(formatObservationDate("")).toBeNull()
    expect(formatObservationDate("garbage")).toBeNull()
  })

  it("reads the stamp from observed_at only", () => {
    expect(observationStamp({ observed_at: MEASURED })).toEqual({
      date: "12/10/2026",
      time: "04:00",
    })
    expect(observationStamp({ requested_at: MEASURED })).toBeNull()
    expect(observationStamp({ observed_at: "garbage" })).toBeNull()
    expect(observationStamp({ observed_at: null })).toBeNull()
    expect(observationStamp(null)).toBeNull()
  })

  it("dates the source line of a provider weather", () => {
    expect(
      weatherSourceLine({ temperature_c: 9, source: "meteo_france", observed_at: MEASURED }),
    ).toBe("Source : Météo-France, mesure du 12/10/2026 à 04:00")
  })

  it("says the sky is the observer's when it is shown beside the provider's numbers (D-37)", () => {
    expect(
      weatherSourceLine({
        sky: "rain",
        temperature_c: 9,
        source: "meteo_france",
        observed_at: MEASURED,
        edited: ["sky"],
      }),
    ).toBe("Source : Météo-France, mesure du 12/10/2026 à 04:00, ciel saisi par l'observateur")
    expect(
      weatherSourceLine({
        sky: "rain",
        temperature_c: 9,
        source: "meteo_france",
        edited: ["sky"],
      }),
    ).toBe("Source : Météo-France, ciel saisi par l'observateur")
    // A cleared sky shows nothing: no clause.
    expect(
      weatherSourceLine({
        sky: null,
        temperature_c: 9,
        source: "meteo_france",
        observed_at: MEASURED,
        edited: ["sky"],
      }),
    ).toBe("Source : Météo-France, mesure du 12/10/2026 à 04:00")
  })

  it("keeps the plain source line without a readable date", () => {
    expect(weatherSourceLine({ sky: "rain", source: "meteo_france" })).toBe("Source : Météo-France")
    expect(weatherSourceLine({ wind_kmh: 3, source: "meteo_france", observed_at: "garbage" })).toBe(
      "Source : Météo-France",
    )
  })

  it("has no line when no shown value is the provider's, never a Météo-France mention", () => {
    expect(weatherSourceLine(null)).toBeNull()
    expect(weatherSourceLine({ sky: "rain", source: "manual", observed_at: MEASURED })).toBeNull()
    expect(
      weatherSourceLine({
        sky: "rain",
        source: "meteo_france",
        observed_at: MEASURED,
        edited: ["sky"],
      }),
    ).toBeNull()
  })
})

describe("weatherCardMention (D-35, D-37)", () => {
  const MEASURED = new Date(2026, 9, 12, 4, 0).toISOString()

  it("is the bare provider name while the provider's values are shown, with no date", () => {
    expect(weatherCardMention({ sky: "rain", source: "meteo_france", observed_at: MEASURED })).toBe(
      "Météo-France",
    )
    expect(weatherCardMention({ wind_kmh: 3, source: "meteo_france", edited: [] })).toBe(
      "Météo-France",
    )
  })

  it("stays the bare name when the observer set the sky, never 'en partie modifiée'", () => {
    // The owner's survey: numbers from the provider, the sky cleared by the observer.
    expect(
      weatherCardMention({
        sky: null,
        edited: ["sky"],
        source: "meteo_france",
        wind_kmh: 7.2,
        temperature_c: 16.9,
        rain_24h_mm: 0,
        observed_at: "2026-10-12T10:00:00Z",
      }),
    ).toBe("Météo-France")
  })

  it("has no mention for the observer's sky alone, a manual weather or none", () => {
    expect(weatherCardMention({ sky: "rain", source: "meteo_france", edited: ["sky"] })).toBeNull()
    expect(weatherCardMention({ sky: "rain", source: "manual", edited: ["sky"] })).toBeNull()
    expect(weatherCardMention(null)).toBeNull()
    expect(weatherCardMention(undefined)).toBeNull()
  })
})

describe("weatherRequestTime (D-39: the survey time of a draft that was never stamped)", () => {
  it("keeps a stamped survey time as it is, old or not (the 24 h rule is needsWeatherLookup's)", () => {
    expect(weatherRequestTime({ requested_at: ago(30) }, ago(2), NOW)).toBe(ago(30))
    expect(weatherRequestTime({ requested_at: ago(1) }, null, NOW)).toBe(ago(1))
  })

  it("derives it from the creation time of a draft created within the last 24 h", () => {
    expect(weatherRequestTime({ sky: "clear", source: "manual" }, ago(3), NOW)).toBe(ago(3))
    expect(weatherRequestTime(null, ago(23), NOW)).toBe(ago(23))
    expect(weatherRequestTime({ requested_at: null }, ago(1), NOW)).toBe(ago(1))
  })

  it("never invents a time: too old, in the future, unreadable or missing gives null", () => {
    expect(weatherRequestTime({}, ago(25), NOW)).toBeNull()
    expect(weatherRequestTime({}, "2026-07-08 10:00:00+00", NOW)).toBeNull()
    expect(weatherRequestTime({}, ago(-2), NOW)).toBeNull()
    expect(weatherRequestTime({}, "not a date", NOW)).toBeNull()
    expect(weatherRequestTime({}, null, NOW)).toBeNull()
    expect(weatherRequestTime({}, undefined, NOW)).toBeNull()
  })

  it("reads the server timestamp format of a pulled draft (space and +00)", () => {
    expect(weatherRequestTime({}, "2026-10-11 10:30:00+00", NOW)).toBe("2026-10-11T10:30:00.000Z")
    expect(weatherRequestTime({}, "2026-10-11 10:30:00.123456+00", NOW)).toBe(
      "2026-10-11T10:30:00.123Z",
    )
  })

  it("accepts a number as now", () => {
    expect(weatherRequestTime({}, ago(1), NOW.getTime())).toBe(ago(1))
  })
})
