---
phase: 17-offline-map-own-survey-navigation
status: complete
completed: 2026-09-27
revalidated: 2026-10-06
---

# Phase 8: Offline Map & Own-Survey Navigation: Validation

Maps each ROADMAP success criterion to its evidence. Written after the fact on 2026-10-06 against the
current code; the full goal-backward check is in `17-VERIFICATION.md`. Phase 12.1 replaced the Phase 8
implementation (an app-owned `UrlTile` raster layer on `react-native-maps`, per-area tile files) with
MapLibre native offline packs, so the evidence below names today's files. `17-SUMMARY.md` and
`17-CONTEXT.md` describe the original build.

1. **The map shows members' surveys, not an anonymous or own-only set.** Struck through in the
   roadmap: done in Phase 2. Evidence in code: `api/src/surveys/public.controller.ts`
   (`@UseGuards(AuthGuard)` on `public`), `api/src/surveys/public-map.queries.ts`
   (`PUBLIC_SURVEY_PREDICATE`, no `user_id` filter), `api/test/public-map-items.e2e-spec.ts` (401
   without a token, another member sees every submitted survey), and a token-only client
   (`mobile/src/api/ibp-api.ts`, `usePublicMapExplorer.ts`). `REQUIREMENTS.md` still lists
   `REQ-B-own-surveys-map` as open; the code delivers it.
2. **Satellite and Map basemap switch, persisted.** `MapTopControls` toggle, `useBasemapPreference`,
   `storage/map-preference.ts` (`local_meta`, default `map`), `useMapStyle`, `map/maplibre/styles.ts`.
   Tests: `map-preference.sqlite.test.ts`, `useBasemapPreference.test.ts`, `useMapStyle.test.ts`,
   `PublicMapScreen.test.tsx`. Owner confirmed the basemap button on the phone (OA-118).
3. **Select an area, see size and progress, survives a relaunch, list and delete.** Estimate and cap:
   `map/tile-math.ts`, `OfflineAreasSheet.tsx`. Download: `useOfflineAreas.ts`, `map/offline-packs.ts`
   (one native pack per basemap, zoom 13 to 17), `map/offline-styles.ts`. Persistence:
   `storage/db.ts` migration 3 (`offline_areas`, `offline_area_parcels`, `offline_pending_parcels`),
   `storage/offline-map.ts`. List and delete: Paramètres > Cartes hors ligne
   (`OfflineAreasRoute.tsx`, `OfflineAreasScreen.tsx`, OA-108). Tests: `useOfflineAreas.test.ts`,
   `offline-map.sqlite.test.ts`, `OfflineAreasScreen.test.tsx`, `offline-styles.test.ts`. Owner
   confirmed the download on the phone (OA-120). Progress is a percentage in the survey-flow banner
   only; the Explorer panel shows an indeterminate button. **Not exercised on a device:** relaunch
   survival of the native packs.
4. **Airplane mode: indicator, downloaded basemap, cached parcels, GPS, zoom, pan, selection.**
   `useIsOffline.ts`, `ScoreLegend` and `OfflineIndicatorBadge`, `useMapStyle` (offline `file://`
   style), `usePublicMapExplorer` reading `offline_area_parcels`, `MapCanvas` (`UserLocation`,
   `ParcelPolygonsLayer`). Tests: `useIsOffline.test.ts`, `useMapStyle.test.ts`,
   `usePublicMapExplorer.test.ts`, `offline-map.sqlite.test.ts`. **Not exercised on a device:** the
   airplane-mode walkthrough.
5. **Missing parcel is said plainly, with a download that runs on reconnect, no spinner.**
   `useParcelSurveyHistory.ts` (`offline: true`, no request), `ParcelHistoryCard.tsx`,
   `storage/offline-map.ts` (`offline_pending_parcels`), `useOfflinePendingParcelDrain.ts`. Tests:
   `PublicMapScreen.test.tsx` (offline missing-parcel flow), `useOfflinePendingParcelDrain.test.ts`,
   `useParcelSurveyHistory.test.ts`. The drain fetches the parcel history and discards it.

## Gate

I re-ran the Phase 8 suites on 2026-10-06 (`jest -c mobile/jest.unit.config.js --coverage=false`
on `src/map`, the offline and basemap storage and hook files, `src/screens/public-map` and
`OfflineAreasScreen`): 29 suites, 224 tests, all passing. I did not re-run lint, typecheck, the full
unit suite or the coverage thresholds; the original gate (119 mobile suites, 1451 tests, every
threshold met) is recorded in `17-SUMMARY.md` and predates the MapLibre rework.

## Known gap

No device was available when the phase closed, and none was used here. Criterion 3's "survives a
force-quit and relaunch" and criterion 4's airplane-mode walkthrough are deferred to Phase 13's field
validation by the owner's decision (ROADMAP Phase 8 status note). They are tracked as
`human_verification` in `17-VERIFICATION.md`, not as failures. What a phone did confirm (Phase 12.1
owner acceptance): the basemap switch, the download itself, the Paramètres list and delete.

## Deliberate scope decisions (see `17-CONTEXT.md`, and what Phase 12.1 changed)

- Areas are the current viewport, fixed zoom 13 to 17, a hard cap of 3000 tiles per basemap. Kept.
- Both basemaps are downloaded for every area. Kept: each pack carries the cadastre.
- The survey-creation parcel picker was out of scope in Phase 8; Phase 12.1 added a download
  proposal there (`useOfflineMapPrompt`, about 2 km around the chosen parcel, OA-92, OA-106).
- The areas list moved out of the Explorer panel into Paramètres (OA-108, OA-123).
- Cancelling a download, refreshing a stale area, and a user-facing default-basemap setting remain
  deferred.
- Open: the queued parcel download stores nothing, and the Explorer shows no download percentage.
