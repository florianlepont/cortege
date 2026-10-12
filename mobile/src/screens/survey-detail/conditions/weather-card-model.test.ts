import { fr } from "../../../i18n"
import { areaAccessibilityLabel, weatherCardModel, weatherDetailLine } from "./weather-card-model"

const s = fr.conditions.summary

describe("weatherCardModel", () => {
  test("reads the sky, the temperature and the columns that exist", () => {
    const model = weatherCardModel({
      sky: "fog",
      temperature_c: 3,
      wind_kmh: 1,
      source: "meteo_france",
    })

    expect(model.sky).toBe("fog")
    expect(model.temperature).toBe(3)
    expect(model.stats.map((entry) => entry.key)).toEqual(["wind"])
    expect(model.mention).toBe(s.mention)
    expect(model.hasContent).toBe(true)
  })

  test("nothing, an unknown sky or a non finite figure is no content", () => {
    expect(weatherCardModel(null).hasContent).toBe(false)
    expect(weatherCardModel({ requested_at: "2026-10-11T08:00:00.000Z" }).hasContent).toBe(false)
    expect(weatherCardModel({ sky: "hail" as never, temperature_c: Number.NaN }).hasContent).toBe(
      false,
    )
  })
})

describe("weatherDetailLine", () => {
  test("is the wind and the rain, lowercase, joined by a comma", () => {
    expect(weatherDetailLine({ wind_kmh: 12, rain_24h_mm: 2 })).toBe(
      "vent 12 km/h, pluie 2 mm sur 24 h",
    )
  })

  test("is null without a wind or a rain figure", () => {
    expect(weatherDetailLine(null)).toBeNull()
    expect(weatherDetailLine({ temperature_c: 9, wind_kmh: Number.NaN })).toBeNull()
  })
})

describe("areaAccessibilityLabel", () => {
  const base = { line: null, mention: null, loading: false, offline: false, hasContent: false }

  test("says the weather and its source when the provider's values are shown", () => {
    expect(areaAccessibilityLabel({ ...base, line: "Nuageux, 14 °C", mention: s.mention })).toBe(
      s.openWithLineSource("Nuageux, 14 °C", s.mention),
    )
    expect(areaAccessibilityLabel({ ...base, line: "Pluie" })).toBe(s.openWithLine("Pluie"))
  })

  test("falls back to the plain action, the search, the offline or the invitation sentence", () => {
    expect(areaAccessibilityLabel({ ...base, hasContent: true })).toBe(s.open)
    expect(areaAccessibilityLabel({ ...base, loading: true })).toBe(s.openWithLine(s.loading))
    expect(areaAccessibilityLabel({ ...base, offline: true })).toBe(s.openWithLine(s.offlineBody))
    expect(areaAccessibilityLabel(base)).toBe(s.openWithLine(s.emptyBody))
  })
})
