jest.mock("react-native", () => ({ useColorScheme: () => "light" }))
jest.mock("../storage/theme-preference", () => ({
  DEFAULT_THEME_MODE: "automatic",
  loadThemeModePreference: jest.fn(),
  saveThemeModePreference: jest.fn(),
}))

import {
  brandComponentTokens,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "./brand-tokens"
import { compositeOver, contrastRatio, relativeLuminance } from "./contrast"
import {
  type Box,
  FLOW_LINES,
  type ForestTextBlock,
  layLine,
  MIST_DISCS,
  textEllipse,
} from "./forest-aurora-shape"
import {
  buildTextShield,
  forestAurora,
  type ForestShieldKey,
  forestShield,
} from "./forest-aurora-tokens"
import { buildTheme } from "./theme"
import { forestStops, numeralGeometry, withAlpha } from "./visual-tokens"
import { RESUME_LAYOUT } from "../screens/home/layout-budget"

const noop = () => {}
const themes = {
  light: buildTheme("automatic", "light", noop),
  dark: buildTheme("automatic", "dark", noop),
}
const forest = themes.light.visual.forest
const stops = [forestStops.a, forestStops.b, forestStops.c]
const a = forestAurora
const lines = a.lines

// ---------------------------------------------------------------------------------------------
// The worst a point of text ever sits on: the three discs at their peak stacked on it (they cross
// the whole card, so any point can get them), a dash of light and its glow passing right behind
// it (as much as the lines' mask lets through there), then the shield of every block.

type Ellipse = ReturnType<typeof textEllipse>

/** 0 at the ellipse's centre, its `inner` at the block's corners, 1 at its rim. */
function radius(e: Ellipse, x: number, y: number): number {
  return Math.hypot((x - e.cx) / e.rx, (y - e.cy) / e.ry)
}

function shieldAt(key: ForestShieldKey, e: Ellipse, x: number, y: number): number {
  const { core, edge } = forestShield[key]
  const t = radius(e, x, y)
  if (t <= e.inner) return core + ((edge - core) * t) / e.inner
  return Math.max(0, edge * (1 - (t - e.inner) / (1 - e.inner)))
}

function linesShowAt(e: Ellipse, x: number, y: number): number {
  const t = radius(e, x, y)
  const hole = t <= e.inner ? 1 : Math.max(0, 1 - (t - e.inner) / (1 - e.inner))
  return 1 - (1 - lines.floor) * hole
}

function worstUnder(
  key: ForestShieldKey,
  blocks: ForestTextBlock[],
  stop: string,
  x: number,
  y: number,
) {
  let colour = stop
  for (const disc of MIST_DISCS)
    colour = compositeOver(withAlpha(a[disc.key].colour, a[disc.key].peak), colour)
  const ellipses = blocks.map(textEllipse)
  const show = ellipses.reduce((share, e) => share * linesShowAt(e, x, y), 1)
  colour = compositeOver(withAlpha(lines.glow, lines.glowOpacity * show), colour)
  colour = compositeOver(withAlpha(lines.light, lines.lightOpacity * show), colour)
  for (const e of ellipses)
    colour = compositeOver(withAlpha(forestShield.colour, shieldAt(key, e, x, y)), colour)
  return colour
}

type Pair = { name: string; colour: string; target: number }
type Region = {
  name: string
  x: number
  y: number
  width: number
  height: number
  pairs: Pair[]
  tile?: boolean
}
type CardModel = {
  name: string
  key: ForestShieldKey
  box: Box
  blocks: ForestTextBlock[]
  regions: Region[]
}

/** The lowest ratio of each pair over a region, sampled every 4 pt, on every gradient stop. */
function lowest(card: CardModel, region: Region): Record<string, number> {
  const result: Record<string, number> = {}
  for (const stop of stops) {
    for (let x = region.x; x <= region.x + region.width; x += 4) {
      for (let y = region.y; y <= region.y + region.height; y += 4) {
        let background = worstUnder(card.key, card.blocks, stop, x, y)
        if (region.tile) background = compositeOver(forest.tileFill, background)
        for (const pair of region.pairs) {
          result[pair.name] = Math.min(
            result[pair.name] ?? Infinity,
            contrastRatio(pair.colour, background),
          )
        }
      }
    }
  }
  return result
}

// The cards on a 375 and a 393 pt wide phone (16 pt margins), laid out from their tokens, their
// blocks as the cards measure them. Text is taken to fill its block.
const PAD = RESUME_LAYOUT.padding
const BUTTON = 120

function cards(width: number): CardModel[] {
  const out: CardModel[] = []
  for (const titleLines of [1, 2]) {
    for (const draft of [true, false]) {
      const copyHeight =
        titleLines * brandTypography.screenTitle.lineHeight +
        RESUME_LAYOUT.textGap +
        brandTypeScale.subhead.lineHeight
      const row = Math.max(brandComponentTokens.button.minHeight, copyHeight)
      const copy = {
        x: PAD,
        y: PAD + (row - copyHeight) / 2,
        width: width - 2 * PAD - BUTTON - brandSpacing4.smd,
        height: copyHeight,
      }
      const progress = {
        x: PAD,
        y: PAD + row + RESUME_LAYOUT.progressGap,
        width: width - 2 * PAD,
        height: RESUME_LAYOUT.progressHeight,
      }
      const height =
        PAD + row + (draft ? RESUME_LAYOUT.progressGap + RESUME_LAYOUT.progressHeight : 0) + PAD
      out.push({
        name: `Accueil ${draft ? "resume" : "start"} card, ${titleLines} line(s), ${width} pt`,
        key: "standard",
        box: { width, height },
        blocks: draft ? [copy, progress] : [copy],
        regions: [
          {
            name: "title and factors line",
            ...copy,
            pairs: [
              { name: "title", colour: forest.title, target: 4.5 },
              { name: "body", colour: forest.body, target: 4.5 },
            ],
          },
          ...(draft
            ? [
                {
                  name: "segments",
                  ...progress,
                  pairs: [{ name: "filled segment", colour: a.progressDone, target: 3 }],
                },
              ]
            : []),
        ],
      })
    }
  }
  const stats = {
    x: PAD,
    y: PAD,
    width: 200,
    height:
      brandTypography.screenTitle.lineHeight +
      brandSpacing4.xs +
      brandTypeScale.footnote.lineHeight,
  }
  out.push({
    name: `Mes Relevés, ${width} pt`,
    key: "standard",
    box: { width, height: stats.height + 2 * PAD },
    blocks: [stats],
    regions: [
      {
        name: "the two figures",
        ...stats,
        pairs: [
          { name: "figure", colour: forest.title, target: 4.5 },
          { name: "accent figure", colour: forest.titleAccent, target: 4.5 },
          { name: "label", colour: forest.body, target: 4.5 },
        ],
      },
    ],
  })
  const head = {
    x: PAD,
    y: PAD,
    width: 165,
    height: brandTypography.label.lineHeight + brandSpacing4.xs + numeralGeometry.height,
  }
  const lowerTop = head.y + head.height
  const tiles = {
    x: PAD,
    y: lowerTop + brandSpacing4.sm + 6 + brandSpacing4.smd,
    width: width - 2 * PAD,
    height: 60,
  }
  const hint = {
    x: PAD,
    y: tiles.y + tiles.height + brandSpacing4.sm,
    width: 200,
    height: brandTypography.meta.lineHeight,
  }
  const lower = {
    x: PAD,
    y: lowerTop,
    width: width - 2 * PAD,
    height: hint.y + hint.height - lowerTop,
  }
  out.push({
    name: `score card, ${width} pt`,
    key: "score",
    box: { width, height: hint.y + hint.height + PAD },
    blocks: [head, lower],
    regions: [
      {
        name: "caption and numeral",
        ...head,
        pairs: [
          { name: "caption", colour: forest.body, target: 4.5 },
          { name: "numeral end", colour: forest.numeralBottom, target: 4.5 },
          { name: "unit", colour: forest.sage, target: 4.5 },
        ],
      },
      {
        name: "tiles",
        ...tiles,
        tile: true,
        pairs: [
          { name: "tile label and unit", colour: forest.body, target: 4.5 },
          { name: "tile value", colour: forest.title, target: 4.5 },
        ],
      },
      { name: "hint", ...hint, pairs: [{ name: "hint", colour: forest.body, target: 4.5 }] },
    ],
  })
  return out
}

const ALL = [343, 361].flatMap(cards)
const CASES = ALL.flatMap((card) =>
  card.regions.map((region) => [`${card.name}: ${region.name}`, card, region] as const),
)

describe("forest mist colours (owner's settings: fogA 1.6)", () => {
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

  test("the lines: faint base, a bright dash, a soft glow, only a little behind text", () => {
    expect(lines.baseOpacity).toBeCloseTo(0.18)
    expect(lines.lightOpacity).toBe(1)
    expect(lines.glowOpacity).toBeLessThan(0.5)
    expect(lines.glowWidth).toBeGreaterThan(lines.width)
    expect(relativeLuminance(lines.light)).toBeGreaterThan(relativeLuminance(lines.base))
    expect(lines.floor).toBeGreaterThan(0)
    expect(lines.floor).toBeLessThanOrEqual(0.2)
  })
})

describe("readable text with the mist at its peak and the light passing behind (12.2-19)", () => {
  test.each(CASES)("%s", (_name, card, region) => {
    const failing = Object.entries(lowest(card, region))
      .map(([name, ratio]) => ({
        name,
        ratio,
        target: region.pairs.find((p) => p.name === name)!.target,
      }))
      .filter(({ ratio, target }) => ratio < target)
    expect(failing).toEqual([])
  })

  test("without its shield the same text would not hold: the shield is needed", () => {
    let colour: string = forestStops.b
    for (const disc of MIST_DISCS)
      colour = compositeOver(withAlpha(a[disc.key].colour, a[disc.key].peak), colour)
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

describe("the effect covers the whole card (owner: not only the top right)", () => {
  test.each(ALL.map((card) => [card.name, card] as const))(
    "%s: every point gets mist",
    (_name, card) => {
      const { width, height } = card.box
      const dark: string[] = []
      for (let x = 0; x <= width; x += 8) {
        for (let y = 0; y <= height; y += 8) {
          // Some disc puts at least a quarter of its peak there at some moment of its drift.
          const reached = MIST_DISCS.some((disc) => {
            for (let step = 0; step <= 40; step += 1) {
              const k = step / 40
              const cx = width * (disc.from[0] + (disc.to[0] - disc.from[0]) * k)
              const cy = height * (disc.from[1] + (disc.to[1] - disc.from[1]) * k)
              const r = (disc.size / 2) * (1 + (disc.scale - 1) * k)
              if (Math.hypot(x - cx, y - cy) <= 0.75 * r) return true
            }
            return false
          })
          if (!reached) dark.push(`${x},${y}`)
        }
      }
      expect(dark).toEqual([])
    },
  )

  test.each(ALL.map((card) => [card.name, card] as const))(
    "%s: the lines cross it",
    (_name, card) => {
      const { width, height } = card.box
      // Points along the lines (the curves stay inside their control polygons' hull).
      const along = FLOW_LINES.flatMap((points) => {
        const out: [number, number][] = []
        for (let i = 0; i + 2 < points.length; i += 2) {
          for (let k = 0; k <= 10; k += 1) {
            out.push([
              width * (points[i] + (points[i + 2] - points[i]) * (k / 10)),
              height * (points[i + 1] + (points[i + 3] - points[i + 1]) * (k / 10)),
            ])
          }
        }
        return out
      })
      expect(Math.min(...along.map(([x]) => x))).toBeLessThanOrEqual(0)
      expect(Math.max(...along.map(([x]) => x))).toBeGreaterThanOrEqual(width)
      for (let x = 0; x <= width; x += 16) {
        for (let y = 0; y <= height; y += 8) {
          const nearest = Math.min(...along.map(([px, py]) => Math.hypot(px - x, py - y)))
          expect(nearest).toBeLessThanOrEqual(0.35 * height + 12)
        }
      }
      // The dash pattern outlasts each line: the light runs its whole length.
      for (const points of FLOW_LINES) {
        const { d, pattern } = layLine(points, card.box)
        expect(d).toMatch(/^M[-\d\s.]+( C[-\d\s.]+)+$/)
        expect(pattern).toBeGreaterThan(width)
      }
    },
  )
})

// ---------------------------------------------------------------------------------------------
// No hard edge and no flat zone (owner: "le fond devient uni en vert").

describe("the shield: soft ellipses only, never an edge or a flat zone", () => {
  test.each(["standard", "score"] as const)(
    "%s: falls from the centre to nothing at the rim",
    (key) => {
      const { core, edge } = forestShield[key]
      expect(core).toBeGreaterThan(edge)
      expect(buildTextShield(key, 0.4)).toBe(
        `radial-gradient(50% 50% at 50% 50%, ${withAlpha(forestShield.colour, core)} 0%, ` +
          `${withAlpha(forestShield.colour, edge)} 40%, ${withAlpha(forestShield.colour, 0)} 100%)`,
      )
    },
  )

  test("each block's ellipse keeps a feather of at least 44 pt all round, at a gentle slope", () => {
    expect(forestShield.feather).toBeGreaterThanOrEqual(40)
    for (const card of ALL) {
      for (const block of card.blocks) {
        const e = textEllipse(block)
        // The block lies inside the ellipse's inner share.
        expect(radius(e, block.x, block.y)).toBeCloseTo(e.inner)
        // From the block's sides to the rim: at least the feather.
        expect(e.rx - block.width / 2).toBeGreaterThanOrEqual(forestShield.feather - 0.01)
        expect(e.ry - block.height / 2).toBeGreaterThanOrEqual(forestShield.feather - 0.01)
        for (const key of ["standard", "score"] as const) {
          expect(forestShield[key].edge / forestShield.feather).toBeLessThanOrEqual(0.7 / 40)
        }
      }
    }
    // A block of no size still gets a soft round shield.
    const dot = textEllipse({ x: 10, y: 10, width: 0, height: 0 })
    expect(dot.rx).toBe(0)
    expect(dot.inner).toBeGreaterThan(0)
  })
})
