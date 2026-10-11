# 28-05 Amendment: swipe zones and haptics (owner decision 2026-10-11)

Source: `28-CONTEXT.md` item 11. It supersedes the 20 % / 80 % compare window of plan 28-05 and the UI-SPEC.
Only `mobile/src/map/swipe-machine.ts` and its test changed. `ui/feedback.ts` already had `feedback.impact.medium`, `feedback.impact.light` and `feedback.selection`, so nothing was added there.

## Zones

The revealed fraction is cut in thirds: cancel below 1/3, compare from 1/3 to 2/3, commit above 2/3. Where no comparison is allowed (a side wipe, or a full wipe with a comparison already built) there are two zones: cancel up to 1/3, commit above.
A zone changes only after the fraction crosses its boundary by `ZONE_HYSTERESIS` (0.03). The zone is stored in the gesture, so the live hint, the haptic cue and the release outcome read the same value.
A release exactly on a boundary follows the hysteresis rule: the zone the finger was in is kept until the hysteresis point (a cancel or commit zone is left at the point itself, the compare zone only beyond it). With no previous zone, the boundary value belongs to compare (three zones) or to cancel (two zones).

## Changed constants

- `COMPARE_MIN = 1 / 3` (was 0.2)
- `COMPARE_MAX = 2 / 3` (was 0.8)
- `SIDE_COMMIT = 1 / 3` (was 0.33)
- New: `ZONE_HYSTERESIS = 0.03`
- Unchanged: `SWIPE_SLOP`, `EDGE_EXIT`, `LINE_MARGIN`, `IDLE_MS`, `HINT_MS`, `SETTLE_MS`

## New exports

- Types `SwipeZone = "cancel" | "compare" | "commit"` and `HapticCue = "detent" | "tick"`
- `swipeZone(rev, previous: SwipeZone | null, comparisonAllowed): SwipeZone`
- `zoneHaptic(previous: SwipeZone | null, next: SwipeZone): HapticCue | null`: `"detent"` entering compare, `"tick"` entering cancel or commit, `null` if unchanged or if `previous` is null (first zone of the gesture)
- `releaseHaptic(outcome: ReleaseOutcome): HapticCue | null`: compare is `"detent"`, commit is `"tick"`, everything else `null`

All three are pure and carry the `"worklet"` directive.

## Changed shapes (backward compatible)

- `WipeGesture` gains `zone: SwipeZone | null` (null until the gesture starts). `beginGesture` returns `zone: null`; `moveGesture` updates it with hysteresis.
- `MoveContext` gains the optional `comparisonAllowed?: boolean` (default true; side wipes ignore it). The UI should pass the same value it passes to `releaseGesture` and `liveHint`.
- `releaseGesture(gesture, comparisonAllowed)` and `liveHint(gesture, comparisonAllowed)` keep their signatures and now read the zone (recomputed idempotently from the stored one).

## How the UI plans (28-13, 28-17) use it

On each move: `const next = moveGesture(gesture, point, context)`; if `next.zone !== null`, `const cue = zoneHaptic(gesture.zone, next.zone)` and play it (`"detent"` = `feedback.impact.medium()`, `"tick"` = `feedback.selection()`, charter rule: only through `ui/feedback.ts`). The cue map is the UI's; the spec calls the light tick a light selection tick.
On release: `const result = releaseGesture(gesture, allowed)`, then `releaseHaptic(result.outcome)` with the same map. A cancel plays nothing.

## Verification

`swipe-machine.ts` stays at 100 % statements, branches, functions and lines (per-file coverage run). Tests: thresholds, hysteresis in both directions at both boundaries, the zone to cue table, release outcomes at 0.30, 0.34, 0.50, 0.66 and 0.70, the two-zone case, and a sweep checking that the live hint always agrees with the release outcome.
