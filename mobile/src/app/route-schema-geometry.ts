import type { RouteMethod } from "@cortege/ibp-domain"

// The three schemas of the parcours (owner request, Phase 30): a stand seen from above and what the
// observer does in it. Pure geometry in a 300 x 190 box; the screen component draws and animates it.
// The drawings are schematic, not to scale: the sentences next to them carry the figures.

export const SCHEMA_VIEWBOX = { width: 300, height: 190 } as const

export const SCHEMA_STAND = { x: 30, y: 20, width: 240, height: 150, radius: 10 } as const

export type SchemaPoint = readonly [number, number]

/** The walk of the full parcours: regular strips back and forth over the whole stand. */
export const FULL_WALK: readonly SchemaPoint[] = [
  [48, 38],
  [252, 38],
  [252, 62],
  [48, 62],
  [48, 86],
  [252, 86],
  [252, 110],
  [48, 110],
  [48, 134],
  [252, 134],
  [252, 158],
  [48, 158],
]

/** The walk of the partial parcours by strip: the length of one wide strip. */
export const STRIP_WALK: readonly SchemaPoint[] = [
  [44, 91],
  [256, 91],
]

/** The strip itself, 46 units wide in the 150 high stand (the real width is 20 to 50 m). */
export const STRIP_BAND = { x: 30, y: 68, width: 240, height: 46 } as const

/** The plot: a circle at the centre of the stand. */
export const PLOT = { cx: 150, cy: 95, radius: 52 } as const

export type Walk = {
  points: readonly SchemaPoint[]
  /** Total length of the polyline. */
  length: number
  /** Share of the length reached at each point, from 0 to 1. */
  shares: number[]
  xs: number[]
  ys: number[]
  /** The SVG path of the polyline. */
  path: string
}

/** Measures a polyline: its length, the share reached at each corner and its SVG path. */
export function measureWalk(points: readonly SchemaPoint[]): Walk {
  let length = 0
  const distances = [0]
  for (let index = 1; index < points.length; index += 1) {
    const [x0, y0] = points[index - 1]
    const [x1, y1] = points[index]
    length += Math.hypot(x1 - x0, y1 - y0)
    distances.push(length)
  }
  return {
    points,
    length,
    shares: distances.map((distance) => (length === 0 ? 0 : distance / length)),
    xs: points.map(([x]) => x),
    ys: points.map(([, y]) => y),
    path: points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" "),
  }
}

export function walkFor(method: RouteMethod): Walk | null {
  if (method === "full") return measureWalk(FULL_WALK)
  if (method === "partial_strip") return measureWalk(STRIP_WALK)
  return null
}

/** The position along a walk at a share of its length, 0 to 1 (the dot of the animation). */
export function pointAlong(walk: Walk, share: number): SchemaPoint {
  const clamped = Math.min(1, Math.max(0, share))
  for (let index = 1; index < walk.shares.length; index += 1) {
    if (clamped <= walk.shares[index]) {
      const from = walk.shares[index - 1]
      const span = walk.shares[index] - from
      const local = span === 0 ? 0 : (clamped - from) / span
      const [x0, y0] = walk.points[index - 1]
      const [x1, y1] = walk.points[index]
      return [x0 + (x1 - x0) * local, y0 + (y1 - y0) * local]
    }
  }
  return walk.points[walk.points.length - 1]
}
