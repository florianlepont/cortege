---
phase: 28-map-layers-comparison-inserted-v1
plan: 07
subsystem: mobile-map
tags: [map, offline, packs, watchdog, weighted-progress, styles]
requires: ["28-02", "28-04", "28-06"]
provides:
  - "mobile/src/map/offline-styles.ts: pack style file per layer, withCadastre(style, opacity), display styles of the Plan without the cadastre"
  - "mobile/src/map/offline-packs.ts: downloadAreaLayerPacks (sequential, best-effort extras, watchdog, real sizes), weightedPercentage, listAreaLayers, packStyleFor per layer"
  - "mock pack pause and resume in mobile/test/maplibre.mock.ts"
affects:
  - "28-10 (useOfflineAreas moves to downloadAreaLayerPacks and removes downloadAreaPacks)"
  - "28-11 (useMapStyle reads offlineDisplayStyleUri and builds the offline rasters inline)"
  - "28-15 (download card, availability by layer through listAreaLayers)"
tech-stack:
  added: []
  patterns:
    - "one native pack per layer, awaited one after the other, metadata { areaId, layer }"
    - "stall watchdog restarted when completedResourceCount grows"
    - "layer file names only from the closed MapLayerKey union"
key-files:
  modified:
    - mobile/src/map/offline-styles.ts
    - mobile/src/map/offline-styles.test.ts
    - mobile/src/map/offline-packs.ts
    - mobile/src/map/offline-packs.test.ts
    - mobile/test/maplibre.mock.ts
decisions:
  - "A failed extra counts as done (100) in the weighted percentage, so the bar ends full and the area can be marked ready; its completedResourceSize is 0 in the result"
  - "A stalled pack accepted at 90 % or more is paused and counts as 100; it is not retried"
  - "Progress callback gets a final emit with complete: true after the last layer, in addition to the per-status emits"
  - "AreaPackProgress is now the new per-layer type; the two-basemap function returns BasemapPackProgress (no external user of either name)"
metrics:
  duration: "about 35 minutes"
  completed: 2026-10-11
status: complete
---

# Phase 28 Plan 07: Per-layer offline packs Summary

An area now downloads as one native pack per layer, one after the other, with a percentage weighted by estimated bytes, extra layers that can never sink the area, a 45 s stall watchdog and the real size of each pack; each layer has its own capped pack style file, and only the Plan pack carries the cadastre.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | A pack style file per layer | d013932d | `map/offline-styles.ts`, `map/offline-styles.test.ts` |
| 2 | Sequential per-layer packs, weighted percentage, best-effort extras, stall watchdog | e3b61d3b | `map/offline-packs.ts`, `map/offline-packs.test.ts`, `test/maplibre.mock.ts` |

## Exported names (for the next plans)

`mobile/src/map/offline-styles.ts`
- `withCadastre(style, opacity = 0.9)`, `CADASTRE_SOURCE_ID`, `CADASTRE_MIN_ZOOM`, `offlineStylesDir(dir)`
- `offlineStyleUri(dir, layer: MapLayerKey, dark = false)`: `${dir}offline-styles/<layer>[-dark].json`
- `offlineDisplayStyleUri(dir, dark)`: `${dir}offline-styles/map-display.json` and `map-display-dark.json` (Plan, without the cadastre; dark is the recoloured Plan)
- `writeOfflineStyle(dir, layer, fetchImpl?)`: returns the pack style URI. "map" fetches once and writes `map.json` (Plan plus cadastre, also read by the PDF snapshot) and the two display styles; the other five write `JSON.stringify(rasterStyleFor(layer, { offline: true }))`, no fetch, no cadastre
- `offlineStyleExists(dir, layer, dark = false)`

`mobile/src/map/offline-packs.ts`
- `downloadAreaLayerPacks({ documentDirectory, os, apiUrl, areaId, bounds, layers: { key, weight }[], minZoom?, maxZoom?, onProgress }): Promise<AreaPacksResult>`
- `AreaPackProgress = { percentage, completedTileCount, currentLayer: MapLayerKey | null, complete }`
- `AreaPacksResult = { percentage, layers: { key, outcome: "complete" | "accepted" | "failed", completedResourceSize }[], failedLayers: MapLayerKey[], totalBytes }`
- `LayerPackOutcome`, `PackMetadata = { areaId, layer }`
- `weightedPercentage(entries: { weight, percentage }[])`, `packStyleFor(os, apiUrl, layer, styleFileUri)`
- `listAreaLayers(): Promise<Map<string, Set<MapLayerKey>>>`, `deleteAreaPacks(areaId)`, `listPackAreaIds()` (all accept `{ areaId, layer }` and the older `{ areaId, basemap }`)
- `STALL_TIMEOUT_MS = 45_000`, `STALL_ACCEPT_PERCENT = 90`, `OFFLINE_MIN_ZOOM`, `OFFLINE_MAX_ZOOM`
- Kept until 28-10: `downloadAreaPacks` (two basemaps), now typed with `BasemapPackProgress`

## Behaviour notes

- Layers run in the order the caller gives (the Plan first, as `PACK_ORDER`). A base layer (`tier === "base"`: map, satellite) that fails, stalls below 90 % or cannot be created or styled rejects with the native error (or "offline pack stopped before it was complete" / "offline pack stalled before it was complete"); the caller deletes the area's packs. An extra that does the same is deleted (`OfflineManager.deletePack`, best effort), listed in `failedLayers`, and the loop goes on (older API answering 404 for a new Android style only loses that layer).
- A reported native error is remembered, never fatal on its own (IGN @2x sprite 404 case kept). Only "inactive" after "active" without "complete" ends a pack.
- The watchdog starts when the pack is created and restarts whenever `completedResourceCount` grows; at 45 s of silence: 90 % or more gives "accepted" (`pack.pause()`, errors swallowed), below that "failed". Every timer is cleared on settle; late events are ignored.
- `completedResourceSize` of the last status of each pack is returned per layer and summed in `totalBytes` (criterion 4). 28-10 writes it into `estimated_bytes`.
- The 1950 photographs pack style declares `maxzoom` 17 (catalogue offline cap), the Etat-major 15, Carte 1950 15, forest types 16, satellite 19.

## Verification

- `npx jest -c jest.unit.config.js src/map/offline-styles.test.ts src/app/survey-pdf src/hooks/useMapStyle.test.ts --coverage=false`: 24 suites, 452 tests pass.
- `npx jest -c jest.unit.config.js src/map ...` with per-file coverage on the two modules: `offline-packs.ts` 100 % statements, branches, functions, lines; `offline-styles.ts` 100 % statements, functions, lines (branches 90 %: the default `fetch` parameter, as before).
- `npm run test:coverage:mobile`: 341 suites, 4660 tests pass, no threshold failure.
- `npm run lint`, `npm run typecheck`: exit 0. `npm run format:check` only warns on `.claude/settings.local.json` (local untracked, not mine).
- Acceptance greps: `rasterStyleFor(layer, { offline: true })`, `withCadastre(style: StyleSpecification, opacity = 0.9)`, `offlineDisplayStyleUri`, `downloadAreaLayerPacks`, `STALL_TIMEOUT_MS = 45_000`, `weightedPercentage`, `listAreaLayers` all present.
- Native OfflineManager is mocked; real pack behaviour (watchdog on a stuck forest pack, sizes) is for the device checks.

## Deviations from Plan

None to the plan. Choices where the plan was silent:

1. **Naming split.** The plan names the new progress type `AreaPackProgress`; the old two-basemap function used the same name (no external importer), so the old one is now `BasemapPackProgress` until 28-10 deletes the function.
2. **Mock typing.** `MockPack` got optional `pause` and `resume`, and the mock `createPack` options type accepts `mapStyle`, `minZoom`, `maxZoom` (needed by the new tests); additive.
3. **Intermediate state until 28-11 (expected, per plan).** The satellite pack style lost its duplicate cadastre and the old `map-dark.json` is no longer written, so with the current `useMapStyle` an offline satellite map shows no cadastre and an offline dark Plan falls back to the light style. 28-11 replaces both with `offlineDisplayStyleUri` and the cadastre child layer.

## Known Stubs

None.

## Threat Flags

None. T-28-16 (sequential packs), T-28-17 (watchdog, extras non-fatal), T-28-18 (file names from `MapLayerKey` only) and T-28-19 (`packLayer` accepts two exact shapes, tested with invalid metadata) are mitigated as planned.

## Self-Check: PASSED

- FOUND: mobile/src/map/offline-styles.ts, offline-styles.test.ts, offline-packs.ts, offline-packs.test.ts, mobile/test/maplibre.mock.ts
- FOUND commits d013932d and e3b61d3b on `claude/focused-sutherland-89f87e`
