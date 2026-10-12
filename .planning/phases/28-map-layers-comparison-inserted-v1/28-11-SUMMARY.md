---
phase: 28-map-layers-comparison-inserted-v1
plan: 11
subsystem: mobile-map
tags: [map, layers, parcels, cadastre, offline, dark-mode, contrast]
requires: ["28-01", "28-04", "28-05", "28-07"]
provides:
  - "mobile/src/hooks/useMapStyle.ts: useMapStyle(layer, refreshKey, retryKey), MapStyleChoice"
  - "mobile/src/map/maplibre/ForestTypesLayer.tsx: ForestTypesLayer"
  - "mobile/src/map/maplibre/ParcelPolygonsLayer.tsx: mode, casing, casingOpacity, fillOpacity, surveyParcelIds props"
  - "mobile/src/screens/public-map/MapContentLayers.tsx: MapContentLayers, shownParcelsFor"
  - "tokens brandMapTokens.parcelCasing, parcelFillOldBaseFactor, visual.mapRaster, visual.mapHint"
affects:
  - "28-13 to 28-18 (screen wiring, stacked maps, settings sheet)"
tech-stack:
  added: []
  patterns:
    - "the cadastre is a child layer on every map (online and offline); only older Plan pack files still carry it in the style"
    - "one content component (MapContentLayers) drawn identically on every stacked map"
key-files:
  created:
    - mobile/src/map/maplibre/ForestTypesLayer.tsx
    - mobile/src/screens/public-map/MapContentLayers.tsx
    - mobile/src/screens/public-map/MapContentLayers.test.tsx
  modified:
    - mobile/src/app/brand-tokens.ts
    - mobile/src/app/theme-visual.ts
    - mobile/src/app/visual-tokens.test.ts
    - mobile/src/hooks/useMapStyle.ts
    - mobile/src/hooks/useMapStyle.test.ts
    - mobile/src/map/offline-styles.ts
    - mobile/src/map/offline-styles.test.ts
    - mobile/src/map/maplibre/parcel-features.ts
    - mobile/src/map/maplibre/parcel-features.test.ts
    - mobile/src/map/maplibre/ParcelPolygonsLayer.tsx
    - mobile/src/map/maplibre/CadastreLayer.tsx
    - mobile/src/map/maplibre/layers.test.tsx
    - mobile/src/screens/public-map/MapCanvas.tsx
    - mobile/src/screens/public-map/MapCanvas.test.tsx
decisions:
  - "visual.tab.dot is now per scheme (#6C8429 light, #A6CA76 dark) so the two accent dots reach 3:1 on the capsule glass"
  - "useMapStyle returns the ORTHO_STYLE constant for the online satellite (identity kept for the parcel picker test), a fresh rasterStyleFor object after a retry"
  - "Offline Plan file order: display file (no cadastre), then legacy map-dark.json (dark), then map.json (both legacy files carry the cadastre)"
metrics:
  duration: "about 50 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 11: Layers on the Explorer map Summary

Every base of the cycle now renders through one style hook (online, offline, dark, retry), the forest types overlay is a raster child layer, Parcelles has its three states with the cadastre as a child layer, the old bases get the lightened parcel fill and the white casing, and `MapContentLayers` draws the same content on any map that stacks.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Tokens and the style hook for every base | `0986c7d7` |
| 2 | Parcel features, Parcelles filters, casing and the forest overlay layer | `47d98d21` |
| 3 | Shared content layers and the MapCanvas props | `6a2c99cc` |

## Exported names (for the next plans)

Tokens
- `brandMapTokens.parcelCasing` (`rgba(255, 255, 255, 0.85)`), `brandMapTokens.parcelFillOldBaseFactor` (0.6) in `app/brand-tokens.ts`
- `theme.visual.mapRaster.dimBrightnessMax` (0.8 dark, 1 light), `theme.visual.mapHint { fill: "rgba(30, 36, 28, 0.7)", ink: white }` in `app/theme-visual.ts`

Hook, `mobile/src/hooks/useMapStyle.ts`
- `useMapStyle(layer: BaseLayerKey, refreshKey = 0, retryKey = 0): MapStyleChoice`
- `MapStyleChoice = { mapStyle: string | StyleSpecification; cadastreInStyle: boolean; cadastreOpacity: number }` (0.9, 0.7 on Etat-major and Carte 1950, read from `LAYER_CATALOGUE`)

Layers, `mobile/src/map/maplibre/`
- `ForestTypesLayer({ enabled, belowCadastre? })` (RasterSource and Layer id `types-foret`, opacity 0.55, `beforeId` `ign-cadastre` when `belowCadastre`)
- `CADASTRE_LAYER_ID` (`"ign-cadastre"`) exported from `CadastreLayer.tsx`
- `ParcelPolygonsLayer` new optional props: `mode: ParcelsMode = "all"`, `surveyParcelIds?: ReadonlySet<string>`, `casing = false`, `casingOpacity = 1`, `fillOpacity = 1`
- `ParcelFeatureProperties` gains `hasSurvey: boolean` and `selected: boolean`; `buildParcelFeatureCollection(items, selectedIds, { byScore, surveyParcelIds })`

Screen, `mobile/src/screens/public-map/`
- `shownParcelsFor(parcelStatuses, parcelLayerRenderable, studiedParcelsRenderable)`
- `MapContentLayers({ base, forestOverlay, parcelsMode, cadastreEnabled, cadastreInStyle, cadastreOpacity, parcels, selectedParcelIds?, surveyParcelIds?, interactive, onParcelPress? })` and `MapContentLayersProps`
- `MapCanvas` new/widened props: `basemap: BaseLayerKey`, `forestOverlay`, `parcelsMode` (default "all"), `surveyParcelIds`, `styleRetryKey`, `onStyleLoaded`, `onStyleFailed` (to `onDidFinishLoadingStyle` and `onDidFailLoadingMap`)

Also `offlineDisplayStyleExists(documentDirectory, dark)` in `map/offline-styles.ts`.

## Behaviour notes

- Online: Plan = published URL (`?retry=N` when `retryKey > 0`; the dark recolouring is fetched again on a retry), rasters = `rasterStyleFor(layer, { offline: false, brightnessMax })` with 0.8 only on the two old maps in dark.
- Offline with a ready area: Plan = `offlineDisplayStyleUri` (dark in dark) with `cadastreInStyle: false`; if missing (area from before the phase), the legacy `map-dark.json` (dark) or `map.json` with `cadastreInStyle: true`; rasters = inline `rasterStyleFor(layer, { offline: true, brightnessMax })` with no cadastre (28-07 intermediate state closed: dark Plan and satellite cadastre fixed).
- The cadastre is mounted by `MapContentLayers` only for Parcelles "Toutes", at zoom, and when the style does not already carry it. With an older Plan pack file (cadastre baked in) a Parcelles "Avec IBP" / "Aucune" cannot hide the baked cadastre: only for areas downloaded before this phase, accepted (prod is test data).
- Z-order: base, forest overlay, cadastre, casing, fill, outline, markers. The `selected` feature property keeps a focused parcel drawn in every state (tested on the filters).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `visual.tab.dot` failed the 3:1 test on the capsule glass**
- **Found during:** Task 1 (contrast test required by the plan)
- **Issue:** brand moss `#89A33A` measured 2.2:1 (light) and 2.0:1 (dark) against `mapControl.glass` over the map backdrops.
- **Fix:** `tab.dot` is per scheme, `#6C8429` in light (3.27:1) and `#A6CA76` in dark (3.15:1); `dotShadow` keeps the brand moss. Side effect: the tab bar dot and the Switch track colour (`OverlayBubble`) take the same step. Owner can judge on the phone.
- **Files modified:** `mobile/src/app/theme-visual.ts`
- **Commit:** `0986c7d7`

**2. [Rule 3 - Blocking] A display-file existence check was missing**
- **Issue:** `useMapStyle` must know whether `map-display[-dark].json` exists (areas downloaded before the phase have none); `offlineStyleExists` only checks the pack files.
- **Fix:** added `offlineDisplayStyleExists` to `offline-styles.ts` (+ test), outside the plan's file list.
- **Commit:** `0986c7d7`

**3. [Design choice] `CADASTRE_LAYER_ID`**
- `CadastreLayer.tsx` (not in the file list) exports the id `ign-cadastre`, used by `ForestTypesLayer` for `beforeId`; a test pins it equal to `CADASTRE_SOURCE_ID` of `offline-styles`.

**4. [Design choice] ParcelMap identity**
- The existing picker test asserts `toBe(ORTHO_STYLE)`; `useMapStyle("satellite")` therefore returns that constant online (no retry). The picker and PDF snapshot are otherwise untouched.

## Owner questions (contrast findings, recorded as the plan asks)

- **Outline against its own lightened fill:** a hue outline over a tint of the same hue never reaches 3:1, for any factor between 0.4 and 0.8 on the cream paper and grey photograph backdrops (best measured: 1.0 to 1.2 for the score bands, the warm grey and the terracotta selection; 2.9 for the heavy forest outline). Pinned in `visual-tokens.test.ts`. What separates the outline from the pale map is the casing.
- **Outline against the white casing:** reaches 3:1 for low (terracotta), mid (ochre), warm grey, terracotta selection and the forest outline; the **high-band moss outline measures 2.5:1** (same moss as the marker, also under 3:1 on white elsewhere in the app). Choice for the owner: darker moss outline on the old bases only, or accept.
- The casing and the 0.6 factor remain "one number to tune on the phone".

## Verification

- Per-file coverage 100 % statements, branches, functions, lines: `useMapStyle.ts`, `parcel-features.ts`, `ParcelPolygonsLayer.tsx`, `ForestTypesLayer.tsx`, `CadastreLayer.tsx`, `MapContentLayers.tsx`.
- `npx jest src/hooks src/map src/screens/public-map src/__checks__ src/app src/navigation`: all pass except the two failures below. `MapCanvas.tsx` is 239 lines.
- Mobile `tsc --noEmit`, `npm run lint`, `npm run typecheck` exit 0. `npm run format:check` only warns on `.claude/settings.local.json` (untracked tooling file, not mine).
- `npm run test:coverage:mobile`: 351 suites pass, 2 fail, both in files I did not touch (below), so the command exits 1.

### Failures outside this plan (not fixed)

- `mobile/src/app/glass-density.test.ts` (1 test): expects the light `mapControl.glass` tint and fill at alpha 0.76, but `mapControlGlass.light` is 0.92 since commit `bdba9653` (denser light map control glass). The test needs updating to 0.92.
- `mobile/src/screens/public-map/useSwipeSpike.test.tsx` (2 tests: "the line starts where the finger let go, kept 22 pt from the edges", "a swipe from the left edge keeps the incoming layer on the left"): swipe-machine thresholds changed by the owner decision commit `d1e896ba` (thirds); the spike file is deleted by 28-17 anyway.

## Known Stubs

None.

## Threat Flags

None. T-28-27 (styles only from the catalogue builders keyed by the closed `BaseLayerKey` union), T-28-28 (overlay at 0.55 under the parcels, casing on with the overlay) and T-28-29 (the `selected` term in the `withIbp` and `none` filters, tested) are mitigated.

## Self-Check: PASSED

- FOUND: mobile/src/hooks/useMapStyle.ts, mobile/src/map/maplibre/ForestTypesLayer.tsx, mobile/src/screens/public-map/MapContentLayers.tsx, MapContentLayers.test.tsx
- FOUND commits `0986c7d7`, `47d98d21`, `6a2c99cc` on `claude/focused-sutherland-89f87e`
