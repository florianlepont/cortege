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
    expect(conditions.summary.openWithLine("x")).toBe("Ouvrir la météo du relevé. x")
  })

  test("the summary card mention is very short and keeps the licence wording (D-35)", () => {
    expect(conditions.summary.mention).toBe("Météo-France")
    expect("mentionPartlyEdited" in conditions.summary).toBe(false)
  })

  test("the Contexte section is the weather only (D-33)", () => {
    expect(conditions.section.title).toBe("Météo")
    expect(conditions.readOnly.empty).toBe("Météo non renseignée.")
  })

  test("the attribution of the provider (D-26) and the visibility helper (D-06)", () => {
    expect(conditions.weather.source).toBe("Source : Météo-France")
    expect(conditions.readOnly.sourceManual).toBe("Ciel saisi par l'observateur.")
    expect(conditions.note.visibility).toBe("Visible par les membres qui peuvent lire ce relevé.")
  })

  test("the attribution carries the date of the data when there is one (D-31)", () => {
    const stamp = { date: "12/10/2026", time: "04:00" }
    expect(conditions.weather.sourceDated(stamp)).toBe(
      "Source : Météo-France, mesure du 12/10/2026 à 04:00",
    )
    expect(conditions.weather.status.prefilledDated(stamp)).toBe(
      "Mesures de Météo-France, mesure du 12/10/2026 à 04:00.",
    )
  })

  test("a sky the observer set is never presented as the provider's (D-37)", () => {
    const stamp = { date: "12/10/2026", time: "04:00" }
    expect(conditions.weather.sourceObserverSky).toBe(
      "Source : Météo-France, ciel saisi par l'observateur",
    )
    expect(conditions.weather.sourceObserverSkyDated(stamp)).toBe(
      "Source : Météo-France, mesure du 12/10/2026 à 04:00, ciel saisi par l'observateur",
    )
  })

  test("the measurements are read-only rows and nothing of the old editing remains (D-37)", () => {
    expect(conditions.weather.rows.temperature).toBe("Température")
    expect(conditions.weather.rows.time).toBe("Heure de la mesure")
    expect("fields" in conditions.weather).toBe(false)
    expect("refillConfirm" in conditions.weather).toBe(false)
    expect("refill" in conditions.weather.status).toBe(false)
    expect("edited" in conditions.weather.status).toBe(false)
    expect("manual" in conditions.weather.status).toBe(false)
  })
})
