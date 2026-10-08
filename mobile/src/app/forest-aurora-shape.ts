// Geometry and timing of the forest card's backdrop (12.2-19), from the owner's live tuning in
// sketch 010 `round4.html` ("spd=2 fogA=1.6 size=0.7 flowSpd=1 flowA=1"). The colours live in
// `forest-aurora-tokens.ts`. Lengths are points in the card's space.

import { type AuroraTone, forestAurora } from "./forest-aurora-tokens"

/** The owner's "Vitesse de la brume" (spd) and "Taille des nappes" (size). */
const MIST_SPEED = 2
const MIST_SIZE = 0.7

export type MistDisc = {
  key: AuroraTone
  /** Diameter of the disc (the sketch's 420 times the owner's size). */
  size: number
  /** Where it rests, from the card's edges (it overflows them and the card clips it). */
  anchor: { left?: number; right?: number; top?: number; bottom?: number }
  /** How far it drifts from its rest, and its scale at the far end. */
  drift: { x: number; y: number; scale: number }
  /** One way of the drift; it then comes back, eased in and out, endlessly. */
  legMs: number
}

/**
 * The three discs of the sketch's `.live` mist: moss from the top left drifting right and down,
 * teal from the right drifting left and down, ochre from below drifting right and up. Legs of 14,
 * 18 and 23 s divided by the owner's speed.
 */
export const MIST_DISCS: readonly MistDisc[] = [
  {
    key: "moss",
    size: 420 * MIST_SIZE,
    anchor: { left: -60, top: -120 },
    drift: { x: 210, y: 110, scale: 1.2 },
    legMs: 14000 / MIST_SPEED,
  },
  {
    key: "teal",
    size: 420 * MIST_SIZE,
    anchor: { right: -120, top: -40 },
    drift: { x: -210, y: 90, scale: 0.85 },
    legMs: 18000 / MIST_SPEED,
  },
  {
    key: "ochre",
    size: 420 * MIST_SIZE,
    anchor: { left: 60, bottom: -220 },
    drift: { x: 230, y: -110, scale: 1.25 },
    legMs: 23000 / MIST_SPEED,
  },
]

export const mistMotion = {
  /** Each leg and each flow period is drawn per mount within this share of its value, so the layers never fall into step. */
  jitter: 0.06,
  /** The mist fades in once its zone is known, so it never pops in. */
  revealMs: 700,
} as const

/** The contour lines, drawn bottom-left aligned in the card's clear zone. */
export const FLOW_VIEWBOX = { width: 200, height: 150 } as const

/** Three lines, cubic segments only, so their control polygons bound their lengths (tested). */
export const FLOW_PATHS: readonly string[] = [
  "M20 140 C60 110 90 120 120 80 C150 40 170 40 200 30",
  "M0 120 C50 95 80 100 110 62 C140 24 160 24 200 12",
  "M40 150 C80 128 110 138 140 100 C170 62 185 62 200 52",
]

/** The owner's "Vitesse des courbes" (flowSpd). */
const FLOW_SPEED = 1

export const flowMotion = {
  /** The dash of light and the gap after it (`dash + gap` is longer than any line). */
  dash: 20,
  gap: 260,
  /** One pass of the dash along each line, linear and endless (7, 10 and 13 s in the sketch). */
  periodsMs: [7000 / FLOW_SPEED, 10000 / FLOW_SPEED, 13000 / FLOW_SPEED],
} as const

/**
 * The card's clear zone, in the card's space: right of `left` (where its text column ends) and
 * above `bottom` (where a band of text starts, if any). The lines are drawn in it; the shield
 * darkens, in gradients only, what is left of it and below it.
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
