---
phase: 28-map-layers-comparison-inserted-v1
plan: 21
subsystem: mobile-map
tags: [map, comparison, grabber, line, exit-gesture, item-13b]
requires: ["28-20"]
provides:
  - "wipe-geometry: EDGE_EXIT_FRACTION = 1 / 5; edgeExitKeeps(x, width) by the outer fifths (x < width/5 keeps B, x > 4 width/5 keeps A); the 40 pt EDGE_EXIT constant removed"
  - "swipe-machine: SPRINGBACK_MS = 240 (= brandMotion.durations.base), edgeExitCue(previous, next) -> 'tick' | null, re-exports EDGE_EXIT_FRACTION and LINE_MARGIN"
  - "CompareGrabber + grabberCenterY + GRABBER_HIT/WIDTH/LENGTH/HEIGHT_RATIO (testID compare-grabber)"
  - "CompareLine (testID compare-line), COMPARE_LINE_WIDTH"
  - "useCurtainClip: the line starts at the clamped compare.x, eases to width / 2 in SETTLE_MS, never follows a later compare.x, re-centres on a width change"
  - "fr.mapLayers.compare: hintExit, actionKeepLeft, actionKeepRight, new handleA11yHint, handleA11yValue({ left, right })"
affects:
  - "28-22 (wires CompareLine and CompareGrabber into the Explorer, removes CurtainHandle, linePercent helpers, line-move action and old strings)"
  - "28-23 (side tags at grabberCenterY, 24 pt from the line)"
status: complete
tech-stack:
  added: []
  patterns:
    - "exit-only drag: one UI-thread Pan whose cancelled gesture (success false) is handled in onFinalize and never exits"
key-files:
  created:
    - mobile/src/screens/public-map/CompareGrabber.tsx
    - mobile/src/screens/public-map/CompareGrabber.test.tsx
    - mobile/src/screens/public-map/CompareLine.tsx
  modified:
    - mobile/src/map/wipe-geometry.ts
    - mobile/src/map/wipe-geometry.test.ts
    - mobile/src/map/swipe-machine.ts
    - mobile/src/map/swipe-machine.test.ts
    - mobile/src/screens/public-map/useCurtainClip.ts
    - mobile/src/screens/public-map/CurtainHandle.tsx
    - mobile/src/screens/public-map/CurtainHandle.test.tsx
    - mobile/src/i18n/fr/map-layers.ts
    - mobile/src/i18n/fr/map-layers.test.ts
decisions:
  - "The grabber's 1 pt edge is a ring outside the 4 pt white bar: an outer View (padding 1, radius 3, backgroundColor visual.curtain.edge) around an inner 4 x 36 View (radius 2, visual.curtain.line), so the drawn bar is 6 x 38 pt and the white body is exactly 4 x 36, like the 4 pt line whose edges are separate views outside the core"
  - "onExitZone also reports null when the drag ends in an exit (just before onEdgeExit), so the hint under the pill is cleared by the grabber itself"
  - "The spring-back relies on ReduceMotion.System inside withTiming (no useReducedMotion branch in the grabber): under Reduce Motion the line jumps back at once"
  - "The old CurtainHandle stays until 28-22; it only lost its percent state because handleA11yValue no longer takes a percent"
metrics:
  tasks: 2
  commits: 2
---

# Phase 28 Plan 21: The comparison line, part 1 Summary

Exit-zone rules (outer fifths, zone tick, spring-back time) as pure tested functions, the slim 4 x 36 pt grabber with its exit-only drag, the decorative line, and a curtain clip that rests at the centre, all built beside the old handle for 28-22 to wire.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Geometry and machine rules of the exit drag | c30fc1c5 |
| 2 | The slim grabber, the decorative line and a curtain that rests at the centre | 0861edeb |

## What was built

- **Rules** (`wipe-geometry.ts`, `swipe-machine.ts`): `EDGE_EXIT_FRACTION = 1 / 5` replaces the 40 pt constant; on width 400, `edgeExitKeeps` is "B" up to 79, null from 80 to 320, "A" from 321. `edgeExitCue(previous, next)` ticks only on entering a side that differs from the previous one. `SPRINGBACK_MS = 240` is asserted equal to `brandMotion.durations.base`. `clampLine` is unchanged. `src/map` stays at 100 % statements and lines.
- **`CompareGrabber`**: 44 x 44 pt hit area centred on `lineX` and on `grabberCenterY(height) = round(height x 0.32)`; the only part of the line that takes a touch. `onBegin` cancels a spring-back in progress and stores the start; `onUpdate` writes `clampLine(start + translationX)` to `lineX`, and on a zone change calls `onExitZone(zone)` and plays one `feedback.selection()` when `edgeExitCue` says "tick" (nothing when leaving a zone); `onEnd` acts only when `success` is true (in a zone: `onExitZone(null)` then `onEdgeExit(zone)`; outside: spring back in `SPRINGBACK_MS`, standard easing, `ReduceMotion.System`, no haptic); `onFinalize` without success springs back and reports `onExitZone(null)`, never exits; `onFinalize` after a successful end does nothing. Adjustable role, label "Séparation de la comparaison", hint "Faites glisser vers un bord pour quitter la comparaison", value "{gauche} à gauche, {droite} à droite", actions increment "Quitter en gardant le fond de gauche" (`onEdgeExit("A")`) and decrement "Quitter en gardant le fond de droite" (`onEdgeExit("B")`).
- **`CompareLine`**: 4 pt (1 + 2 + 1) from `top` to the bottom, `pointerEvents="none"`, hidden from accessibility, follows `lineX`.
- **`useCurtainClip`**: on the null-to-comparison transition `lineX` starts at the clamped `compare.x`, then eases to `width / 2` in `SETTLE_MS` (set directly under Reduce Motion); later `compare.x` values are ignored; a width change puts it at the new centre; without a comparison it stays parked on the right edge; leaving and covering unchanged.
- **Strings**: `hintExit`, `actionKeepLeft`, `actionKeepRight` added; `handleA11yHint` and `handleA11yValue({ left, right })` set to the UI-SPEC copy. The old handle lost its percent state and call argument only.

## Grabber edge reading (UI-SPEC "white with the same graphite edge as the line")

The line draws its edges as separate 1 pt views outside the 2 pt core. The grabber follows the same reading: the white body is exactly 4 x 36 pt (`visual.curtain.line`), wrapped in a 1 pt ring of `visual.curtain.edge` drawn as a padded outer View with a background (no `borderWidth`), so the drawn shape is 6 x 38 pt inside the 44 x 44 hit area. A border drawn over the body would blend the semi-transparent graphite with the white and shrink the body, which is why the ring is a separate backing view.

## Deviations from Plan

None - plan executed as written. Small additions inside the plan's scope:

- `onExitZone(null)` is also reported before `onEdgeExit` when the drag ends in an exit (not required by the plan, harmless, clears the hint in one place).
- The percent state, its `useEffect`/`useState` imports and its test assertions were removed from the old `CurtainHandle` (plan: "whatever that leaves unused"); the old handle's test titles and drag distances were adjusted to the fifth zones.
- The `useCurtainClip` cases moved from `CurtainHandle.test.tsx` into `CompareGrabber.test.tsx`; derived clip values only update on render in the Jest mock, so the transition tests assert `lineX` and the recorded timings, and one test holds `withTiming` at the front (`mockHold`) to check the start position and the clip.

## Notes for 28-22

- `useExplorerSwipe` still passes `compare` with a `x`; the clip now ignores later `x`, so the old handle's `onMoveLine` no longer moves the line through state (the old handle writes `lineX` directly while dragging, so it still works until removed).
- `onSideAction` in the old wiring still calls `actions.setSide` (per 28-20 note).
- Exported names for wiring: `CompareGrabber` (`lineX`, `width`, `height`, `leftName`, `rightName`, `onExitZone(keeps: "A" | "B" | null)`, `onEdgeExit(keeps: "A" | "B")`), `grabberCenterY`, `GRABBER_HIT`, `GRABBER_WIDTH`, `GRABBER_LENGTH`, `GRABBER_HEIGHT_RATIO`; `CompareLine` (`lineX`, `top?`), `COMPARE_LINE_WIDTH`; `EDGE_EXIT_FRACTION`, `LINE_MARGIN`, `SPRINGBACK_MS`, `edgeExitCue` from `map/swipe-machine`; `edgeExitKeeps`, `clampLine` from `map/wipe-geometry`; strings `fr.mapLayers.compare.hintExit`, `actionKeepLeft`, `actionKeepRight`. The grabber is positioned in the map-area coordinate space (top = `grabberCenterY(height) - 22`, no `lineTop` offset), unlike the old handle strip. `CurtainSideTags` still reads `knobTop` (from `knobCenterY`); 28-22/28-23 switch it to `grabberCenterY`.
- To remove in 28-22: `CurtainHandle`, `knobCenterY`, `linePercent`, `lineFromPercent`, `stepLinePercent`, `onMoveLine`, `actionLeftNext/Previous`, `actionRightNext/Previous`.

## Verification

- `jest` on `src/map` (wipe-geometry, swipe-machine): 100 % statements and lines; on `CompareGrabber.tsx`, `CompareLine.tsx`, `useCurtainClip.ts`: 100 % statements, branches and lines.
- `src/map src/screens/public-map src/navigation src/i18n src/__checks__` all pass; full `npm run test:coverage:mobile`: 362 suites, 5110 tests passed.
- `npx tsc --noEmit` (mobile), `npm run typecheck`, `npm run lint`: clean. `prettier --check` on `src/map`, `src/screens/public-map`, `src/i18n`: clean (`format:check` at the root only warns on the untracked-by-us `.claude/settings.local.json`).
- Acceptance greps: `EDGE_EXIT_FRACTION = 1 / 5`, `export function edgeExitCue`, `compare-grabber`, `SPRINGBACK_MS`, `onFinalize` present; no `swap-horizontal-outline` or `GlassSurface` in the grabber; no remaining `EDGE_EXIT` token.

## Threat surface

T-28-51 and T-28-53 mitigated as planned (only the 44 x 44 grabber takes the drag; release outside the fifths springs back; a cancelled gesture never exits; a tick warns on entering a zone; the two adjustable actions exist), all covered by tests. No new endpoint, storage or package.

## Known Stubs

None. The new components are not yet mounted in the Explorer (28-22 wires them), which is the plan's stated scope.

## Self-Check: PASSED

- FOUND: mobile/src/screens/public-map/CompareGrabber.tsx, CompareGrabber.test.tsx, CompareLine.tsx
- FOUND: commits c30fc1c5, 0861edeb
