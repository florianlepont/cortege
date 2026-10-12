---
phase: 28-map-layers-comparison-inserted-v1
plan: 22
subsystem: mobile-map
tags: [map, comparison, grabber, line, exit-hint, item-13b, removal]
requires: ["28-21"]
provides:
  - "QuitComparePill.hint (testID compare-exit-hint, visual.mapHint scrim, live region polite)"
  - "ExplorerSwipeView.onExitZone(keeps | null) and ExplorerSwipeView.quitHint (string | null); onMoveLine removed"
  - "ExplorerSwipeLayers renders CompareLine (top capsuleTop) and CompareGrabber, tags at grabberCenterY(height)"
  - "free line removed: CurtainHandle, knobCenterY, linePercent, lineFromPercent, stepLinePercent, moveLine action, the four old side-action strings"
  - "CurtainSideTags.test.tsx (tag cases moved from the old handle test)"
affects:
  - "28-23 (side tags: onSideAction is still in the hook and the view but no longer passed by ExplorerSwipeLayers; CurtainSideTags keeps its knobTop prop, now fed grabberCenterY)"
status: complete
tech-stack:
  added: []
  patterns:
    - "hint state derived in the hook: quitHint = comparing && inExitZone, reset on both comparison transitions"
key-files:
  created:
    - mobile/src/screens/public-map/CurtainSideTags.test.tsx
  modified:
    - mobile/src/screens/public-map/QuitComparePill.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.test.tsx
    - mobile/src/screens/public-map/useExplorerSwipe.ts
    - mobile/src/screens/public-map/useExplorerSwipe.test.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.test.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
    - mobile/src/screens/public-map/CurtainSideTags.tsx
    - mobile/src/screens/public-map/map-layers-state.ts
    - mobile/src/screens/public-map/map-layers-state.test.ts
    - mobile/src/screens/public-map/useMapLayersState.ts
    - mobile/src/screens/public-map/useMapLayersState.test.ts
    - mobile/src/screens/public-map/useBasemapSwipe.test.tsx
    - mobile/src/map/wipe-geometry.ts
    - mobile/src/map/wipe-geometry.test.ts
    - mobile/src/i18n/fr/map-layers.ts
  deleted:
    - mobile/src/screens/public-map/CurtainHandle.tsx
    - mobile/src/screens/public-map/CurtainHandle.test.tsx
decisions:
  - "The exit hint is a plain View under the pill inside the pill's row (gap 8), pointerEvents none, 24 pt min height like the swipe hint; the notices column top is not moved for it (the hint is transient, only while a finger is in an outer fifth)"
  - "PublicMapScreen.tsx needed no change (375 lines): no prop name moved"
  - "onSideAction stays in the hook and view: 28-23 owns its removal (its plan greps for zero)"
metrics:
  tasks: 2
  commits: 2
---

# Phase 28 Plan 22: The comparison line, part 2 Summary

The Explorer's comparison now shows the decorative centre line and the slim grabber; dragging the grabber into an outer fifth shows "Lâchez pour quitter la comparaison" under the quit pill and a release there ends the comparison, a release elsewhere springs back with no hint; nothing of the free line remains.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | The Explorer wires the grabber, the centre line and the exit hint | 577030e4 |
| 2 | The free line is removed | c7f4221f |

## What was built

- **`QuitComparePill`**: optional `hint`; with it a `compare-exit-hint` view under the pill (`visual.mapHint` fill and ink, 12 SemiBold via `brandTypography.meta`, `accessibilityLiveRegion="polite"`, `pointerEvents="none"`); without it the pill is unchanged.
- **`useExplorerSwipe`**: the line-move callback is gone. `onExitZone(keeps | null)` sets an exit-zone flag; the view exposes `quitHint` (`fr.mapLayers.compare.hintExit` while comparing and in a zone, else null). The flag resets whenever the comparison starts or ends. `onEdgeExit` is unchanged (it also serves the grabber's two accessibility actions); the hook itself plays no zone haptic (the grabber ticks).
- **`ExplorerSwipeLayers`**: renders `CompareLine` (top `capsuleTop`) and `CompareGrabber` (`onExitZone`, `onEdgeExit`) in place of the old handle, the tags get `grabberCenterY(view.height)`, and the quit pill gets `hint={view.quitHint}`. `onQuit` is no longer passed to the line (the pill is the only quit control besides the exit gesture).
- **Screen tests** (`PublicMapScreen.test.tsx`): testIDs `compare-line` and `compare-grabber`; the grabber's pan is found through its `GestureDetector`. Cases: drag to x 50 on 400 pt shows the hint and a release keeps Satellite (right layer), covered until the Explorer map loads it; drag to the right fifth keeps Plan; drag to x 150 (even after having been in the zone and out again) releases back to the centre with no hint and the comparison intact; a cancelled drag in a zone springs back and leaves no hint; the line is `pointerEvents="none"` and the map stays free (no swipe surface, native pan and zoom).
- **Removal**: `CurtainHandle.tsx` and its test deleted (the tag cases now live in `CurtainSideTags.test.tsx`); `linePercent`, `lineFromPercent`, `stepLinePercent` and their tests removed; the line-move reducer case, action type and hook action removed; `CompareState.x` documented as the start of the line's ease; the four `actionLeft/Right Next/Previous` strings removed; the layers-actions fixtures in `useBasemapSwipe.test.tsx` and `useExplorerSwipe.test.tsx` match `MapLayersActions`; `CurtainSideTags.tsx` comments name the grabber.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Local Reanimated shared-value stability in the screen test**
- **Found during:** Task 1 (screen drive of the grabber)
- **Issue:** the shared Reanimated mock returns a fresh shared value on every render. The exit hint is a state change in the middle of a drag, so the screen re-rendered and reset the line and the zone of the grabber's pan, which the real hook never does.
- **Fix:** `PublicMapScreen.test.tsx` mocks `react-native-reanimated` locally (spreading the shared mock) with a `useSharedValue` that lives as long as its component. A global change of `test/react-native-reanimated.mock.ts` was tried first and reverted: it broke one unrelated assertion in `DownloadStatusView.test.tsx` that relies on fresh values.
- **Files modified:** `mobile/src/screens/public-map/PublicMapScreen.test.tsx`
- **Commit:** 577030e4

**2. [Rule 1 - Coverage] One `wipe-geometry.ts` branch lost its only test**
- **Found during:** Task 2
- **Issue:** the NaN fallback of `clampTo` was covered only by the removed `linePercent` test; `src/map` must stay at 100 %.
- **Fix:** a `wipeStrip` case with a NaN finger position.
- **Commit:** c7f4221f

Otherwise the plan was executed as written. `PublicMapScreen.tsx` is unchanged (375 lines).

## Notes for 28-23

- `ExplorerSwipeView` still has `onSideAction` (hook and view and test) but `ExplorerSwipeLayers` no longer passes it anywhere; 28-23 either wires it into the tags or removes it (its acceptance greps `onSideAction` to 0).
- `CurtainSideTags` still takes `knobTop` (now `grabberCenterY(view.height)`, 256 on an 800 pt window) and `TAG_GAP = 30` in `wipe-geometry.ts` (its comment still says "knob radius 22 plus 8"); 28-23 changes the gap to 24 pt from the line and renames as it sees fit. `CurtainSideTags.test.tsx` holds the current tag cases (the plan says it is replaced by 28-23's side-tag tests).
- Exported names now used: `CompareGrabber`, `grabberCenterY`, `CompareLine`, `QuitComparePill` (`hint`), `ExplorerSwipeView.onExitZone`, `ExplorerSwipeView.quitHint`, `ExplorerSwipeView.onEdgeExit`.
- The notices column top (`noticesTop`) does not account for the exit hint (24 pt plus gap under the pill); the hint is transient and can overlap the first notice pill while a finger is in an outer fifth. Adjust if the owner sees it on device.

## Verification

- Plan verify commands: `jest src/screens src/__checks__` (Task 1) and `jest src/map src/screens src/i18n src/__checks__` plus the `wipe-geometry` 100 % coverage run (Task 2) pass; `npx tsc --noEmit` in `mobile/` passes before each commit.
- Negative grep `moveLine|onMoveLine|CurtainHandle|knobCenterY|linePercent|lineFromPercent|stepLinePercent|actionLeftNext|actionLeftPrevious|actionRightNext|actionRightPrevious` over `mobile/src`: 0 lines. `CurtainHandle.tsx` absent. `grep "CurtainHandle\|onMoveLine"` on `ExplorerSwipeLayers.tsx` and `useExplorerSwipe.ts`: 0.
- `npm run lint`, `npm run typecheck`, `prettier --check mobile/src/screens mobile/src/map mobile/src/i18n`: clean (`format:check` at the root only warns on `.claude/settings.local.json`, pre-existing).
- Full `npm run test:coverage:mobile`: 362 suites, 5100 tests passed; `wipe-geometry.ts`, `swipe-machine.ts` (src/map) at 100 %, and the touched components and hooks (`CompareGrabber`, `CompareLine`, `CurtainSideTags`, `ExplorerSwipeLayers`, `QuitComparePill`, `useExplorerSwipe`, `map-layers-state`, `useMapLayersState`) at 100 %.
- `PublicMapScreen.tsx`: 375 lines (limit 380).

## Threat surface

T-28-52 mitigated (the line is `pointerEvents="none"`, only the grabber's 44 x 44 hit area takes touches, tested on the screen). T-28-64 mitigated (the zone tick of 28-21 and the exit hint show before a release that leaves; tested at hook, pill, layers and screen level). No new endpoint, storage or package.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: mobile/src/screens/public-map/CurtainSideTags.test.tsx; CurtainHandle.tsx and CurtainHandle.test.tsx absent
- FOUND: commits 577030e4, c7f4221f
