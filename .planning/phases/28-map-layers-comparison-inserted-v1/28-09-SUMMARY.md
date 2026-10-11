---
phase: 28-map-layers-comparison-inserted-v1
plan: 09
subsystem: mobile-map
tags: [map, layers, state, overlay, parcels, legend]
requires: ["28-02", "28-05"]
provides:
  - "mobile/src/screens/public-map/map-layers-state.ts: pure reducer and selectors of the Explorer layers"
  - "mobile/src/screens/public-map/useMapLayersState.ts: useMapLayersState with stable public actions and the preference writes"
  - "OverlayButton, ParcelsControl, OverlayBubble (mobile/src/screens/public-map/)"
  - "forestTypesLegend (app/visual-tokens.ts) and fr.mapLayers.overlays.legend"
affects:
  - "28-13, 28-16, 28-17 (Explorer wiring, swipe and comparison)"
tech-stack:
  added: []
  patterns:
    - "pure reducer plus a thin hook; actions made stable with useStableActions, public signatures typed once in MapLayersActions"
    - "comparison keeps `secondSide`: the Explorer map keeps one side, a second map draws the other"
key-files:
  created:
    - mobile/src/screens/public-map/map-layers-state.ts
    - mobile/src/screens/public-map/map-layers-state.test.ts
    - mobile/src/screens/public-map/useMapLayersState.ts
    - mobile/src/screens/public-map/useMapLayersState.test.ts
    - mobile/src/screens/public-map/OverlayButton.tsx
    - mobile/src/screens/public-map/OverlayButton.test.tsx
    - mobile/src/screens/public-map/ParcelsControl.tsx
    - mobile/src/screens/public-map/OverlayBubble.tsx
    - mobile/src/screens/public-map/OverlayBubble.test.tsx
  modified:
    - mobile/src/ui/AppChoiceChip.tsx
    - mobile/src/ui/AppChoiceChip.test.tsx
    - mobile/src/app/visual-tokens.ts
    - mobile/src/i18n/fr/map-layers.ts
decisions:
  - "Forest legend drawn by the app (CONTEXT item 10): five colour groups, colours read from the official image, no image asset"
  - "AppChoiceChip gets an optional radio role and testID; a selected radio ignores a press (no tick, no handler)"
  - "Selector layerOfSide takes the saved basemap: layerOfSide(state, saved, side)"
metrics:
  duration: "about 45 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 09: Layers state and overlay controls Summary

The Explorer's layers state (base, overlay, Parcelles, comparison with its derived second side, swipe mode) is a pure reducer plus a hook with stable actions that writes the saved basemap preference for Plan and Satellite only, and the round overlay button, the three-state Parcelles control and the overlay bubble with a simplified forest legend drawn by the app are built and tested.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Layers state reducer, selectors and hook | 21ef73e3 | `map-layers-state.ts` (+ test), `useMapLayersState.ts` (+ test) |
| 2 | Overlay button and Parcelles control | 8a804dd2 | `OverlayButton.tsx` (+ test), `ParcelsControl.tsx`, `ui/AppChoiceChip.tsx` (+ test) |
| 3 | Overlay bubble | 0be2378c | `OverlayBubble.tsx` (+ test), `app/visual-tokens.ts`, `i18n/fr/map-layers.ts` |

## Exported API (for the next plans)

### map-layers-state.ts (pure)
- Types `CompareState = { sideA, sideB, secondSide: "left" | "right", x }`, `MapLayersState = { baseOverride, overlay, parcels, compare, swipeMode, loadingBase, failedLayer }`, `MapLayersAction`
- `INITIAL_MAP_LAYERS_STATE`, `mapLayersReducer(state, action)`
- `isSavedKind(key): key is "map" | "satellite"`, `secondSideFor(sideA, sideB, displayed)`
- Selectors: `displayedBase(state, saved)`, `secondMapLayer(state)`, `layerOfSide(state, saved, "left" | "right")`, `shownBases(state, saved)`, `globeDot(state, saved)`, `overlayDot(state)`

### useMapLayersState.ts
- `useMapLayersState({ savedBasemap: BasemapKey, saveBasemap: (b: BasemapKey) => void }): MapLayers`
- `MapLayers = { state, displayedBase, secondMapLayer, shownBases, globeDot, overlayDot, layerOfSide(side), actions }`
- `MapLayersActions` (stable identity, the only signatures to call): `enterSwipe()`, `exitSwipe()`, `toggleSwipe()`, `commitBase(key: BaseLayerKey)`, `startCompare({ sideA, sideB, x })` (the second side is derived), `setSide(side: "A" | "B", key: BaseLayerKey)`, `moveLine(x: number)`, `quitCompare(keep: "A" | "B")`, `toggleOverlay()`, `setParcels(mode: ParcelsMode)`, `styleLoaded()`, `styleFailed(layer: MapLayerKey)`
- `commitBase` and `quitCompare` call `saveBasemap` only when the resulting base is "map" or "satellite" (T-28-22); `setSide` never does. `quitCompare` without a comparison is a no-op. Neither the swipe actions nor `quitCompare` touch `swipeMode`; the caller decides.

### Components (`mobile/src/screens/public-map/`)
- `OverlayButton({ top, active, expanded, onPress })`: absolute, right 14; testIDs `map-overlay-button`, `map-overlay-dot`
- `ParcelsControl({ value: ParcelsMode, onChange })`: testIDs `overlay-parcels-all|ibp|none`
- `OverlayBubble({ top, forest, forestAvailable, parcels, comparing, onToggleForest, onChangeParcels })`: testIDs `map-overlay-bubble`, `overlay-forest-switch`, `overlay-forest-legend`; right 72, width 248 or the room left; dismissal and opening are the screen's job (28-16)

### Tokens and text
- `forestTypesLegend` and `ForestTypesLegendKey` in `app/visual-tokens.ts`; `fr.mapLayers.overlays.legend.{broadleaf,conifer,mixed,poplar,open}`

## Forest legend colours

Read on 2026-10-11 by decoding the PNG served at `https://data.geopf.fr/annexes/ressources/legendes/LANDCOVER.FORESTINVENTORY.V2-legend.png` (300 x 835, swatch column x = 28, the file stayed in the scratchpad and was never executed). One representative class per group:

| Group | Class | Colour |
|-------|-------|--------|
| Feuillus | Forêt fermée à mélange de feuillus | #00D92F |
| Conifères | Forêt fermée à mélange de conifères | #404DFF |
| Forêts mélangées | Forêt fermée à mélange de feuillus prépondérants et conifères | #FF6633 |
| Peupleraies | Peupleraie | #FFFF00 |
| Landes et forêts ouvertes | Forêt ouverte à mélange de feuillus et conifères | #FFD138 |

The owner may prefer other representative classes (for example pure beech, or the pale "Lande" #FFE6BF); the choice is one line in `visual-tokens.ts`.

## Verification

- `npx jest -c jest.unit.config.js src/screens/public-map/map-layers-state.test.ts src/screens/public-map/useMapLayersState.test.ts --coverage ...` : 28 tests, 100 % statements, branches, functions and lines on both files.
- The Task 3 coverage command (95 % floor): `OverlayBubble.tsx`, `OverlayButton.tsx`, `ParcelsControl.tsx` at 100 % in every column.
- `npx jest ... src/screens/public-map src/__checks__ src/i18n src/ui src/app/visual-tokens.test.ts --coverage=false`: 79 suites, 963 tests pass.
- `npm run lint` and `npm run typecheck` exit 0. `npm run format:check` only warns on `.claude/settings.local.json` (untracked local file, not touched, same as 28-02).
- No hex or `rgba(` literal in `OverlayButton.tsx`, `ParcelsControl.tsx` or `OverlayBubble.tsx` (the legend colours are in `visual-tokens.ts`).

## Deviations from Plan

**1. [Owner decision, CONTEXT item 10] Legend drawn by the app, no image asset**
- The plan's bubble `require`d `assets/map-layers/forest-types-legend.png` (300 x 69). 28-02 found the official image is 300 x 835 and did not bundle it. Per the orchestrator, the bubble draws five colour groups (swatch and label on a paper tile of the theme, `theme.colors.panel`), the plan's acceptance grep on `forest-types-legend.png` therefore does not apply. The container keeps `testID="overlay-forest-legend"` and the `legendA11y` label; the swatches are hidden from the accessibility tree by the labelled `accessible` group.
- Added `fr.mapLayers.overlays.legend` (the five group names), which 28-02 had not created, and `forestTypesLegend` in `visual-tokens.ts`.

**2. [Rule 3 - Blocking] `AppChoiceChip` extended**
- The plan asks for chips with `accessibilityRole="radio"` and the testIDs `overlay-parcels-*`; the shared chip hard-coded the "button" role and took no testID. Added two optional props (`accessibilityRole?: "button" | "radio"`, `testID?`) and the rule that a selected radio ignores a press (no tick, no handler), with tests. Existing callers are unchanged.

**3. Selector signature**: `layerOfSide(state, saved, side)` takes the saved basemap (without a comparison both sides are the displayed base, which needs it). The hook's own `layerOfSide(side)` has the plan's signature.

**4. Commit guard**: as in 28-02, commits go to `claude/focused-sutherland-89f87e` as ordered, so the `worktree-agent-*` allow-list was not applied (the protected-branch deny-list was). Only own files were staged, with pathspecs.

## Known Stubs

None. The components take their data through props; the Explorer wiring is 28-16 and 28-17.

## Threat Flags

None. T-28-22 (an old base reaching the saved preference) is mitigated and tested: only "map" and "satellite" reach `saveBasemap`. T-28-23 (parcels hidden and forgotten): overlay dot, helper sentence, cold start resets.

## Notes for the next plans

- The Explorer map style change on `commitBase` is signalled by `state.loadingBase`; call `actions.styleLoaded()` when it finishes and `styleFailed(layer)` on error.
- 28-16: `forestAvailable` comes from the offline status of the layer for the view; while comparing pass `comparing` so the bubble says the overlays apply to both sides.
- `AppChoiceChip` now offers the radio role for any other radio group.

## Self-Check: PASSED

- FOUND: all nine plan files, plus `AppChoiceChip.tsx` and its test, under `mobile/src`
- FOUND commits 21ef73e3, 8a804dd2 and 0be2378c on `claude/focused-sutherland-89f87e`
