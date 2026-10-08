// The motion of the forest card's backdrop (12.2-19, owner-tuned in sketch 010 `round4.html`):
// each disc drifts there and back, eased, endlessly, and a dash of light flows along each contour
// line. The few random numbers (legs a few percent apart, where each layer starts) are drawn once
// per mount from a seeded generator; the poses and offsets are worklets on the UI thread.

import { flowMotion, MIST_DISCS, type MistDisc, mistMotion } from "./forest-aurora-shape"

/** A small seeded generator (mulberry32): the same seed gives the same plan. */
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

/** 0 to 1 and back over a phase of period 2, eased in and out: the alternate drift of a disc. */
export function pingPong(phase: number): number {
  "worklet"
  const p = ((phase % 2) + 2) % 2
  const x = p <= 1 ? p : 2 - p
  return x * x * (3 - 2 * x)
}

/** Offset and scale of a disc at `phase`: at rest for 0, at the far end of its drift for 1. */
export function discPose(
  phase: number,
  disc: MistDisc,
): { translateX: number; translateY: number; scale: number } {
  "worklet"
  const k = pingPong(phase)
  return {
    translateX: disc.drift.x * k,
    translateY: disc.drift.y * k,
    scale: 1 + (disc.drift.scale - 1) * k,
  }
}

/** Dash offset of the flowing light at `phase` (0 to 1, it loops): it runs from the line's start. */
export function flowOffset(phase: number): number {
  "worklet"
  const pattern = flowMotion.dash + flowMotion.gap
  return pattern * (1 - (((phase % 1) + 1) % 1))
}

export type MistPlan = {
  /** Per disc: its leg and where on its there-and-back (0 to 2) it starts. */
  discs: { legMs: number; start: number }[]
  /** Per line: its period and where on it (0 to 1) the dash starts. */
  flows: { periodMs: number; start: number }[]
}

export function planMist(seed: number): MistPlan {
  const random = seededRandom(seed)
  const jitter = (value: number) => value * (1 + mistMotion.jitter * (2 * random() - 1))
  return {
    discs: MIST_DISCS.map((disc) => ({ legMs: jitter(disc.legMs), start: 2 * random() })),
    flows: flowMotion.periodsMs.map((periodMs) => ({
      periodMs: jitter(periodMs),
      start: random(),
    })),
  }
}
