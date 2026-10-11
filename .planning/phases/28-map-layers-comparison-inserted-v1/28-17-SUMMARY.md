---
phase: 28-map-layers-comparison-inserted-v1
plan: 17
subsystem: mobile-map
tags: [map, explorer, swipe, comparison, wipe, curtain, stacked-maps, cleanup]
requires: ["28-01", "28-05", "28-09", "28-11", "28-12", "28-13", "28-14", "28-16"]
provides:
  - "mobile/src/screens/public-map/useExplorerSwipe.ts: useExplorerSwipe, ExplorerSwipe, ExplorerSwipeInput, ExplorerSwipeView, StackedMapView"
  - "mobile/src/screens/public-map/ExplorerSwipeLayers.tsx: ExplorerSwipeLayers, ExplorerSwipeLayersProps, StackedContentProps"
  - "MapTopControls basemapMode, swipeModeOn, basemapDot; BasemapSwipeOverlay onHeight; ExplorerPanelsView noticesTop"
affects:
  - "28-18 (device checks and the docs)"
tech-stack:
  added: []
  patterns:
    - "cover-until-loaded derived while rendering (previous wipe kept in state), so the stacked map is never unmounted for a frame between a wipe and its cover"
    - "one stacked map element per slot with a stable key, fed by the controller's strip (wipe, cover) or the curtain's strip (comparison, keep cover)"
key-files:
  created:
    - mobile/src/screens/public-map/useExplorerSwipe.ts
    - mobile/src/screens/public-map/useExplorerSwipe.test.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.test.tsx
  modified:
    - mobile/src/screens/public-map/MapControls.tsx
    - mobile/src/screens/public-map/MapControls.test.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.test.tsx
    - mobile/src/screens/public-map/ExplorerPanelsView.tsx
    - mobile/src/screens/public-map/ExplorerPanelsView.test.tsx
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
    - mobile/src/app/feature-flags.ts
    - mobile/src/app/feature-flags.test.ts
    - mobile/README-native.md
  deleted:
    - mobile/src/screens/public-map/useSwipeSpike.tsx
    - mobile/src/screens/public-map/useSwipeSpike.test.tsx
    - mobile/src/screens/public-map/SpikeStacks.tsx
decisions:
  - "useExplorerSwipe takes { layers: ExplorerLayers, cameraRef, region, closePanels } and reads the window size itself; it computes the number of skipped layers itself"
  - "The swipe flags (hidden surveys, skipped layers) come back to useExplorerLayers through a state fed by an effect, not a ref: a ref set after the hook ran would not re-render, so the pill would wait for an unrelated render"
  - "Edge exit and quit dispatch quitCompare at once and keep the second map covering until the Explorer map has loaded the kept style; the plan's wording (quitCompare after the load) cannot work because the Explorer map only loads that style after quitCompare"
  - "The Explorer camera is also put north up and flat when the swipe mode starts, not only when a comparison starts, because the stacked wipe map is north up and flat"
status: complete
---

# Phase 28 Plan 17: Swipe mode and comparison wired into the Explorer Summary

The Explorer's globe now enters the basemap swipe mode: a swipe changes the base through stacked maps, a release in the middle third compares two layers behind a draggable line, side swipes change one side, and "Terminé" and "Quitter la comparaison" leave each state; the 28-01 spike scaffolding is gone. `PublicMapScreen.tsx` is 379 lines.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | The globe in swipe mode | b835ea95 | `MapControls.tsx` (+ test) |
| 2 | The swipe and comparison lifecycle hook and its view component | e741c15f | `useExplorerSwipe.ts`, `ExplorerSwipeLayers.tsx` (+ tests), `BasemapSwipeOverlay.tsx` (+ test) |
| 3 | Swipe mode and comparison wired; spike scaffolding removed | 5857b0ff | `PublicMapScreen.tsx` (+ test), `ExplorerPanelsView.tsx` (+ test), `useExplorerSwipe.ts` (+ test), `feature-flags.ts` (+ test), `README-native.md`; deleted `useSwipeSpike.tsx` (+ test), `SpikeStacks.tsx` |

## What it does

- **Globe** (`MapTopControls`): `basemapMode="swipe"` shows "Changer de fond de carte", its hint, `expanded` = swipe mode on, an 8 pt dot 11 pt from the top-right (`map-basemap-dot`) with the value "fond modifié", glyph `earth-outline` while Plan is displayed. Without `basemapMode` the parcel picker is unchanged. The capsule keeps `mapControl.glass`.
- **`useExplorerSwipe`** composes `useBasemapSwipe` (zones, hints, zone and release haptics stay there: the acceptance grep for `swipeZone(`, `zoneHaptic(`, `COMPARE_MIN`, `COMPARE_MAX`, `ZONE_HYSTERESIS`, `impact.medium` prints 0), `useCurtainClip`, `useMapSync` and `useTransientFlag`. It only plays `feedback.selection()` once on an edge exit, on "Quitter la comparaison" and on a handle side action, and calls only the 28-09 action signatures.
- **Stacked maps.** Second map (key `second-map`): the wipe's incoming layer (strip from the controller), then the curtain's second side (strip from the line) on a release in the middle, so the wipe's map is reused. Third map (`third-map`): only for a side wipe. Each is mounted only if `WIPE_PRESENTATION` / `SIDE_WIPE` is "wipe"; `COMPARISON_BUILT` false returns nothing of the curtain.
- **Cover until loaded.** After a full-wipe commit the second map stays full width until `onBaseStyleLoaded` (or the layers state says the Explorer map is done, or 8 s); after a side commit the third map covers until the map drawing that side reports its style (`onBaseStyleLoaded` or `onSecondStyleLoaded`); after an edge exit or the quit slide that keeps the second map's layer, the second map covers (curtain phase `covering`) until the Explorer map has loaded it. Keeping the Explorer map's own layer unmounts the second map at once.
- **Comparison start:** camera `jumpTo` (centre of the region, bearing 0, pitch 0), markers hidden, rotation locked, the "Les relevés sont masqués pendant la comparaison." pill for 4 s.
- **Swipe mode:** map frozen; the globe closes the bubble and the card first; opening a panel, leaving the tab (`useScreenFocus`) or `Terminé` ends it, a comparison stays. The chip is hidden by `useExplorerLayers.chipShown` (from the layers state), the download announcements continue.
- **Notices** start below the swipe stack (measured through the new `BasemapSwipeOverlay.onHeight`, 100 pt estimate before the first layout) or below the 40 pt quit pill; the chip row still wins when it is lower.
- **`ExplorerSwipeLayers`** renders in z-order: second map, third map, `SwipeSurface` (swipe mode), `CurtainHandle` and `CurtainSideTags` (comparing), `BasemapSwipeOverlay` (swipe mode), `QuitComparePill` (`quitPillVisible`). Stacked maps draw `MapContentLayers` with the Explorer's overlay, Parcelles mode, parcels and survey parcels, not interactive.

## Hook order in `PublicMapScreen` (kept)

ref + `useLatestCallback` -> `useExplorerPanels` -> `useExplorerLayers` -> `useExplorerSwipe` -> `swipePanelExitRef.current = swipe.onPanelOpen`. `chipShown` stays derived inside `useExplorerLayers` from `layers.state.swipeMode`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The flags ref of the plan would never re-render**
- **Issue:** the plan fed `hiddenSurveys` and `showSkipped` to `useExplorerLayers` through a ref written after `useExplorerSwipe`. A ref write does not render, and the swipe hook's own state changes render the screen before the ref is updated, so the "surveys are hidden" pill would only appear (and disappear) on an unrelated render.
- **Fix:** a `useState` in the screen fed by a `useEffect` on the two flags (one extra render per toggle). The ref for `onPanelOpen` is as planned.
- **Files:** `PublicMapScreen.tsx`. **Commit:** 5857b0ff.

**2. [Rule 1 - Bug] "quitCompare after the Explorer map has loaded" cannot happen**
- **Issue:** the plan says an edge exit that keeps the second map's layer covers "until the Explorer map has loaded that style, then `quitCompare(keep)`". The Explorer map only changes its style after `quitCompare` moves `displayedBase`, so waiting first would never end.
- **Fix:** `quitCompare(keep)` is dispatched at once with a `keep` cover (second map full width via the curtain's `covering` phase) that is dropped on `onBaseStyleLoaded` (same for the pill after its slide when side A is the second map's layer).
- **Files:** `useExplorerSwipe.ts`. **Commit:** e741c15f.

**3. [Rule 2 - Missing critical functionality] North up and flat when the swipe mode starts**
- **Issue:** the stacked wipe map is north up and flat; a rotated or pitched Explorer map would not match it during a wipe (the plan resets only when a comparison starts).
- **Fix:** the same `jumpTo` also runs when the swipe mode turns on (and again when a comparison starts). One extra jump with the current centre; zoom is left to the camera (`jumpTo` takes an optional zoom and `computeRegionZoom` is rounded). To revert if the owner does not want the snap: delete one effect.
- **Files:** `useExplorerSwipe.ts`.

**4. [Rule 3 - Blocking] Measured top control needs a layout callback**
- **Issue:** "noticesTop below the measured top control" needs the swipe stack's height; `BasemapSwipeOverlay` (28-13, not in the plan's file list) exposed none.
- **Fix:** optional `onHeight` on its root view (+ test). The hook owns the measurement, so the plan's `topControlHeight` input is gone.
- **Files:** `BasemapSwipeOverlay.tsx`, its test. **Commit:** e741c15f.

**5. [Rule 3 - Blocking] ExplorerPanelsView had no way to take another notices top**
- Added optional `noticesTop` (falls back to `layers.noticesTop`) and a test.
- **Files:** `ExplorerPanelsView.tsx`, its test. **Commit:** 5857b0ff.

**6. Input shape of `useExplorerSwipe`**
- The plan listed `{ layers, savedBasemap, width, height, cameraRef, region, isAvailable, skippedCount, topControlHeight }`. To keep the screen at 379 lines the hook takes `{ layers: ExplorerLayers, cameraRef, region, closePanels }`, reads `useWindowDimensions` itself, takes `isAvailable`, `capsuleTop` and the base `noticesTop` from `ExplorerLayers`, counts the skipped layers with `skippedCount(isAvailable)` and does not pass `savedBasemap` (the controller never read it). It also returns `toggleSwipe` (panels closed, then `layers.actions.toggleSwipe`), which the screen gives the globe instead of `layers.actions.toggleSwipe` directly, because entering must close the bubble and the card.

**7. Tests that described the removed behaviour**
- `PublicMapScreen.test.tsx`: the spike cases and the "one tap switches the basemap" case were replaced; the Reanimated, gesture-handler and MapLibre mocks now record the pan handlers and `jumpTo`, so the real controller is driven like a finger (compare, commit, cancel, edge exit, Terminé, quit pill with Reduce Motion).

## Verification

- Task 1 verify: `MapControls.test.tsx`, `SurveyParcelSelectionScreen`, `visual-tokens.test.ts`, `glass-density.test.ts`: pass.
- Task 2 verify (coverage floor 95): `useExplorerSwipe.ts` and `ExplorerSwipeLayers.tsx` at 100 % statements, branches, functions, lines; `npx tsc --noEmit` clean.
- Task 3 verify: `npx jest -c jest.unit.config.js src/screens src/app/feature-flags.test.ts src/__checks__` (142 suites, 1713 tests), `tsc --noEmit`, `PublicMapScreen.tsx` = 379 lines.
- `npm run test:coverage:mobile`: 362 suites, 5097 tests, exit 0 (`PublicMapScreen.tsx` 97.1 % statements, only the pre-existing `measureInWindow` callback uncovered).
- `npm run lint` and `npm run typecheck`: exit 0. `npm run format:check`: only the untracked local `.claude/settings.local.json` warns (not mine, same as 28-02 to 28-16).
- Acceptance greps: `EXPO_PUBLIC_SWIPE_SPIKE` in `mobile/src` = 0; `useSwipeSpike.tsx` gone; `<ExplorerSwipeLayers`, `basemapMode="swipe"`, `swipePanelExitRef.current = swipe.onPanelOpen`, `"second-map"`, `useBasemapSwipe(`, `layers.actions.quitCompare("A")` present; no zone rule in the two new files.
- Not run: any device check (stacked maps, glass over the map, the wipe's fluidity, Android texture view). 28-18.

## For 28-18 (device checks and the docs)

- `LEFT_MAP_ANDROID_VIEW` ("texture") is now passed as `androidView` **always** on the Explorer map, not only in swipe mode (switching it at runtime would remount the native view). Check Android pan fluidity of the plain Explorer with a texture view; the constant is in `map-stack-mode.ts`.
- Check the cover on a real device: a committed wipe, a side wipe commit, an edge exit and the quit pill each keep a stacked map until the Explorer map (or the second map for a side it draws) reports its style; a cover is also dropped after 8 s.
- Check the north-up snap when entering the swipe mode on a rotated map (deviation 3), and that the camera `jumpTo` with no zoom keeps the zoom on both platforms.
- The swipe stack's height is measured through `onLayout`; the 100 pt estimate is only used before the first layout. Check that the notices column does not jump when the 3 s hint appears and fades (the hint is part of the measured column).
- The handle line starts at `capsuleTop` (not the exact top safe area) and its knob is at 32 % of the window height.
- A second wipe started while a cover is still waiting takes the second map over (wipe has priority); the Explorer map is still loading then, so a blank strip could show for that short moment.
- `docs/user-tests/device-checks.md` DL-01 still mentions `EXPO_PUBLIC_SWIPE_SPIKE` as historical evidence (left untouched); CLAUDE.md navigation lines for the swipe mode are the docs work of 28-18.
- Reduce Motion: the controller makes wipes instant, so no stacked map mounts for a gesture; the quit pill's slide is instant (`useCurtainClip`).

## Known Stubs

None.

## Threat Flags

None. T-28-41 (leftover build variable): the two spike readers, the driver and the README steps are deleted, `grep -rn EXPO_PUBLIC_SWIPE_SPIKE mobile/src` prints 0. T-28-42 (maps left mounted): a stacked map unmounts on its style load, on a cover's 8 s limit, when the comparison ends and when the swipe mode ends (tested). T-28-43 (surveys hidden without explanation): the 4 s pill and the comparison announcement (28-13) are in place.

## Self-Check: PASSED

- FOUND: `useExplorerSwipe.ts`, `useExplorerSwipe.test.tsx`, `ExplorerSwipeLayers.tsx`, `ExplorerSwipeLayers.test.tsx`; `useSwipeSpike.tsx`, `useSwipeSpike.test.tsx`, `SpikeStacks.tsx` absent
- FOUND commits b835ea95, e741c15f, 5857b0ff on `claude/focused-sutherland-89f87e`
