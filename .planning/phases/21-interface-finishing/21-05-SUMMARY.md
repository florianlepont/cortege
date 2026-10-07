# Batch 5 — public-map/ dark-mode sweep and Liquid Glass (DS-12, DS-15)

## What shipped

- `public-map/styles.ts` split by whether a group actually needs the hook: `markerStyles` and the
  map-fill half of `screenStyles` stayed static exports (every color there is a theme-invariant hue
  or a `brandMapTokens` value); `createScreenContainerStyle`, `createControlStyles`,
  `createFilterBarStyles`, `createOfflineAreasStyles`, `createOfflineIndicatorStyles` and
  `createPanelStyles` became theme factories. All ten importers updated
  (`SurveyMarker`/`ClusterMarker` needed no change at all).
- New `ui/GlassSurface.tsx` (see `21-CONTEXT.md` for its `tone` prop design) and a matching `AppCard`
  `glass` prop. Applied to every floating map/card control that used to carry a flat
  `brandTranslucentPanel`/`heroScrimOnDark` fill:
  - `MapControls.tsx`: the explore badge, the survey-count badge, the three round icon buttons, and
    the filters panel (via `AppCard glass`) — `tone="auto"`.
  - `OfflineControls.tsx`: the basemap Plan/Satellite toggle — `tone="auto"`.
  - `ScoreLegend.tsx`: the toggle button and the expanded legend panel — `tone="auto"`.
  - `OfflineAreasSheet.tsx`: the whole sheet, via `AppCard glass`.
  - `ExplorerSheet.tsx`: a new `SheetBackground` component passed to gorhom's `backgroundComponent`
    prop, layering `BlurView` under the sheet's existing shape (radius, handle) instead of a flat
    `backgroundColor` — the tiered sheet itself (Phase 9's `@gorhom/bottom-sheet` choice) is
    unchanged.
  - `MapBottomDock`'s "no survey here" bubble — `tone="auto"` via `AppCard glass`.
- `mobile/test/expo-blur.mock.ts` (new) + `jest.unit.config.js` `moduleNameMapper` entry: `expo-blur`
  had no existing jest mock; `BlurView` now renders as a passthrough host element under test.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green.
