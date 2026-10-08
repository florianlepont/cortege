jest.mock("react-native", () => ({ useColorScheme: () => "light" }))
jest.mock("../storage/theme-preference", () => ({
  DEFAULT_THEME_MODE: "automatic",
  loadThemeModePreference: jest.fn(),
  saveThemeModePreference: jest.fn(),
}))

import { brandSpacing4, brandTypeScale, brandTypography } from "./brand-tokens"
import { compositeOver, contrastRatio, relativeLuminance } from "./contrast"
import { MIST_DISCS, type MistDisc } from "./forest-aurora-shape"
import {
  buildBandShield,
  buildColumnShield,
  forestAurora,
  type ForestShieldKey,
  forestShield,
  forestVeil,
  forestVeilImage,
} from "./forest-aurora-tokens"
import { buildTheme } from "./theme"
import { forestStops, numeralGeometry, withAlpha } from "./visual-tokens"
import { RESUME_LAYOUT, resumeCardHeight } from "../screens/home/layout-budget"

const noop = () => {}
const themes = {
  light: buildTheme("automatic", "light", noop),
  dark: buildTheme("automatic", "dark", noop),
}
const forest = themes.light.visual.forest
const stops = [forestStops.a, forestStops.b, forestStops.c]
const a = forestAurora

// ---------------------------------------------------------------------------------------------
// The mist at its worst over a point: each disc at the most it ever puts there over its whole
// drift (centre and radius along the way), all three stacked, over a stop of the card gradient.

function mistAt(disc: MistDisc, width: number, height: number, x: number, y: number): number {
  const half = disc.size / 2
  const { left, right, top, bottom } = disc.anchor
  const restX = left !== undefined ? left + half : width - (right as number) - half
  const restY = top !== undefined ? top + half : height - (bottom as number) - half
  let most = 0
  for (let step = 0; step <= 50; step += 1) {
    const k = step / 50
    const cx = restX + disc.drift.x * k
    const cy = restY + disc.drift.y * k
    const radius = half * (1 + (disc.drift.scale - 1) * k)
    const share = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / radius)
    most = Math.max(most, a[disc.key].peak * share)
  }
  return most
}

type Card = {
  name: string
  key: ForestShieldKey
  width: number
  height: number
  /** Where the text column ends (the zone's left) and where the band's text starts, if any. */
  zoneLeft: number
  zoneBottom?: number
}

function columnShieldAt(card: Card, x: number): number {
  const { start, end } = forestShield[card.key]
  if (x <= card.zoneLeft) return start + ((end - start) * x) / card.zoneLeft
  return Math.max(0, end * (1 - (x - card.zoneLeft) / forestShield.fade))
}

function bandShieldAt(card: Card, y: number): number {
  if (card.zoneBottom === undefined) return 0
  const { band, bandEnd } = forestShield[card.key]
  const from = card.zoneBottom - forestShield.feather
  if (y <= from) return 0
  if (y <= card.zoneBottom) return (band * (y - from)) / forestShield.feather
  return band + ((bandEnd - band) * (y - card.zoneBottom)) / (card.height - card.zoneBottom)
}

/** What a point of the card shows at the mist's worst, every layer applied in its order. */
function under(card: Card, stop: string, x: number, y: number): string {
  let colour = stop
  for (const disc of MIST_DISCS) {
    colour = compositeOver(
      withAlpha(a[disc.key].colour, mistAt(disc, card.width, card.height, x, y)),
      colour,
    )
  }
  const veil = forestVeil.alpha * Math.max(0, 1 - (x / card.width) * (100 / forestVeil.reach))
  colour = compositeOver(withAlpha(forestVeil.colour, veil), colour)
  colour = compositeOver(withAlpha(forestShield.colour, columnShieldAt(card, x)), colour)
  return compositeOver(withAlpha(forestShield.colour, bandShieldAt(card, y)), colour)
}

type Pair = { name: string; colour: string; target: number }
type Region = {
  card: Card
  what: string
  x: [number, number]
  y: [number, number]
  pairs: Pair[]
  tile?: boolean
}

/** The lowest ratio of each pair over a region, sampled every 4 pt, on every gradient stop. */
function lowest(region: Region): Record<string, number> {
  const result: Record<string, number> = {}
  for (const stop of stops) {
    for (let x = region.x[0]; x <= region.x[1]; x += 4) {
      for (let y = region.y[0]; y <= region.y[1]; y += 4) {
        let background = under(region.card, stop, x, y)
        if (region.tile) background = compositeOver(forest.tileFill, background)
        for (const pair of region.pairs) {
          const ratio = contrastRatio(pair.colour, background)
          result[pair.name] = Math.min(result[pair.name] ?? Infinity, ratio)
        }
      }
    }
  }
  return result
}

// The cards on a 375 and a 393 pt wide phone (16 pt margins), laid out from their tokens. Text
// is taken to run to its column's end: a short button (120 pt), wide figures (200 pt), the
// draft caption "Score IBP du brouillon" (about 165 pt).
const PAD = RESUME_LAYOUT.padding
const copy = (titleLines: number) =>
  titleLines * brandTypography.screenTitle.lineHeight +
  RESUME_LAYOUT.textGap +
  brandTypeScale.subhead.lineHeight
const SCORE = {
  lower: PAD + brandTypography.label.lineHeight + brandSpacing4.xs + numeralGeometry.height,
  tileHeight: 60,
}

function regions(width: number): Region[] {
  const out: Region[] = []
  for (const titleLines of [1, 2]) {
    for (const draft of [true, false]) {
      const height = resumeCardHeight(draft, titleLines, 1)
      const segments = height - PAD - RESUME_LAYOUT.progressHeight
      const card: Card = {
        name: `Accueil ${draft ? "resume" : "start"}, ${titleLines} line(s), ${width} pt`,
        key: "standard",
        width,
        height,
        zoneLeft: width - PAD - 120 - brandSpacing4.smd,
        zoneBottom: draft ? segments - RESUME_LAYOUT.progressGap / 2 : undefined,
      }
      out.push({
        card,
        what: "title and factors line",
        x: [PAD, card.zoneLeft],
        y: [PAD, PAD + copy(titleLines)],
        pairs: [
          { name: "title", colour: forest.title, target: 4.5 },
          { name: "body", colour: forest.body, target: 4.5 },
        ],
      })
      if (draft) {
        out.push({
          card,
          what: "progress segments",
          x: [PAD, width - PAD],
          y: [segments, segments + RESUME_LAYOUT.progressHeight],
          pairs: [{ name: "filled segment", colour: a.progressDone, target: 3 }],
        })
      }
    }
  }
  const list: Card = {
    name: `Mes Relevés, ${width} pt`,
    key: "standard",
    width,
    height: 82,
    zoneLeft: PAD + 200 + PAD,
  }
  out.push({
    card: list,
    what: "the two figures",
    x: [PAD, PAD + 200],
    y: [PAD, list.height - PAD],
    pairs: [
      { name: "figure", colour: forest.title, target: 4.5 },
      { name: "accent figure", colour: forest.titleAccent, target: 4.5 },
      { name: "label", colour: forest.body, target: 4.5 },
    ],
  })
  const tilesTop = SCORE.lower + brandSpacing4.sm + 6 + brandSpacing4.smd
  const hintTop = tilesTop + SCORE.tileHeight + brandSpacing4.sm
  const score: Card = {
    name: `score card, ${width} pt`,
    key: "score",
    width,
    height: hintTop + brandTypography.meta.lineHeight + PAD,
    zoneLeft: PAD + 165 + brandSpacing4.smd,
    zoneBottom: SCORE.lower,
  }
  out.push({
    card: score,
    what: "caption and numeral",
    x: [PAD, PAD + 165],
    y: [PAD, SCORE.lower],
    pairs: [
      { name: "caption", colour: forest.body, target: 4.5 },
      { name: "numeral end", colour: forest.numeralBottom, target: 4.5 },
      { name: "unit", colour: forest.sage, target: 4.5 },
    ],
  })
  out.push({
    card: score,
    what: "tiles",
    tile: true,
    x: [PAD, width - PAD],
    y: [tilesTop, tilesTop + SCORE.tileHeight],
    pairs: [
      { name: "tile label and unit", colour: forest.body, target: 4.5 },
      { name: "tile value", colour: forest.title, target: 4.5 },
    ],
  })
  out.push({
    card: score,
    what: "hint",
    x: [PAD, PAD + 200],
    y: [hintTop, hintTop + brandTypography.meta.lineHeight],
    pairs: [{ name: "hint", colour: forest.body, target: 4.5 }],
  })
  return out
}

const ALL = [343, 361].flatMap(regions)

describe("forest mist colours (owner's settings: fogA 1.6, size 0.7)", () => {
  test("the sketch's alphas times 1.6: moss 0.672, teal 0.608, ochre 0.416", () => {
    expect(a.moss.peak).toBeCloseTo(0.672)
    expect(a.teal.peak).toBeCloseTo(0.608)
    expect(a.ochre.peak).toBeCloseTo(0.416)
    expect([a.moss.colour, a.teal.colour, a.ochre.colour]).toEqual([
      "#6EBE3C",
      "#1EAA8C",
      "#DCAA3C",
    ])
  })

  test("the lines: faint base, a bright dash, a soft glow", () => {
    expect(a.lines.baseOpacity).toBeCloseTo(0.18)
    expect(a.lines.lightOpacity).toBe(1)
    expect(a.lines.glowOpacity).toBeLessThan(0.5)
    expect(a.lines.glowWidth).toBeGreaterThan(a.lines.width)
    expect(relativeLuminance(a.lines.light)).toBeGreaterThan(relativeLuminance(a.lines.base))
  })
})

describe("readable text at the mist's worst, where the discs can reach (12.2-19)", () => {
  test.each(ALL.map((region) => [`${region.card.name}: ${region.what}`, region] as const))(
    "%s",
    (_name, region) => {
      const failing = Object.entries(lowest(region))
        .map(([name, ratio]) => ({
          name,
          ratio,
          target: region.pairs.find((p) => p.name === name)!.target,
        }))
        .filter(({ ratio, target }) => ratio < target)
      expect(failing).toEqual([])
    },
  )

  test("without its shield the same text would not hold: the shield is needed", () => {
    const [title] = ALL
    const bare = { ...title.card, key: "standard" as const }
    const x = bare.zoneLeft
    const veil = forestVeil.alpha * Math.max(0, 1 - (x / bare.width) * (100 / forestVeil.reach))
    let colour: string = forestStops.b
    for (const disc of MIST_DISCS) {
      colour = compositeOver(
        withAlpha(a[disc.key].colour, mistAt(disc, bare.width, bare.height, x, PAD)),
        colour,
      )
    }
    colour = compositeOver(withAlpha(forestVeil.colour, veil), colour)
    expect(contrastRatio(forest.body, colour)).toBeLessThan(4.5)
  })

  test("the same text colours in both schemes: the card is always forest", () => {
    for (const key of ["title", "titleAccent", "body", "sage", "tileFill"] as const) {
      expect(themes.dark.visual.forest[key]).toBe(themes.light.visual.forest[key])
    }
  })

  test.each(["light", "dark"] as const)("%s: Accueil's button is opaque over the mist", (s) => {
    const { pill } = themes[s].visual
    expect(pill.fallback).toMatch(/^#[0-9A-F]{6}$/i)
    expect(pill.top).toMatch(/^#[0-9A-F]{6}$/i)
    expect(contrastRatio(pill.label, pill.fallback)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(pill.label, pill.top)).toBeGreaterThanOrEqual(4.5)
  })
})

// ---------------------------------------------------------------------------------------------
// No hard edge and no flat zone (owner: "le fond devient uni en vert").

type Stop = { alpha: number; at: number }

function parseStops(image: string): { angle: number; stops: Stop[] } {
  const match = /^linear-gradient\((\d+)deg, (.*)\)$/.exec(image)
  if (!match) throw new Error(image)
  const stopsOf = [...match[2].matchAll(/rgba\(\d+, \d+, \d+, ([\d.]+)\) ([\d.]+)%/g)]
  return {
    angle: Number(match[1]),
    stops: stopsOf.map(([, alpha, at]) => ({ alpha: Number(alpha), at: Number(at) })),
  }
}

/** The steepest change of alpha per point along a gradient `length` points long. */
function steepest(stopsOf: Stop[], length: number): number {
  let most = 0
  for (let i = 1; i < stopsOf.length; i += 1) {
    const run = ((stopsOf[i].at - stopsOf[i - 1].at) / 100) * length
    const rise = Math.abs(stopsOf[i].alpha - stopsOf[i - 1].alpha)
    most = Math.max(most, rise === 0 ? 0 : rise / run)
  }
  return most
}

describe("shields and veil: gradients only, from nothing, never a hard edge", () => {
  // The steepest a shield may get: its full alpha over no less than 40 pt.
  const MAX_SLOPE = 0.6 / 40

  test.each(["standard", "score"] as const)(
    "%s column: falls to nothing past the text, gently",
    (key) => {
      for (const [width, left] of [
        [343, 160],
        [361, 216],
        [361, 300],
      ]) {
        const { angle, stops: column } = parseStops(buildColumnShield(key, width, left))
        expect(angle).toBe(90)
        expect(column[0]).toEqual({ alpha: forestShield[key].start, at: 0 })
        expect(column[column.length - 1].alpha).toBe(0)
        expect(steepest(column, width)).toBeLessThanOrEqual(MAX_SLOPE)
      }
      expect(forestShield.fade).toBeGreaterThanOrEqual(40)
    },
  )

  test.each(["standard", "score"] as const)("%s band: rises from nothing, never flat", (key) => {
    for (const height of [60, 80, 126]) {
      const { angle, stops: band } = parseStops(buildBandShield(key, height))
      expect(angle).toBe(180)
      expect(band[0]).toEqual({ alpha: 0, at: 0 })
      expect(band[band.length - 1].at).toBe(100)
      for (let i = 1; i < band.length; i += 1)
        expect(band[i].alpha).toBeGreaterThan(band[i - 1].alpha)
      expect(steepest(band, height)).toBeLessThanOrEqual(MAX_SLOPE)
    }
    expect(forestShield.feather).toBeGreaterThanOrEqual(40)
  })

  test("the veil of the sketch: 0.9 of the card's first green at the left, gone at 60 %", () => {
    const { stops: veil } = parseStops(forestVeilImage)
    expect(veil).toEqual([
      { alpha: forestVeil.alpha, at: 0 },
      { alpha: 0, at: forestVeil.reach },
    ])
    expect(steepest(veil, 343)).toBeLessThanOrEqual(0.9 / 150)
  })
})
