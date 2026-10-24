import { FACTOR_KEYS, bandTone, contextBand, standBand, totalBand } from "@cortege/ibp-domain"

import { fr } from "../../i18n"
import { countMissingFactors, filledPoints, scoreBands, toneColor } from "./score-section"
import type { PdfPalette, SurveyExportData } from "./types"

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

  it("names the bands of the sheet (a mid and a high score)", () => {
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
