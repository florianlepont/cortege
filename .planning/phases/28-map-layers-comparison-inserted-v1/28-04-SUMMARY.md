---
phase: 28-map-layers-comparison-inserted-v1
plan: 04
subsystem: mobile-map
tags: [map, layers, offline, estimate, notices, pure-logic]
requires: ["28-02", "28-03"]
provides:
  - "mobile/src/map/layer-styles.ts: raster sources and styles per layer with zoom caps, overlay source props, dark dimming rule"
  - "mobile/src/map/offline-estimate.ts: covering-zoom estimator, per-layer and per-area estimates, policy layers, reference area"
  - "mobile/src/map/layer-notices.ts: over-zoom, coverage and attribution rules"
affects:
  - "28-05 to 28-18 (map screen, wipe, download card, settings sheet, legend)"
tech-stack:
  added: []
  patterns:
    - "every style and source is built from LAYER_CATALOGUE constants, no user input reaches a URL"
    - "covering zoom: raster = round(zoom + 1), vector = floor(zoom), clamped to the source zooms"
key-files:
  created:
    - mobile/src/map/layer-styles.ts
    - mobile/src/map/layer-styles.test.ts
    - mobile/src/map/offline-estimate.ts
    - mobile/src/map/offline-estimate.test.ts
    - mobile/src/map/layer-notices.ts
    - mobile/src/map/layer-notices.test.ts
  modified:
    - mobile/src/map/maplibre/styles.ts
decisions:
  - "ORTHO_STYLE now states minzoom 0 (the MapLibre default) so rasterStyleFor('satellite') deep-equals it, as the plan requires"
  - "offline-estimate reads the default pack zooms from tile-math (13 to 17), not offline-packs, to stay free of the native MapLibre import; a test pins them equal to OFFLINE_MIN_ZOOM and OFFLINE_MAX_ZOOM"
  - "OfflineLayersPolicy is imported as a type from storage/offline-layers-policy (28-03)"
metrics:
  duration: "about 20 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 04: Layer styles, offline estimate, notice rules Summary

Three pure, fully covered modules under `mobile/src/map/`: raster styles with zoom caps per layer, an offline estimator that counts the tiles MapLibre really downloads (covering zoom + 1 for 256 px rasters) with measured weights, and the over-zoom, coverage and attribution rules.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Raster styles, overlay source and dark dimming per layer | `feat(28-04): raster styles per layer ...` |
| 2 | Honest offline estimate with the covering zoom | `feat(28-04): honest offline estimate ...` |
| 3 | Over-zoom, coverage and attribution rules | `feat(28-04): over-zoom, coverage and attribution rules ...` |

## Results

- Fontainebleau 4 x 4 km (`regionAround(POLICY_REFERENCE_POINT, 2)`): `referenceAreaBytes("base")` = 53.05 MB (research: about 53 MB), `referenceAreaBytes("all")` = 83.91 MB (research: about 84 MB). The 1950 photographs weigh 25 to 32 MB (capped at 17 offline); each of the other three extras is under 1.5 MB.
- Coverage: `layer-styles.ts`, `offline-estimate.ts`, `layer-notices.ts` all 100 % statements, branches, functions and lines (per-file coverage run).
- `npx jest src/map` 22 suites / 241 tests pass; with `src/__checks__` 336 tests pass.
- `npm run lint`, `npm run typecheck` clean. `npm run format:check` only warns on `.claude/settings.local.json` (not mine, untracked tooling file).

## API notes for the next plans

- `rasterSourceSpec(key, { offline })`, `rasterStyleFor(key, { offline, brightnessMax? })` (key is a `RasterLayerKey`, so not "map"), `overlaySourceProps({ offline })` returns `{ id: "types-foret", tiles, tileSize, minzoom, maxzoom, opacity }`, `baseLayerBrightnessMax(key, darkDim)`.
- `coveringZoomRange(packMin, packMax, source, { offline = true })` returns `[min, max] | null`; `estimateSourceDownload(bounds, source, packMin?, packMax?)` returns `{ tiles, bytes }` without the fixed part; `estimateLayerDownload(bounds, key)` returns `{ key, tier, tiles, bytes, fixedBytes }` (bytes includes the fixed part, the Plan carries the 4.3 MB and the cadastre); `estimateAreaLayers(bounds, policy)` returns `{ policy, layers, totalTileCount, estimatedBytes, baseBytes, extraBytes, exceedsCap }`.
- `layersForPolicy("base")` is `["map", "satellite"]`, `("all")` a copy of `PACK_ORDER`.
- `overzoomNotice({ bases, overlay }, mapZoom, offline)` returns `"base" | "overlay" | null`; `attributionLayerKeys({ left, right, overlay })` returns `MapLayerKey[] | null` (a layer shown on both sides is listed once).
- Over-zoom thresholds (online): etat-major and carte-1950 map zoom 16, types-foret 17, photos-1950 19 (18 offline), satellite 20; the Plan never.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ORTHO_STYLE lacked minzoom**
- **Found during:** Task 1 (deep-equality test against `ORTHO_STYLE`)
- **Issue:** the plan wants every built source to declare `minzoom: 0` and the satellite style to deep-equal `ORTHO_STYLE`, which declared no `minzoom`.
- **Fix:** added `minzoom: 0` (the MapLibre default, no behaviour change) to `ORTHO_STYLE` in `mobile/src/map/maplibre/styles.ts`; `styles.test.ts`, `offline-styles.test.ts` and `ParcelMap.test.tsx` still pass.
- **Files modified:** `mobile/src/map/maplibre/styles.ts` (outside the plan's file list, one line)

**2. [Design choice] Pack zoom defaults from tile-math**
- The plan's read_first points at `OFFLINE_MIN_ZOOM`/`OFFLINE_MAX_ZOOM` in `offline-packs.ts`, which imports the native MapLibre `OfflineManager`. To keep the module pure, the defaults come from `MIN_TILE_ZOOM`/`MAX_TILE_ZOOM` in `tile-math.ts` (13 and 17), and a test fails if the pack's constants ever drift.

## Known Stubs

None.

## Threat Flags

None. All styles come from catalogue constants keyed by a closed union (T-28-09); the estimator is tested against the measured sizes (T-28-10).

## Self-Check: PASSED

Files and commits verified below.
