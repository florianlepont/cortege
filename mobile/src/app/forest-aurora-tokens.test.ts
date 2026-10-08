jest.mock("react-native", () => ({ useColorScheme: () => "light" }))

import {
  brandComponentTokens,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "./brand-tokens"
import { compositeOver, contrastRatio, relativeLuminance } from "./contrast"
import {
  type Box,
  type ForestTextBlock,
  layLines,
  MIST_DISCS,
  type MistDisc,
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

const themes = {
  light: buildTheme("light"),
  dark: buildTheme("dark"),
}
const forest = themes.light.visual.forest
const stops = [forestStops.a, forestStops.b, forestStops.c]
const a = forestAurora
const lines = a.lines

// ---------------------------------------------------------------------------------------------
// The worst a point of text ever sits on: each disc at the most it ever puts there over its whole
// drift (centre and radius along the way), all three stacked; a faint base line, and a dash of
// light with its glow passing right behind it, as much as the lines' mask lets through there;
// then the shield of every block of the card.

function mistAt(disc: MistDisc, box: Box, x: number, y: number): number {
  const half = disc.size / 2
  const { left, right, top, bottom } = disc.anchor
  const restX = left !== undefined ? left + half : box.width - (right as number) - half
  const restY = top !== undefined ? top + half : box.height - (bottom as number) - half
  let most = 0
  for (let step = 0; step <= 50; step += 1) {
    const k = step / 50
    const cx = restX + disc.drift.x * k
    const cy = restY + disc.drift.y * k
    const r = half * (1 + (disc.drift.scale - 1) * k)
    most = Math.max(most, a[disc.key].peak * Math.max(0, 1 - Math.hypot(x - cx, y - cy) / r))
  }
  return most
}

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

/** The share of the lines the mask lets through at a point: `floor` behind a block, all far off. */
function linesShowAt(e: Ellipse, x: number, y: number): number {
  const t = radius(e, x, y)
  const hole = t <= e.inner ? 1 : Math.max(0, 1 - (t - e.inner) / (1 - e.inner))
  return 1 - (1 - lines.floor) * hole
}

function worstUnder(card: CardModel, stop: string, x: number, y: number) {
  let colour = stop
  for (const disc of MIST_DISCS) {
    colour = compositeOver(withAlpha(a[disc.key].colour, mistAt(disc, card.box, x, y)), colour)
  }
  const show = card.blocks.reduce(
    (share, block) => share * linesShowAt(textEllipse(block), x, y),
    1,
  )
  colour = compositeOver(withAlpha(lines.base, lines.baseOpacity * show), colour)
  colour = compositeOver(withAlpha(lines.glow, lines.glowOpacity * show), colour)
  colour = compositeOver(withAlpha(lines.light, lines.lightOpacity * show), colour)
  for (const block of card.blocks) {
    const shield = shieldAt(block.tone ?? card.key, textEllipse(block), x, y)
    colour = compositeOver(withAlpha(forestShield.colour, shield), colour)
  }
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
        let background = worstUnder(card, stop, x, y)
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
        tone: "graphic" as const,
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
/** No point of a card is farther than this from a line (the sketch's own spread, on the score card). */
const LINE_REACH = 104
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
    expect(lines.floor).toBeGreaterThan(0)
    expect(lines.floor).toBeLessThanOrEqual(0.2)
    expect(lines.baseOpacity).toBeCloseTo(0.18)
    expect(lines.lightOpacity).toBe(1)
    expect(lines.glowOpacity).toBeLessThan(0.5)
    expect(lines.glowWidth).toBeGreaterThan(lines.width)
    expect(relativeLuminance(lines.light)).toBeGreaterThan(relativeLuminance(lines.base))
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

describe("the effect over the whole card (round5.html)", () => {
  test.each(ALL.map((card) => [card.name, card] as const))(
    "%s: the mist reaches most of it",
    (_name, card) => {
      const { width, height } = card.box
      let reached = 0
      let all = 0
      for (let x = 0; x <= width; x += 8) {
        for (let y = 0; y <= height; y += 8) {
          all += 1
          // A quarter of some disc's peak at some moment of its drift.
          if (MIST_DISCS.some((disc) => mistAt(disc, card.box, x, y) >= a[disc.key].peak / 4)) {
            reached += 1
          }
        }
      }
      expect(reached / all).toBeGreaterThanOrEqual(0.8)
    },
  )

  test.each(ALL.map((card) => [card.name, card] as const))(
    "%s: diagonal S curves cross it",
    (_name, card) => {
      const { width, height } = card.box
      const laid = layLines(card.box)
      expect(laid).toHaveLength(4)
      const along: [number, number][] = []
      for (const { points, d } of laid) {
        expect(d).toMatch(/^M[-\d\s.]+( C[-\d\s.]+){2}$/)
        // Rising from the bottom left to the top right.
        expect(points[points.length - 1]).toBeLessThan(points[1])
        expect(points[points.length - 2]).toBeGreaterThan(points[0])
        // Clearly diagonal: the S's middle climbs at 20 to 55 degrees (its tangent there).
        const middle = (Math.atan2(points[5] - points[9], points[8] - points[4]) * 180) / Math.PI
        expect(middle).toBeGreaterThanOrEqual(20)
        expect(middle).toBeLessThanOrEqual(55)
        // Smooth at the middle (the sketch's `S`): the tangents in and out line up.
        const into = [points[6] - points[4], points[7] - points[5]]
        const out = [points[8] - points[6], points[9] - points[7]]
        expect(into[0] * out[1] - into[1] * out[0]).toBeCloseTo(0)
        for (let segment = 0; segment < 2; segment += 1) {
          const p = points.slice(segment * 6, segment * 6 + 8)
          for (let k = 0; k <= 40; k += 1) {
            const t = k / 40
            const w = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3]
            along.push([
              w[0] * p[0] + w[1] * p[2] + w[2] * p[4] + w[3] * p[6],
              w[0] * p[1] + w[1] * p[3] + w[2] * p[5] + w[3] * p[7],
            ])
          }
        }
      }
      // Together they span the card's width and height.
      const inside = along.filter(([x, y]) => x >= 0 && x <= width && y >= 0 && y <= height)
      expect(Math.min(...inside.map(([x]) => x))).toBeLessThanOrEqual(4)
      expect(Math.max(...inside.map(([x]) => x))).toBeGreaterThanOrEqual(width - 4)
      expect(Math.min(...inside.map(([, y]) => y))).toBeLessThanOrEqual(4)
      expect(Math.max(...inside.map(([, y]) => y))).toBeGreaterThanOrEqual(height - 4)
      // Every point of the card is near a line.
      let farthest = 0
      for (let x = 0; x <= width; x += 8) {
        for (let y = 0; y <= height; y += 8) {
          const nearest = Math.min(...along.map(([px, py]) => Math.hypot(px - x, py - y)))
          farthest = Math.max(farthest, nearest)
        }
      }
      expect(farthest).toBeLessThanOrEqual(LINE_REACH)
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

  test("each block's ellipse keeps a feather of at least 40 pt all round, at a gentle slope", () => {
    expect(forestShield.feather).toBeGreaterThanOrEqual(40)
    for (const card of ALL) {
      for (const block of card.blocks) {
        const e = textEllipse(block)
        // The block lies inside the ellipse's inner share.
        expect(radius(e, block.x, block.y)).toBeCloseTo(e.inner)
        // From the block's sides to the rim: at least the feather.
        expect(e.rx - block.width / 2).toBeGreaterThanOrEqual(forestShield.feather - 0.01)
        expect(e.ry - block.height / 2).toBeGreaterThanOrEqual(forestShield.feather - 0.01)
      }
    }
    // A block of no size still gets a soft round shield.
    const dot = textEllipse({ x: 10, y: 10, width: 0, height: 0 })
    expect(dot.rx).toBe(0)
    expect(dot.inner).toBeGreaterThan(0)
  })
})
