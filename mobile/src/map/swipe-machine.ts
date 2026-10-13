// The decisions of the basemap swipe mode and of the comparison, as pure functions with the numbers
// of the sketch engine (`.planning/sketches/themes/map-layers-kit.js`, "moteur balayage"). The UI
// renders and animates what these decide; instant results under Reduce Motion are the UI's job.
// Where the UI-SPEC and the engine differ the UI-SPEC wins (it names the engine as the reference
// for numbers only): below the compare zone no hint is shown, because a release cancels.
//
// Zones (owner decision 2026-10-11, CONTEXT item 11, superseding the 0.2 / 0.8 window): the revealed
// fraction is cut in thirds. Cancel below 1/3, compare between 1/3 and 2/3, commit above 2/3. Where
// the comparison is not built there are two zones, cancel below 1/3 and commit above. The zone is kept
// in the gesture and moves only after crossing a boundary by ZONE_HYSTERESIS, so the live hint, the
// haptic cue and the release outcome all read the same zone and never disagree.
//
// A gesture is a plain object the pan handler keeps (a shared value on the UI thread) and replaces
// on every move; nothing here keeps state. Every function carries the `"worklet"` directive.
// No React, no i18n: hints are keys, the screens turn them into text.
//
// The swipe mode and the comparison never coexist (owner feedback, CONTEXT item 13 d): every gesture
// is full width. The swipe surface is not active in a comparison, so the machine knows no line, no
// side of a line and no tap rule (a tap always exits the swipe mode).

import { neighbourLayer } from "./layer-cycle"
import type { BaseLayerKey } from "./layers"
import { revealedFraction, sideBounds } from "./wipe-geometry"
import type { SideKey } from "./wipe-geometry"

// One definition each, in wipe-geometry.ts; this module exports the whole UI-SPEC list.
export { EDGE_EXIT_FRACTION, LINE_MARGIN } from "./wipe-geometry"

/** A touch becomes a wipe after this much horizontal movement (pt); under it, a tap candidate. */
export const SWIPE_SLOP = 6
/** A full-width release from this revealed fraction (one third) creates a comparison. */
export const COMPARE_MIN = 1 / 3
/** A full-width release above this revealed fraction (two thirds) commits. */
export const COMPARE_MAX = 2 / 3
/** A zone changes only after the finger crossed its boundary by this revealed fraction. */
export const ZONE_HYSTERESIS = 0.03
/** The swipe mode quits after this long without a gesture or an action (ms). */
export const IDLE_MS = 8000
/** Duration of the commit and the spring-back (ms, `brandMotion.durations.base`). */
export const SETTLE_MS = 240
/**
 * Duration of the comparison line's spring-back to the centre after a drag released outside an
 * exit zone (ms, `brandMotion.durations.base`; UI-SPEC "Line spring-back to the centre").
 */
export const SPRINGBACK_MS = 240

/** Entering the immersive effect (ms, `brandMotion.durations.slow`, decelerate easing). */
export const IMMERSIVE_IN_MS = 360
/** Leaving the immersive effect (ms, `brandMotion.durations.base`, standard easing). */
export const IMMERSIVE_OUT_MS = 240
/** The map buttons fade out, and back in, over this long (ms, `brandMotion.durations.fast`). */
export const BUTTON_FADE_MS = 160
/** The buttons start fading back in this long after the exit begins (ms). */
export const BUTTON_FADE_IN_DELAY_MS = 80

/** A horizontal swipe on a side tag changes that side from this much travel (pt, UI-SPEC section 4). */
export const TAG_SWIPE_MIN = 44
/** ... or from this speed (points per second) once the travel is past the slop in the same direction. */
export const TAG_FLICK_VELOCITY = 500

/** What a release would do now: spring back, open the comparison, or switch to the new layer. */
export type SwipeZone = "cancel" | "compare" | "commit"
/** The haptic to play: a clear detent (medium impact) or a light tick (selection). */
export type HapticCue = "detent" | "tick"

export type WipeGesture = {
  /** Where the gesture acts: always the whole map ("full"). */
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
  /** The zone of `rev` with hysteresis, null until the gesture starts. */
  zone: SwipeZone | null
}

export type MoveContext = {
  width: number
  /** The layer shown on a side (the base for "full"). */
  layerOf: (side: SideKey) => BaseLayerKey
  isAvailable: (key: BaseLayerKey) => boolean
  /** False when only two zones exist; defaults to true. */
  comparisonAllowed?: boolean
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

/** A gesture starts at the first touch and always acts on the whole map. */
export function beginGesture(touch: { x: number; y: number }): WipeGesture {
  "worklet"
  return {
    side: "full",
    x0: touch.x,
    y0: touch.y,
    started: false,
    blocked: false,
    dx: 0,
    dy: 0,
    fingerX: touch.x,
    incoming: null,
    rev: 0,
    zone: null,
  }
}

/**
 * The zone of a revealed fraction. `previous` is the zone the finger was in (null at the start):
 * a zone changes only once the fraction crosses its boundary by ZONE_HYSTERESIS, so the haptic does
 * not flicker around 1/3 or 2/3. Without a previous zone the boundaries are exact: cancel below
 * 1/3, compare from 1/3 to 2/3 inclusive, commit above 2/3 (two zones: cancel up to 1/3 inclusive,
 * commit above). A release exactly on a boundary follows this rule: the zone the finger was in
 * keeps it until the hysteresis point (a cancel or commit zone is left at the point itself, the
 * compare zone only beyond it); with no previous zone the boundary value belongs to compare. `comparisonAllowed` false gives the two zones only; a
 * previous "compare" then counts as none.
 */
export function swipeZone(
  rev: number,
  previous: SwipeZone | null,
  comparisonAllowed: boolean,
): SwipeZone {
  "worklet"
  if (!comparisonAllowed) {
    if (previous === "commit") return rev < COMPARE_MIN - ZONE_HYSTERESIS ? "cancel" : "commit"
    const toCommit = previous === "cancel" ? COMPARE_MIN + ZONE_HYSTERESIS : COMPARE_MIN
    return rev > toCommit ? "commit" : "cancel"
  }
  let lower = COMPARE_MIN
  if (previous === "cancel") lower += ZONE_HYSTERESIS
  else if (previous === "compare") lower -= ZONE_HYSTERESIS
  let upper = COMPARE_MAX
  if (previous === "compare") upper += ZONE_HYSTERESIS
  else if (previous === "commit") upper -= ZONE_HYSTERESIS
  if (rev < lower) return "cancel"
  return rev > upper ? "commit" : "compare"
}

/**
 * The haptic for a zone change while the finger is down: a detent when entering the compare zone
 * (the cue that releasing there opens the comparison), a light tick when entering cancel or commit,
 * nothing while the zone is unchanged or at the first zone of the gesture (`previous` null).
 */
export function zoneHaptic(previous: SwipeZone | null, next: SwipeZone): HapticCue | null {
  "worklet"
  if (previous === null || previous === next) return null
  return next === "compare" ? "detent" : "tick"
}

/**
 * The haptic for the comparison line crossing into an edge exit zone (UI-SPEC section 4): a light
 * tick when `next` is a side the line was not in, nothing on leaving a zone or while it stays in it.
 */
export function edgeExitCue(previous: "A" | "B" | null, next: "A" | "B" | null): HapticCue | null {
  "worklet"
  return next !== null && next !== previous ? "tick" : null
}

/**
 * The step a horizontal swipe on a side tag asks for, at the end of its pan: dragging left is the
 * next layer (1), right the previous one (-1), as in the wipe; null when the swipe is too short.
 * It commits from `TAG_SWIPE_MIN` of travel, or from `TAG_FLICK_VELOCITY` once the travel passed
 * the slop in the same direction as the flick.
 */
export function tagSwipeStep({ dx, velocityX }: { dx: number; velocityX: number }): 1 | -1 | null {
  "worklet"
  if (dx <= -TAG_SWIPE_MIN) return 1
  if (dx >= TAG_SWIPE_MIN) return -1
  if (velocityX <= -TAG_FLICK_VELOCITY && dx <= -SWIPE_SLOP) return 1
  if (velocityX >= TAG_FLICK_VELOCITY && dx >= SWIPE_SLOP) return -1
  return null
}

/** The haptic at the release: a medium impact opening the comparison, a tick committing, else none. */
export function releaseHaptic(outcome: ReleaseOutcome): HapticCue | null {
  "worklet"
  if (outcome === "compare") return "detent"
  return outcome === "commit" ? "tick" : null
}

/** The zone a gesture is in now, for a given permission; idempotent on the stored zone. */
function zoneOf(gesture: WipeGesture, comparisonAllowed: boolean): SwipeZone {
  "worklet"
  return swipeZone(gesture.rev, gesture.zone, comparisonAllowed)
}

/**
 * The gesture after the finger moved to `point`. Past the slop it starts with the incoming layer
 * (next when dragging left, previous when dragging right, skipping unavailable layers); when no
 * layer qualifies it is blocked and never starts.
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
  })
  if (incoming === null) return { ...moved, blocked: true, started: false, incoming: null }
  const bounds = sideBounds("full", 0, context.width)
  const rev = revealedFraction(bounds, dx, point.x)
  const zone = swipeZone(rev, gesture.zone, context.comparisonAllowed ?? true)
  return { ...moved, started: true, incoming, rev, zone }
}

/**
 * The hint to show while the finger is down, null for none. It follows the zone: nothing in the
 * cancel zone (a release cancels), "compare" in the compare zone, "change" in the commit zone.
 */
export function liveHint(gesture: WipeGesture, comparisonAllowed: boolean): LiveHint | null {
  "worklet"
  if (gesture.blocked) return "none-available"
  if (!gesture.started) return null
  const zone = zoneOf(gesture, comparisonAllowed)
  if (zone === "cancel") return null
  return zone === "compare" ? "compare" : "change"
}

/**
 * What the release does. A gesture that never started is a tap (under 6 pt in both axes) or nothing.
 * A started gesture releases in the zone it is in, hysteresis included, so a release exactly on a
 * boundary follows the zone the finger was in: the wipe cancels, compares or commits by thirds, or
 * cancels or commits at 1/3 when the comparison is not allowed.
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
  return result(zoneOf(gesture, comparisonAllowed))
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

/** The 8 s idle exit is off while a screen reader is on, so nobody is ejected mid-action. */
export function idleExitEnabled(screenReaderOn: boolean): boolean {
  "worklet"
  return !screenReaderOn
}
