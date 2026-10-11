---
phase: 28-map-layers-comparison-inserted-v1
plan: 16
subsystem: mobile-map
tags: [map, explorer, layers, overlay, parcels, notices, legend, offline, download]
requires: ["28-08", "28-09", "28-10", "28-11", "28-12", "28-15"]
provides:
  - "mobile/src/screens/public-map/useExplorerPanels.ts: useExplorerPanels, ExplorerPanel, ExplorerCardView, ExplorerPanels"
  - "mobile/src/screens/public-map/useExplorerLayers.ts: useExplorerLayers, ExplorerLayers"
  - "mobile/src/screens/public-map/ExplorerPanelsView.tsx: ExplorerPanelsView, ExplorerPanelsViewProps"
  - "ScoreLegend attributionLines, useAreaDownloadAction alertOnClosedFailure, DownloadCard onHeight"
  - "PublicMapRoute surveyParcelIds, PublicMapScreen surveyParcelIds"
affects:
  - "28-17 (swipe and comparison wiring), 28-18 (device checks)"
tech-stack:
  added: []
  patterns:
    - "one panel value makes the floating panels exclusive; the swipe exit reaches the panels hook through a stable useLatestCallback over a ref"
    - "the map controls are children of ExplorerPanelsView so the bubble's backdrop sits under them and the card above them"
key-files:
  created:
    - mobile/src/screens/public-map/useExplorerPanels.ts
    - mobile/src/screens/public-map/useExplorerPanels.test.ts
    - mobile/src/screens/public-map/useExplorerLayers.ts
    - mobile/src/screens/public-map/useExplorerLayers.test.ts
    - mobile/src/screens/public-map/ExplorerPanelsView.tsx
    - mobile/src/screens/public-map/ExplorerPanelsView.test.tsx
    - mobile/src/screens/public-map/useAreaDownloadAction.test.ts
  modified:
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
    - mobile/src/screens/public-map/ScoreLegend.tsx
    - mobile/src/screens/public-map/ScoreLegend.test.tsx
    - mobile/src/screens/public-map/useAreaDownloadAction.ts
    - mobile/src/screens/public-map/DownloadCard.tsx
    - mobile/src/screens/public-map/DownloadCard.test.tsx
    - mobile/src/navigation/routes/PublicMapRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/i18n/fr/map-layers.ts
decisions:
  - "ExplorerPanelsView takes the map's own controls as children (capsule, locate arrow, legend): the bubble's transparent backdrop is under them, so a tap on the download button opens the card at once (UI-SPEC section 10), and the card is above the legend like the old sheet was"
  - "Closing the card with its close control, and starting or retrying a download, use closePanel (status kept); only Terminé and the cluster sheet's dismissal use closeAll (status cleared). A failed chip therefore survives a closed card, as UI-SPEC section 6 says"
  - "Style load failures are attributed to the displayed base (onDidFailLoadingMap carries no layer): styleFailed(displayedBase). Réessayer bumps styleRetryKey and the next onDidFinishLoadingStyle clears the notice"
  - "surveyParcelIds is an input of useExplorerLayers (as the plan lists it) and is handed back unchanged for MapCanvas and, in 28-17, the stacked maps"
metrics:
  duration: "about 75 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 16: Explorer wiring Summary

The Explorer now has the round overlay button with its bubble (Types de forêt, Parcelles Toutes / Avec IBP / Aucune), the centred notices column, the legend source lines, and the compact download card then chip, all in `PublicMapScreen.tsx` at 358 lines. The capsule keeps its Plan/Satellite toggle and the locate arrow is unchanged (it only rises above an open card).

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Panel state and the Explorer layers hook | 296ad3cc | `useExplorerPanels.ts`, `useExplorerLayers.ts` (+ tests) |
| 2 | Legend source lines, download action option, route survey parcels, panels view | 41ee244c | `ScoreLegend.tsx`, `useAreaDownloadAction.ts`, `PublicMapRoute.tsx`, `ExplorerPanelsView.tsx`, `DownloadCard.tsx` (+ tests), `fr.mapLayers.overlays.closeA11y` |
| 3 | The Explorer screen wired in the fixed hook order | 9562a69d | `PublicMapScreen.tsx`, `PublicMapScreen.test.tsx` |

## Exported API (for 28-17 and 28-18)

### Hook order in `PublicMapScreen` (kept by 28-17)
1. `const swipePanelExitRef = useRef<() => void>(noop)` and `const handlePanelOpen = useLatestCallback(() => swipePanelExitRef.current())`
2. `const panels = useExplorerPanels({ clearDownloadStatus, onPanelOpen: handlePanelOpen })`
3. `const layers = useExplorerLayers({ savedBasemap: basemap, saveBasemap: onChangeBasemap, region: viewport.region, areas: offlineAreas.areas, isOffline, surveyParcelIds, downloadStatus, cardOpen: panels.panel === "card", capsuleTop, capsuleButtons: offlineEnabled ? 2 : 1, hiddenSurveys: false, showSkipped: false })`
4. 28-17 only: `useExplorerSwipe(...)` after step 3, then `swipePanelExitRef.current = swipe.onPanelOpen`; pass `hiddenSurveys` and `showSkipped` to step 3 from state that does not need the swipe hook (the hook derives `chipShown` from its own `layers.state.swipeMode`).

### useExplorerPanels.ts
- `useExplorerPanels({ clearDownloadStatus, onPanelOpen }): ExplorerPanels`
- `ExplorerPanel = "card" | "bubble" | "cluster" | null`, `ExplorerCardView = "form" | "failed" | "partial"`
- Returned fields: `panel`, `cardView`, `clusterItems: PublicMapItem[] | null`, `areaChosen`
- Functions (all identity-stable, `useStableActions`): `openCard()` (form view, drops cluster list, resets `areaChosen`, calls `clearDownloadStatus` then `onPanelOpen`), `openCardOn("failed" | "partial")` (status kept, calls `onPanelOpen`), `toggleBubble()` (opening calls `onPanelOpen` and replaces the card), `closeBubble()` (bubble only), `openClusterList(items)` (does not call `onPanelOpen`), `closeCluster()` (a marker was chosen: only an open list closes), `closePanel()` (closes any panel, status kept), `closeAll()` (closes and calls `clearDownloadStatus`, a running status survives), `chooseArea()`, `unchooseArea()`.

### useExplorerLayers.ts
- `useExplorerLayers(input): ExplorerLayers` where `ExplorerLayers = LayerAvailability & { layers: MapLayers; surveyParcelIds; capsuleTop; skipped; chipShown; notices; noticesTop; overlayButtonTop; legendLines }` (`isAvailable`, `areaAtCenter` come from `useLayerAvailability`).
- `layers` is the whole `MapLayers` of 28-09 (`layers.actions`, `layers.state`, `layers.displayedBase`, `layers.shownBases`, `layers.layerOfSide`, `layers.secondMapLayer`, `layers.globeDot`, `layers.overlayDot`).
- `chipShown` = a status exists and the card is closed and `layers.state.swipeMode` is false. `noticesTop` = `capsuleTop`, or `capsuleButtonCenterY(capsuleTop, 1) + MAP_PILL_HEIGHT / 2 + 8` while a chip is shown (28-17 adds the swipe stack and the "Quitter la comparaison" pill offsets on top of this). `overlayButtonTop` = `capsuleTop + capsuleHeight(capsuleButtons) + 8`.
- `skipped` = `skippedCount(isAvailable)` only when `showSkipped`, else 0. `legendLines` = null in the default display, else one `layers.*.source` per shown layer, `layers.cadastreSource` when Parcelles is "all", then `sources.common`.

### ExplorerPanelsView.tsx
- `ExplorerPanelsView({ panels, layers, downloadStatus, estimate, downloading, onDownload, onRetry, onClearStatus, onRetryStyle, onCardHeight, forestAvailable, cardBottom, children })`. Render order: backdrop (`testID="overlay-bubble-backdrop"`, bubble open only), `OverlayButton`, `children` (capsule, locate arrow, legend), `OverlayBubble`, `MapNoticeStack`, `DownloadChip`, `DownloadCard`. It calls `useDownloadAnnouncements(downloadStatus)`. A failed chip reopens the card on "failed", any other pressable chip on "partial".
- 28-17 should put the swipe overlay and the curtain handle (and their controls) in the same `children` slot or above the view, below the card.

### Other
- `ScoreLegend` and `MapLegend` prop `attributionLines?: string[]` (screen passes `layers.legendLines ?? undefined`).
- `useAreaDownloadAction` option `alertOnClosedFailure = true` (the Explorer passes false; the too-large alert always shows).
- `DownloadCard` optional prop `onHeight(height)` (from `onLayout` of its positioned view).
- `PublicMapRoute` and `PublicMapScreen` prop `surveyParcelIds: ReadonlySet<string>` (ids of the author's local surveys, drafts included, trimmed and upper case through `resolveDraftParcelIds`).
- `fr.mapLayers.overlays.closeA11y` ("Fermer les superpositions"), the backdrop's accessibility label.
- The screen wires `MapCanvas` with `basemap={layers.layers.displayedBase}`, `forestOverlay`, `parcelsMode`, `surveyParcelIds`, `styleRetryKey`, `onStyleLoaded={layers.layers.actions.styleLoaded}` and `onStyleFailed`. The 28-01 spike mount is untouched (`useSwipeSpike`, `spike.overlay`, the globe's `spike.active ? spike.toggleSwipe : toggleBasemap`).

## Behaviour notes

- Card: bottom is `max(tabBarHeight, insets.bottom) + 14`. The locate arrow sits at `cardBottom + cardHeight + 10` while the card is open, `max(12, dockBottom + 10)` otherwise; the legend stays put and is covered by the card, as the old sheet covered it.
- Edge glow: card open on its form view, area not chosen, no download running. The card closes at once on Télécharger, so the glow goes then.
- A failure after the card has closed shows no alert (chip only); a refused area (too large) still alerts.
- Retry from the failed view downloads the framed area again under the failed status's name (default name when it has none), then closes the card.
- Parcelles "Avec IBP" counts a parcel with a submitted survey or with one of the author's own surveys (drafts included): the assumption to confirm with the owner (UI-SPEC open item 7).

## Verification

- Task 1 verify (coverage threshold 95): `useExplorerPanels.ts` and `useExplorerLayers.ts` 100 % statements, branches, functions, lines.
- Task 2 verify (`ScoreLegend`, `ExplorerPanelsView`, `src/navigation`, `SurveyParcelSelectionScreen`): pass; `ExplorerPanelsView.tsx`, `useAreaDownloadAction.ts` and `DownloadCard.tsx` 100 %.
- Task 3 verify: `npx jest -c jest.unit.config.js src/screens src/navigation src/__checks__ --coverage=false` (153 suites, 1885 tests), `npx tsc --noEmit`, `wc -l` of `PublicMapScreen.tsx` = 358 (cap 380).
- `npm run test:coverage:mobile`: 361 suites, 5047 tests pass, exit 0 (`PublicMapScreen.tsx` 97.7 % statements, `PublicMapRoute.tsx` 100 %).
- `npm run lint`, `npm run typecheck`: exit 0. `npm run format:check`: only the untracked local `.claude/settings.local.json` warns (not mine, as in 28-02 to 28-15).
- Acceptance greps: `<ExplorerPanelsView` 1, `useLatestCallback(` 5, `<OfflineAreasSheet` 0, `useExplorerSwipe` in `useExplorerLayers.ts` 0.
- Not run: device check of the glass bubble, backdrop taps over the native map, and the card/chip placement on a phone (glass and MapLibre are mocked in tests). 28-18.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `DownloadCard` had no way to report its height**
- **Issue:** the plan asks for the card's height to reach the screen (`onCardHeight`) so the locate arrow can rise above it, but `DownloadCard` (28-15) exposed no layout callback.
- **Fix:** optional `onHeight` prop on the card's positioned view (`onLayout`), with a test.
- **Files:** `DownloadCard.tsx`, `DownloadCard.test.tsx` (outside the plan's file list). **Commit:** 41ee244c.

**2. [Rule 1/2 - Behaviour] `closePanel` added next to `closeAll`**
- **Issue:** the plan's `closeAll` clears the download status. Used for the card's close control and after Télécharger or Réessayer, it would delete a failed chip that UI-SPEC section 6 says stays until resolved or the next download.
- **Fix:** `closePanel()` (status kept) for those three; `closeAll()` for Terminé and the cluster sheet's dismissal. Tested in the hook, the view and the screen.
- **Commit:** 41ee244c.

**3. [Design choice] Children slot instead of a separate z-order**
- The plan renders everything in one `ExplorerPanelsView`; a full-screen backdrop rendered after the capsule would swallow the first tap on the download button (UI-SPEC section 10: that tap opens the card and closes the bubble). The map's own controls are therefore passed as children and drawn between the backdrop and the bubble, with the card last.

**4. [Rule 3 - Blocking] Backdrop label**
- The backdrop is a real pressable and needs a label (`AppPressable` requires one): added `fr.mapLayers.overlays.closeA11y`.

**5. [Rule 3 - Blocking] `PublicMapScreen` prop type added in Task 2**
- `PublicMapRoute` cannot compile without `surveyParcelIds?` on the screen's props, so the type landed in the Task 2 commit and the destructuring and wiring in Task 3.

**6. Tests**
- The old "offline areas" tests of `PublicMapScreen.test.tsx` described the removed sheet and were replaced by the card and chip cases (including the "Terminé closes it" case, whose done fixtures now carry `failedLayers`). `useLayerAvailability` and `ForestTypesLayer` are mocked in that file (native pack metadata and MapLibre raster source). A new `useAreaDownloadAction.test.ts` covers the hook, which had no test of its own.

## Known Stubs

None. `hiddenSurveys: false` and `showSkipped: false` are the plan's declared inputs until 28-17 passes the swipe values; the globe keeps its Plan/Satellite toggle until 28-17.

## Threat Flags

None. T-28-39 (the author's draft parcels only drawn on their own phone, nothing sent), T-28-40 (explore flow regression: all existing screen cases still pass, the capsule/locate arrow/legend/count pill/cluster list/parcel tap/edge glow cases are pinned, the picker and `MapTopControls` untouched).

## Self-Check: PASSED

- FOUND: `useExplorerPanels.ts`, `useExplorerLayers.ts`, `ExplorerPanelsView.tsx` and their tests, `useAreaDownloadAction.test.ts`
- FOUND commits 296ad3cc, 41ee244c, 9562a69d on `claude/focused-sutherland-89f87e`
