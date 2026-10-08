// Geometry and timing of the forest card's backdrop (12.2-19), as the owner validated it in sketch
// 010 `round5.html` (owner: "c'est parfait, je veux exactement ça"): the mist "spd=2 fogA=1.6
// size=0.7" and diagonal S curves over the whole card with a dash of light ("flowSpd=1
// flowA=1"). The colours live in `forest-aurora-tokens.ts`. Lengths are points in the card's space.

import {
  type AuroraTone,
  forestAurora,
  forestShield,
  type ForestShieldKey,
} from "./forest-aurora-tokens"

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
 * The three discs of the sketch's mist: moss from the top left drifting right and down, teal from
 * the right drifting left and down, ochre from below drifting right and up. Legs of 14, 18 and 23
 * s divided by the owner's speed.
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
  /** Each leg is drawn per mount within this share of its value, so the discs never fall in step. */
  jitter: 0.06,
  /** The mist fades in once the card is measured, so it never pops in. */
  revealMs: 700,
} as const

/** The owner's "Vitesse des courbes" (flowSpd). */
const FLOW_SPEED = 1

/**
 * The four contour lines of `round5.html`: S curves rising from the bottom left to the top right,
 * spread over the card. Each is a start point and two cubic segments (the sketch's `S` written
 * out), x in the sketch's 340 pt wide card, y as a share of the card's height.
 */
export const FLOW_PATHS: readonly (readonly number[])[] = [
  [-10, 0.55, 60, 0.5, 90, 0.62, 150, 0.3, 210, -0.02, 270, 0.05, 350, -0.05],
  [-10, 0.95, 70, 0.85, 110, 0.95, 180, 0.62, 250, 0.29, 290, 0.3, 350, 0.12],
  [30, 1.05, 110, 1, 160, 1.08, 230, 0.82, 300, 0.56, 310, 0.58, 350, 0.48],
  [-10, 0.22, 40, 0.2, 70, 0.28, 120, 0.08, 170, -0.12, 200, -0.06, 240, -0.1],
]

export const flowMotion = {
  /** The sketch's card: 340 pt wide, its hero 158 pt tall. */
  sketchWidth: 340,
  sketchHeight: 158,
  /** The dash of light and the gap after it (the sketch's `26 300`), in points. */
  dash: 26,
  gap: 300,
  /** One pass of each line's light (7, 10, 13 and 10 s), each 2.3 s ahead of the one before. */
  periodsMs: [7000 / FLOW_SPEED, 10000 / FLOW_SPEED, 13000 / FLOW_SPEED, 10000 / FLOW_SPEED],
  staggerMs: 2300,
} as const

export type Box = { width: number; height: number }

export type LaidLine = {
  /** Start, then the controls and ends of its two cubic segments, in the card's points. */
  points: number[]
  d: string
}

/**
 * The lines laid on a card in points, so the dash stays 26 pt. Across, the sketch's 340 pt are the
 * card's width. Down, the shares apply to the card's height, but never to less than the sketch
 * hero's proportion (158 over 340), centred: on a short card the curves keep the slope the owner
 * saw instead of flattening, and run past its top and bottom.
 */
export function layLines(box: Box): LaidLine[] {
  const { sketchWidth, sketchHeight } = flowMotion
  const across = box.width / sketchWidth
  const tall = Math.max(box.height, (box.width * sketchHeight) / sketchWidth)
  const fixed = (value: number) => Math.round(value * 10) / 10
  return FLOW_PATHS.map((shares) => {
    const points = shares.map((value, index) =>
      index % 2 === 0 ? value * across : box.height / 2 + (value - 0.5) * tall,
    )
    let d = `M${fixed(points[0])} ${fixed(points[1])}`
    for (let i = 2; i < points.length; i += 2) {
      d += `${(i - 2) % 6 === 0 ? " C" : ""} ${fixed(points[i])} ${fixed(points[i + 1])}`
    }
    return { points, d }
  })
}

/**
 * A block of text on a card (its rectangle in the card's space), measured by the card; `tone`
 * overrides the card's shield for it (`graphic` for a graphic such as the progress segments).
 */
export type ForestTextBlock = {
  x: number
  y: number
  width: number
  height: number
  tone?: ForestShieldKey
}

/** Without blocks from the card: its text is taken to fill the left `textReach` of it. */
export function defaultBlocks(box: Box): ForestTextBlock[] {
  return [{ x: 0, y: 0, width: box.width * forestAurora.textReach, height: box.height }]
}

/**
 * The soft ellipse of shield a text block gets: the ellipse through the block's corners (radii its
 * sides over root 2), scaled so its feather is `forestShield.feather` points on its short side.
 * `inner` is the share of the radius at the corners: inside it lies the whole block.
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
