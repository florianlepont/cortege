---
phase: 28-map-layers-comparison-inserted-v1
plan: 13
subsystem: mobile-map
tags: [map, swipe, gesture, haptics, accessibility, overlay]
requires: ["28-01", "28-02", "28-05", "28-09", "28-11"]
provides:
  - "mobile/src/screens/public-map/useBasemapSwipe.ts: useBasemapSwipe, BasemapSwipe, BasemapSwipeParams, playHapticCue"
  - "mobile/src/screens/public-map/SwipeSurface.tsx: SwipeSurface"
  - "mobile/src/screens/public-map/BasemapSwipeOverlay.tsx: BasemapSwipeOverlay, BasemapSwipeOverlayProps"
  - "mobile/src/screens/public-map/QuitComparePill.tsx: QuitComparePill"
  - "mobile/src/screens/public-map/swipe-labels.ts: swipeLabel, indicatorValue"
  - "mobile/src/screens/public-map/useSwipeModeTimers.ts: useSwipeModeTimers"
  - "fr.mapLayers.basemap.hintCancel"
affects:
  - "28-14 (wipe layer reads wipe, clipLeft, clipRight), 28-17 (Explorer wiring), 28-18 (device checks)"
tech-stack:
  added: []
  patterns:
    - "pan handlers on the JS thread (runOnJS(true)) like the 28-01 spike; strip published through shared values; settle animation on the UI thread hands the state change back with runOnJS"
    - "no threshold in the UI: zone, zone haptic and release haptic all come from swipe-machine.ts"
key-files:
  created:
    - mobile/src/screens/public-map/useBasemapSwipe.ts
    - mobile/src/screens/public-map/useBasemapSwipe.test.tsx
    - mobile/src/screens/public-map/useSwipeModeTimers.ts
    - mobile/src/screens/public-map/swipe-labels.ts
    - mobile/src/screens/public-map/SwipeSurface.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.test.tsx
    - mobile/src/screens/public-map/QuitComparePill.tsx
  modified:
    - mobile/src/i18n/fr/map-layers.ts
    - mobile/src/i18n/fr/map-layers.test.ts
decisions:
  - "Hint text is mapped from gesture.zone, not from the machine's liveHint (see below)"
  - "Pan handlers on the JS thread, as the spike measured; the layer context (availability, sides) is JS state"
  - "A settle applies its outcome on the withTiming completion (runOnJS) with a 360 ms JS guard timer, and a new touch applies a pending outcome at once"
status: complete
---

# Phase 28 Plan 13: Basemap swipe mode controller and top display Summary

The swipe mode is a tested controller that turns pan events into wipes, comparisons and commits using only the amended machine's zones and cues, a gesture surface, a centred indicator stack with dots, "Terminé" and the zone hint, and the "Quitter la comparaison" pill.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | The cancel-zone hint in the catalogue | e76ef5b5 | `i18n/fr/map-layers.ts` (+ test) |
| 2 | Swipe-mode controller with zone hints and haptics, and the gesture surface | f2b27106 | `useBasemapSwipe.ts` (+ test), `useSwipeModeTimers.ts`, `swipe-labels.ts`, `SwipeSurface.tsx` |
| 3 | Centred top stack and the quit pill | 19b28246 | `BasemapSwipeOverlay.tsx` (+ test), `QuitComparePill.tsx` |

## Exported API (for 28-14, 28-17)

### useBasemapSwipe.ts
- `useBasemapSwipe({ layers: MapLayers, savedBasemap?: BasemapKey, width: number, isAvailable: LayerAvailability, skippedCount: number }): BasemapSwipe`. `savedBasemap` is accepted (optional) so the call sites of the plan type-check; it is not read, because `layers.displayedBase` already resolves it.
- `BasemapSwipe = { gesture: PanGesture, wipe: { side: SideKey; incoming: BaseLayerKey } | null, clipLeft, clipRight: SharedValue<number>, zone: SwipeZone | null, hintText: string | null, fingerDown, indicatorLayer: BaseLayerKey, introHintVisible, skippedVisible, compareAvailable, next, previous, compareNext, done }`
  - `compareAvailable` is an addition to the plan's list: `COMPARISON_BUILT`, no comparison yet and a next available layer. Pass it to the overlay.
  - `wipe` is the layer to mount as the clipped wipe map (28-14); `clipLeft`/`clipRight` are the strip in points from the left edge of the map area, written while dragging and animated on release. `wipe` stays set through the settle animation and is cleared when the outcome is applied. It is never set under Reduce Motion or an "instant" presentation.
  - `indicatorLayer` is the incoming layer while a wipe is under way (kept through a commit's settle), else the displayed base.
- `playHapticCue(cue: HapticCue | null)`: detent is `feedback.impact.medium()`, tick is `feedback.selection()`.
- Gesture: `Gesture.Pan().runOnJS(true).minDistance(0)` with `onBegin`, `onUpdate`, `onEnd`, `onFinalize`. A touch that never activates ends in `onFinalize` and is handled as a tap.

### SwipeSurface.tsx
- `SwipeSurface({ gesture })`: absolute-fill `GestureDetector`, `testID="swipe-surface"`. It must be rendered above the maps and below the controls.

### BasemapSwipeOverlay.tsx / QuitComparePill.tsx
- `BasemapSwipeOverlay({ top, layer, comparing, isAvailable, hintText, fingerDown, introHintVisible, compareAvailable, onDone, onNext, onPrevious, onCompareNext })`. Pass `layer = swipe.indicatorLayer`, `hintText`, `fingerDown`, `introHintVisible`, `compareAvailable`, `onDone = swipe.done`, `onNext = swipe.next`, `onPrevious = swipe.previous`, `onCompareNext = swipe.compareNext`, `comparing = layers.state.compare !== null`. testIDs `swipe-indicator`, `swipe-dots`, `swipe-dot-<layer>`, `swipe-done`, `swipe-hint`.
- `QuitComparePill({ top, onQuit })`: `testID="compare-quit"`. The screen shows it only while a comparison exists and the swipe mode is off, and calls `layers.actions.quitCompare("A")`.
- `skippedVisible` has no display here: the "N fonds non téléchargés" notice belongs to the notices column (MapNoticeStack, 28-12/28-17).
- `swipe-labels.ts`: `swipeLabel(key) -> { name, era }`, `indicatorValue(key)`.
- `useSwipeModeTimers`: intro and skipped flags for `HINT_MS`, idle exit after `IDLE_MS` (off during a gesture and with a screen reader on), used by the hook.

## Behaviour notes

- **Zones, hints and cues come from the machine.** The code never compares a revealed fraction with a number (the acceptance grep prints 0). Each pan update calls `moveGesture`, then `zoneHaptic(previous.zone, next.zone)`; a release calls `releaseGesture` then `releaseHaptic(outcome)`; `comparisonAllowed` is `COMPARISON_BUILT && no comparison`.
- **`liveHint` vs zone-hint difference (for the machine's owner, 28-05).** The amended `liveHint` returns `null` in the cancel zone and always `"change"` for a side wipe, but CONTEXT item 11 and the UI-SPEC show "Lâchez pour revenir" in the cancel zone, also on a side wipe where the two zones are cancel and commit. The hook therefore maps `gesture.zone` to the catalogue text (`cancel` -> `hintCancel`, `compare` -> `hintRelease`, `commit` -> `hintChange`, blocked -> `hintNoneAvailable`) and does not call `liveHint`. `liveHint` is now unused by the UI; it can be removed or aligned (return `"cancel"` in the cancel zone) when convenient.
- Taps: `tapAction(comparing)`. A tap in a comparison does nothing.
- Haptics fire for zone changes after the first zone, on release (compare = medium, commit = selection), and for the accessibility actions (`next`/`previous` tick, `compareNext` detent). Reduce Motion removes the animation only.
- `next` and `previous` do nothing in a comparison (the indicator is not shown there); `compareNext` is a no-op unless `compareAvailable`.
- Announcements: entering says "Changement de fond. {left layer}, {era}." (in a comparison the left layer), a commit or an action says "{name}, {era}", a comparison says "Comparaison : ... Relevés masqués." Names are the swipe names.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two extra small source files**
- **Found during:** Task 2
- **Issue:** the hook came to 464 lines, over the 400-line cap in the plan's acceptance, and the overlay needs the same layer names as the hook's announcements.
- **Fix:** the hint, idle and screen-reader clocks went to `useSwipeModeTimers.ts`; the shared name/era/value helpers to `swipe-labels.ts`. Both are covered by the hook and overlay tests. `useBasemapSwipe.ts` is 398 lines.
- **Files:** `useSwipeModeTimers.ts`, `swipe-labels.ts`

**2. [Rule 1 - Bug avoided] `onFinalize` handles taps**
- A pan with `minDistance(0)` that never moves does not activate, so `onEnd` never fires for a pure tap. The tap and a system-cancelled gesture are therefore finished in `onFinalize` when `onEnd` has not already consumed the gesture (a started gesture that is cancelled springs back, nothing is applied).

**3. Settle applied by completion callback plus a JS guard**
- Under the Jest Reanimated mock `withTiming` never calls its completion, so the tests mock it to record and finish the animation. In the app the outcome is applied from the `withTiming` completion through `runOnJS`; a 360 ms JS timer applies it anyway if the completion never comes (interrupted animation). A new touch applies a pending outcome at once, so an old commit is never half applied.

**4. Commit guard**: as in the earlier plans, commits go to `claude/focused-sutherland-89f87e` as ordered (the `worktree-agent-*` allow-list was not applied, the protected-branch deny-list was). Only own files were staged, with pathspecs.

None for Task 1 (the catalogue edit is exactly the planned line).

## Notes for the next plans

- **28-14 / 28-17, wipe presentation:** after a commit, `wipe` is cleared at the moment `commitBase` is dispatched. The Explorer map changes its style then (`layers.state.loadingBase`); to avoid a flash while it loads, keep drawing the wipe layer (or a cover) until `styleLoaded`, as the 28-01 spike did with a 400 ms cover. After a comparison starts, `wipe` is cleared at once and the second map is driven by `layers.state.compare` (the strip front is the line).
- **28-17:** render order is maps, then `SwipeSurface` (only while `layers.state.swipeMode`), then the controls. Hide the download chip and close the bubble while the swipe mode is on. `done` frees the map and keeps a comparison.
- **Native/device checks (28-18):** the gesture runs on the JS thread; if the wipe lags on the iPhone, moving the update handler and the machine calls to the UI thread needs the availability and side layers passed as plain values (the machine functions are already worklets).
- The idle exit calls `layers.actions.exitSwipe` from the timer; `skippedCount` is read at entry only.

## Verification

- `npx jest -c jest.unit.config.js src/screens/public-map src/i18n src/__checks__ --coverage=false`: 47 suites, 632 tests pass.
- Coverage (per-file runs, threshold 95 % statements and lines): `useBasemapSwipe.ts` 100 % statements and lines, 96.55 % branches; `useSwipeModeTimers.ts` and `SwipeSurface.tsx` 100 %; `BasemapSwipeOverlay.tsx`, `QuitComparePill.tsx`, `swipe-labels.ts` 100 % in every column.
- `npm run lint` and `npm run typecheck` exit 0. `npm run format:check` only warns on `.claude/settings.local.json` (untracked local file, not touched; pre-existing, same as 28-02/28-09).
- Acceptance greps: `hintCancel`, `COMPARISON_BUILT`, `zoneHaptic(`, `releaseHaptic(`, `feedback.impact.medium()`, `feedback.selection()`, `isScreenReaderEnabled`, `ReduceMotion.System`, `accessibilityRole="adjustable"`, `mapControl.glass`, `compare-quit` all present; no zone threshold in `useBasemapSwipe.ts` (count 0); no hex or `rgba(` literal in the two components (count 0).

## Known Stubs

None. The components and the hook take their data through props; the Explorer wiring is 28-17.

## Threat Flags

None. T-28-32 (an old base reaching the saved preference): every commit goes through `layers.actions.commitBase` and side changes through `setSide`, tested. T-28-33/34: four exits plus the screen-reader path, idle off with a screen reader on, tested. T-28-35: one cue per zone change, asserted (including the back-and-forth around a boundary).

## Self-Check: PASSED

- FOUND: all eight source and test files and the two catalogue files
- FOUND commits e76ef5b5, f2b27106, 19b28246 on `claude/focused-sutherland-89f87e`
