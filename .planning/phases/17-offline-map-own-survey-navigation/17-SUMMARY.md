# Phase 8: Offline Map & Own-Survey Navigation — Summary

**Requirements:** REQ-D-offline-map, REQ-D-area-download, REQ-D-offline-parcel-warning, REQ-D-basemap-switch
**Status:** Done (on-device verification deferred — see below)
**Executed:** autonomously, no live product-owner session; every call that would normally be an
owner decision is recorded as Claude's discretion in `17-CONTEXT.md`.

## What changed

### Basemap switch (REQ-D-basemap-switch)

- `mobile/src/map/basemaps.ts`: two IGN Géoplateforme TMS layers (`GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2`
  "Plan", `ORTHOIMAGERY.ORTHOPHOTOS` "Satellite"), the same tile-endpoint family the existing
  cadastre overlay already uses.
- `mobile/src/screens/public-map/OfflineControls.tsx` (`BasemapToggle`): a segmented pill in the
  Explorer's top controls.
- `mobile/src/storage/map-preference.ts` + `mobile/src/hooks/useBasemapPreference.ts`: persisted to
  `local_meta` (same key/value pattern as the cached profile and local-data-owner), so the choice
  survives navigation and a relaunch — a strict superset of "persists while navigating".

### Offline area download (REQ-D-area-download)

- `mobile/src/map/tile-math.ts`: slippy-map tile math, a `countTilesForBounds`/`estimateAreaDownload`
  pair that never materialises a tile array (so a huge requested area can't exhaust memory before
  the cap check), and `MAX_TILES_PER_AREA` = 3000/basemap.
- `mobile/src/map/offline-download.ts`: downloads a job list in concurrent batches of 6, throttling
  progress reports to roughly every 30 tiles; a failing tile is counted and skipped, never retried
  automatically; the loop always completes.
- `mobile/src/storage/db.ts` migration 3 (`SCHEMA_VERSION` 2 → 3): `offline_areas`,
  `offline_area_parcels`, `offline_pending_parcels` — additive only, per the repo's migration
  convention. `mobile/src/storage/offline-map.ts` is the CRUD layer.
- `mobile/src/hooks/useOfflineAreas.ts`: orchestrates a download for the current map viewport (both
  basemaps, so a basemap switch keeps working offline), inserts the area row before downloading so
  progress is visible immediately, and best-effort-caches the viewport's parcel statuses once tiles
  are in.
- `mobile/src/screens/public-map/OfflineAreasSheet.tsx`: the size estimate, a name field, download
  progress, and the list of downloaded areas with delete.

### Offline map rendering (REQ-D-offline-map)

- `mobile/src/hooks/useIsOffline.ts`: wraps `expo-network`'s `getNetworkStateAsync`/
  `addNetworkStateListener`, reusing the `isOnlineNetworkState` rule `useSurveySyncNetwork.ts` and
  `useAuth0Session.ts` already use to trigger a resync, so "online" means the same thing everywhere.
- `mobile/src/screens/public-map/OfflineControls.tsx` (`OfflineIndicatorBadge`): shown next to the
  Explorer badge whenever offline.
- `mobile/src/screens/public-map/OfflineBasemapTile.tsx`: the app-owned raster basemap layer;
  online it points at the remote IGN URL, offline it points at the most recently downloaded ready
  area covering the viewport center (`resolveOfflineAreaForPoint`), via `UrlTile`'s documented
  `file://.../{z}/{x}/{y}.png` local-filesystem template — no native offline-tile module needed.
- `mobile/src/hooks/usePublicMapExplorer.ts`: `loadPublicParcels` reads `offline_area_parcels`
  instead of calling the network while offline.
- GPS "follow" and zoom/pan/parcel selection needed no code change: location capture is already
  on-device (`expo-location`) and the map's gesture/selection handling never depended on the
  network.

### Missing-parcel warning (REQ-D-offline-parcel-warning)

- `mobile/src/hooks/useParcelSurveyHistory.ts`: while offline, skips the network entirely and
  reports `offline: true` instead of a perpetual `loading: true` — no request is ever attempted, so
  there is nothing to time out or spin on.
- `mobile/src/screens/public-map/ParcelHistoryCard.tsx`: shows the offline explanation and a
  "download when back online" button; pressing it queues the parcel id.
- `mobile/src/hooks/useOfflinePendingParcelDrain.ts`: on the offline → online transition, fetches
  each queued parcel once and clears it; a parcel that still fails stays queued for the next
  reconnect.

## Scope boundary

The survey-creation parcel picker (`ParcelMapModal.tsx`/`useParcelMap.ts`) is untouched: it never
calls the public map-items/parcel-status endpoints this phase caches (it already works from the
cadastre provider and local survey drafts), and both the roadmap phrasing and `REQUIREMENTS.md`
point at "the map" Phase 2 repointed — the Explorer/public map screen. See `17-CONTEXT.md` for this
and every other scope/design decision (tile source, zoom range 13–17, the per-area storage
tradeoff over a shared tile cache, the 3000-tile cap, "both basemaps downloaded" rationale).

## Tests

New or updated, all passing:
- `mobile/src/map/tile-math.test.ts`, `basemaps.test.ts`, `offline-download.test.ts` — pure logic,
  100% statements/lines.
- `mobile/src/storage/offline-map.sqlite.test.ts`, `map-preference.sqlite.test.ts` — real SQL
  against the migrated schema (the repo's `node:sqlite`-backed test double), 100% statements/lines.
- `mobile/src/hooks/useIsOffline.test.ts`, `useBasemapPreference.test.ts`, `useOfflineAreas.test.ts`,
  `useParcelSurveyHistory.test.ts`, `useOfflinePendingParcelDrain.test.ts` — `renderHook`, 100%
  statements/lines each.
- `mobile/src/hooks/usePublicMapExplorer.test.ts` — extended for the offline parcel-cache path.
- `mobile/src/screens/public-map/PublicMapScreen.test.tsx` — extended for the offline missing-
  parcel flow (notice shown, network never called, button queues and disables itself).
- `mobile/src/navigation/routes/routes.test.tsx`, `mobile/src/state/render-counts.test.tsx` — the
  three new screen-owned hooks stubbed the same way `usePublicMapExplorer` already was, so these
  suites stay isolated from SQLite/network.
- `mobile/src/i18n/catalogue.test.ts` — the new `offlineMap` catalogue section registered and
  exercised by the generic every-function-returns-user-facing-text check.

Full coverage-threshold run (`npm --workspace mobile run test:unit:coverage`, which is what CI's
`unit-mobile` job actually runs — the local pre-commit gate `test:unit` does not enforce coverage):
119 suites, 1451 tests, every per-directory `jest.unit.config.js` threshold met (`./src/hooks/`,
`./src/storage/`, `./src/screens/`, `./src/navigation/`, plus the new `./src/map/` falling under the
literal 100%-statements/lines "global" bucket, which only really binds directories with no more
specific override).

## Verification

```
npm run lint                    # clean, all three workspaces
npm run typecheck               # clean (domain + mobile + api build)
npm run format:check            # clean
npm run test:unit               # 119 mobile suites / 1451 tests + api + domain, all green
npm --workspace mobile run test:unit:coverage   # every threshold met
```

## Follow-on / not done here

- **On-device check**: no simulator or physical device is available in this cloud session (same
  constraint recorded in Phase 4's summary). The genuinely device-dependent parts of this phase —
  a real airplane-mode walkthrough (basemap tiles rendering from disk, GPS follow, parcel
  selection with no radio), and a real force-quit/relaunch proving the SQLite + filesystem state
  survives — have not been run on hardware. Recorded as Phase 13's job (field validation).
- Cancelling an in-progress area download, deduplicating tiles across overlapping areas, and a
  user-facing default-basemap *setting* (as opposed to the code constant) are deliberately deferred
  — see `17-CONTEXT.md`'s Deferred section.
