import { fr } from "../index"

const { conditions } = fr

describe("fr.conditions", () => {
  test("the eight sky codes of the contract have a label", () => {
    expect(Object.keys(conditions.sky).filter((key) => !key.startsWith("group"))).toEqual([
      "clear",
      "partly_cloudy",
      "cloudy",
      "overcast",
      "fog",
      "rain",
      "thunderstorm",
      "snow",
    ])
  })

  test("weather values are printed on one line with a no-break space before each unit", () => {
    const { parts } = conditions.weather
    const line = parts.line([
      conditions.sky.cloudy,
      parts.temperature("14"),
      parts.wind("12"),
      parts.rain("2"),
    ])
    expect(line).toBe("Nuageux, 14 °C, vent 12 km/h, pluie 2 mm sur 24 h")
  })

  test("a value with its unit keeps the unit on the same line", () => {
    const { values } = conditions.weather
    expect(values.temperature("14,5")).toBe("14,5\u00a0°C")
    expect(values.wind("12")).toBe("12\u00a0km/h")
    expect(values.rain("2")).toBe("2\u00a0mm")
  })

  test("an empty list of parts gives an empty line", () => {
    expect(conditions.weather.parts.line([])).toBe("")
  })

  test("the note counter and its spoken twin", () => {
    expect(conditions.note.counter({ count: 123, max: 1000 })).toBe("123 / 1000")
    expect(conditions.note.counterA11y({ count: 123, max: 1000 })).toBe("123 caractères sur 1000")
  })

  test("the summary card sentence for a screen reader", () => {
    expect(conditions.summary.openWithLine("x")).toBe("Ouvrir les conditions du relevé. x")
    expect(conditions.summary.openWithLine(conditions.summary.noWeather)).toBe(
      "Ouvrir les conditions du relevé. Aucune météo",
    )
  })

  test("the attribution of the provider (D-26) and the visibility helper (D-06)", () => {
    expect(conditions.weather.source).toBe("Source : Météo-France")
    expect(conditions.readOnly.sourcePrefilled).toBe("Source : Météo-France.")
    expect(conditions.note.visibility).toBe("Visible par les membres qui peuvent lire ce relevé.")
  })

  test("range messages keep the unit glued to the number", () => {
    expect(conditions.weather.fields.temperature.range).toBe("Entre -40 et 55 °C")
    expect(conditions.weather.fields.wind.range).toBe("Entre 0 et 350 km/h")
    expect(conditions.weather.fields.rain.range).toBe("Entre 0 et 1000 mm")
  })

  test("the refill confirmation carries its cancel button", () => {
    expect(conditions.weather.refillConfirm.cancel).toBe("Annuler")
    expect(conditions.weather.refillConfirm.confirm).toBe("Remplacer")
  })
})
