// Geometry of the basemap wipe and of the comparison curtain, from the sketch engine
// (`.planning/sketches/themes/map-layers-kit.js`, the reference named by the UI-SPEC; sections 3, 4
// and 5 of the UI-SPEC win where they differ). All x values are in points from the left edge of
// the map. Pure: no import. Every function carries the `"worklet"` directive so the pan handlers
// can call it on the UI thread (a plain string under Jest).
//
// The over-zoom threshold lives in `layer-notices.ts` and the parcel fill factor in
// `parcels-visibility.ts`: not here (one definition of each rule).

/** Where a gesture acts: the whole map, or one side of the comparison line. */
export type SideKey = "full" | "left" | "right"
/** The x range of a side, `[from, to]`. */
export type Bounds = readonly [number, number]
/** The strip of the incoming layer that is shown, `left <= right`. */
export type Strip = { left: number; right: number }

/** The comparison line stays this far from each edge of the map. */
export const LINE_MARGIN = 22
/** Releasing the line closer than this to an edge quits the comparison. */
export const EDGE_EXIT = 40
/** Distance between the line and a side tag (knob radius 22 plus 8). */
export const TAG_GAP = 30
/** Under this width a side tag fades out. */
export const TAG_MIN_WIDTH = 72
// A tag keeps 14 pt of air on its outer edge (engine: `W - S.x - gap - 14`).
const TAG_OUTER_AIR = 14

function clampTo(value: number, from: number, to: number): number {
  "worklet"
  // NaN would poison every layout number: it falls back to the start of the range.
  if (Number.isNaN(value)) return from
  return Math.min(Math.max(value, from), to)
}

/** The x range a gesture acts in: the whole map, or one side of the line at `lineX`. */
export function sideBounds(side: SideKey, lineX: number, width: number): Bounds {
  "worklet"
  if (side === "left") return [0, lineX]
  if (side === "right") return [lineX, width]
  return [0, width]
}

/**
 * The strip of the incoming layer between the finger and the edge it comes from, inside the side:
 * dragging left (`dx` < 0) uncovers it from the right edge, dragging right from the left edge.
 */
export function wipeStrip(bounds: Bounds, dx: number, fingerX: number): Strip {
  "worklet"
  const [from, to] = bounds
  const finger = clampTo(fingerX, from, to)
  return dx < 0 ? { left: finger, right: to } : { left: from, right: finger }
}

/** The share of the side the incoming layer covers, 0 to 1. */
export function revealedFraction(bounds: Bounds, dx: number, fingerX: number): number {
  "worklet"
  const [from, to] = bounds
  const size = to - from
  if (size <= 0 || Number.isNaN(fingerX)) return 0
  const strip = wipeStrip(bounds, dx, fingerX)
  return clampTo((strip.right - strip.left) / size, 0, 1)
}

/** Where the strip ends up after the release: the whole side on commit, nothing on cancel. */
export function settledStrip(bounds: Bounds, dx: number, outcome: "commit" | "cancel"): Strip {
  "worklet"
  const [from, to] = bounds
  if (outcome === "commit") return { left: from, right: to }
  return dx < 0 ? { left: to, right: to } : { left: from, right: from }
}

/** The line position kept 22 pt from each edge; centred on a map too narrow for both margins. */
export function clampLine(x: number, width: number): number {
  "worklet"
  const from = LINE_MARGIN
  const to = width - LINE_MARGIN
  if (to < from || Number.isNaN(x)) return width / 2
  return clampTo(x, from, to)
}

/**
 * What quitting by the edge keeps: a line released within 40 pt of the left edge keeps the right
 * layer B, within 40 pt of the right edge the left layer A, elsewhere nothing (the comparison stays).
 */
export function edgeExitKeeps(x: number, width: number): "A" | "B" | null {
  "worklet"
  if (x < EDGE_EXIT) return "B"
  if (x > width - EDGE_EXIT) return "A"
  return null
}

/** The line position as a percent of the width (the screen reader value), 0 to 100. */
export function linePercent(x: number, width: number): number {
  "worklet"
  if (width <= 0) return 0
  return clampTo((x / width) * 100, 0, 100)
}

/** The clamped line position for a percent of the width. */
export function lineFromPercent(percent: number, width: number): number {
  "worklet"
  return clampLine((clampTo(percent, 0, 100) / 100) * width, width)
}

/** A percent moved by `delta` points, kept within 0 and 100 (the increment and decrement actions). */
export function stepLinePercent(percent: number, delta: number): number {
  "worklet"
  return clampTo(percent + delta, 0, 100)
}

/** The widest a side tag may be: its visible side minus the gap to the line and the outer air. */
export function tagMaxWidth(side: "left" | "right", lineX: number, width: number): number {
  "worklet"
  const visible = side === "left" ? lineX : width - lineX
  return Math.max(visible - TAG_GAP - TAG_OUTER_AIR, 0)
}

/** A tag narrower than 72 pt fades out. */
export function tagVisible(maxWidth: number): boolean {
  "worklet"
  return maxWidth >= TAG_MIN_WIDTH
}
