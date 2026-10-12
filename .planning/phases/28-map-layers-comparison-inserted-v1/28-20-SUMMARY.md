---
phase: 28-map-layers-comparison-inserted-v1
plan: 20
subsystem: mobile-map
tags: [map, explorer, comparison, swipe, single-mode, item-13]
requires: ["28-19"]
provides:
  - "mapLayersReducer: startCompare sets swipeMode false in the same change; enterSwipe and toggleSwipe return the same state object while state.compare is not null"
  - "swipe-machine: beginGesture({ x, y }) always full width; MoveContext = { width, layerOf, isAvailable, comparisonAllowed? }; two-zone split at COMPARE_MIN; no side branch in liveHint; tapAction, SIDE_COMMIT and wipe-geometry sideOf removed (sideBounds kept)"
  - "useBasemapSwipe: no comparison branch, a tap always exits, comparisonAllowed = COMPARISON_BUILT, no guard on next/previous/compareNext, never calls setSide"
  - "BasemapSwipeOverlay without the comparing prop; fr.mapLayers.basemap without the in-comparison hint; fr.mapLayers.compare.announceStart = 'Comparaison : {left} à gauche, {right} à droite.'"
  - "MapTopControls.basemapDisabled (swipe mode only) with testID map-globe-button: disabled, accessibilityState { expanded, disabled }, glyph at brandInteraction.disabledOpacity, dot kept"
  - "useExplorerSwipe: no third map, no side cover, no onSecondStyleLoaded; quitPillVisible === comparing; Cover = { kind: 'full' | 'keep'; layer }"
affects:
  - "28-21 (centre line and grabber)"
  - "28-23 (side tags with chevrons: re-adds the third map and the second-map style routing)"
status: complete
tech-stack:
  added: []
  patterns:
    - "single comparison mode enforced in the reducer (not only in the UI), so a stray press cannot stack a frozen swipe mode over a comparison"
key-files:
  created: []
  modified:
    - mobile/src/screens/public-map/map-layers-state.ts
    - mobile/src/screens/public-map/map-layers-state.test.ts
    - mobile/src/screens/public-map/useMapLayersState.test.ts
    - mobile/src/map/swipe-machine.ts
    - mobile/src/map/swipe-machine.test.ts
    - mobile/src/map/wipe-geometry.ts
    - mobile/src/map/wipe-geometry.test.ts
    - mobile/src/i18n/fr/map-layers.ts
    - mobile/src/i18n/fr/map-layers.test.ts
    - mobile/src/screens/public-map/useBasemapSwipe.ts
    - mobile/src/screens/public-map/useBasemapSwipe.test.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.tsx
    - mobile/src/screens/public-map/BasemapSwipeOverlay.test.tsx
    - mobile/src/screens/public-map/MapControls.tsx
    - mobile/src/screens/public-map/MapControls.test.tsx
    - mobile/src/screens/public-map/useExplorerSwipe.ts
    - mobile/src/screens/public-map/useExplorerSwipe.test.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.test.tsx
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
decisions:
  - "WipeGesture.side and ReleaseResult.side stay typed SideKey (always 'full' now) so the controller and the stacked-map types are unchanged"
  - "SIDE_WIPE stays exported from map-stack-mode.ts although nothing reads it now: 28-23 reads it for the tag step"
  - "StackedMapView, WipeLayer.onStyleLoaded and useMapSync stay (28-23 re-uses them for the third map)"
metrics:
  commits: 3
---

# Phase 28 Plan 20: One single comparison mode Summary

The swipe mode and the comparison no longer coexist: a release in the compare zone starts the comparison and ends the swipe mode in one state change, the map is free (pan and zoom) with the one "Quitter la comparaison" pill, the globe is disabled and dimmed, and the swipe machine, controller and top stack lost all side-wipe code.

## Tasks

| Task | Commit | Result |
|------|--------|--------|
| 1. Layers state keeps the two modes apart | 7b4a1e7e | `startCompare` adds `swipeMode: false`; `enterSwipe` / `toggleSwipe` return `state` while comparing; reducer and hook tests |
| 2. Full-width gestures only | f1492933 | machine, controller, top stack and strings (see provides) |
| 3. Globe disabled; Explorer wiring | 9bb30c34 | `basemapDisabled`, `map-globe-button`, `useExplorerSwipe` / `ExplorerSwipeLayers` single mode, screen tests rewritten |

## Verification

- `npx jest -c jest.unit.config.js src/map` with coverage: swipe-machine.ts and wipe-geometry.ts 100 % statements, branches, lines; all of `src/map` 100 % statements and lines
- Per-file: BasemapSwipeOverlay.tsx, ExplorerSwipeLayers.tsx, useExplorerSwipe.ts, map-layers-state.ts 100 %; useBasemapSwipe.ts 100 % statements and lines (two pre-existing `??` branches); MapControls.tsx 100 % statements and lines
- `npm run test:coverage:mobile`: 361 suites, 5082 tests passed; Statements 95.55 %, Branches 89.91 %, Functions 95.17 %, Lines 95.92 %
- `npm run lint`, `npm run typecheck`, `prettier --check mobile/src/screens mobile/src/map mobile/src/i18n`: exit 0
- Negative greps over `mobile/src`: `tapAction|SIDE_COMMIT|otherOf|sideOf|hintSwipeCompare|Relevés masqués` 0; `sideWipeLayer|third-map` 0; `setSide|SIDE_WIPE` in useBasemapSwipe.ts 0; `comparing` in BasemapSwipeOverlay.tsx 0
- `PublicMapScreen.tsx` 375 lines (cap 380); `useBasemapSwipe.ts` 384 lines (cap 400)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ExplorerSwipeLayers touched in Task 2**
- **Found during:** Task 2
- **Issue:** removing the `comparing` prop of `BasemapSwipeOverlay` broke `ExplorerSwipeLayers.tsx` (assigned in Task 3), so the commit would not compile
- **Fix:** removed the prop line in Task 2 and updated the two `ExplorerSwipeLayers.test.tsx` cases that read it; the rest of the file (third map) was done in Task 3 as planned
- **Files modified:** `ExplorerSwipeLayers.tsx`, `ExplorerSwipeLayers.test.tsx`
- **Commit:** f1492933

**2. [Rule 1 - Dead code] `onSecondStyleLoaded` removed**
- **Found during:** Task 3
- **Issue:** only the side cover waited for the second map's style (`wait: "second"`); with the side cover gone the callback, the `wait` field and the `WipeLayer` wiring in `ExplorerSwipeLayers` had no user (TypeScript also rejects the `=== "second"` comparison once `wait` is gone)
- **Fix:** removed `ExplorerSwipe.onSecondStyleLoaded`; `onBaseStyleLoaded` now clears the cover unconditionally; `Cover` is `{ kind: "full" | "keep"; layer }`. 28-23 re-adds the second-map routing together with the third map
- **Commit:** 9bb30c34

### Kept on purpose

- `SIDE_WIPE` in `map-stack-mode.ts`, `WipeLayer.onStyleLoaded`, `useMapSync`, `StackedMapView`: no reader left in 28-20, but 28-23 names them in its read list.

None otherwise: plan executed as written. Tests were written alongside the code in each task (a reducer or machine change and its tests in the same sitting) rather than strictly red first.

## Known Stubs

None.

## Threat Flags

None. T-28-49 mitigated: the reducer refuses the swipe mode while comparing and ends it on `startCompare`, tested in the reducer, the hook and the screen. T-28-50 mitigated: `useBasemapSwipe` never calls `setSide`.

## Self-Check: PASSED

Commits 7b4a1e7e, f1492933, 9bb30c34 exist on the branch; all listed files exist; STATE.md and ROADMAP.md untouched.
