---
phase: 28-map-layers-comparison-inserted-v1
plan: 23
subsystem: mobile-map
tags: [map, comparison, side-tags, chevrons, tag-swipe, side-wipe, item-13d]
requires: ["28-22"]
provides:
  - "wipe-geometry: TAG_GAP = 24 (comment corrected: 22 pt half of the grabber hit area + 2, U-23), halfBounds(side, width)"
  - "swipe-machine: TAG_SWIPE_MIN = 44, TAG_FLICK_VELOCITY = 500, tagSwipeStep({ dx, velocityX }) -> 1 | -1 | null"
  - "fr.mapLayers.compare: sideLeft, sideRight, sideA11yLabel({ side, name }), sideA11yHint, sideA11yValue({ name, era }), announceSide({ side, name, era }); tagA11y removed"
  - "CompareSideTag (testID compare-tag-left|right, chevrons compare-tag-<side>-previous|next) and TAG_HEIGHT = 44"
  - "CompareGrabber.onDragging(boolean)"
  - "useSideStep({ layers, isAvailable, width }) -> { canStep(side), step(side, direction), stepping, onStyleLoaded(map) }"
  - "ExplorerSwipeView: third, canStep, onStep, lineDragging, onLineDragging (onSideAction removed); ExplorerSwipe.onSecondStyleLoaded"
affects:
  - "28-24 to 28-26 (the comparison is complete: line, grabber, tags, side wipe)"
status: complete
tech-stack:
  added: []
  patterns:
    - "a timed, half-confined wipe on a third map with a generation counter so a late timing of an ended comparison does nothing"
key-files:
  created:
    - mobile/src/screens/public-map/CompareSideTag.tsx
    - mobile/src/screens/public-map/CompareSideTag.test.tsx
    - mobile/src/screens/public-map/useSideStep.ts
    - mobile/src/screens/public-map/useSideStep.test.tsx
  modified:
    - mobile/src/map/wipe-geometry.ts
    - mobile/src/map/wipe-geometry.test.ts
    - mobile/src/map/swipe-machine.ts
    - mobile/src/map/swipe-machine.test.ts
    - mobile/src/i18n/fr/map-layers.ts
    - mobile/src/i18n/fr/map-layers.test.ts
    - mobile/src/screens/public-map/CompareGrabber.tsx
    - mobile/src/screens/public-map/CompareGrabber.test.tsx
    - mobile/src/screens/public-map/useExplorerSwipe.ts
    - mobile/src/screens/public-map/useExplorerSwipe.test.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.test.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
  deleted:
    - mobile/src/screens/public-map/CurtainSideTags.tsx
    - mobile/src/screens/public-map/CurtainSideTags.test.tsx
decisions:
  - "A side change that is still waiting for its cover counts as running: a press during it does nothing (plan: a step while another one is running does nothing)"
  - "The tag's accessibility actions are ignored (like the chevrons and the swipe) when no other layer exists for the side"
  - "The chevron glyphs are at full ink when active and at brandInteraction.disabledOpacity (40 %) when disabled, replacing the old 50 % decorative chevron"
  - "The third map has no style-load callback of its own: the cover waits for the map that draws the side (second map or Explorer map), reported through useSideStep.onStyleLoaded"
metrics:
  tasks: 3
  commits: 3
---

# Phase 28 Plan 23: Side tags with chevrons, tag swipe and half-confined side wipe Summary

Each side tag is now a real control of the comparison: a tap on its back or forward chevron, a horizontal swipe on its name (44 pt or a flick) or the screen reader's increment/decrement actions change that side's layer, shown as a 240 ms wipe confined to the side's half of the fixed centre, drawn by a re-added third map that covers the half until the map drawing that side has loaded its new style. Nothing writes the saved preference.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Tag geometry, the tag swipe rule and the side strings | d71c06ce |
| 2 | The tappable side tag and the grabber's drag report | ac9f58aa |
| 3 | The side change with its half-confined wipe, wired into the Explorer | 7ed89cf4 |

## What was built

- **Rules**: `TAG_GAP` 24 (the old 30 "knob radius" comment is replaced by the U-23 derivation), `halfBounds` through `sideBounds(side, width / 2, width)`, `tagSwipeStep` (left = next, from 44 pt of travel or a 500 pt/s flick whose travel is past the 6 pt slop in the same direction). `src/map` stays at 100 % statements and lines.
- **`CompareSideTag`**: 44 pt glass pill (`mapControl.glass`) 24 pt from the line, centred on `grabberCenterY`, `[chevron zone 44][name][chevron zone 44]`; the name part owns `Gesture.Pan()` (`activeOffsetX` / `failOffsetY` at `SWIPE_SLOP`, `onEnd` through `tagSwipeStep` and `runOnJS`); fades under 72 pt of room (160 ms) and enters with `FadeIn` (`brandMotion.durations.fast`, `ReduceMotion.System`); `pointerEvents="none"` while the line is dragged; dimmed (`brandInteraction.disabledOpacity`) and disabled chevrons plus no swipe when `canStep` is false; one `adjustable` element with label, hint, value and the two actions "Fond suivant" / "Fond précédent"; chevrons hidden from accessibility; `cloud-offline-outline` before the name for an unavailable layer.
- **`useSideStep`**: `neighbourLayer(layers.layerOfSide(side), direction, { isAvailable, exclude: otherSideLayer })`; one `feedback.selection()`, announcement `compare.announceSide` with `swipeLabel`; `withTiming` of the strip's moving bound over `SETTLE_MS` (standard easing, `ReduceMotion.System`) from `halfBounds`: next enters from the half's right bound (strip `[to, to]`, left bound to `from`), previous from the left bound; `layers.actions.setSide` from the timing's completion through `runOnJS`; the step then becomes a cover waiting for "second" (when the second map draws that side) or "base"; dropped by `onStyleLoaded(map)`, after 8 s, or when the comparison ends (a generation counter ignores a late timing and `cancelAnimation` stops it). Under Reduce Motion or `SIDE_WIPE === "instant"`: `setSide` at once, same haptic and announcement, no third map. The hook never names the base-commit action.
- **Explorer wiring**: `useExplorerSwipe` calls `useSideStep`, builds `third` (key `third-map` in the view) with its own `useMapSync()` camera, syncs both stacked maps from the Explorer map's view, routes `onBaseStyleLoaded` (also drops the full/keep cover) and the re-added `onSecondStyleLoaded` to the side step, and exposes `canStep`, `onStep`, `lineDragging`, `onLineDragging`. `ExplorerSwipeLayers` renders `stackedMap("second-map", …, swipe.onSecondStyleLoaded)`, `stackedMap("third-map", …)` and two `CompareSideTag`, and passes `onDragging` to the grabber.
- **Removed**: `CurtainSideTags` (and its test), `onSideAction`, the hook's `neighbourLayer` / `swipeLabel` / `announce` imports.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 2 had to touch the Explorer files to compile**
- **Found during:** Task 2
- **Issue:** deleting `CurtainSideTags` broke `ExplorerSwipeLayers.tsx` (assigned to Task 3)
- **Fix:** Task 2 already rendered two `CompareSideTag` from `ExplorerSwipeLayers`, added `lineDragging` / `onLineDragging` to the hook and view, and used the existing `onSideAction` as the `onStep` target; Task 3 then swapped that for `useSideStep` and removed `onSideAction`.
- **Commits:** ac9f58aa, 7ed89cf4

**2. [Rule 3 - Blocking] Screen test gesture mock**
- **Issue:** the `PublicMapScreen.test.tsx` Pan recorder did not chain `activeOffsetX` / `failOffsetY`
- **Fix:** added both to its chainable names (the tag pans are also recorded; the swipe pan lookup keys on `onFinalize`, which the tag pans do not have)
- **Commit:** ac9f58aa

### Notes

- The plan's behaviour for the first strip ("starting at [400, 400]") is asserted with a local `useSharedValue` / `withTiming` mock in `useSideStep.test.tsx` that keeps the value until the animation ends (the shared Reanimated mock would jump to the target).
- Tests were written together with the code in each task rather than strictly red first.

## For the next plans (28-24 to 28-26)

- Heads up (item e of the brief, not fixed): the transient exit hint under the quit pill can overlap the first notice pill while a finger is in an outer fifth of the grabber.
- The side tags and the third map are tuned on tests only; the swipe distance on the tag is flagged "owner reviews on device" in the UI-SPEC.
- `useSideStep.step` ignores presses while a cover waits for a slow style load (up to 8 s). If the owner finds that heavy-handed on device, relax it there.
- The side hint copy "Balayez vers le haut ou le bas" (UI-SPEC, as written) describes the screen reader's adjust gesture, not the horizontal tag swipe.

## Verification

- Task verify commands pass: `src/map` wipe-geometry and swipe-machine at 100 % statements and lines; `src/i18n`, dash and abbreviation gates; `CompareSideTag.tsx` and `CompareGrabber.tsx` 100 %; `useSideStep.ts`, `useExplorerSwipe.ts`, `ExplorerSwipeLayers.tsx` 100 % statements, branches and lines.
- `jest src/map` with coverage over `src/map/**/*.ts`: 100 % statements and lines.
- `npm run test:coverage:mobile`: 363 suites, 5150 tests passed; statements 95.6 %, branches 90.01 %, functions 95.21 %, lines 95.96 %.
- `npm run lint`, `npm run typecheck`, `prettier --check mobile/src/screens mobile/src/map mobile/src/i18n`: clean.
- Greps: `TAG_GAP = 24`, `export function tagSwipeStep`, `announceSide` present; `tagA11y` 0; `commitBase` in `useSideStep.ts` 0; `CurtainSideTags|onSideAction` over `mobile/src` 0; `"third-map"` and `<CompareSideTag` in `ExplorerSwipeLayers.tsx`; no hex or `rgba(` in `CompareSideTag.tsx`; `PublicMapScreen.tsx` 375 lines; `useExplorerSwipe.ts` 348 lines.

## Threat surface

T-28-54 mitigated: `useSideStep` only calls `setSide`, tested (`commitBase` never called). T-28-55 mitigated: the third map is dropped on its covered map's style load, after 8 s and when the comparison ends, all tested. T-28-56 mitigated: `neighbourLayer` excludes the other side's layer, tested. No new endpoint, storage or package.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: CompareSideTag.tsx, CompareSideTag.test.tsx, useSideStep.ts, useSideStep.test.tsx; CurtainSideTags.tsx absent
- FOUND: commits d71c06ce, ac9f58aa, 7ed89cf4
- STATE.md and ROADMAP.md untouched
