---
phase: 28-map-layers-comparison-inserted-v1
plan: 24
subsystem: mobile-map
tags: [map, capsule, download-button, overlay-button, chip, item-13a]
requires: ["28-23"]
provides:
  - "useLocateAction({ moveTo }) -> { locating, onLocate } (screens/public-map/useLocateAction.ts)"
  - "styles.ts: MAP_BUTTON_GAP = 8, overlaySlotTopOf(capsuleTop), downloadButtonTopOf(capsuleTop)"
  - "MapControls.tsx: MapTopControls overlay slot (type MapOverlaySlot { active, expanded, onPress }), MapDownloadButton({ top, onPress }) (testID map-download-button), createControlStyles().downloadButton / downloadCircle"
  - "useExplorerLayers: input bubbleOpen (capsuleButtons removed); output downloadButtonTop, overlayBubbleTop (overlayButtonTop removed); chipShown false while the bubble is open"
  - "DownloadChip: prop buttonTop (top removed)"
  - "ExplorerPanelsView: prop downloadEnabled; renders MapDownloadButton"
affects:
  - "28-26 (immersive wiring: the capsule, the download button and the chip are the buttons that fade; PublicMapScreen.tsx is at 359 lines)"
status: complete
tech-stack:
  added: []
  patterns:
    - "opt-in slot on a shared component (overlay) so the parcel picker keeps its capsule through the unchanged default props"
key-files:
  created:
    - mobile/src/screens/public-map/useLocateAction.ts
    - mobile/src/screens/public-map/useLocateAction.test.ts
  modified:
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
    - mobile/src/screens/public-map/styles.ts
    - mobile/src/screens/public-map/MapControls.tsx
    - mobile/src/screens/public-map/MapControls.test.tsx
    - mobile/src/screens/public-map/useExplorerLayers.ts
    - mobile/src/screens/public-map/useExplorerLayers.test.ts
    - mobile/src/screens/public-map/DownloadChip.tsx
    - mobile/src/screens/public-map/DownloadChip.test.tsx
    - mobile/src/screens/public-map/ExplorerPanelsView.tsx
    - mobile/src/screens/public-map/ExplorerPanelsView.test.tsx
  deleted:
    - mobile/src/screens/public-map/OverlayButton.tsx
    - mobile/src/screens/public-map/OverlayButton.test.tsx
decisions:
  - "The overlay slot object given to MapTopControls is memoised in the screen so the memoised capsule does not redraw on every render"
  - "MapDownloadButton is drawn by ExplorerPanelsView before the map controls (above the bubble backdrop, under the bubble and the card), the position the old round overlay button had"
  - "noticesTop with a chip is downloadButtonTop + 25 + MAP_PILL_HEIGHT / 2 + MAP_BUTTON_GAP, computed from the helpers (about capsuleTop + 163 with the real hairline, UI-SPEC rounds it to +162)"
metrics:
  tasks: 3
  commits: 3
---

# Phase 28 Plan 24: The capsule layout (item 13 a) Summary

The Explorer's capsule now holds the globe and the overlay (layers) button together; the download button is a separate round 50 pt glass button 8 pt below it, drawn only when offline maps are on. The download chip is centred on that button and hidden while the overlay bubble is open, the notices column starts below the chip's row, and the bubble opens level with the overlay button. The locate action left the screen for a small tested hook.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | The locate action leaves the screen | 63728237 |
| 2 | The capsule's overlay slot and the round download button | d25eb509 |
| 3 | The Explorer uses the new layout; the round overlay button is removed | 264cedc4 |

## What was built

- **`useLocateAction`**: the `locating` state, the permission and position calls, the 0.012 span over 450 ms and both alerts, unchanged in behaviour and text; `PublicMapScreen.tsx` calls it once. The screen went from 375 to 349 lines before the layout wiring and ends at 359 (limit 380).
- **Helpers (`styles.ts`)**: `MAP_BUTTON_GAP = 8`, `overlaySlotTopOf(top) = capsuleButtonCenterY(top, 1) - 25`, `downloadButtonTopOf(top) = top + capsuleHeight(2) + 8`. Capsule helper comments now say the second button is the overlay button in the Explorer.
- **`MapTopControls` overlay slot**: with `overlay={{ active, expanded, onPress }}` the second button is the overlay button (`map-overlay-button`, `layers-outline`, same label, hint, expanded state and "réglages modifiés" value as the old round button, moss dot `map-overlay-dot` 8 pt at 11 pt) after a hairline; the picker's download slot is not drawn then. Without `overlay` the picker keeps its download button (or the globe alone), so `SurveyParcelSelectionScreen.tsx` is untouched.
- **`MapDownloadButton`**: `AppPressable` (`map-download-button`) around a round `GlassSurface` (`mapControl.glass`, 1 pt `mapControl.hairline`, radius 25), 50 pt, 14 pt from the right edge, `download-outline`, label `fr.offlineMap.areas.openSheet`.
- **`useExplorerLayers`**: takes `bubbleOpen` instead of a button count; exposes `downloadButtonTop` and `overlayBubbleTop` from the helpers; `chipShown` is false while the bubble is open (U-13); `noticesTop` is below the chip's row while a chip shows, else `capsuleTop`.
- **`DownloadChip`**: `buttonTop` instead of `top`; top = `buttonTop + 25 - 20`, right 72 (the gap is `MAP_BUTTON_GAP`).
- **`ExplorerPanelsView`**: `downloadEnabled`; renders `MapDownloadButton` at `downloadButtonTop` (press opens the card through `panels.openCard`), the bubble at `overlayBubbleTop`, the chip with `buttonTop`. `OverlayButton.tsx` and its test are deleted (their cases moved into `MapControls.test.tsx`).
- **Screen**: `PublicMapScreen.tsx` passes the memoised `overlay` slot to the capsule (no download callback any more), `downloadEnabled={offlineEnabled}` and `bubbleOpen`.

## Verification

- `useLocateAction.test.ts` (4 cases), `MapControls.test.tsx` (overlay slot, download button, picker, helpers; file at 100 % statements and lines), `useExplorerLayers.test.ts`, `DownloadChip.test.tsx`, `ExplorerPanelsView.test.tsx`, and four new screen cases in `PublicMapScreen.test.tsx` (capsule contents, download button position and card, chip centred and hidden with the bubble, notices below the chip row). Offsets are asserted through the helpers.
- `npx jest src/screens src/__checks__`: 143 suites, 1764 tests pass. `npm run test:coverage:mobile`: 365 suites, 5196 tests pass. `npm run lint`, `npm run typecheck` and `npx prettier --check mobile/src/screens` pass. `npx tsc --noEmit` was run in `mobile/` before each commit.
- Negative grep for the removed names (`OverlayButton`, `overlayButtonTop`, `capsuleButtons`, `DOWNLOAD_BUTTON_INDEX`) over `mobile/src`: 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The screen test's react-native mock had no `hairlineWidth`**
- **Found during:** Task 3
- **Issue:** the capsule helpers read `StyleSheet.hairlineWidth`; the screen test's mock left it undefined, so computed offsets were NaN and the new offset assertions could not mean anything.
- **Fix:** added `hairlineWidth: 0.5` to the mock's `StyleSheet` in `PublicMapScreen.test.tsx`.
- **Commit:** 264cedc4

### Notes

- Tests were written in the same commit as the code, not strictly before it (the plan says "tests first"); every behaviour of the plan is covered.
- The overlay slot is memoised in the screen (not in the plan) to keep `MapTopControls` memoisation effective.

## Known Stubs

None.

## Threat Flags

None (layout of existing controls; no input, storage or network change).

## Self-Check: PASSED

- Created and modified files exist; `OverlayButton.tsx` and its test are gone.
- Commits 63728237, d25eb509 and 264cedc4 are on the branch.
- STATE.md and ROADMAP.md untouched.
