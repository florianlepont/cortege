// The decisions of the basemap swipe mode and of the comparison, as pure functions with the numbers
// of the sketch engine (`.planning/sketches/themes/map-layers-kit.js`, "moteur balayage"). The UI
// renders and animates what these decide; instant results under Reduce Motion are the UI's job.
// Where the UI-SPEC and the engine differ the UI-SPEC wins (it names the engine as the reference
// for numbers only): below 0.2 of a full-width wipe no hint is shown, because a release cancels.
//
// A gesture is a plain object the pan handler keeps (a shared value on the UI thread) and replaces
// on every move; nothing here keeps state. Every function carries the `"worklet"` directive.
// No React, no i18n: hints are keys, the screens turn them into text.

import { neighbourLayer } from "./layer-cycle"
import type { BaseLayerKey } from "./layers"
import { revealedFraction, sideBounds, sideOf } from "./wipe-geometry"
import type { SideKey } from "./wipe-geometry"

// One definition each, in wipe-geometry.ts; this module exports the whole UI-SPEC list.
export { EDGE_EXIT, LINE_MARGIN } from "./wipe-geometry"

/** A touch becomes a wipe after this much horizontal movement (pt); under it, a tap candidate. */
export const SWIPE_SLOP = 6
/** A full-width release from this revealed fraction creates a comparison. */
export const COMPARE_MIN = 0.2
/** A full-width release above this revealed fraction commits (0.8 itself still compares). */
export const COMPARE_MAX = 0.8
/**
 * A side wipe, or a full wipe when the comparison is not built, commits above this fraction. The
 * UI-SPEC says "one third"; the engine uses 0.33 and wins.
 */
export const SIDE_COMMIT = 0.33
/** The swipe mode quits after this long without a gesture or an action (ms). */
export const IDLE_MS = 8000
/** The entry hint stays visible this long before it fades (ms). */
export const HINT_MS = 3000
/** Duration of the commit and the spring-back (ms, `brandMotion.durations.base`). */
export const SETTLE_MS = 240

export type WipeGesture = {
  /** Where the gesture acts, decided by the first touch. */
  side: SideKey
  x0: number
  y0: number
  /** True once the movement passed the slop and an incoming layer exists. */
  started: boolean
  /** True when the movement passed the slop and no other layer is available. */
  blocked: boolean
  dx: number
  dy: number
  fingerX: number
  incoming: BaseLayerKey | null
  /** The revealed fraction of the gesture's side, 0 to 1. */
  rev: number
}

export type MoveContext = {
  width: number
  /** The comparison line, null without a comparison. */
  lineX: number | null
  /** The layer shown on a side (the base for "full"). */
  layerOf: (side: SideKey) => BaseLayerKey
  /** The layer shown on the other side of the comparison, null for "full". */
  otherOf: (side: SideKey) => BaseLayerKey | null
  isAvailable: (key: BaseLayerKey) => boolean
}

export type LiveHint = "compare" | "change" | "none-available"
export type ReleaseOutcome = "tap" | "none" | "cancel" | "compare" | "commit"
export type ReleaseResult = {
  outcome: ReleaseOutcome
  incoming: BaseLayerKey | null
  side: SideKey
  /** The finger x at the release: the comparison line starts there (the UI clamps it). */
  releaseX: number
}

/** A gesture starts at the first touch: on a side of the line when there is one, else full width. */
export function beginGesture(touch: { x: number; y: number; lineX: number | null }): WipeGesture {
  "worklet"
  return {
    side: touch.lineX === null ? "full" : sideOf(touch.x, touch.lineX),
    x0: touch.x,
    y0: touch.y,
    started: false,
    blocked: false,
    dx: 0,
    dy: 0,
    fingerX: touch.x,
    incoming: null,
    rev: 0,
  }
}

/**
 * The gesture after the finger moved to `point`. Past the slop it starts with the incoming layer
 * (next when dragging left, previous when dragging right, skipping unavailable layers and the other
 * side's layer); when no layer qualifies it is blocked and never starts.
 */
export function moveGesture(
  gesture: WipeGesture,
  point: { x: number; y: number },
  context: MoveContext,
): WipeGesture {
  "worklet"
  const dx = point.x - gesture.x0
  const dy = point.y - gesture.y0
  const moved = { ...gesture, dx, dy, fingerX: point.x }
  if (gesture.blocked) return moved
  if (!gesture.started && Math.abs(dx) < SWIPE_SLOP) return moved
  const incoming = neighbourLayer(context.layerOf(gesture.side), dx < 0 ? 1 : -1, {
    isAvailable: context.isAvailable,
    exclude: context.otherOf(gesture.side) ?? undefined,
  })
  if (incoming === null) return { ...moved, blocked: true, started: false, incoming: null }
  const bounds = sideBounds(gesture.side, context.lineX ?? 0, context.width)
  return { ...moved, started: true, incoming, rev: revealedFraction(bounds, dx, point.x) }
}

/**
 * The hint to show while the finger is down, null for none. A full-width wipe says nothing below
 * the point where a release would cancel (UI-SPEC open item 1); a side wipe always says "change".
 */
export function liveHint(gesture: WipeGesture, comparisonAllowed: boolean): LiveHint | null {
  "worklet"
  if (gesture.blocked) return "none-available"
  if (!gesture.started) return null
  if (gesture.side !== "full") return "change"
  if (!comparisonAllowed) return gesture.rev > SIDE_COMMIT ? "change" : null
  if (gesture.rev < COMPARE_MIN) return null
  return gesture.rev <= COMPARE_MAX ? "compare" : "change"
}

/**
 * What the release does. A gesture that never started is a tap (under 6 pt in both axes) or nothing.
 * A full-width wipe cancels under 0.2, compares from 0.2 to 0.8 inclusive and commits above 0.8
 * (when the comparison is not built: commits above 0.33). A side wipe commits above 0.33.
 */
export function releaseGesture(gesture: WipeGesture, comparisonAllowed: boolean): ReleaseResult {
  "worklet"
  const result = (outcome: ReleaseOutcome): ReleaseResult => ({
    outcome,
    incoming: gesture.incoming,
    side: gesture.side,
    releaseX: gesture.fingerX,
  })
  if (!gesture.started) {
    const tap = !gesture.blocked && Math.abs(gesture.dx) < SWIPE_SLOP
    return result(tap && Math.abs(gesture.dy) < SWIPE_SLOP ? "tap" : "none")
  }
  if (gesture.side === "full" && comparisonAllowed) {
    if (gesture.rev < COMPARE_MIN) return result("cancel")
    return result(gesture.rev <= COMPARE_MAX ? "compare" : "commit")
  }
  return result(gesture.rev > SIDE_COMMIT ? "commit" : "cancel")
}

/**
 * The two sides of a comparison created by a release: dragging left (`dx` < 0) keeps the shown
 * layer on the left (A) and the incoming one on the right (B); dragging right the other way round.
 * `secondSide` is the side the incoming layer lands on.
 */
export function compareSidesFor(
  dx: number,
  shown: BaseLayerKey,
  incoming: BaseLayerKey,
): { sideA: BaseLayerKey; sideB: BaseLayerKey; secondSide: "left" | "right" } {
  "worklet"
  return dx < 0
    ? { sideA: shown, sideB: incoming, secondSide: "right" }
    : { sideA: incoming, sideB: shown, secondSide: "left" }
}

/** A tap on the map exits the swipe mode, except in a comparison (the user aims at a side). */
export function tapAction(comparing: boolean): "exit-swipe" | "nothing" {
  "worklet"
  return comparing ? "nothing" : "exit-swipe"
}

/** The 8 s idle exit is off while a screen reader is on, so nobody is ejected mid-action. */
export function idleExitEnabled(screenReaderOn: boolean): boolean {
  "worklet"
  return !screenReaderOn
}
