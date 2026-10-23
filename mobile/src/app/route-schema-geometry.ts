import type { RouteMethod } from "@cortege/ibp-domain"

// The three schemas of the parcours (owner request, Phase 30): a parcel seen from above, drawn like
// a cadastral map (an irregular outline, its neighbours, a road), and what the observer does in it.
// Pure geometry in a 300 x 190 box; the screen component draws and animates it. The drawings are
// schematic, not to scale: the sentences next to them carry the figures.

export const SCHEMA_VIEWBOX = { width: 300, height: 190 } as const

export type SchemaPoint = readonly [number, number]
export type Polygon = readonly SchemaPoint[]

/** The parcel: a convex outline, slightly irregular like a cadastral parcel. */
export const PARCEL: Polygon = [
  [38, 34],
  [212, 22],
  [268, 70],
  [256, 152],
  [120, 172],
  [44, 128],
]

/** The land around it, each piece sharing an edge with the parcel, tiling the whole box. */
export const NEIGHBOURS: readonly Polygon[] = [
  [
    [0, 0],
    [236, 0],
    [212, 22],
    [38, 34],
    [0, 38],
  ],
  [
    [236, 0],
    [300, 0],
    [300, 96],
    [268, 70],
    [212, 22],
  ],
  [
    [300, 96],
    [300, 190],
    [262, 190],
    [256, 152],
    [268, 70],
  ],
  [
    [0, 38],
    [38, 34],
    [44, 128],
    [0, 118],
  ],
  [
    [112, 190],
    [0, 190],
    [0, 118],
    [44, 128],
    [120, 172],
  ],
]

/** The road along the south side of the parcel. */
export const ROAD: Polygon = [
  [262, 190],
  [112, 190],
  [120, 172],
  [256, 152],
]

/** The centre line of the road, dashed on the drawing. */
export const ROAD_CENTRE: readonly [SchemaPoint, SchemaPoint] = [
  [116, 181],
  [259, 171],
]

/** The partial parcours by strip: one wide strip across the parcel, between these two heights. */
export const STRIP_ROWS = { top: 78, bottom: 114 } as const

/** The plot: a circle around the middle of the parcel. */
export const PLOT = { cx: 150, cy: 98, radius: 50 } as const

/** Where the full parcours walks: the heights of its regular strips. */
export const FULL_ROWS: readonly number[] = [44, 64, 84, 104, 124, 144]

/** How far the walk stays inside the outline. */
const WALK_INSET = 10

export function pointsAttribute(polygon: Polygon): string {
  return polygon.map(([x, y]) => `${x},${y}`).join(" ")
}

/** The left and right ends of a convex polygon at a height, or null when it does not reach it. */
export function rowSpan(polygon: Polygon, y: number): readonly [number, number] | null {
  const xs: number[] = []
  for (let index = 0; index < polygon.length; index += 1) {
    const [x0, y0] = polygon[index]
    const [x1, y1] = polygon[(index + 1) % polygon.length]
    if ((y0 <= y && y <= y1) || (y1 <= y && y <= y0)) {
      xs.push(y1 === y0 ? Math.min(x0, x1) : x0 + ((x1 - x0) * (y - y0)) / (y1 - y0))
      if (y1 === y0) xs.push(Math.max(x0, x1))
    }
  }
  if (xs.length === 0) return null
  return [Math.min(...xs), Math.max(...xs)]
}

/** Keeps the part of a polygon on one side of a horizontal line (Sutherland-Hodgman, one edge). */
export function clipRows(polygon: Polygon, y: number, keep: "below" | "above"): Polygon {
  const inside = (point: SchemaPoint): boolean => (keep === "below" ? point[1] >= y : point[1] <= y)
  const result: SchemaPoint[] = []
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const previous = polygon[(index + polygon.length - 1) % polygon.length]
    if (inside(current) !== inside(previous)) {
      const share = (y - previous[1]) / (current[1] - previous[1])
      result.push([previous[0] + (current[0] - previous[0]) * share, y])
    }
    if (inside(current)) result.push(current)
  }
  return result
}

/** The strip of the parcours by strip: the parcel cut between two heights. */
export function stripBand(): Polygon {
  return clipRows(clipRows(PARCEL, STRIP_ROWS.top, "below"), STRIP_ROWS.bottom, "above")
}

/** Whether a point is inside a convex polygon, at least `margin` away from its edges. */
export function insideWithMargin(polygon: Polygon, point: SchemaPoint, margin: number): boolean {
  let side = 0
  for (let index = 0; index < polygon.length; index += 1) {
    const [x0, y0] = polygon[index]
    const [x1, y1] = polygon[(index + 1) % polygon.length]
    const length = Math.hypot(x1 - x0, y1 - y0)
    const signed = ((x1 - x0) * (point[1] - y0) - (y1 - y0) * (point[0] - x0)) / length
    if (Math.abs(signed) < margin) return false
    const direction = Math.sign(signed)
    if (side === 0) side = direction
    else if (direction !== side) return false
  }
  return true
}

export type Crown = {
  cx: number
  cy: number
  r: number
  /** 0 to 1: how dark the crown is drawn. */
  tone: number
}

const CROWN_COLUMNS = 16
const CROWN_ROWS = 11

/**
 * The tree crowns that give the parcel its forest look: a jittered grid over the parcel, so the
 * trees spread evenly without lining up, filled from a fixed seed so the picture is the same on
 * every render and every device. A crown is kept only when it lies wholly inside the outline.
 */
export function treeCrowns(): readonly Crown[] {
  let seed = 20261023
  const next = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const xs = PARCEL.map(([x]) => x)
  const ys = PARCEL.map(([, y]) => y)
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  const cellWidth = (Math.max(...xs) - left) / CROWN_COLUMNS
  const cellHeight = (Math.max(...ys) - top) / CROWN_ROWS
  const crowns: Crown[] = []
  for (let row = 0; row < CROWN_ROWS; row += 1) {
    for (let column = 0; column < CROWN_COLUMNS; column += 1) {
      const r = 4.5 + next() * 3.5
      const cx = left + (column + 0.25 + next() * 0.5) * cellWidth
      const cy = top + (row + 0.25 + next() * 0.5) * cellHeight
      const tone = next()
      if (insideWithMargin(PARCEL, [cx, cy], r + 2)) crowns.push({ cx, cy, r, tone })
    }
  }
  return crowns
}

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

/** The walk of the full parcours: regular strips back and forth over the whole parcel. */
export function fullWalkPoints(): readonly SchemaPoint[] {
  const points: SchemaPoint[] = []
  FULL_ROWS.forEach((y, index) => {
    const span = rowSpan(PARCEL, y)
    if (span === null) return
    const left: SchemaPoint = [span[0] + WALK_INSET, y]
    const right: SchemaPoint = [span[1] - WALK_INSET, y]
    points.push(...(index % 2 === 0 ? [left, right] : [right, left]))
  })
  return points
}

/** The walk of the partial parcours by strip: along the middle of the strip, end to end. */
export function stripWalkPoints(): readonly SchemaPoint[] {
  const y = (STRIP_ROWS.top + STRIP_ROWS.bottom) / 2
  const span = rowSpan(PARCEL, y)
  if (span === null) return []
  return [
    [span[0] + WALK_INSET, y],
    [span[1] - WALK_INSET, y],
  ]
}

export function walkFor(method: RouteMethod): Walk | null {
  if (method === "full") return measureWalk(fullWalkPoints())
  if (method === "partial_strip") return measureWalk(stripWalkPoints())
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
