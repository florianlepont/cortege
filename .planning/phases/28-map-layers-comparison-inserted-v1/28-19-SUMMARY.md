---
phase: 28-map-layers-comparison-inserted-v1
plan: 19
subsystem: mobile-map
tags: [map, explorer, legend, notices, removal, item-13]
requires: ["28-17"]
provides:
  - "MapLegend: countLabel optional; without it, a bare ActivityIndicator (testID map-legend-loading) right of the (i) button while loading"
  - "ScoreLegend without a count prop"
  - "buildMapNotices without the hidden kind; useExplorerLayers without hiddenSurveys; useExplorerSwipe without hiddenSurveys"
affects:
  - "28-20 (one comparison mode)"
status: complete
tech-stack:
  added: []
  patterns:
    - "shared legend component keeps its count pill only when a label is given (the parcel picker); the Explorer passes none"
key-files:
  created: []
  modified:
    - mobile/src/screens/public-map/ScoreLegend.tsx
    - mobile/src/screens/public-map/ScoreLegend.test.tsx
    - mobile/src/i18n/fr/public-map.ts
    - mobile/src/screens/public-map/markers.test.tsx
    - mobile/src/screens/public-map/map-notices.ts
    - mobile/src/screens/public-map/map-notices.test.ts
    - mobile/src/i18n/fr/map-layers.ts
    - mobile/src/screens/public-map/useExplorerLayers.ts
    - mobile/src/screens/public-map/useExplorerLayers.test.ts
    - mobile/src/screens/public-map/useExplorerSwipe.ts
    - mobile/src/screens/public-map/useExplorerSwipe.test.tsx
    - mobile/src/screens/public-map/ExplorerSwipeLayers.test.tsx
    - mobile/src/screens/PublicMapScreen.tsx
    - mobile/src/screens/public-map/PublicMapScreen.test.tsx
  deleted:
    - mobile/src/screens/public-map/useTransientFlag.ts
    - mobile/src/screens/public-map/useTransientFlag.test.ts
decisions:
  - "The notices-column position test anchored on the hidden pill; it now anchors on the offline notice of the forest overlay (always present offline when the area lacks the layer)"
metrics:
  commits: 2
---

# Phase 28 Plan 19: Count pill and hidden-surveys notice removed Summary

The Explorer no longer shows the "N relevés ici" count pill nor the "surveys are hidden" notice; the legend keeps its (i) button, panel and offline badge, with a bare spinner beside the button while loading. Markers still hide silently in a comparison.

## Tasks

| Task | Commit | Result |
|------|--------|--------|
| 1. Count pill leaves the Explorer | 2ccd1768 | `MapLegend.countLabel` optional (picker keeps its pill and inner spinner); `ScoreLegend` takes no `count`; `fr.publicMap.count` removed; screen stops passing a count |
| 2. Hidden notice and plumbing removed | 563926d0 | notice kind `hidden`, `eye-off-outline` icon, `fr.mapLayers.compare.hiddenSurveys`, `hiddenSurveys` input of `useExplorerLayers`, `HIDDEN_PILL_MS`, `hiddenNonce`, `hiddenSurveys` output of `useExplorerSwipe`, `useTransientFlag` (+ test) all deleted |

## Verification

- Targeted jest (ScoreLegend, markers, PublicMapScreen, SurveyParcelSelectionScreen, `src/__checks__`, `src/screens/public-map`, `src/i18n`): all pass
- `npm run lint`, `npm run typecheck`, `prettier --check mobile/src/screens mobile/src/i18n`: exit 0
- `npm run test:coverage:mobile`: 361 suites, 5096 tests passed; Statements 95.56%, Branches 90.02%, Functions 95.19%, Lines 95.93%
- `PublicMapScreen.tsx`: 374 lines (cap 390 for this plan, 400 structure gate)
- Acceptance greps: zero hits for `relevés ici` outside tests, zero for `hiddenSurveys|HIDDEN_PILL_MS|useTransientFlag` anywhere in `mobile/src`, zero `"hidden"` in `map-notices.ts`; `SurveyParcelSelectionScreen.tsx` untouched and still has one `countLabel`

## Deviations from Plan

None in scope. Notes:
- `PublicMapScreen.test.tsx` replaced count assertions by marker-count assertions (first-load fit, offline own items) or by "no `relevé(s) ici` text" (default render); dropped the one in the globe test.
- Removed `fr.publicMap.count` only; no other key was count-pill-only (`clusterList.title`, `cluster.*` are still used). A legend comment ("beside the count") was reworded.
- The "hidden" pill was the anchor of the "notices start below the swipe stack and the quit pill" test; re-anchored on the offline notice (forest overlay, offline, area lacks layer).

## Known Stubs

None.

## Names for 28-20

- `useExplorerSwipe` (`mobile/src/screens/public-map/useExplorerSwipe.ts`): `ExplorerSwipe` no longer has `hiddenSurveys`; the comparison-start effect only calls `northUp()`; `mapCanvasProps.hideMarkers: comparing` unchanged
- `PublicMapScreen.tsx`: single state `skippedPill` / `setSkippedPill` fed by `swipe.skippedVisible`, passed as `showSkipped` to `useExplorerLayers`
- `ScoreLegend` props: `bottom`, `loading`, `isOffline`, `attributionLines`; spinner testID `map-legend-loading`
- `buildMapNotices` kinds: `skipped | outside | offline | error | overzoom`
- `useTransientFlag` no longer exists

## Self-Check: PASSED

Commits 2ccd1768 and 563926d0 exist on `claude/focused-sutherland-89f87e`; all listed files present or deleted as stated.
