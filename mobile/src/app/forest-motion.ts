// The motion of the forest card's backdrop (12.2-19 fifth round, owner: "elle se lance une fois et
// après elle s'arrête ... elle devrait se jouer un peu en continu en mode random"). Plans are drawn
// once per mount, on the JS thread, from a small seeded generator; the poses and offsets are
// worklets that only read them, so nothing runs on the JS thread per frame. Each plan loops
// seamlessly, the aurora's after 63 to 68 s per disc and the contours' after at least 72 s.

import { type AuroraDisc, auroraRoam, TRACE_PATHS, traceMotion } from "./forest-aurora-shape"

/** A small seeded generator (mulberry32): the same seed gives the same plans. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function between(random: () => number, [from, to]: readonly [number, number]): number {
  return from + (to - from) * random()
}

export type DiscPlan = {
  /** Waypoints: across and down the clear zone (shares), scale and opacity (share of the peak). */
  across: number[]
  down: number[]
  scale: number[]
  alpha: number[]
  /** The waypoint it blooms at (its rightmost) and the half width of the bloom, in legs. */
  bloomAt: number
  bloomHalf: number
  /** Where on its path it starts, 0 to 1. */
  start: number
}

export function planDisc(disc: AuroraDisc, random: () => number): DiscPlan {
  const across: number[] = []
  const down: number[] = []
  const scale: number[] = []
  const alpha: number[] = []
  for (let i = 0; i < disc.legs; i += 1) {
    across.push(between(random, auroraRoam.across))
    down.push(between(random, disc.rows))
    scale.push(between(random, auroraRoam.scale))
    alpha.push(between(random, auroraRoam.alpha))
  }
  const bloomAt = across.indexOf(Math.max(...across))
  return {
    across,
    down,
    scale,
    alpha,
    bloomAt,
    bloomHalf: auroraRoam.bloomMs / 2 / disc.legMs,
    start: random(),
  }
}

function smooth(x: number): number {
  "worklet"
  return x * x * (3 - 2 * x)
}

/** A closed Catmull-Rom curve through `points`: leg `i`, `t` from 0 to 1, never stopping. */
export function closedSpline(points: number[], i: number, t: number): number {
  "worklet"
  const n = points.length
  const p0 = points[(i - 1 + n) % n]
  const p1 = points[i % n]
  const p2 = points[(i + 1) % n]
  const p3 = points[(i + 2) % n]
  const t2 = t * t
  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (3 * p1 - p0 - 3 * p2 + p3) * t2 * t)
  )
}

/** 0 away from the bloom, 1 at its top: `at` legs along a path of `n`, eased in and out. */
export function bloomAmount(at: number, plan: DiscPlan, n: number): number {
  "worklet"
  const gap = Math.abs(at - plan.bloomAt)
  const distance = Math.min(gap, n - gap)
  return smooth(Math.max(0, 1 - distance / plan.bloomHalf))
}

export type DiscPose = { across: number; down: number; scale: number; alpha: number }

/** Where a disc is at `phase` (0 to 1 along its path; any real number, it loops). */
export function discPoseAt(phase: number, plan: DiscPlan): DiscPose {
  "worklet"
  const n = plan.across.length
  const at = (((phase % 1) + 1) % 1) * n
  const leg = Math.min(n - 1, Math.floor(at))
  const t = at - leg
  const bloom = bloomAmount(at, plan, n)
  const alpha = Math.min(1, Math.max(0, closedSpline(plan.alpha, leg, t)))
  return {
    across: closedSpline(plan.across, leg, t),
    down: closedSpline(plan.down, leg, t),
    scale: Math.max(0.5, closedSpline(plan.scale, leg, t)) * (1 + auroraRoam.bloomScale * bloom),
    alpha: alpha + (1 - alpha) * bloom,
  }
}

export type TraceLinePlan = {
  /** 1 when the line is drawn at the start (and the end) of the loop. */
  initial: number
  /** Its strokes, in order: start, duration and kind (1 draws it, 0 erases it from its start). */
  starts: number[]
  durations: number[]
  kinds: number[]
}

export type TracePlan = { loopMs: number; lines: TraceLinePlan[]; start: number }

/**
 * The contours' relay: one stroke after another, each line in turn drawing itself or erasing
 * itself, the next stroke always starting before the current one ends, so a line is always moving.
 * An erase never leaves the card without a drawn or drawing line, the relay leans towards erasing
 * when three are drawn and towards drawing when one is. After `loopMs` it steers back to the lines
 * it started with, so it loops without a jump.
 */
export function planTrace(random: () => number, lineCount = TRACE_PATHS.length): TracePlan {
  const goal = Array.from({ length: lineCount }, (_, i) => traceMotion.initialDrawn[i % 4])
  const drawn = [...goal]
  const busyUntil = Array.from({ length: lineCount }, () => 0)
  const lines: TraceLinePlan[] = goal.map((on) => ({
    initial: on ? 1 : 0,
    starts: [],
    durations: [],
    kinds: [],
  }))
  let t = 0
  let end = 0
  for (let guard = 0; guard < 1000; guard += 1) {
    const steering = t >= traceMotion.loopMs
    const idle = lines.map((_, i) => i).filter((i) => busyUntil[i] <= t)
    if (steering && drawn.every((on, i) => on === goal[i])) break
    const lit = drawn.filter(Boolean).length
    let options = idle.filter((i) => (steering ? drawn[i] !== goal[i] : true))
    options = options.filter((i) => !drawn[i] || lit > 1)
    const lean = steering || lit <= 1 ? false : lit >= 3 ? true : null
    const preferred = lean === null ? options : options.filter((i) => drawn[i] === lean)
    if (preferred.length > 0) options = preferred
    if (options.length === 0) {
      // Every candidate is busy: wait for the first stroke to end (it moves until then). One is
      // always busy here (an idle candidate is always allowed to move), and the guard bounds it.
      t = Math.min(...busyUntil.filter((until) => until > t))
      continue
    }
    const line = options[Math.min(options.length - 1, Math.floor(random() * options.length))]
    const kind = drawn[line] ? 0 : 1
    const duration = between(random, kind ? traceMotion.drawMs : traceMotion.eraseMs)
    lines[line].starts.push(t)
    lines[line].durations.push(duration)
    lines[line].kinds.push(kind)
    drawn[line] = kind === 1
    busyUntil[line] = t + duration
    end = Math.max(end, t + duration)
    t += duration * between(random, traceMotion.overlap)
  }
  return { loopMs: end, lines, start: random() }
}

/**
 * Dash offset of a line `t` ms into the loop: `dash` hides it, 0 shows it whole, minus `dash`
 * hides it again (erased from its start, the gap running after the stroke).
 */
export function traceLineOffset(t: number, line: TraceLinePlan): number {
  "worklet"
  const { dash } = traceMotion
  let offset = line.initial === 1 ? 0 : dash
  for (let k = 0; k < line.starts.length; k += 1) {
    if (line.starts[k] > t) break
    const done = Math.min(1, (t - line.starts[k]) / line.durations[k])
    offset = line.kinds[k] === 1 ? dash * (1 - smooth(done)) : -dash * smooth(done)
  }
  return offset
}

/** How much of a line shows at a dash offset, 0 to 1. */
export function visibleShare(offset: number): number {
  return 1 - Math.min(1, Math.abs(offset) / traceMotion.dash)
}

export type AuroraPlan = { discs: DiscPlan[]; trace: TracePlan }

export function planAurora(seed: number, discs: readonly AuroraDisc[]): AuroraPlan {
  const random = seededRandom(seed)
  return { discs: discs.map((disc) => planDisc(disc, random)), trace: planTrace(random) }
}
