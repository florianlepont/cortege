import type { SurveyWeather, WeatherObservation } from "@cortege/ibp-domain"
import {
  canonicalWeather,
  editWeatherValue,
  formatObservationDate,
  formatObservationTime,
  formatWeatherLine,
  formatWeatherNumber,
  hasWeatherValues,
  mergeWeatherObservation,
  needsWeatherLookup,
  observationStamp,
  parseObservationTimeInput,
  parseWeatherValueInput,
  resetWeatherForRefill,
  roundWeatherCoordinate,
  showsProviderAttribution,
  weatherProvenance,
  weatherCardMention,
  weatherSourceLine,
  weatherViewState,
  withObservationTime,
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
  it("reads the common ways of writing a time", () => {
    expect(parseObservationTimeInput("1430")).toBe("14:30")
    expect(parseObservationTimeInput("14:30")).toBe("14:30")
    expect(parseObservationTimeInput("14h30")).toBe("14:30")
    expect(parseObservationTimeInput("14H30")).toBe("14:30")
    expect(parseObservationTimeInput(" 9:05 ")).toBe("09:05")
    expect(parseObservationTimeInput("930")).toBe("09:30")
    expect(parseObservationTimeInput("0:00")).toBe("00:00")
    expect(parseObservationTimeInput("23:59")).toBe("23:59")
  })

  it("refuses what is not a time of day", () => {
    for (const text of ["2460", "25:00", "abc", "", "12:60", "14:3", "1", "14h", "12345"]) {
      expect(parseObservationTimeInput(text)).toBeNull()
    }
  })

  it("keeps the local calendar date of the base and sets the local time", () => {
    const base = "2026-10-11T06:12:00.000Z"
    const result = withObservationTime(base, "14:30")
    expect(result).not.toBeNull()
    const got = new Date(result as string)
    const wanted = new Date(base)
    expect(got.getFullYear()).toBe(wanted.getFullYear())
    expect(got.getMonth()).toBe(wanted.getMonth())
    expect(got.getDate()).toBe(wanted.getDate())
    expect(got.getHours()).toBe(14)
    expect(got.getMinutes()).toBe(30)
    expect(got.getSeconds()).toBe(0)
    expect(got.getMilliseconds()).toBe(0)
  })

  it("falls back to today when the base is missing or unreadable, and refuses a bad time", () => {
    for (const base of [null, undefined, "not a date"]) {
      const result = withObservationTime(base, "08:05")
      const got = new Date(result as string)
      expect(got.getHours()).toBe(8)
      expect(got.getMinutes()).toBe(5)
    }
    expect(withObservationTime("2026-10-11T06:12:00.000Z", "99:99")).toBeNull()
  })

  it("formats the local HH:mm of an ISO string", () => {
    const iso = "2026-10-11T08:12:41.000Z"
    const local = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    expect(formatObservationTime(iso)).toBe(`${pad(local.getHours())}:${pad(local.getMinutes())}`)
    expect(formatObservationTime(null)).toBeNull()
    expect(formatObservationTime(undefined)).toBeNull()
    expect(formatObservationTime("garbage")).toBeNull()
  })

  it("round-trips a typed time", () => {
    const stored = withObservationTime("2026-10-11T06:12:00.000Z", "14:30")
    expect(formatObservationTime(stored)).toBe("14:30")
  })
})

describe("parseWeatherValueInput", () => {
  it("reads a number with a comma or a point and one decimal", () => {
    expect(parseWeatherValueInput("temperature_c", "14,5")).toEqual({ value: 14.5 })
    expect(parseWeatherValueInput("temperature_c", "14.5")).toEqual({ value: 14.5 })
    expect(parseWeatherValueInput("temperature_c", "-3,25")).toEqual({ value: -3.3 })
    expect(parseWeatherValueInput("temperature_c", " 7 ")).toEqual({ value: 7 })
    expect(parseWeatherValueInput("wind_kmh", ",5")).toEqual({ value: 0.5 })
    expect(parseWeatherValueInput("rain_24h_mm", "1000")).toEqual({ value: 1000 })
    expect(parseWeatherValueInput("rain_24h_mm", "0")).toEqual({ value: 0 })
  })

  it("clears on an empty text", () => {
    expect(parseWeatherValueInput("temperature_c", "")).toEqual({ value: null })
    expect(parseWeatherValueInput("wind_kmh", "   ")).toEqual({ value: null })
  })

  it("reports a range error for out-of-range or unreadable text", () => {
    expect(parseWeatherValueInput("temperature_c", "80")).toEqual({ error: "range" })
    expect(parseWeatherValueInput("temperature_c", "-41")).toEqual({ error: "range" })
    expect(parseWeatherValueInput("temperature_c", "abc")).toEqual({ error: "range" })
    expect(parseWeatherValueInput("temperature_c", "-")).toEqual({ error: "range" })
    expect(parseWeatherValueInput("temperature_c", "1e2")).toEqual({ error: "range" })
    expect(parseWeatherValueInput("wind_kmh", "-1")).toEqual({ error: "range" })
    expect(parseWeatherValueInput("wind_kmh", "351")).toEqual({ error: "range" })
    expect(parseWeatherValueInput("rain_24h_mm", "1000,1")).toEqual({ error: "range" })
  })
})

describe("hasWeatherValues and provenance", () => {
  it("counts the four displayed values", () => {
    expect(hasWeatherValues(null)).toBe(false)
    expect(hasWeatherValues({ requested_at: ago(1) })).toBe(false)
    expect(hasWeatherValues({ temperature_c: null, sky: null })).toBe(false)
    expect(hasWeatherValues({ rain_24h_mm: 0 })).toBe(true)
    expect(hasWeatherValues({ sky: "fog" })).toBe(true)
  })

  it("tells where the shown values come from", () => {
    expect(weatherProvenance(null)).toBeNull()
    expect(weatherProvenance({ requested_at: ago(1), source: "meteo_france" })).toBeNull()
    expect(weatherProvenance({ sky: "rain", source: "meteo_france" })).toBe("prefilled")
    expect(
      weatherProvenance({ sky: "rain", source: "meteo_france", edited: ["temperature_c"] }),
    ).toBe("edited")
    expect(weatherProvenance({ wind_kmh: 4, source: "manual", edited: ["wind_kmh"] })).toBe(
      "manual",
    )
    expect(weatherProvenance({ wind_kmh: 4 })).toBe("manual")
  })

  it("shows the attribution only while a shown value is still the provider's", () => {
    expect(showsProviderAttribution(null)).toBe(false)
    expect(showsProviderAttribution({ sky: "rain", source: "meteo_france" })).toBe(true)
    expect(
      showsProviderAttribution({
        sky: "rain",
        temperature_c: 9,
        source: "meteo_france",
        edited: ["sky"],
      }),
    ).toBe(true)
    expect(showsProviderAttribution({ sky: "rain", source: "meteo_france", edited: ["sky"] })).toBe(
      false,
    )
    expect(showsProviderAttribution({ sky: "rain", source: "manual" })).toBe(false)
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
      temperature_c: 9,
      edited: ["temperature_c"],
    }
    const merged = mergeWeatherObservation(
      current,
      observation({ temperature_c: 12.34, wind_kmh: 18, sky: null, rain_24h_mm: null }),
    )
    expect(merged.temperature_c).toBe(9)
    expect(merged.wind_kmh).toBe(18)
    expect(merged.sky).toBeNull()
    expect(merged.rain_24h_mm).toBeNull()
    expect(merged.observed_at).toBe("2026-10-11T11:00:00.000Z")
    expect(merged.source).toBe("meteo_france")
    expect(merged.requested_at).toBe(requested)
    expect(merged.edited).toEqual(["temperature_c"])
  })

  it("keeps a present untouched value and a cleared edited value", () => {
    const merged = mergeWeatherObservation(
      {
        requested_at: requested,
        sky: "fog",
        wind_kmh: null,
        edited: ["wind_kmh"],
      },
      observation({ sky: "clear", wind_kmh: 30, temperature_c: 11.26 }),
    )
    expect(merged.sky).toBe("fog")
    expect(merged.wind_kmh).toBeNull()
    expect(merged.temperature_c).toBe(11.3)
  })

  it("keeps an hour typed by the observer", () => {
    const merged = mergeWeatherObservation(
      {
        requested_at: requested,
        observed_at: "2026-10-11T13:00:00.000Z",
        edited: ["observed_at"],
      },
      observation({ temperature_c: 10 }),
    )
    expect(merged.observed_at).toBe("2026-10-11T13:00:00.000Z")
    expect(merged.temperature_c).toBe(10)
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
      {
        requested_at: requested,
        edited: ["sky", "temperature_c", "wind_kmh", "rain_24h_mm"],
      },
      observation({ sky: "rain", temperature_c: 3, wind_kmh: 3, rain_24h_mm: 3 }),
    )
    expect(merged.source).toBe("meteo_france")
    expect(hasWeatherValues(merged)).toBe(false)
    expect(needsWeatherLookup(merged, NOW)).toBe(false)
  })
})

describe("editWeatherValue", () => {
  it("sets the value and marks it edited, in canonical order without duplicates", () => {
    let weather: SurveyWeather = editWeatherValue({ requested_at: ago(1) }, "wind_kmh", 12)
    weather = editWeatherValue(weather, "sky", "rain")
    weather = editWeatherValue(weather, "wind_kmh", 14.26)
    expect(weather).toMatchObject({ sky: "rain", wind_kmh: 14.3, source: "manual" })
    expect(weather.edited).toEqual(["sky", "wind_kmh"])
  })

  it("counts a clearing as an edit", () => {
    const weather = editWeatherValue(
      { sky: "rain", source: "meteo_france", requested_at: ago(1) },
      "sky",
      null,
    )
    expect(weather.sky).toBeNull()
    expect(weather.edited).toEqual(["sky"])
    expect(weather.source).toBe("meteo_france")
  })

  it("starts a weather from nothing and stores an observation time as is", () => {
    const iso = "2026-10-11T12:30:00.000Z"
    const weather = editWeatherValue(null, "observed_at", iso)
    expect(weather).toEqual({ observed_at: iso, source: "manual", edited: ["observed_at"] })
  })

  it("clears the hour on an empty or wrong value", () => {
    expect(editWeatherValue(null, "observed_at", "").observed_at).toBeNull()
    expect(editWeatherValue(null, "observed_at", 5).observed_at).toBeNull()
  })

  it("refuses a sky code it does not know and a text for a number", () => {
    expect(editWeatherValue(null, "sky", "hail").sky).toBeNull()
    expect(editWeatherValue(null, "temperature_c", "abc").temperature_c).toBeNull()
  })
})

describe("resetWeatherForRefill", () => {
  it("clears the values and the edited list, keeping requested_at", () => {
    const requested = ago(3)
    expect(
      resetWeatherForRefill({
        requested_at: requested,
        sky: "rain",
        temperature_c: 9,
        edited: ["sky"],
        source: "meteo_france",
      }),
    ).toEqual({ requested_at: requested, edited: [] })
  })

  it("copes with no weather", () => {
    expect(resetWeatherForRefill(null)).toEqual({ edited: [] })
  })
})

describe("canonicalWeather", () => {
  it("rounds, orders and drops undefined keys", () => {
    const canonical = canonicalWeather({
      edited: ["wind_kmh", "sky", "wind_kmh"],
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
      edited: ["sky", "wind_kmh"],
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
    expect(canonicalWeather({ sky: null, edited: ["sky"] })).toBeNull()
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

  it("is false when every editable value was touched", () => {
    expect(
      needsWeatherLookup(
        {
          requested_at: ago(2),
          edited: ["sky", "temperature_c", "wind_kmh", "rain_24h_mm", "observed_at"],
        },
        NOW,
      ),
    ).toBe(false)
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
      weatherViewState({
        ...base,
        weather: { sky: "rain", source: "meteo_france", edited: [] },
      }),
    ).toBe("prefilled")
    expect(
      weatherViewState({
        ...base,
        weather: { sky: "rain", source: "meteo_france", edited: ["wind_kmh"] },
      }),
    ).toBe("edited")
    expect(
      weatherViewState({
        ...base,
        weather: { wind_kmh: 3, source: "manual", edited: ["wind_kmh"] },
      }),
    ).toBe("manual")
    expect(weatherViewState({ ...base, online: false, weather: { requested_at: ago(1) } })).toBe(
      "offline",
    )
    expect(weatherViewState({ ...base, weather: { requested_at: ago(1) } })).toBe("unavailable")
    expect(weatherViewState({ ...base, unavailable: true, weather: null })).toBe("unavailable")
  })

  it("shows the values over a request in flight or a lost connection", () => {
    const weather: SurveyWeather = { sky: "fog", source: "meteo_france" }
    expect(weatherViewState({ ...base, inFlight: true, weather })).toBe("prefilled")
    expect(weatherViewState({ ...base, online: false, weather })).toBe("prefilled")
  })

  it("treats typed values without a parcel as manual", () => {
    expect(
      weatherViewState({
        ...base,
        hasParcel: false,
        weather: { wind_kmh: 2, edited: ["wind_kmh"] },
      }),
    ).toBe("manual")
  })

  it("stays on edited when the observer cleared every provider value", () => {
    expect(
      weatherViewState({
        ...base,
        weather: { sky: null, source: "meteo_france", edited: ["sky"] },
      }),
    ).toBe("edited")
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
    expect(weatherSourceLine({ sky: "rain", source: "meteo_france", observed_at: MEASURED })).toBe(
      "Source : Météo-France, mesure du 12/10/2026 à 04:00",
    )
    expect(
      weatherSourceLine({
        sky: "rain",
        temperature_c: 9,
        source: "meteo_france",
        observed_at: MEASURED,
        edited: ["sky"],
      }),
    ).toBe(
      "Source : Météo-France, mesure du 12/10/2026 à 04:00, certaines valeurs modifiées par l'observateur",
    )
  })

  it("says some values were modified when the observer edited a part of the provider's", () => {
    expect(
      weatherSourceLine({
        sky: "rain",
        temperature_c: 9,
        source: "meteo_france",
        edited: ["temperature_c"],
      }),
    ).toBe("Source : Météo-France, certaines valeurs modifiées par l'observateur")
    // An untouched weather keeps the plain line.
    expect(
      weatherSourceLine({ sky: "rain", source: "meteo_france", observed_at: MEASURED, edited: [] }),
    ).toBe("Source : Météo-France, mesure du 12/10/2026 à 04:00")
  })

  it("keeps the plain source line without a readable date", () => {
    expect(weatherSourceLine({ sky: "rain", source: "meteo_france" })).toBe("Source : Météo-France")
    expect(weatherSourceLine({ sky: "rain", source: "meteo_france", observed_at: "garbage" })).toBe(
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

describe("weatherCardMention (D-35)", () => {
  const MEASURED = new Date(2026, 9, 12, 4, 0).toISOString()

  it("is the bare provider name while the provider's values are untouched, with no date", () => {
    expect(weatherCardMention({ sky: "rain", source: "meteo_france", observed_at: MEASURED })).toBe(
      "Météo-France",
    )
    expect(weatherCardMention({ sky: "rain", source: "meteo_france", edited: [] })).toBe(
      "Météo-France",
    )
  })

  it("says the weather is partly modified when some provider values were edited", () => {
    expect(
      weatherCardMention({
        sky: "rain",
        temperature_c: 9,
        source: "meteo_france",
        observed_at: MEASURED,
        edited: ["temperature_c"],
      }),
    ).toBe("Météo-France, en partie modifiée")
  })

  it("has no mention when every provider value was edited, for a manual weather or none", () => {
    expect(weatherCardMention({ sky: "rain", source: "meteo_france", edited: ["sky"] })).toBeNull()
    expect(weatherCardMention({ sky: "rain", source: "manual" })).toBeNull()
    expect(weatherCardMention(null)).toBeNull()
    expect(weatherCardMention(undefined)).toBeNull()
  })
})
