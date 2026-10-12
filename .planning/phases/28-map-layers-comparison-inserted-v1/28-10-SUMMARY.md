---
phase: 28-map-layers-comparison-inserted-v1
plan: 10
subsystem: mobile-offline
tags: [map, offline, packs, policy, estimate, hooks]
requires: ["28-03", "28-04", "28-07"]
provides:
  - "useOfflineAreas on per-layer packs: policy read at start, byte-weighted never-decreasing percentage, extra layers fail alone, estimateForRegion -> AreaLayersEstimate, done status with failedLayers"
  - "finalizeOfflineArea(id, status, progress, measuredBytes?) storing the real size in estimated_bytes"
  - "useOfflineMapPrompt on the policy estimate (copy unchanged)"
affects:
  - "28-11, 28-12, 28-15 (availability by layer, download card estimate, chip percentage)"
tech-stack:
  added: []
  patterns:
    - "stored policy read at download start (loadOfflineLayersPolicy), hook policy only for the displayed estimate and as fallback"
    - "development-only size log: layer key, bytes, outcome (no area id, no coordinates)"
key-files:
  modified:
    - mobile/src/storage/offline-map.ts
    - mobile/src/storage/offline-map.sqlite.test.ts
    - mobile/src/hooks/useOfflineAreas.ts
    - mobile/src/hooks/useOfflineAreas.test.ts
    - mobile/src/hooks/useOfflineMapPrompt.test.ts
    - mobile/src/map/offline-packs.ts
    - mobile/src/map/offline-packs.test.ts
    - mobile/src/map/tile-math.ts
    - mobile/src/map/tile-math.test.ts
    - mobile/src/screens/public-map/OfflineAreasSheet.tsx
    - mobile/src/screens/public-map/OfflineAreasSheet.test.tsx
    - mobile/src/screens/public-map/DownloadStatusView.tsx
    - mobile/src/screens/public-map/DownloadStatusView.test.tsx
    - mobile/src/screens/public-map/GlassIconButton.test.tsx
decisions:
  - "A measured size of 0 (packs that reported nothing) keeps the insert-time estimate instead of writing 0 MB"
  - "If the stored policy cannot be read at start, the hook's current policy is used (no rejected startDownload)"
  - "useOfflineMapPrompt.ts needed no code change: it already read estimateForRegion().estimatedBytes and the area's downloadedTiles, both now fed by the policy estimate and the weighted progress; only its test changed"
metrics:
  duration: "about 30 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 10: Offline areas on per-layer packs Summary

`useOfflineAreas` now downloads one native pack per layer of the stored offline policy, with a byte-weighted percentage that never goes back, extra layers that cannot sink the area, and the real pack size written to `offline_areas.estimated_bytes`; the old two-basemap code and the flat 20 kB per tile estimate are gone.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Store the measured size | 87c33f8b | `storage/offline-map.ts` (+ sqlite test) |
| 2 | useOfflineAreas on per-layer packs, prompt on the new estimate | 44a0391e | `hooks/useOfflineAreas.ts` (+ test), `hooks/useOfflineMapPrompt.test.ts`, `OfflineAreasSheet.tsx`, `DownloadStatusView.tsx` and their test fixtures |
| 3 | Remove the old two-basemap paths | 79ac2769 | `map/offline-packs.ts`, `map/tile-math.ts`, `storage/offline-map.ts` (+ tests) |

## What was built

- `finalizeOfflineArea(id, status, progress, measuredBytes?)`: when `measuredBytes` is a finite number of at least 0 the UPDATE also sets `estimated_bytes` (rounded); otherwise the column keeps the estimate. No schema change (`user_version` stays 5), so Paramètres shows measured megabytes.
- `useOfflineAreas`: `estimateForRegion(region)` returns `estimateAreaLayers(computeRegionBounds(region), policy)` with the policy from `useOfflineLayersPolicy()` (re-read on focus). `startDownload` first calls `loadOfflineLayersPolicy()` (stored value wins; falls back to the hook policy if it throws), refuses a too-large viewport as before, inserts the area, then `downloadAreaLayerPacks` with `layers: estimate.layers.map(({ key, bytes }) => ({ key, weight: bytes }))` ("base" gives map and satellite, "all" gives `PACK_ORDER`). The max-hold `shownPercentage` and the `finished` latch are kept; `downloadedTiles` and `totalTiles` come from the same estimate, so the parcel picker's running view is unchanged.
- Success: area finalized "ready" with `result.totalBytes` (undefined when 0), done status carries `failedLayers`, one `logStatusDetail("offline.layer-size", { layer, bytes, outcome })` per layer. A rejection (base layer failed) deletes every pack of the area, marks it "failed", status "failed" (unchanged). Parcel-status bonus cache unchanged.
- `useOfflineMapPrompt`: megabytes come from the policy estimate; percent follows the area's progress, which is now the weighted one. Test updated (83.9 MB for the "all" reference shape, estimate called with the 2 km region).
- `OfflineAreasSheet` prop `estimate` is `AreaLayersEstimate` (it still reads `exceedsCap`, `totalTileCount`, `estimatedBytes`); `measureStatuses` gets `failedLayers: []`. `SurveyParcelSelectionScreen` is untouched and compiles.
- Removed: `downloadAreaPacks`, `BasemapPackProgress`, `LegacyPackMetadata` (offline-packs), `AreaDownloadEstimate`, `estimateAreaDownload`, `AVERAGE_TILE_BYTES` (tile-math), `basemapsForDownload` (offline-map). The listing of packs of earlier builds (`basemap` metadata) stays in `packLayer`.

## Exported names (for the next plans)

- `useOfflineAreas(apiUrl, accessToken, enabled?)` returns `{ areas, downloadingAreaId, downloadStatus, clearDownloadStatus, estimateForRegion: (region) => AreaLayersEstimate, startDownload, deleteArea, refresh }`
- `AreaDownloadProgress` (unchanged shape), `AreaDownloadStatus` (done variant now has `failedLayers: MapLayerKey[]`), `StartDownloadResult` (unchanged)
- `finalizeOfflineArea(id, status, progress, measuredBytes?)`
- `AreaLayersEstimate` (from `map/offline-estimate`) is now the type every download surface reads

## Verification

- `npx jest -c jest.unit.config.js src/storage/offline-map.sqlite.test.ts --coverage=false`: 17 tests pass.
- `npx jest -c jest.unit.config.js src/hooks src/map src/storage src/screens/public-map ...`: pass.
- `npm run test:coverage:mobile`: 345 suites, 4705 tests pass, no threshold failure. `offline-packs.ts` and `offline-map.ts` 100 % in every column, `tile-math.ts` 100 % statements and lines (branches 88 %, the default zoom parameters, as before).
- `npm run lint`, `npm run typecheck` exit 0. `npm run format:check` only warns on `.claude/settings.local.json` (local untracked file, not mine).
- Acceptance greps: `measuredBytes?: number`, `downloadAreaLayerPacks(`, `loadOfflineLayersPolicy()`, `estimateAreaLayers(` present; `AVERAGE_TILE_BYTES`, `basemapsForDownload`, `downloadAreaPacks` have no match under `mobile/src`.
- Not run: real device download (native `OfflineManager` is mocked); the measured sizes and the stall watchdog on the forest layer remain device checks.

## Deviations from Plan

**1. [Rule 3 - Blocking] Test fixture outside the file list**: `mobile/src/screens/public-map/GlassIconButton.test.tsx` and `DownloadStatusView.test.tsx` also type an estimate or a done status; they moved to `AreaLayersEstimate` and `failedLayers: []` so `tsc` passes in the Task 2 commit. Test files only.

**2. [Rule 2 - Robustness] Policy read failure**: `loadOfflineLayersPolicy()` is followed by `.catch(() => policy)` so a storage error at the start cannot reject `startDownload` (callers use `void startDownload(...)`); tested.

**3. [Rule 1 - Correctness] Measured size of 0**: not written to `estimated_bytes` (it would show 0 MB in Paramètres); the estimate stays.

**4.** `useOfflineMapPrompt.ts` source needed no edit (see Decisions).

## Known Stubs

None.

## Threat Flags

None. T-28-24 (viewport cap of 3000 tiles unchanged, estimate shown before every download), T-28-25 (size log only in development builds, layer key, bytes and outcome, tested) and T-28-26 (done status lists the failed layers) are mitigated as planned.

## Self-Check: PASSED

- FOUND commits 87c33f8b, 44a0391e, 79ac2769 on `claude/focused-sutherland-89f87e`
- FOUND the modified files listed above; no match for the removed names under `mobile/src`
