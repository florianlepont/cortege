jest.mock("react-native", () => ({ useColorScheme: () => "light" }))
jest.mock("../storage/theme-preference", () => ({
  DEFAULT_THEME_MODE: "automatic",
  loadThemeModePreference: jest.fn(),
  saveThemeModePreference: jest.fn(),
}))

import { compositeOver, contrastRatio, relativeLuminance } from "./contrast"
import {
  auroraCore,
  type AuroraTone,
  buildShieldLayers,
  forestAurora,
  type ForestShieldKey,
  forestShield,
  forestShieldLayers,
} from "./forest-aurora-tokens"
import { buildTheme } from "./theme"
import { forestStops, withAlpha } from "./visual-tokens"

const noop = () => {}
const themes = {
  light: buildTheme("automatic", "light", noop),
  dark: buildTheme("automatic", "dark", noop),
}
const forest = themes.light.visual.forest
const stops = [forestStops.a, forestStops.b, forestStops.c]
const tones: AuroraTone[] = ["moss", "teal", "ochre"]
const a = forestAurora

// The brightest the aurora ever makes a point of the card: all three discs at their full peak
// (bloom included) with their lighter heart, one over the other, over a stop of the card gradient.
function worstAurora(stop: string): string {
  return tones.reduce(
    (under, tone) => compositeOver(withAlpha(auroraCore(tone), a[tone].peak), under),
    stop,
  )
}

// What text in a shielded zone of a card sits on, at the worst moment.
function shielded(key: ForestShieldKey, zone: "column" | "band", stop: string): string {
  return compositeOver(withAlpha(forestShield.colour, forestShield[key][zone]), worstAurora(stop))
}

type Pair = { name: string; colour: string; target: number; tile?: boolean }

// Every text and graphic each card puts in its shielded zones (the clear zone holds none, except
// Accueil's opaque button).
const cards: { card: string; key: ForestShieldKey; zone: "column" | "band"; pairs: Pair[] }[] = [
  {
    card: "Accueil, title and factors line",
    key: "standard",
    zone: "column",
    pairs: [
      { name: "title", colour: forest.title, target: 4.5 },
      { name: "body", colour: forest.body, target: 4.5 },
    ],
  },
  {
    card: "Accueil, progress segments",
    key: "standard",
    zone: "band",
    pairs: [{ name: "filled segment", colour: a.progressDone, target: 3 }],
  },
  {
    card: "Mes Relevés, the two figures",
    key: "standard",
    zone: "column",
    pairs: [
      { name: "figure", colour: forest.title, target: 4.5 },
      { name: "accent figure", colour: forest.titleAccent, target: 4.5 },
      { name: "label", colour: forest.body, target: 4.5 },
    ],
  },
  {
    card: "score card, caption and numeral",
    key: "score",
    zone: "column",
    pairs: [
      { name: "caption", colour: forest.body, target: 4.5 },
      { name: "numeral top", colour: forest.numeralTop, target: 4.5 },
      { name: "numeral end", colour: forest.numeralBottom, target: 4.5 },
      { name: "unit", colour: forest.sage, target: 4.5 },
    ],
  },
  {
    card: "score card, tiles and hint",
    key: "score",
    zone: "band",
    pairs: [
      { name: "tile label", colour: forest.body, target: 4.5, tile: true },
      { name: "tile value", colour: forest.title, target: 4.5, tile: true },
      { name: "tile unit", colour: forest.sage, target: 4.5, tile: true },
      { name: "hint", colour: forest.body, target: 4.5 },
    ],
  },
]

describe('forest aurora colours (12.2-19 fifth round: stronger, owner "trop light")', () => {
  test("moss and teal peak at 0.60 to 0.75, the warm ochre accent about 0.45", () => {
    for (const tone of ["moss", "teal"] as const) {
      expect(a[tone].peak).toBeGreaterThanOrEqual(0.6)
      expect(a[tone].peak).toBeLessThanOrEqual(0.75)
    }
    expect(a.ochre.peak).toBeGreaterThanOrEqual(0.4)
    expect(a.ochre.peak).toBeLessThanOrEqual(0.5)
    // Warm: more red than green than blue.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(a.ochre.colour.slice(i, i + 2), 16))
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  test("each disc clearly lifts the card where it glows, its heart a little lighter", () => {
    for (const tone of tones) {
      expect(relativeLuminance(auroraCore(tone))).toBeGreaterThan(relativeLuminance(a[tone].colour))
      for (const stop of stops) {
        const lifted = compositeOver(withAlpha(auroraCore(tone), a[tone].peak), stop)
        // Perceivable on its own, even the ochre: at least 1.6:1 against the bare card.
        expect(contrastRatio(lifted, stop)).toBeGreaterThanOrEqual(1.6)
      }
    }
  })

  test("a soft disc drawn once: full at the centre, nothing at the rim", () => {
    expect(a.falloff[0]).toEqual([0, 1])
    expect(a.falloff[a.falloff.length - 1]).toEqual([1, 0])
    for (let i = 1; i < a.falloff.length; i += 1) {
      expect(a.falloff[i][0]).toBeGreaterThan(a.falloff[i - 1][0])
      expect(a.falloff[i][1]).toBeLessThan(a.falloff[i - 1][1])
    }
  })

  test("the contours stay faint and thin, the deep green the fainter", () => {
    expect(a.trace.maxOpacity).toBeLessThanOrEqual(0.35)
    expect(a.trace.width).toBe(1)
    expect(relativeLuminance(a.trace.deep)).toBeLessThan(relativeLuminance(a.trace.light))
    expect(a.textReach).toBeGreaterThanOrEqual(0.6)
    expect(a.textReach).toBeLessThan(1)
  })
})

describe("readable zones of every forest card, at the aurora's worst", () => {
  test.each(cards)("$card keep their contrast", ({ key, zone, pairs }) => {
    const failing: string[] = []
    for (const stop of stops) {
      const under = shielded(key, zone, stop)
      for (const pair of pairs) {
        const background = pair.tile ? compositeOver(forest.tileFill, under) : under
        const ratio = contrastRatio(pair.colour, background)
        if (ratio < pair.target) failing.push(`${pair.name} on ${stop}: ${ratio.toFixed(2)}`)
      }
    }
    expect(failing).toEqual([])
  })

  test("the same text colours in both schemes: the card is always forest", () => {
    for (const key of ["title", "titleAccent", "body", "sage", "tileFill"] as const) {
      expect(themes.dark.visual.forest[key]).toBe(themes.light.visual.forest[key])
    }
  })

  test("the empty segments' track stays darker than a filled one in the band", () => {
    for (const stop of stops) {
      const track = compositeOver(forest.tagFill, shielded("standard", "band", stop))
      expect(relativeLuminance(track)).toBeLessThan(relativeLuminance(a.progressDone))
    }
  })

  test("without a shield the worst aurora is too bright for the text: the shield is needed", () => {
    expect(contrastRatio(forest.body, worstAurora(forestStops.b))).toBeLessThan(4.5)
  })

  test("the score card's shield is the darker one (sage units and glass tiles)", () => {
    expect(forestShield.score.column).toBeGreaterThan(forestShield.standard.column)
    expect(forestShield.score.band).toBeGreaterThan(forestShield.standard.band)
    for (const key of ["standard", "score"] as const) {
      for (const alpha of Object.values(forestShield[key])) expect(alpha).toBeLessThan(0.85)
    }
    expect(forestShield.colour).toBe(forestStops.c)
  })

  test.each(["light", "dark"] as const)("%s: Accueil's button is opaque over the aurora", (s) => {
    const { pill } = themes[s].visual
    expect(pill.fallback).toMatch(/^#[0-9A-F]{6}$/i)
    expect(pill.top).toMatch(/^#[0-9A-F]{6}$/i)
    expect(contrastRatio(pill.label, pill.fallback)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(pill.label, pill.top)).toBeGreaterThanOrEqual(4.5)
  })
})

describe("shield layers", () => {
  test("a solid fill over the text, fading to nothing into the clear zone", () => {
    expect(buildShieldLayers("standard")).toEqual({
      column: "rgba(14, 34, 16, 0.55)",
      columnFade: "linear-gradient(90deg, rgba(14, 34, 16, 0.55) 0%, rgba(14, 34, 16, 0) 100%)",
      band: "rgba(14, 34, 16, 0.55)",
      bandFade: "linear-gradient(180deg, rgba(14, 34, 16, 0) 0%, rgba(14, 34, 16, 0.55) 100%)",
    })
    expect(forestShieldLayers.score).toEqual(buildShieldLayers("score"))
    expect(forestShieldLayers.score.band).toBe("rgba(14, 34, 16, 0.8)")
    expect(forestShield.fade.column).toBeGreaterThanOrEqual(forestShield.fade.band)
  })
})
