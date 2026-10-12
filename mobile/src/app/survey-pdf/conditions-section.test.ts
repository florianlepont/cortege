import type { SurveyWeather } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import {
  buildConditionsBlock,
  conditionsBlockHeight,
  conditionsSectionCss,
} from "./conditions-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette, SurveyExportData } from "./types"

const t = fr.surveyExport.conditions

const PALETTE_KEYS = [
  "ink",
  "inkMuted",
  "inkFaint",
  "line",
  "paper",
  "panel",
  "panelStrong",
  "accent",
  "accentInk",
  "accentSoft",
  "alert",
  "alertSoft",
  "warning",
  "warningSoft",
  "bandLow",
  "bandMid",
  "bandHigh",
  "bandTrack",
  "watermark",
  "parcelFill",
  "parcelStroke",
  "mapCanvas",
  "chartGrid",
] as const

// Fake palette: each value is its key name, so a rule can be traced without any colour literal.
const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, key])) as PdfPalette

// 14:30 on the phone's own clock, whatever the time zone of the machine running the test.
const OBSERVED_AT = new Date(2026, 9, 10, 14, 30).toISOString()

const WEATHER: SurveyWeather = {
  sky: "cloudy",
  temperature_c: 14,
  wind_kmh: 12,
  rain_24h_mm: 2,
  observed_at: OBSERVED_AT,
  source: "meteo_france",
  edited: [],
}

function makeData(conditions: SurveyExportData["conditions"]): SurveyExportData {
  return {
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: [],
    observationYear: 2026,
    versionNumber: 1,
    dateIso: "2026-10-10T08:00:00Z",
    isDraft: false,
    observerName: null,
    method: {
      version: "3.2",
      ibpCas: 1,
      ibpCas3Scale: false,
      regionVersion: null,
      vegetationStage: null,
    },
    scores: null,
    factorEntries: [],
    generatedAtIso: "2026-10-10T09:00:00Z",
    coordinates: null,
    rawFactors: {},
    conditions,
    photos: { items: [], total: 0, unavailable: 0 },
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
  }
}

function build(conditions: SurveyExportData["conditions"], isDraft = false) {
  return buildConditionsBlock({ ...makeData(conditions), isDraft }, palette)
}

function required(conditions: SurveyExportData["conditions"]) {
  const block = build(conditions)
  if (!block) throw new Error("expected a conditions block")
  return block
}

describe("buildConditionsBlock presence", () => {
  it("is omitted when there is neither a weather value nor a note, draft or submitted", () => {
    expect(build({ note: null, weather: null })).toBeNull()
    expect(build({ note: null, weather: null }, true)).toBeNull()
    expect(build({ note: "  \n ", weather: null })).toBeNull()
    // A weather that only holds the survey time (nothing filled yet) shows nothing either.
    expect(build({ note: null, weather: { requested_at: OBSERVED_AT } })).toBeNull()
    expect(build({ note: null, weather: { source: "meteo_france", edited: [] } })).toBeNull()
  })

  it("is printed for a weather alone, a note alone, or both", () => {
    expect(build({ note: null, weather: WEATHER })).not.toBeNull()
    expect(build({ note: "Sol humide", weather: null })).not.toBeNull()
    expect(build({ note: "Sol humide", weather: WEATHER })).not.toBeNull()
  })

  it("is one block with the id conditions, no page break and no keep-with-next", () => {
    const block = required({ note: "Sol humide", weather: WEATHER })

    expect(block.id).toBe("conditions")
    expect(block.breakBefore).toBeUndefined()
    expect(block.keepWithNext).toBeUndefined()
  })
})

describe("buildConditionsBlock weather rows", () => {
  const { html } = required({ note: null, weather: WEATHER })

  it("prints the heading, the weather sentence with the time last and the provider as source", () => {
    expect(html).toContain("Conditions du relevé")
    expect(html).toContain(">Météo</th>")
    // The unit spaces are non-breaking (the catalogue keeps a value and its unit on one line).
    expect(html).toContain(
      "Nuageux, 14\u00a0°C, vent 12\u00a0km/h, pluie 2\u00a0mm sur 24\u00a0h, observée à 14:30.",
    )
    expect(html).toContain(">Source de la météo</th>")
    // The licence asks for the date of the data next to the source (D-31).
    expect(html).toContain(">Météo-France, mesure du 10/10/2026 à 14:30</td>")
  })

  it("prints the source without a date when the measurement time is missing or unreadable", () => {
    for (const observed_at of [undefined, "garbage"]) {
      const { html: undated } = required({ note: null, weather: { ...WEATHER, observed_at } })
      expect(undated).toContain(">Météo-France</td>")
      expect(undated).not.toContain("mesure du")
    }
  })

  it("prints no note row without a note", () => {
    expect(html).not.toContain(t.note)
    expect(html).not.toContain("conditions-note")
  })

  it("names the observer's edit when a provider value was edited", () => {
    const { html: edited } = required({
      note: null,
      weather: { ...WEATHER, temperature_c: 15, edited: ["temperature_c"] },
    })

    expect(edited).toContain(
      "Météo-France, mesure du 10/10/2026 à 14:30, certaines valeurs modifiées par l&#39;observateur",
    )

    const { html: partial } = required({
      note: null,
      weather: { ...WEATHER, observed_at: undefined, temperature_c: 15, edited: ["temperature_c"] },
    })
    expect(partial).toContain(">Météo-France, certaines valeurs modifiées par l&#39;observateur<")
  })

  it("keeps the plain edited wording when every provider value was edited", () => {
    const { html: all } = required({
      note: null,
      weather: { ...WEATHER, edited: ["sky", "temperature_c", "wind_kmh", "rain_24h_mm"] },
    })

    expect(all).toContain(
      ">Météo-France, mesure du 10/10/2026 à 14:30, modifiée par l&#39;observateur</td>",
    )
    expect(all).not.toContain("certaines valeurs")
  })

  it("names the observer when the weather was typed by hand", () => {
    const { html: manual } = required({
      note: null,
      weather: { sky: "clear", source: "manual", edited: [] },
    })

    expect(manual).toContain("Saisie par l&#39;observateur")
    expect(manual).not.toContain("Météo-France")
    expect(manual).not.toContain("mesure du")
  })

  it("prints only the values that exist and ends without a time when none was recorded", () => {
    const { html: partial } = required({
      note: null,
      weather: { temperature_c: 9.5, source: "manual", edited: [] },
    })

    expect(partial).toContain("9,5\u00a0°C.")
    expect(partial).not.toContain("observée")
    expect(partial).not.toContain("vent")
  })

  it("falls back to the survey time when the station time is absent", () => {
    const { html: fromRequest } = required({
      note: null,
      weather: { sky: "clear", requested_at: OBSERVED_AT, source: "manual", edited: [] },
    })

    expect(fromRequest).toContain("observée à 14:30.")
  })
})

describe("buildConditionsBlock note", () => {
  it("escapes the note and keeps it in a pre-wrap element that cannot overflow", () => {
    const { html } = required({ note: 'a < b & "c"\nligne 2', weather: null })

    expect(html).toContain("a &lt; b &amp; &quot;c&quot;\nligne 2")
    expect(html).not.toContain("a < b")
    expect(html).toContain('<div class="conditions-note">a &lt; b')
    expect(html).toContain(">Note du relevé</th>")
  })

  it("cannot inject markup through the note", () => {
    const { html } = required({
      note: "<img src=x onerror=alert(1)><script>x</script>",
      weather: null,
    })

    expect(html).not.toContain("<img")
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;")
  })

  it("clamps a 1200 character note to 1000 characters", () => {
    const { html } = required({ note: "x".repeat(1200), weather: null })

    expect(html).toContain("x".repeat(1000))
    expect(html).not.toContain("x".repeat(1001))
  })

  it("never prints the weather rows of a note-only survey", () => {
    const { html } = required({ note: "Sol humide", weather: null })

    expect(html).not.toContain("Source de la météo")
    expect(html).not.toContain(">Météo</th>")
  })
})

describe("conditionsBlockHeight and the block height", () => {
  it("one short row is 20 + 24 + 10 + (6 + 13) = 73", () => {
    expect(conditionsBlockHeight([{ text: "Sol humide" }])).toBe(73)
    expect(required({ note: "Sol humide", weather: null }).height).toBe(73)
  })

  it("the weather and its source are two rows", () => {
    expect(required({ note: null, weather: WEATHER }).height).toBe(73 + 19)
  })

  it("counts the lines of a note paragraph by paragraph at 80 characters a line", () => {
    const first = "a".repeat(100) // 2 lines
    const second = "b".repeat(80) // 1 line
    const block = required({ note: `${first}\n${second}`, weather: null })

    expect(block.height).toBe(20 + 24 + 10 + 6 + 13 * (2 + 1))
  })

  it("counts an empty paragraph as one line and an exact multiple of 80 without a spare line", () => {
    expect(conditionsBlockHeight([{ text: "a\n\nb" }])).toBe(54 + 6 + 13 * 3)
    expect(conditionsBlockHeight([{ text: "a".repeat(160) }])).toBe(54 + 6 + 13 * 2)
    expect(conditionsBlockHeight([{ text: "a".repeat(161) }])).toBe(54 + 6 + 13 * 3)
  })

  it("a maximal note in one paragraph with a weather is about the 261 px of the UI-SPEC", () => {
    // 1000 characters are 13 lines at 80 a line; the weather and its source are two 19 px rows.
    const block = required({ note: "a".repeat(1000), weather: WEATHER })

    expect(block.height).toBe(54 + 19 + 19 + 6 + 13 * 13)
    expect(block.height).toBeLessThan(270)
  })
})

describe("conditionsSectionCss", () => {
  const css = conditionsSectionCss(palette)

  it("keeps the line breaks of the note and breaks any long unbroken string", () => {
    expect(css).toContain("white-space: pre-wrap")
    expect(css).toContain("overflow-wrap: anywhere")
  })

  it("copies the identity card rules from the palette and the print fonts", () => {
    expect(css).toContain(`border: 1px solid ${palette.line}`)
    expect(css).toContain(`background: ${palette.panel}`)
    expect(css).toContain(`font-family: ${PDF_FONT_FAMILIES.heading}`)
    expect(css).toContain(`color: ${palette.inkMuted}`)
    expect(css).toContain(`color: ${palette.ink}`)
    expect(css).toContain("width: 150px")
  })

  it("uses no colour literal, no CSS column and no filled hairline", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
    expect(css).not.toContain("column-count")
    expect(css).not.toContain("columns:")
  })
})
