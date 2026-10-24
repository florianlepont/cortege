import {
  FACTOR_KEYS,
  IBP_METHOD_V3_2,
  bandTone,
  contextBand,
  standBand,
  totalBand,
} from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import {
  countMissingFactors,
  filledPoints,
  buildScoreSummaryBlock,
  scoreBands,
  scoreSectionCss,
  toneColor,
} from "./score-section"
import { PDF_FONT_FAMILIES } from "./types"
import type { PdfPalette, SurveyExportData } from "./types"

const t = fr.surveyExport

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

type Entries = SurveyExportData["factorEntries"]

function entry(points: number | null, selectedClass = `S${points}`): Entries[number][1] {
  return { selected_class: selectedClass, warnings: [], score_points: points }
}

function fullEntries(): Entries {
  return FACTOR_KEYS.map((key) => [key, entry(3)] as Entries[number])
}

function entriesMissing(missing: string[]): Entries {
  return FACTOR_KEYS.map(
    (key) => [key, missing.includes(key) ? entry(null, "Not filled") : entry(3)] as Entries[number],
  )
}

function makeData(overrides: Partial<SurveyExportData> = {}): SurveyExportData {
  return {
    mode: "complete",
    surveyId: "survey-1",
    siteName: "Forêt de test",
    parcelIds: [],
    observationYear: 2026,
    versionNumber: 1,
    dateIso: "2026-10-10T08:00:00Z",
    isDraft: false,
    observerName: null,
    method: {
      version: IBP_METHOD_V3_2,
      ibpCas: 1,
      ibpCas3Scale: false,
      regionVersion: null,
      vegetationStage: null,
    },
    scores: { ibp_total: 34, ibp_peuplement_gestion: 25, ibp_contexte: 9 },
    factorEntries: fullEntries(),
    generatedAtIso: "2026-10-10T09:00:00Z",
    coordinates: null,
    rawFactors: {},
    conditions: { note: null, weather: null },
    route: null,
    photos: { items: [], total: 0, unavailable: 0 },
    map: null,
    history: null,
    assets: { fonts: [], logoDataUri: null },
    layout: { platform: "ios", layoutScale: 1.2487 },
    ...overrides,
  }
}

describe("countMissingFactors", () => {
  it("counts nothing for ten filled factors", () => {
    expect(countMissingFactors(fullEntries())).toBe(0)
  })

  it("counts the Not filled sentinel and the absent factors", () => {
    expect(countMissingFactors(entriesMissing(["A", "C"]))).toBe(2)
    expect(countMissingFactors([])).toBe(10)
    expect(countMissingFactors(fullEntries().slice(0, 7))).toBe(3)
  })

  it("ignores entries that are not factors A to J", () => {
    const extra: Entries = [...fullEntries(), ["Z", entry(null, "Not filled")]]
    expect(countMissingFactors(extra)).toBe(0)
  })
})

describe("filledPoints", () => {
  it("gives the points of a filled factor", () => {
    expect(filledPoints(entry(4))).toBe(4)
    expect(filledPoints(entry(0))).toBe(0)
  })

  it("gives null for an absent, sentinel or point-less entry", () => {
    expect(filledPoints(undefined)).toBeNull()
    expect(filledPoints(entry(null, "Not filled"))).toBeNull()
    expect(filledPoints(entry(null, "S2"))).toBeNull()
  })
})

describe("toneColor", () => {
  it("maps the three tones to the three band colours", () => {
    expect(toneColor("low", palette)).toBe("bandLow")
    expect(toneColor("mid", palette)).toBe("bandMid")
    expect(toneColor("high", palette)).toBe("bandHigh")
  })
})

describe("buildScoreSummaryBlock", () => {
  it("prints the three scores out of their maximum", () => {
    const block = buildScoreSummaryBlock(makeData(), palette)
    expect(block.id).toBe("score-summary")
    expect(block.height).toBeGreaterThan(0)
    expect(block.html).toContain(t.scores.title)
    expect(block.html).toContain("34 / 50")
    expect(block.html).toContain("25 / 35")
    expect(block.html).toContain("9 / 15")
    expect(block.html).toContain(t.scores.totalHeading)
    expect(block.html).toContain(t.scores.standHeading)
    expect(block.html).toContain(t.scores.contextHeading)
  })

  it("names the bands from the domain and colours them from the tones", () => {
    // totalBand(34) = assez_forte (high), standBand(25) = assez_forte (high),
    // contextBand(9) = moyenne (mid)
    const block = buildScoreSummaryBlock(makeData(), palette)
    expect(block.html).toContain(t.scores.band({ band: fr.surveyDetail.bands.stand.assez_forte }))
    expect(block.html).toContain(t.scores.band({ band: fr.surveyDetail.bands.context.moyenne }))
    expect(block.html).toContain("bandHigh")
    expect(block.html).toContain("bandMid")
    expect(block.html).not.toContain("bandLow")
  })

  it("follows the band edges of the domain on the total", () => {
    const low = buildScoreSummaryBlock(
      makeData({ scores: { ibp_total: 9, ibp_peuplement_gestion: 6, ibp_contexte: 3 } }),
      palette,
    )
    expect(low.html).toContain(t.scores.band({ band: fr.surveyDetail.bands.stand.faible }))
    expect(low.html).toContain(t.scores.band({ band: fr.surveyDetail.bands.context.faible }))
    expect(low.html).toContain("bandLow")
    expect(low.html).not.toContain("bandHigh")
    const top = buildScoreSummaryBlock(
      makeData({ scores: { ibp_total: 50, ibp_peuplement_gestion: 35, ibp_contexte: 15 } }),
      palette,
    )
    expect(top.html).toContain(t.scores.band({ band: fr.surveyDetail.bands.stand.forte }))
    expect(top.html).toContain(t.scores.band({ band: fr.surveyDetail.bands.context.forte }))
  })

  it("prints the not-filled text and no band when the scores are null", () => {
    const block = buildScoreSummaryBlock(makeData({ scores: null }), palette)
    expect(block.html).toContain(t.scores.notFilled)
    expect(block.html).not.toContain("Niveau")
    expect(block.html).not.toContain(" / 50")
    expect(block.html).not.toContain("bandLow")
    expect(block.html).not.toContain("bandMid")
    expect(block.html).not.toContain("bandHigh")
  })

  it("does not band a score that is not a number", () => {
    const block = buildScoreSummaryBlock(
      makeData({
        scores: { ibp_total: Number.NaN, ibp_peuplement_gestion: 25, ibp_contexte: 9 },
      }),
      palette,
    )
    expect(block.html).not.toContain("NaN")
    expect(block.html).toContain(t.scores.notFilled)
  })

  it("prints the provisional line for a draft with missing factors", () => {
    const block = buildScoreSummaryBlock(
      makeData({ isDraft: true, factorEntries: entriesMissing(["A", "B", "J"]) }),
      palette,
    )
    expect(block.html).toContain(t.scores.provisional({ count: 3 }))
  })

  it("uses the singular for one missing factor", () => {
    const block = buildScoreSummaryBlock(
      makeData({ isDraft: true, factorEntries: entriesMissing(["E"]) }),
      palette,
    )
    expect(block.html).toContain(t.scores.provisional({ count: 1 }))
  })

  it("prints no provisional line for a submitted survey or a complete draft", () => {
    const submitted = buildScoreSummaryBlock(
      makeData({ isDraft: false, factorEntries: entriesMissing(["A"]) }),
      palette,
    )
    expect(submitted.html).not.toContain("provisoire")
    const complete = buildScoreSummaryBlock(makeData({ isDraft: true }), palette)
    expect(complete.html).not.toContain("provisoire")
  })

  it("makes the block taller when the provisional line is there", () => {
    const plain = buildScoreSummaryBlock(makeData({ isDraft: true }), palette)
    const provisional = buildScoreSummaryBlock(
      makeData({ isDraft: true, factorEntries: entriesMissing(["A"]) }),
      palette,
    )
    expect(provisional.height).toBeGreaterThan(plain.height)
  })

  it("fills the bar in proportion to the score, with a dot decimal", () => {
    const block = buildScoreSummaryBlock(makeData(), palette)
    expect(block.html).toContain("width: 68%")
    expect(block.html).toContain("width: 71.4%")
    expect(block.html).toContain("width: 60%")
  })

  it("never prints a dash", () => {
    const block = buildScoreSummaryBlock(makeData({ scores: null }), palette)
    expect(block.html).not.toContain("—")
  })
})

// The score card as it printed before `scoreBands` existed (phase 33-07 refactor): the same bytes
// for a mid and high score, a low score and no scores, with the fake palette.
const GOLDEN_MID_HIGH =
  '<section class="score-card">\n<h2 class="score-title">Score IBP</h2>\n<div class="score-tiles"><div class="score-tile"><div class="score-tile-heading">Total IBP</div><div class="score-value">34 / 50</div><div class="score-band"><span class="score-dot" style="background: bandHigh"></span>Niveau : assez forte</div><div class="score-track"><div class="score-fill" style="width: 68%; background: bandHigh"></div></div></div><div class="score-tile"><div class="score-tile-heading">Peuplement et gestion forestière</div><div class="score-value">25 / 35</div><div class="score-band"><span class="score-dot" style="background: bandHigh"></span>Niveau : assez forte</div><div class="score-track"><div class="score-fill" style="width: 71.4%; background: bandHigh"></div></div></div><div class="score-tile"><div class="score-tile-heading">Contexte</div><div class="score-value">9 / 15</div><div class="score-band"><span class="score-dot" style="background: bandMid"></span>Niveau : moyenne</div><div class="score-track"><div class="score-fill" style="width: 60%; background: bandMid"></div></div></div></div>\n</section>'
const GOLDEN_LOW =
  '<section class="score-card">\n<h2 class="score-title">Score IBP</h2>\n<div class="score-tiles"><div class="score-tile"><div class="score-tile-heading">Total IBP</div><div class="score-value">9 / 50</div><div class="score-band"><span class="score-dot" style="background: bandLow"></span>Niveau : faible</div><div class="score-track"><div class="score-fill" style="width: 18%; background: bandLow"></div></div></div><div class="score-tile"><div class="score-tile-heading">Peuplement et gestion forestière</div><div class="score-value">6 / 35</div><div class="score-band"><span class="score-dot" style="background: bandLow"></span>Niveau : faible</div><div class="score-track"><div class="score-fill" style="width: 17.1%; background: bandLow"></div></div></div><div class="score-tile"><div class="score-tile-heading">Contexte</div><div class="score-value">3 / 15</div><div class="score-band"><span class="score-dot" style="background: bandLow"></span>Niveau : faible</div><div class="score-track"><div class="score-fill" style="width: 20%; background: bandLow"></div></div></div></div>\n</section>'
const GOLDEN_NONE =
  '<section class="score-card">\n<h2 class="score-title">Score IBP</h2>\n<div class="score-tiles"><div class="score-tile"><div class="score-tile-heading">Total IBP</div><div class="score-value score-value-empty">Non renseigné</div></div><div class="score-tile"><div class="score-tile-heading">Peuplement et gestion forestière</div><div class="score-value score-value-empty">Non renseigné</div></div><div class="score-tile"><div class="score-tile-heading">Contexte</div><div class="score-value score-value-empty">Non renseigné</div></div></div>\n</section>'

describe("scoreBands", () => {
  it("gives each score its maximum, band name and tone from the domain", () => {
    const bands = scoreBands({ ibp_total: 32, ibp_peuplement_gestion: 20, ibp_contexte: 12 })
    expect(bands.total).toEqual({
      points: 32,
      max: 50,
      bandName: fr.surveyDetail.bands.stand[totalBand(32)],
      tone: bandTone(totalBand(32)),
    })
    expect(bands.stand).toEqual({
      points: 20,
      max: 35,
      bandName: fr.surveyDetail.bands.stand[standBand(20)],
      tone: bandTone(standBand(20)),
    })
    expect(bands.context).toEqual({
      points: 12,
      max: 15,
      bandName: fr.surveyDetail.bands.context[contextBand(12)],
      tone: bandTone(contextBand(12)),
    })
  })

  it("names the bands the score card prints today", () => {
    // totalBand(34) and standBand(25) are assez_forte (high), contextBand(9) is moyenne (mid)
    const bands = scoreBands({ ibp_total: 34, ibp_peuplement_gestion: 25, ibp_contexte: 9 })
    expect(bands.total.bandName).toBe(fr.surveyDetail.bands.stand.assez_forte)
    expect(bands.total.tone).toBe("high")
    expect(bands.stand.tone).toBe("high")
    expect(bands.context.bandName).toBe(fr.surveyDetail.bands.context.moyenne)
    expect(bands.context.tone).toBe("mid")
  })

  it("follows the band edges at the bottom and the top", () => {
    const low = scoreBands({ ibp_total: 9, ibp_peuplement_gestion: 6, ibp_contexte: 3 })
    expect([low.total.tone, low.stand.tone, low.context.tone]).toEqual(["low", "low", "low"])
    const top = scoreBands({ ibp_total: 50, ibp_peuplement_gestion: 35, ibp_contexte: 15 })
    expect([top.total.tone, top.stand.tone, top.context.tone]).toEqual(["high", "high", "high"])
    expect(top.total.bandName).toBe(fr.surveyDetail.bands.stand.forte)
  })

  it("gives null points, band name and tone for no scores, keeping the maxima", () => {
    const none = { points: null, bandName: null, tone: null }
    expect(scoreBands(null)).toEqual({
      total: { ...none, max: 50 },
      stand: { ...none, max: 35 },
      context: { ...none, max: 15 },
    })
  })

  it("treats a score that is not a number as missing, alone", () => {
    const bands = scoreBands({
      ibp_total: Number.NaN,
      ibp_peuplement_gestion: 25,
      ibp_contexte: Number.POSITIVE_INFINITY,
    })
    expect(bands.total.points).toBeNull()
    expect(bands.total.tone).toBeNull()
    expect(bands.stand.points).toBe(25)
    expect(bands.context.bandName).toBeNull()
  })
})

describe("buildScoreSummaryBlock byte equality", () => {
  it("prints the same card as before for a v3.2 survey with mid and high scores", () => {
    const block = buildScoreSummaryBlock(makeData(), palette)
    expect(block.html).toBe(GOLDEN_MID_HIGH)
    expect(block.height).toBe(138)
  })

  it("prints the same card as before for a v3.0 survey with low scores", () => {
    const block = buildScoreSummaryBlock(
      makeData({
        method: {
          version: null,
          ibpCas: null,
          ibpCas3Scale: false,
          regionVersion: "plaine",
          vegetationStage: "adulte",
        },
        scores: { ibp_total: 9, ibp_peuplement_gestion: 6, ibp_contexte: 3 },
      }),
      palette,
    )
    expect(block.html).toBe(GOLDEN_LOW)
  })

  it("prints the same card as before without scores", () => {
    expect(buildScoreSummaryBlock(makeData({ scores: null }), palette).html).toBe(GOLDEN_NONE)
  })
})

describe("scoreSectionCss", () => {
  const css = scoreSectionCss(palette)

  it("prefixes every class with score-", () => {
    const classes = css.match(/\.[A-Za-z][\w-]*/g) ?? []
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) expect(name.startsWith(".score-")).toBe(true)
  })

  it("uses palette colours and the charter fonts, no hex, no CSS columns", () => {
    expect(css).toContain("bandTrack")
    expect(css).toContain(PDF_FONT_FAMILIES.numeral)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/rgba?\(/)
    expect(css).not.toContain("column-count")
  })
})
