import {
  COUNTING_MODES,
  LARGE_STAND_OPTIONS,
  ROUTE_ADVICE_CODES,
  ROUTE_METHODS,
  ROUTE_QUESTION_IDS,
  ROUTE_REASON_CODES,
  ROUTE_SURFACE_ERROR_CODES,
  ROUTE_WARNING_CODES,
  ROUTE_ZONE_ISSUE_CODES,
  UNCAPPED_PRESET_IDS,
} from "@cortege/ibp-domain"
import { fr } from "../i18n"
import {
  COUNTING_TEXT,
  LARGE_STAND_OPTION_TEXT,
  ROUTE_METHOD_TEXT,
  ROUTE_QUESTION_TEXT,
  ROUTE_REASON_TEXT,
  ROUTE_SURFACE_ERROR_TEXT,
  ROUTE_WARNING_TEXT,
  ROUTE_ZONE_ISSUE_TEXT,
  UNCAPPED_PRESET_TEXT,
  formatDecimalFr,
  formatDurationRange,
  formatHectares,
  parseHectaresInput,
  routeAdviceText,
} from "./route-text"

// Phase 30 (plan 30-11): every package code reaches the screen as a French sentence (T-30-27). The
// maps are typed over the package unions; these tests walk the package code lists, so a code the
// package adds without a sentence fails here as well as in the type check.

const NNBSP = "\u202f"

function expectSentences(map: Readonly<Record<string, unknown>>, codes: readonly string[]): void {
  expect(Object.keys(map).sort()).toEqual([...codes].sort())
  for (const code of codes) {
    const entry = map[code]
    const texts = typeof entry === "string" ? [entry] : Object.values(entry as object)
    for (const text of texts) {
      expect([code, typeof text, String(text).trim().length > 0]).toEqual([code, "string", true])
    }
  }
}

describe("code to text maps", () => {
  test("every reason, warning, zone issue and surface error has a sentence", () => {
    expectSentences(ROUTE_REASON_TEXT, ROUTE_REASON_CODES)
    expectSentences(ROUTE_WARNING_TEXT, ROUTE_WARNING_CODES)
    expectSentences(ROUTE_ZONE_ISSUE_TEXT, ROUTE_ZONE_ISSUE_CODES)
    expectSentences(ROUTE_SURFACE_ERROR_TEXT, ROUTE_SURFACE_ERROR_CODES)
  })

  test("every parcours, mode, preset, question and large-stand option has its text", () => {
    expectSentences(ROUTE_METHOD_TEXT, ROUTE_METHODS)
    expectSentences(COUNTING_TEXT, COUNTING_MODES)
    expectSentences(UNCAPPED_PRESET_TEXT, UNCAPPED_PRESET_IDS)
    expectSentences(ROUTE_QUESTION_TEXT, ROUTE_QUESTION_IDS)
    expectSentences(LARGE_STAND_OPTION_TEXT, LARGE_STAND_OPTIONS)
  })

  test("the words are those of the official method", () => {
    expect(ROUTE_METHOD_TEXT.full.name).toBe("Parcours en plein")
    expect(ROUTE_METHOD_TEXT.partial_strip.name).toBe("Parcours partiel par bande")
    expect(ROUTE_METHOD_TEXT.partial_plot.name).toBe("Parcours partiel par placette")
    expect(COUNTING_TEXT.capped.name).toBe("Relevé plafonné")
    expect(COUNTING_TEXT.uncapped.name).toBe("Relevé déplafonné")
    expect(UNCAPPED_PRESET_TEXT.all_factors.name).toBe("Tous les facteurs")
  })

  test("a warning of the proposal and the same check on the zone say the same sentence", () => {
    expect(ROUTE_WARNING_TEXT.partial_over_half).toBe(ROUTE_ZONE_ISSUE_TEXT.partial_over_half)
  })

  test("the two long presets carry the advice of R-17, the others none", () => {
    expect(UNCAPPED_PRESET_TEXT.mature.note).toBe(fr.routeGuide.counting.presetNote)
    expect(UNCAPPED_PRESET_TEXT.always_max.note).toBe(fr.routeGuide.counting.presetNote)
    expect(UNCAPPED_PRESET_TEXT.all_factors.note).toBeUndefined()
    expect(UNCAPPED_PRESET_TEXT.minimum.note).toBeUndefined()
    expect(UNCAPPED_PRESET_TEXT.custom.note).toBeUndefined()
  })

  test("the refine question says it only informs", () => {
    expect(ROUTE_QUESTION_TEXT.refine.title).toBe("Pour affiner")
    expect(ROUTE_QUESTION_TEXT.refine.why).toContain("ne changent pas le parcours conseillé")
  })

  test("the large-stand options put the subdivision first", () => {
    expect(LARGE_STAND_OPTIONS[0]).toBe("subdivide")
    expect(LARGE_STAND_OPTION_TEXT.subdivide.title).toBe("Découper en sous-peuplements")
  })
})

describe("routeAdviceText", () => {
  test("every advice code has a sentence", () => {
    for (const code of ROUTE_ADVICE_CODES) {
      const text = routeAdviceText(code, { estimated_minutes: { min: 60, max: 80 } })
      expect([code, text.length > 0]).toEqual([code, true])
    }
  })

  test("the duration carries its range", () => {
    expect(routeAdviceText("duration", { estimated_minutes: { min: 25, max: 30 } })).toBe(
      "Pour cette surface, comptez 25 à 30 minutes pour une personne habituée à l'IBP.",
    )
  })

  test("a duration with no range falls back to the note that it is only an indication", () => {
    expect(routeAdviceText("duration", { estimated_minutes: null })).toBe(
      fr.routeGuide.advice.durationNote,
    )
  })

  test("the other codes ignore the range", () => {
    const options = { estimated_minutes: null }
    expect(routeAdviceText("time_short", options)).toBe(fr.routeGuide.advice.timeShort)
    expect(routeAdviceText("beginner", options)).toBe(fr.routeGuide.advice.beginner)
    expect(routeAdviceText("uncapped_longer", options)).toBe(fr.routeGuide.advice.uncappedLonger)
  })
})

describe("formatHectares", () => {
  test.each([
    [2.4, "2,4"],
    [1, "1"],
    [0.125, "0,13"],
    [0.5, "0,5"],
    [8, "8"],
    [1234.5, `1${NNBSP}234,5`],
    [5000, `5${NNBSP}000`],
    [0.004, "0"],
    [-1.5, "-1,5"],
    [Number.NaN, "0"],
    [Number.POSITIVE_INFINITY, "0"],
  ])("%p gives %p", (value, expected) => {
    expect(formatHectares(value)).toBe(expected)
  })

  test("formatDecimalFr keeps the digits asked for", () => {
    expect(formatDecimalFr(2.5, 1)).toBe("2,5")
    expect(formatDecimalFr(2, 1)).toBe("2")
    expect(formatDecimalFr(1.26, 1)).toBe("1,3")
    expect(formatDecimalFr(2.6, 0)).toBe("3")
  })
})

describe("parseHectaresInput", () => {
  test.each([
    ["2,4", 2.4],
    ["2.4", 2.4],
    ["8", 8],
    [" 12 ", 12],
    ["1 234,5", 1234.5],
    [`1${NNBSP}234,5`, 1234.5],
    [",5", 0.5],
    ["5,", 5],
    ["0", 0],
  ])("%p gives %p", (text, expected) => {
    expect(parseHectaresInput(text)).toBe(expected)
  })

  test.each([[" "], [""], ["abc"], ["-1"], ["1,2,3"], ["1e3"], ["Infinity"], ["2 ha"]])(
    "%p is not a number",
    (text) => {
      expect(parseHectaresInput(text)).toBeNull()
    },
  )

  test("a number too long to be a number is refused", () => {
    expect(parseHectaresInput(`1${"0".repeat(400)}`)).toBeNull()
  })
})

describe("formatDurationRange", () => {
  test("minutes below two hours", () => {
    expect(formatDurationRange({ min: 25, max: 30 })).toBe("25 à 30 minutes")
    expect(formatDurationRange({ min: 60, max: 80 })).toBe("60 à 80 minutes")
    expect(formatDurationRange({ min: 18, max: 24 })).toBe("18 à 24 minutes")
  })

  test("a single value and a very short one", () => {
    expect(formatDurationRange({ min: 1, max: 1 })).toBe("1 minute")
    expect(formatDurationRange({ min: 30, max: 30 })).toBe("30 minutes")
    expect(formatDurationRange({ min: 0, max: 0 })).toBe("moins d'une minute")
  })

  test("hours from two hours, to the half hour", () => {
    expect(formatDurationRange({ min: 120, max: 180 })).toBe("environ 2 à 3 heures")
    expect(formatDurationRange({ min: 135, max: 200 })).toBe("environ 2,5 à 3,5 heures")
    expect(formatDurationRange({ min: 120, max: 125 })).toBe("environ 2 heures")
  })

  test("a range that starts under two hours stays in minutes", () => {
    expect(formatDurationRange({ min: 100, max: 150 })).toBe("100 à 150 minutes")
  })

  test("never writes the symbols for minutes or hours", () => {
    for (const range of [
      { min: 25, max: 30 },
      { min: 120, max: 180 },
      { min: 1, max: 1 },
    ]) {
      expect(formatDurationRange(range)).not.toMatch(/(^|\s)(min|h)(\s|$)/)
    }
  })
})
