// The forest card's backdrop (12.2-19 fourth and fifth rounds, owner: "un mélange de A et F",
// sketch 010, then "les halos de couleur sont vraiment trop light"): an aurora of three soft discs
// roaming behind the content, a shield keeping each card's text readable over them, and faint
// contours tracing and erasing themselves in the card's clear zone. Colours only; the geometry and
// timing live in `forest-aurora-shape.ts`, the motion in `forest-motion.ts`. Same values in both
// schemes, the card is always forest. Hex and rgba literals are allowed in this file (ESLint).
//
// Readability is tested in `forest-aurora-tokens.test.ts` on the worst case: all three discs at
// their peak, the lighter core, one over the other, over every stop of the card gradient, under the
// card's shield. Each card's text sits in its shielded zones only (`ForestAurora`'s `zone`).

import { buildLinearGradient, forestStops, mixWithWhite, withAlpha } from "./visual-tokens"

export const forestAurora = {
  /** Colour at a disc's rim side and its opacity at the brightest moment (bloom included). */
  moss: { colour: "#5FA82C", peak: 0.7 },
  teal: { colour: "#1F9A78", peak: 0.65 },
  ochre: { colour: "#C8913A", peak: 0.45 },
  /** The centre of a disc is its colour mixed this much with white: a slightly lighter heart. */
  coreLift: 0.15,
  /** [share of the radius, share of the peak]: a soft edge drawn once, no runtime blur. */
  falloff: [
    [0, 1],
    [0.35, 0.8],
    [0.7, 0.3],
    [1, 0],
  ],
  /**
   * Where the text column ends when a card gives no zone of its own, as a share of its width (the
   * shield covers up to there and the discs roam to its right).
   */
  textReach: 0.64,
  /** The traced contours: two greens, at most `maxOpacity` and `width` pt thin. */
  trace: { light: "#7FA347", deep: "#64873A", maxOpacity: 0.34, width: 1 },
  /** Filled progress segments of Accueil's card: the pale forest green, 3:1 in the shielded band. */
  progressDone: "#C8DDA0",
} as const

export type AuroraTone = "moss" | "teal" | "ochre"

/** The lighter heart of a disc. */
export function auroraCore(tone: AuroraTone): string {
  return mixWithWhite(forestAurora[tone].colour, forestAurora.coreLift)
}

/**
 * The shield: the card's darkest green over the aurora and under the text. Each card has a text
 * column on the left (`column`, up to the zone's left edge) and may have a band at the bottom
 * (`band`, from the zone's bottom edge down); both fade into the clear zone over `fade` points, so
 * no text ever sits on a fade. `standard` covers white titles, the pale body and the pale accent
 * (Accueil, Mes Relevés); `score` also covers the sage units and the glass tiles of the survey's
 * score card, which need more.
 */
export const forestShield = {
  colour: forestStops.c,
  fade: { column: 56, band: 28 },
  standard: { column: 0.55, band: 0.55 },
  score: { column: 0.64, band: 0.8 },
} as const

export type ForestShieldKey = "standard" | "score"

export type ShieldLayers = {
  /** Over the text column. */
  column: string
  /** The column's fade into the clear zone, left to right. */
  columnFade: string
  /** Over the bottom band. */
  band: string
  /** The band's fade into the clear zone, top to bottom. */
  bandFade: string
}

export function buildShieldLayers(key: ForestShieldKey): ShieldLayers {
  const { colour } = forestShield
  const { column, band } = forestShield[key]
  const clear = withAlpha(colour, 0)
  return {
    column: withAlpha(colour, column),
    columnFade: buildLinearGradient(90, [
      [withAlpha(colour, column), 0],
      [clear, 100],
    ]),
    band: withAlpha(colour, band),
    bandFade: buildLinearGradient(180, [
      [clear, 0],
      [withAlpha(colour, band), 100],
    ]),
  }
}

export const forestShieldLayers: Record<ForestShieldKey, ShieldLayers> = {
  standard: buildShieldLayers("standard"),
  score: buildShieldLayers("score"),
}
