// Geometry and timing of the forest card's backdrop (12.2-19), from the owner's live tuning in
// sketch 010 `round4.html` ("spd=2 fogA=1.6 size=0.7 flowSpd=1 flowA=1"), spread over the whole
// card (owner: "pourquoi l'animation est limitée en haut à droite"). The colours live in
// `forest-aurora-tokens.ts`. Lengths are points in the card's space; positions given as shares
// are shares of the card's width and height.

import { type AuroraTone, forestAurora, forestShield } from "./forest-aurora-tokens"

/** The owner's "Vitesse de la brume" (spd) and "Taille des nappes" (size). */
const MIST_SPEED = 2
const MIST_SIZE = 0.7

export type Point = readonly [x: number, y: number]

export type MistDisc = {
  key: AuroraTone
  /** Diameter of the disc (the sketch's 420 times the owner's size). */
  size: number
  /** Where its centre rests and where it drifts to, as shares of the card: across the card. */
  from: Point
  to: Point
  /** Its scale at the far end of the drift. */
  scale: number
  /** One way of the drift; it then comes back, eased in and out, endlessly. */
  legMs: number
}

/**
 * The three discs, crossing the whole card: moss from the top left to the bottom right, teal from
 * the top right to the bottom left, ochre from below the middle to the top right. The sketch's
 * scales and legs of 14, 18 and 23 s divided by the owner's speed.
 */
export const MIST_DISCS: readonly MistDisc[] = [
  {
    key: "moss",
    size: 420 * MIST_SIZE,
    from: [0.1, 0.15],
    to: [0.75, 0.95],
    scale: 1.2,
    legMs: 14000 / MIST_SPEED,
  },
  {
    key: "teal",
    size: 420 * MIST_SIZE,
    from: [0.95, 0.2],
    to: [0.15, 0.85],
    scale: 0.85,
    legMs: 18000 / MIST_SPEED,
  },
  {
    key: "ochre",
    size: 420 * MIST_SIZE,
    from: [0.35, 1.05],
    to: [0.9, 0],
    scale: 1.25,
    legMs: 23000 / MIST_SPEED,
  },
]

export const mistMotion = {
  /** Each leg and each flow period is drawn per mount within this share of its value. */
  jitter: 0.06,
  /** The mist fades in once the card is measured, so it never pops in. */
  revealMs: 700,
} as const

/**
 * Three contour lines across the whole card, top, middle and bottom, as shares of the card:
 * a start point then cubic segments (three points each). They run a little past both edges.
 */
export const FLOW_LINES: readonly (readonly number[])[] = [
  [-0.02, 0.22, 0.2, 0.02, 0.38, 0.42, 0.58, 0.28, 0.78, 0.14, 0.9, 0.34, 1.02, 0.18],
  [-0.02, 0.6, 0.22, 0.42, 0.4, 0.78, 0.62, 0.56, 0.8, 0.38, 0.92, 0.62, 1.02, 0.5],
  [-0.02, 0.92, 0.18, 0.74, 0.42, 1.02, 0.6, 0.84, 0.78, 0.68, 0.9, 0.9, 1.02, 0.8],
]

/** The owner's "Vitesse des courbes" (flowSpd). */
const FLOW_SPEED = 1

export const flowMotion = {
  /** The dash of light; after each pass it waits `rest` points of travel before the next. */
  dash: 20,
  rest: 40,
  /** One pass of the dash along each line, linear and endless (7, 10 and 13 s in the sketch). */
  periodsMs: [7000 / FLOW_SPEED, 10000 / FLOW_SPEED, 13000 / FLOW_SPEED],
} as const

export type Box = { width: number; height: number }

/** A line laid on a card: its path and the length of its dash pattern (longer than the line). */
export function layLine(points: readonly number[], box: Box): { d: string; pattern: number } {
  const xy = (i: number) => [points[i] * box.width, points[i + 1] * box.height] as const
  const fixed = (value: number) => Math.round(value * 10) / 10
  let d = `M${fixed(xy(0)[0])} ${fixed(xy(0)[1])}`
  let polygon = 0
  for (let i = 2; i < points.length; i += 2) {
    const [x, y] = xy(i)
    const [px, py] = xy(i - 2)
    polygon += Math.hypot(x - px, y - py)
    d += `${(i - 2) % 6 === 0 ? " C" : ""} ${fixed(x)} ${fixed(y)}`
  }
  // The control polygon bounds a cubic's length, so the dash always leaves the line.
  return { d, pattern: Math.ceil(polygon) + flowMotion.dash + flowMotion.rest }
}

/** A block of text on a card (its rectangle in the card's space), measured by the card. */
export type ForestTextBlock = { x: number; y: number; width: number; height: number }

/** Without blocks from the card: its text is taken to fill the left `textReach` of it. */
export function defaultBlocks(box: Box): ForestTextBlock[] {
  return [{ x: 0, y: 0, width: box.width * forestAurora.textReach, height: box.height }]
}

/**
 * The soft ellipse a text block gets in the shield and in the lines' mask: the ellipse through
 * the block's corners (radii its sides over root 2), scaled by `scale` so its feather is at least
 * `forestShield.feather` points in both directions. `inner` is the share of the radius at the
 * corners: inside it lies the whole block.
 */
export function textEllipse(block: ForestTextBlock) {
  const rx = block.width / Math.SQRT2
  const ry = block.height / Math.SQRT2
  const scale = 1 + forestShield.feather / Math.max(1, Math.min(rx, ry))
  return {
    cx: block.x + block.width / 2,
    cy: block.y + block.height / 2,
    rx: rx * scale,
    ry: ry * scale,
    inner: 1 / scale,
  }
}
