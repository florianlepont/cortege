// Geometry and timing of the forest card's backdrop (12.2-19 fourth and fifth rounds, sketch 010,
// A + F). The colours live in `forest-aurora-tokens.ts`, the motion in `forest-motion.ts`. Lengths
// are points in the card's space.

import { type AuroraTone, forestAurora } from "./forest-aurora-tokens"

export type AuroraDisc = {
  key: AuroraTone
  /** Diameter of the disc (about 1.3 times the fourth round's, owner: too faint to notice). */
  size: number
  /** One leg of its path, from a waypoint to the next. */
  legMs: number
  /** Waypoints of its path: legs of 9, 13 and 17 s, so each path takes over a minute. */
  legs: number
  /**
   * The rows of the clear zone its centre roams, as shares of the zone's height (0 its top, 1 its
   * bottom; beyond, it overflows the card and the card clips it).
   */
  rows: readonly [number, number]
}

/**
 * The three discs: moss in the upper half, teal in the lower half, the warm ochre anywhere. Their
 * paths take 63, 65 and 68 s, so the three never line up the same way twice in many minutes.
 */
export const AURORA_DISCS: readonly AuroraDisc[] = [
  { key: "moss", size: 312, legMs: 9000, legs: 7, rows: [-0.25, 0.6] },
  { key: "teal", size: 286, legMs: 13000, legs: 5, rows: [0.4, 1.25] },
  { key: "ochre", size: 220, legMs: 17000, legs: 4, rows: [-0.2, 1.1] },
]

/** What a waypoint can be, each drawn at random per mount. */
export const auroraRoam = {
  /**
   * Across the clear zone, as a share of its width (0 its left edge, the text's end; 1 the card's
   * right edge): the centres stay in the right part, the text column only gets their soft rims.
   */
  across: [0.15, 1.05],
  scale: [0.85, 1.2],
  /** The disc's opacity as a share of its peak: it breathes between waypoints. */
  alpha: [0.6, 0.92],
  /** Once per path, at its rightmost waypoint, the disc blooms to its full peak for about 2 s. */
  bloomMs: 2000,
  bloomScale: 0.12,
  /** The aurora fades in once its zone is known, so it never pops in. */
  revealMs: 700,
} as const

/** The traced contours (sketch F), drawn bottom-left aligned in the card's clear zone. */
export const TRACE_VIEWBOX = { width: 200, height: 150 } as const

/** Four lines, cubic segments only, so their control polygons bound their lengths (tested). */
export const TRACE_PATHS: readonly string[] = [
  "M20 140 C60 110 90 120 120 80 C150 40 170 40 200 30",
  "M0 120 C50 95 80 100 110 62 C140 24 160 24 200 12",
  "M40 150 C80 128 110 138 140 100 C170 62 185 62 200 52",
  "M60 150 C100 140 130 150 160 118 C190 86 190 90 200 80",
]

export const traceMotion = {
  /** Dash and gap of each line, longer than any of them: an offset of `dash` hides it whole. */
  dash: 260,
  /** Share of the viewBox's width over which a line fades in from the left. */
  fadeEnd: 0.45,
  /** A line draws itself, and later erases itself from its start, in a time drawn from these. */
  drawMs: [2200, 3200],
  eraseMs: [1800, 2600],
  /**
   * The next stroke starts this far into the current one (share of its duration), so a line is
   * always moving; the holds between a line's strokes come out of that relay.
   */
  overlap: [0.35, 0.85],
  /** Lines drawn when the relay starts, and again when it loops. */
  initialDrawn: [true, false, true, false],
  /** The relay runs at least this long before it steers back to its start and loops. */
  loopMs: 72000,
} as const

/**
 * The card's clear zone, in the card's space: right of `left` (where its text column ends) and
 * above `bottom` (where a band of text starts, if any). The discs roam it and the contours are
 * drawn in it; the shield covers everything left of it and below it.
 */
export type AuroraZone = { left: number; bottom?: number }

export type Box = { width: number; height: number }
/** The zone resolved against the card's size: `right` and `height` are the card's. */
export type ClearZone = { left: number; bottom: number; right: number; height: number }

export function resolveZone(box: Box, zone: AuroraZone | undefined): ClearZone {
  const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))
  return {
    left: clamp(zone?.left ?? box.width * forestAurora.textReach, box.width),
    bottom: clamp(zone?.bottom ?? box.height, box.height),
    right: box.width,
    height: box.height,
  }
}
