import { IBP_MAX } from "@cortege/ibp-domain"

// Pure geometry of the parcel history curve (phase 24, D-06 and D-10). No React, no colour, no
// catalogue: the view draws what this module computes. Values come from the UI contract 4b.

export const TREND_HEIGHT = 128
/** Left and right padding: a value label centred on an end point never clips. */
export const TREND_PAD_X = 24
/** Highest y of the plot (room above for the value label). */
export const TREND_PLOT_TOP = 32
/** Lowest y of the plot (room below for the year labels). */
export const TREND_PLOT_BOTTOM = 96
export const TREND_YEAR_BASELINE = 120
/** A value label sits this far above its point. */
export const TREND_VALUE_OFFSET = 12

const MIN_SPAN = 20
const STEP = 5

export type TrendInputPoint = {
  surveyId: string
  total: number
  year: number | null
  isCurrent: boolean
  methodKey: string
}

export type TrendPoint = TrendInputPoint & { x: number; y: number }
export type TrendSegment = { d: string; length: number }
export type TrendLink = { d: string }
export type TrendGeometry = {
  domain: { lo: number; hi: number }
  points: TrendPoint[]
  segments: TrendSegment[]
  links: TrendLink[]
}

/** A total from the wire is untrusted: non-finite becomes 0, the rest is held to 0..50. */
const clampTotal = (value: number): number =>
  Number.isFinite(value) ? Math.min(IBP_MAX.total, Math.max(0, value)) : 0

const round2 = (value: number): number => Math.round(value * 100) / 100

/** The vertical range of the curve: the totals padded by one step, at least 20 wide, within 0..50. */
export function yDomain(totals: readonly number[]): { lo: number; hi: number } {
  if (totals.length === 0) return { lo: 0, hi: IBP_MAX.total }
  const clamped = totals.map(clampTotal)
  let lo = Math.max(0, Math.floor((Math.min(...clamped) - STEP) / STEP) * STEP)
  let hi = Math.min(IBP_MAX.total, Math.ceil((Math.max(...clamped) + STEP) / STEP) * STEP)
  if (hi - lo < MIN_SPAN) {
    hi = Math.min(IBP_MAX.total, hi + (MIN_SPAN - (hi - lo)))
    lo = Math.max(0, lo - (MIN_SPAN - (hi - lo)))
  }
  return { lo, hi }
}

/** Sum of the straight segment lengths (react-native-svg has no `getTotalLength`). */
export function pathLength(points: ReadonlyArray<{ x: number; y: number }>): number {
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    )
  }
  return length
}

const coordinates = (point: { x: number; y: number }): string =>
  `${round2(point.x)} ${round2(point.y)}`

/**
 * Points, solid runs and dashed links of the curve. Points are spread by survey order, not by
 * calendar time. The line is cut at every method change: one solid segment per run of two or more
 * points, and a link from the last point of a run to the first of the next.
 */
export function buildTrend(points: readonly TrendInputPoint[], width: number): TrendGeometry {
  const domain = yDomain(points.map((point) => point.total))
  if (!(width > 0) || points.length === 0) {
    return { domain, points: [], segments: [], links: [] }
  }
  const span = domain.hi - domain.lo
  const plotHeight = TREND_PLOT_BOTTOM - TREND_PLOT_TOP
  const plotWidth = width - 2 * TREND_PAD_X
  const placed: TrendPoint[] = points.map((point, index) => {
    const total = clampTotal(point.total)
    return {
      ...point,
      total,
      x:
        points.length === 1 ? TREND_PAD_X : TREND_PAD_X + (index * plotWidth) / (points.length - 1),
      y: TREND_PLOT_BOTTOM - ((total - domain.lo) / span) * plotHeight,
    }
  })

  const runs: TrendPoint[][] = []
  for (const point of placed) {
    const current = runs[runs.length - 1]
    if (current && current[0].methodKey === point.methodKey) current.push(point)
    else runs.push([point])
  }

  const segments: TrendSegment[] = runs
    .filter((run) => run.length >= 2)
    .map((run) => ({
      d: run.map((point, index) => `${index === 0 ? "M" : "L"} ${coordinates(point)}`).join(" "),
      length: pathLength(run),
    }))
  const links: TrendLink[] = []
  for (let index = 1; index < runs.length; index += 1) {
    const from = runs[index - 1][runs[index - 1].length - 1]
    const to = runs[index][0]
    links.push({ d: `M ${coordinates(from)} L ${coordinates(to)}` })
  }
  return { domain, points: placed, segments, links }
}
