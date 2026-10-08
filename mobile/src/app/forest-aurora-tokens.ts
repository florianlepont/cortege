// The forest card's backdrop (12.2-19), as the owner tuned it live in sketch 010 `round4.html`
// ("spd=2 fogA=1.6 size=0.7 flowSpd=1 flowA=1"): a mist of three soft discs drifting behind the
// content, faint contour lines with a dash of light flowing along them, a veil fading the left of
// the card, and a feathered shield keeping each card's text readable. Colours only; the geometry
// and timing live in `forest-aurora-shape.ts`. Same values in both schemes, the card is always
// forest. Hex and rgba literals are allowed in this file (ESLint).
//
// No layer may draw a flat zone or a hard edge (owner: "le fond devient uni en vert"): every
// shield is a gradient from nothing, tested in `forest-aurora-tokens.test.ts` with the contrast of
// each card's text at the mist's worst, over the points the discs can reach.

import { buildLinearGradient, forestStops, withAlpha } from "./visual-tokens"

/** The owner's "Intensité de la brume" (fogA) applied to the sketch's base alphas. */
const FOG = 1.6

export const forestAurora = {
  /** Colour at a disc's centre and its opacity there; it fades to nothing at its rim. */
  moss: { colour: "#6EBE3C", peak: 0.42 * FOG },
  teal: { colour: "#1EAA8C", peak: 0.38 * FOG },
  ochre: { colour: "#DCAA3C", peak: 0.26 * FOG },
  /** The contours: faint base lines and a short bright dash with a soft glow under it. */
  lines: {
    base: "#8CB950",
    baseOpacity: 0.18,
    light: "#D7F096",
    lightOpacity: 1,
    glow: "#C8EC78",
    glowOpacity: 0.3,
    width: 1.2,
    glowWidth: 4,
  },
  /**
   * Where the text column ends when a card gives no zone of its own, as a share of its width.
   */
  textReach: 0.64,
  /** Filled progress segments of Accueil's card: the pale forest green, 3:1 at the mist's worst. */
  progressDone: "#C8DDA0",
} as const

export type AuroraTone = "moss" | "teal" | "ochre"

/**
 * The veil of the sketch (its `.mask`): the card's first green, 0.9 at the left edge, gone at 60 %
 * of the width. It sits over the mist and the lines, so both fade towards the text.
 */
export const forestVeil = { colour: forestStops.a, alpha: 0.9, reach: 60 } as const

export const forestVeilImage = buildLinearGradient(90, [
  [withAlpha(forestVeil.colour, forestVeil.alpha), 0],
  [withAlpha(forestVeil.colour, 0), forestVeil.reach],
])

/**
 * The shield over the text, in the card's darkest green, all gradients: across the card from
 * `start` at its left edge to `end` where its text column ends, then down to nothing over `fade`
 * points; and, for a card with text at its bottom (Accueil's segments, the score card's bar and
 * tiles), a band rising from nothing over `feather` points to `band` where that text starts and on
 * to `bandEnd` at the bottom edge. `standard` is Accueil's and Mes Relevés'; `score` is the score
 * card's, whose sage unit and glass tiles need more.
 */
export const forestShield = {
  colour: forestStops.c,
  fade: 90,
  feather: 48,
  standard: { start: 0.5, end: 0.44, band: 0.24, bandEnd: 0.34 },
  score: { start: 0.5, end: 0.5, band: 0.54, bandEnd: 0.62 },
} as const

export type ForestShieldKey = "standard" | "score"

const percent = (value: number, total: number) =>
  Math.round(Math.min(100, Math.max(0, (value / total) * 100)) * 100) / 100

/** The shield across a card `width` wide whose text column ends at `left`. */
export function buildColumnShield(key: ForestShieldKey, width: number, left: number): string {
  const { colour, fade } = forestShield
  const { start, end } = forestShield[key]
  return buildLinearGradient(90, [
    [withAlpha(colour, start), 0],
    [withAlpha(colour, end), percent(left, width)],
    [withAlpha(colour, 0), percent(left + fade, width)],
  ])
}

/** The band from `feather` above its text down to the card's bottom, `height` points in all. */
export function buildBandShield(key: ForestShieldKey, height: number): string {
  const { colour, feather } = forestShield
  const { band, bandEnd } = forestShield[key]
  return buildLinearGradient(180, [
    [withAlpha(colour, 0), 0],
    [withAlpha(colour, band), percent(feather, height)],
    [withAlpha(colour, bandEnd), 100],
  ])
}
