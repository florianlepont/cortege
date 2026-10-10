---
phase: 17-offline-map-own-survey-navigation
verified: 2026-10-06
status: passed
score: 3/5 success criteria verified; 2 present and wired but not exercised on a device (behavior_unverified)
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "The downloaded area is still usable after force-quitting and relaunching the app (criterion 3)"
    test: "Download a small area on a phone, force-quit the app, relaunch it in airplane mode, open Paramètres > Cartes hors ligne and the Explorer"
    expected: "The area is listed as Prête with its size, and the Explorer draws the downloaded basemap inside it"
    why_human: "State lives in two stores, the SQLite offline_areas rows (covered by offline-map.sqlite.test.ts) and the MapLibre native pack cache plus the style file under the document directory. No test can exercise the native pack surviving a relaunch. Deferred to Phase 13 by the owner."
  - truth: "In airplane mode the map shows an offline indicator, renders the downloaded basemap and cached parcels, follows GPS, and still allows zoom, pan and parcel selection (criterion 4)"
    test: "Airplane mode on, open the Explorer inside a downloaded area, pan, zoom, tap the locate button, tap a studied parcel"
    expected: "Offline badge shown; Plan or Satellite basemap and the cadastre drawn from the native cache; parcels filled by score from the cached statuses; the device position halo and recentre work; tapping a studied parcel opens the missing-parcel notice, never a spinner"
    why_human: "Native offline rendering, GPS and gestures need a real device with the radio off. Deferred to Phase 13 by the owner (ROADMAP Phase 8 status note), so it is recorded here and is not a failure."
human_verification:
  - test: "Airplane-mode walkthrough and force-quit relaunch (the two behavior_unverified items above)"
    expected: "As listed above"
    why_human: "Device-only; explicitly deferred to Phase 13 field validation"
  - test: "Decide whether the queued 'download when back online' for a parcel must keep what it fetches"
    expected: "Either accept the current behavior (the fetch result is discarded, the history is read live when the card is open online) or have the drain store the history so it can be shown offline"
    why_human: "Product decision. Today drainPendingParcelDownloads awaits fetchParcelSurveyHistory and throws the answer away, and no code ever reads a cached history, so the queue changes nothing the user can see. The literal criterion text (message, button, action runs on reconnect, no spinner) is met."
  - test: "Decide whether an indeterminate 'Téléchargement…' button is enough progress in the Explorer panel"
    expected: "Either accept it (the percentage is shown only in the survey-flow banner) or show the percentage in the Explorer sheet too"
    why_human: "Criterion 3 says the surveyor 'sees ... progress'. The Explorer panel only shows a loading button; the numeric percentage exists in the survey-flow prompt (useOfflineMapPrompt)."
---

# Phase 08: Offline Map & Own-Survey Navigation Verification Report

**Phase Goal:** The surveyor can find their way around a parcel and see the association's recorded work on the map, with no network at all.
**Verified:** 2026-10-06 (against branch `claude/roadmap-seeds-16a6af`, `origin/main` at `0fb6d2f`)
**Status:** human_needed (no code gap against the roadmap text; device checks owed, two product decisions raised)
**Re-verification:** No, initial verification. The phase closed on 2026-09-27 with `17-SUMMARY.md` and `17-CONTEXT.md` only.

**Important:** the implementation `17-SUMMARY.md` describes no longer exists. Phase 8 shipped an app-owned raster tile layer on `react-native-maps` (`UrlTile`, `OfflineBasemapTile`, per-area tile files, `offline-download.ts` with batches of 6). Phase 12.1 then moved the Explorer to MapLibre (OA-60 to OA-62, owner decision 2026-09-28) and rebuilt offline areas on MapLibre native offline packs (commit `bc1587a`, "offline maps on MapLibre native packs", now on by default). `OfflineBasemapTile.tsx`, `offline-download.ts` and `react-native-maps` are gone from `mobile/`. Every criterion below was checked against the current code. The SQLite tables, the parcel cache, the basemap preference, the offline indicator and the pending-parcel queue survived the rework.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The map shows the surveyor's own surveys ... (struck through in the roadmap: done in Phase 2, which repoints the map to all members' surveys; navigation unchanged). | VERIFIED (by Phase 2) | See "REQ-B-own-surveys-map" below. The Explorer (`PublicMapRoute.tsx` then `PublicMapScreen.tsx`) is the member-authenticated map, and navigation is unchanged. |
| 2 | The surveyor switches between a satellite and a map basemap, and the choice persists while navigating. | VERIFIED | `PublicMapScreen.tsx` passes `toggleBasemap` to `MapTopControls`; `PublicMapRoute.tsx` owns `useBasemapPreference()`, which loads and saves through `storage/map-preference.ts` (`local_meta` key `map_basemap`, default `"map"`, invalid values fall back to the default). `MapCanvas` feeds `basemap` to `useMapStyle`, which picks `mapStyleFor(basemap)` (Plan IGN style or orthophoto style in `map/maplibre/styles.ts`). The choice therefore also survives a relaunch, a superset of the criterion. Tests run here: `map-preference.sqlite.test.ts`, `useBasemapPreference.test.ts`, `useMapStyle.test.ts`, `PublicMapScreen.test.tsx` (basemap switch test at line 533) all pass. Owner: OA-118 (basemap button, closed on the phone 2026-10-06). |
| 3 | The surveyor selects an area, sees its estimated download size and progress, and the downloaded area is still usable after force-quitting and relaunching the app; downloaded areas can be listed and deleted. | PRESENT_BEHAVIOR_UNVERIFIED | Select and estimate: `OfflineAreasSheet.tsx` takes the current viewport, shows `t.estimate({tiles, bytes})` from `estimateAreaDownload` (`map/tile-math.ts`, 20 kB per tile, 3000 tiles per basemap cap, "too large, zoom in" message) and a name field; `useOfflineAreas.startDownload` inserts an `offline_areas` row first, then `downloadAreaPacks` (`map/offline-packs.ts`) creates one `OfflineManager` pack per basemap (zoom 13 to 17, style with the cadastre) and mirrors the percentage into `downloaded_tiles`. Progress: a numeric percent is shown in the survey-flow banner (`useOfflineMapPrompt` to `OfflineMapPrompt`, "Téléchargement · N %"); the Explorer panel shows only a loading button (see Human Verification, the catalogue string `offlineMap.areas.progress` is unused). Persist: `db.ts` migration 3 creates `offline_areas`, `offline_area_parcels`, `offline_pending_parcels` (`SCHEMA_VERSION` is now 4); `offline-map.sqlite.test.ts` runs the real SQL. The native pack surviving a relaunch is not testable here. List and delete: Paramètres > Cartes hors ligne (`OfflineAreasRoute.tsx`, `OfflineAreasScreen.tsx`, owner decision OA-108 and OA-123) lists name, size and status and deletes with a confirmation through `deleteArea`, which calls `deleteAreaPacks` then removes the row. The list lives in Paramètres now, not in the Explorer panel. Tests run here: `useOfflineAreas.test.ts`, `OfflineAreasScreen.test.tsx`, `offline-styles.test.ts` pass. Owner: OA-120 (download fixed, closed "phone pass 2, main at 4419590"), OA-108 closed on the phone. The relaunch half is the owner's explicit Phase 13 item. |
| 4 | In airplane mode the map shows an offline indicator, renders the downloaded basemap and cached parcels, follows GPS, and still allows zoom, pan and parcel selection. | PRESENT_BEHAVIOR_UNVERIFIED | Indicator: `useIsOffline.ts` (`expo-network`, same `isOnlineNetworkState` rule as the sync engine) feeds `PublicMapRoute`, then `ScoreLegend isOffline`, which renders `OfflineIndicatorBadge` ("Hors connexion"). Basemap: `useMapStyle.ts`, when offline with a ready area and the style file present, returns the composite `file://` style written by `writeOfflineStyle` (cadastre included, `cadastreInStyle: true`); its sources are served by the native pack cache. Cached parcels: `usePublicMapExplorer.loadPublicParcels` reads `getCachedParcelsForBounds` (SQL join on `offline_area_parcels` and `offline_areas`) instead of calling the network when `isOffline`; `useOfflineAreas` stores the statuses after a download (best effort, needs a token). `MapCanvas` draws them in `ParcelPolygonsLayer`. GPS: `MapCanvas` mounts MapLibre `<UserLocation />` and `handleLocate` recentres from `expo-location`, both on-device. Zoom and pan are MapLibre gestures; selecting a studied parcel calls `handleSelectParcel`, which opens `ParcelHistoryCard`. Limits visible in code: survey markers are not cached (`loadPublicMap` has no offline path, markers only exist from an earlier online load), and outside a downloaded area there is no basemap offline. Nothing tests native offline rendering, so this stays unverified until the Phase 13 airplane-mode walkthrough. Tests run here: `useIsOffline.test.ts`, `useMapStyle.test.ts`, `usePublicMapExplorer.test.ts` (offline parcel path), `offline-map.sqlite.test.ts`, `ScoreLegend.test.tsx` pass. |
| 5 | When a parcel is missing from the offline cache, the app says so plainly and offers a download action that runs once the network returns, with no infinite spinner. | VERIFIED (with a warning) | `useParcelSurveyHistory.ts` returns `offline: true` and attempts no request while offline, so there is no spinner. `ParcelHistoryCard.tsx` shows an `AppNotice` ("Parcelle non disponible hors connexion") and an `AppButton` "Télécharger au retour du réseau"; pressing it calls `onQueueDownload` then `addPendingParcelDownload` (`offline_pending_parcels`) and the notice switches to "Téléchargement programmé…". `useOfflinePendingParcelDrain` (mounted in `PublicMapRoute`) drains the queue on the offline to online transition: one `fetchParcelSurveyHistory` per pending parcel, cleared on success, kept on failure. `PublicMapScreen.test.tsx:435` ("tapping a studied parcel while offline shows the missing-parcel warning, never the network") and `useOfflinePendingParcelDrain.test.ts` (7 tests, including the transition) pass here. Warning, Level 4 data flow: the drain discards the response (`await fetchParcelSurveyHistory(...)` with no store) and nothing reads `getCachedParcelById` (defined, never called outside tests). A parcel's history is never cached, so offline, every tapped studied parcel shows "Cette parcelle n'a pas été téléchargée" even inside a downloaded area, and the queued "download" has no lasting effect. The literal criterion holds; its intent (the parcel becomes available) is only met live, because the open card refetches on reconnect. |

**Score:** 3/5 truths verified. Criteria 3 and 4 are PRESENT_BEHAVIOR_UNVERIFIED (`behavior_unverified: 2`), explicitly deferred to Phase 13 and not counted as failures.

### REQ-B-own-surveys-map: is it really delivered in code?

**Yes in code, but it belongs to Phase 2, not to Phase 8, and `REQUIREMENTS.md` still shows it open.** The requirement (as redefined 2026-09-27) is: the map requires authentication and shows the surveys submitted by any association member.

- Server auth: `api/src/surveys/public.controller.ts` has `@UseGuards(AuthGuard)` on the whole `public` controller, so `GET /public/map-items` and `GET /public/parcels/status` return 401 without a bearer token.
- Server scope: `api/src/surveys/public-map.queries.ts:9` defines `PUBLIC_SURVEY_PREDICATE = s.status = 'submitted' AND s.deleted_at IS NULL`. There is no `user_id` filter and no visibility filter, so every member sees every submitted survey, never a draft.
- Server tests (read, not run here, they need PostgreSQL): `api/test/public-map-items.e2e-spec.ts` asserts 401 on both routes (lines 37 to 43) and that a different member sees both a public and a private submitted survey (lines 136 to 152).
- Client: `mobile/src/api/ibp-api.ts` `fetchPublicMapItems` and `fetchPublicParcelStatuses` require an `accessToken` argument; `mobile/src/hooks/usePublicMapExplorer.ts` returns without fetching when there is no token; `PublicMapRoute.tsx` passes `useAccessToken()`.
- Extra, from Phase 12.1 (OA-59): `mobile/src/map/own-drafts.ts` also draws the author's own drafts beside the members' surveys, visible to the author only.

**Bookkeeping gap:** `.planning/REQUIREMENTS.md` line 50 still reads `- [ ] **REQ-B-own-surveys-map**` and the traceability row at line 260 says `Phase 2 | Build`. The code delivers it; the document was not updated. Phase 8's own four requirements (`REQ-D-offline-map`, `REQ-D-area-download`, `REQ-D-offline-parcel-warning`, `REQ-D-basemap-switch`) are marked `[x]` and "Built".

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/src/storage/map-preference.ts`, `hooks/useBasemapPreference.ts` | Persisted basemap choice | VERIFIED | Wired in `PublicMapRoute` |
| `mobile/src/map/tile-math.ts` | Estimate and cap | VERIFIED | Used by `useOfflineAreas`, `useOfflineMapPrompt` |
| `mobile/src/map/offline-packs.ts` | Native pack create and delete | VERIFIED | `downloadAreaPacks`, `deleteAreaPacks` used by `useOfflineAreas`; `listPackAreaIds` unused |
| `mobile/src/map/offline-styles.ts` | Composite style file with cadastre | VERIFIED | Written before each pack, read by `useMapStyle` |
| `mobile/src/storage/offline-map.ts`, `db.ts` migration 3 | CRUD and tables | VERIFIED | Real-SQL test passes |
| `mobile/src/hooks/useOfflineAreas.ts`, `screens/public-map/OfflineAreasSheet.tsx`, `screens/OfflineAreasScreen.tsx`, `navigation/routes/OfflineAreasRoute.tsx` | Download, list, delete | VERIFIED | Download in the Explorer panel and the survey flow, list and delete in Paramètres |
| `mobile/src/hooks/useIsOffline.ts`, `screens/public-map/OfflineControls.tsx` | Offline state and badge | VERIFIED | Badge rendered by `ScoreLegend` |
| `mobile/src/hooks/useMapStyle.ts` | Offline style selection | VERIFIED | Needs a device to prove rendering |
| `mobile/src/hooks/usePublicMapExplorer.ts` | Offline parcel cache read | VERIFIED | Test covers the path |
| `mobile/src/hooks/useParcelSurveyHistory.ts`, `ParcelHistoryCard.tsx`, `useOfflinePendingParcelDrain.ts` | Missing-parcel warning and queue | HOLLOW (data) | Wired and tested; the queued fetch is discarded |
| `mobile/src/app/feature-flags.ts` | Kill switch | VERIFIED | Offline maps on unless `EXPO_PUBLIC_ENABLE_OFFLINE_MAPS=false` |
| `mobile/src/screens/public-map/OfflineBasemapTile.tsx`, `map/offline-download.ts` | Phase 8 tile layer and downloader | Removed | Superseded by MapLibre native packs |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `PublicMapRoute` | `useBasemapPreference`, `useIsOffline`, `useOfflinePendingParcelDrain` | hooks, props into `PublicMapScreen` | WIRED | |
| `PublicMapScreen` download button | `useOfflineAreas.startDownload` | `OfflineAreasSheet.onDownload` with `viewport.region` | WIRED | Disabled while downloading or over the cap |
| `useOfflineAreas` | `downloadAreaPacks` and `offline_areas` row | `insertOfflineArea`, then packs, then `finalizeOfflineArea` | WIRED | A failed pack deletes the packs and marks the area `failed` |
| `MapCanvas` | offline style | `useMapStyle(basemap, styleRefreshKey)`, key bumped by `readyAreaCount` | WIRED | |
| `usePublicMapExplorer` | `offline_area_parcels` | `getCachedParcelsForBounds` when `isOffline` | WIRED | |
| `ParcelHistoryCard` | `offline_pending_parcels` then drain | `addPendingParcelDownload`, `useOfflinePendingParcelDrain` | WIRED, result discarded | See truth 5 |
| Paramètres | `OfflineAreasScreen` | Cartes hors ligne row, `isOfflineMapsEnabled()` | WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ParcelPolygonsLayer` offline | `parcelStatuses` | `offline_area_parcels` filled after a download from `GET /public/parcels/status` (zoom 16) | Yes, if the download had a token and the call succeeded | FLOWING (best effort) |
| `useMapStyle` offline | style `file://` URI | `writeOfflineStyle` at download | Yes | FLOWING (needs the native cache; device check) |
| `ParcelHistoryCard` offline | `items` | none: history is never cached | No | DISCONNECTED (shows the missing notice for every parcel) |
| `drainPendingParcelDownloads` | fetched history | `fetchParcelSurveyHistory` | Fetched and dropped | HOLLOW |
| `OfflineAreasSheet` progress | `downloadingAreaId` only | no percentage passed | Indeterminate | STATIC |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 8 suites | `jest -c mobile/jest.unit.config.js --coverage=false` on `src/map`, `storage/offline-map`, `storage/map-preference`, `hooks/useOfflineAreas`, `useIsOffline`, `useBasemapPreference`, `useMapStyle`, `useOfflinePendingParcelDrain`, `useParcelSurveyHistory`, `usePublicMapExplorer`, `screens/public-map`, `screens/OfflineAreasScreen` | 29 suites, 224 tests passed | PASS |
| Debt markers | `grep -rnE "\b(TBD|FIXME|XXX)\b" mobile/src` | none | PASS |
| API E2E for the member-wide map | `api/test/public-map-items.e2e-spec.ts` | Not run (needs a PostgreSQL service); read only | SKIPPED |
| On-device airplane mode, relaunch | | No device in this session | SKIPPED, routed to Human Verification |

### Probe Execution

No probes declared; `scripts/*/tests/probe-*.sh` does not exist. Skipped.

### Requirements Coverage

| Requirement | Source | Description | Status | Evidence |
|-------------|--------|-------------|--------|----------|
| REQ-D-basemap-switch | Phase 8 | Satellite and Map selector, persisted, default configurable | SATISFIED | Truth 2. "Configurable" is the `DEFAULT_BASEMAP` constant, as `REQUIREMENTS.md` already notes |
| REQ-D-area-download | Phase 8 | Select an area, size and progress, list, delete, survives restart | SATISFIED in code, relaunch NEEDS HUMAN | Truth 3 |
| REQ-D-offline-map | Phase 8 | Indicator, basemap and local parcels, GPS, zoom, pan, selection with no connectivity | SATISFIED in code, NEEDS HUMAN | Truth 4 |
| REQ-D-offline-parcel-warning | Phase 8 | Clear message and a quick action once the network returns, no infinite spinner | SATISFIED as worded, warning on the discarded fetch | Truth 5 |
| REQ-B-own-surveys-map | Phase 2 (claimed by this roadmap's struck criterion 1) | Authenticated map of members' surveys | DELIVERED in code (see above); `REQUIREMENTS.md` not updated | Phase 2 files |

No requirement is mapped to Phase 8 in `REQUIREMENTS.md` without being listed here.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/src/hooks/useOfflinePendingParcelDrain.ts` | 14 | Fetch result discarded; the "download" stores nothing | Warning | The queue has no lasting effect (truth 5) |
| `mobile/src/hooks/useParcelSurveyHistory.ts` | 8 | `offline` is returned for every parcel; no cached history is ever consulted | Warning | A parcel inside a downloaded area still gets the "not downloaded" notice |
| `mobile/src/storage/offline-map.ts` | `getCachedParcelById`, `findReadyOfflineAreaForPoint` | Exported, never called outside tests | Info | Dead code left from the pre-MapLibre design |
| `mobile/src/map/offline-packs.ts` | `listPackAreaIds` | "for reconciling the local list", never called | Info | No startup reconciliation: an area interrupted by a force-quit stays `downloading` in SQLite until deleted by hand, and a native pack removed outside the app leaves a `ready` row. Worth a look in the Phase 13 relaunch test |
| `mobile/src/i18n/fr/offline-map.ts` | `areas.progress` | Unused string | Info | Matches the missing Explorer progress |
| `mobile/src/screens/PublicMapScreen.tsx` | 56 | Prop comment says "Area downloads are suspended (Explorer on MapLibre)" while downloads are live again | Info | Stale comment |
| `.planning/phases/17-offline-map-own-survey-navigation/17-SUMMARY.md`, `17-CONTEXT.md` | all | Describe `UrlTile`, per-area tile files and 6-way batches, now replaced | Info | Historical; `17-VALIDATION.md` records the current state |

### Human Verification Required

#### 1. Airplane-mode walkthrough and force-quit relaunch (deferred to Phase 13)

**Test:** On a phone, download a small area (Explorer panel or the survey banner), force-quit, relaunch in airplane mode. Pan, zoom, switch Plan and Satellite, tap locate, tap a studied parcel.
**Expected:** The area is listed as Prête, the offline badge shows, the downloaded basemap and cadastre draw, parcels are coloured by score, the position halo works, a tapped parcel gives the missing-parcel notice with no spinner.
**Why human:** Device only. This is the owner's explicit Phase 13 item and is not a failure.

#### 2. Should the queued parcel download keep its result?

**Test:** Decide.
**Expected:** Accept the current behavior (history read live) or store the fetched history so it can be shown offline.
**Why human:** Product decision; `REQ-D-offline-parcel-warning` is met as worded.

#### 3. Is an indeterminate button enough progress in the Explorer panel?

**Test:** Decide.
**Expected:** Accept it or pass `downloadedTiles / totalTiles` to `OfflineAreasSheet`.
**Why human:** Criterion 3 says "sees ... progress"; the percentage exists only in the survey-flow banner.

### Gaps Summary

No code gap against the Phase 8 success criteria as written. Criteria 1, 2 and 5 are verified in the code and by passing tests. Criteria 3 and 4 are fully built and wired, but their device-dependent halves (relaunch persistence of the native packs; offline rendering, GPS and gestures) have never been exercised on hardware, which the roadmap and the owner already deferred to Phase 13, so they are reported as `behavior_unverified`, not as failures. Three things deserve attention: the queued parcel download fetches and throws away its result (warning), the Explorer panel shows no percentage (decision), and `REQUIREMENTS.md` still shows `REQ-B-own-surveys-map` as open although Phase 2 delivered it (bookkeeping).

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_

## Update 2026-10-10

The two decisions are settled by the owner: the deferred parcel-history download stays as it is (the fetch result is discarded, the history is read live online; Phase 24 caches the history per parcel), and an indeterminate "Téléchargement…" button is not enough: the percentage in the Explorer sheet is added in Phase 28. The airplane-mode walkthrough and the force-quit relaunch are checks D-04 and D-05 of `docs/user-tests/device-checks.md`. Status stays `human_needed` until they are run.

**Walkthrough run 2026-10-10 (iPhone, owner's recordings):** the downloaded basemap, the parcels and the scored parcels display in airplane mode, also after a force quit and relaunch (D-04, D-05). Two gaps: offline, another member's survey opens a broken error page (F-1), and after a restart the Explorer draws none of the owner's surveys, because only drafts come from local data (F-2, success criterion "see your own surveys on the map"). Both are criteria of Phase 26; the status is `gaps_found` until it closes them.

## Closed 2026-10-10

The owner closed the phase: the two gaps found by the airplane-mode walkthrough are carried over and tracked, so they no longer hold it open. F-1 (offline, another member's survey opens a broken error page) and F-2 (after a restart, the owner's submitted surveys, the last markers and the clusters are not drawn from local data) are findings of `docs/user-tests/device-checks.md` and success criteria 5 and 6 of Phase 26. The offline basemap, parcels and scored parcels were confirmed in airplane mode, also after a force quit and relaunch (D-04, D-05).
