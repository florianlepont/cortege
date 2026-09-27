# Phase 8: Offline Map & Own-Survey Navigation - Context

**Gathered:** 2026-09-27
**Status:** Ready for implementation
**Source:** `.planning/ROADMAP.md` Phase 8, `.planning/REQUIREMENTS.md` (REQ-D-offline-map,
REQ-D-area-download, REQ-D-offline-parcel-warning, REQ-D-basemap-switch). Run autonomously (no
live product-owner discussion this time), so every call below that would normally be an owner
decision is instead Claude's discretion, recorded here for review rather than made silently.

<domain>
## Phase Boundary

The map this phase makes offline-capable is the member-authenticated Explorer map Phase 2 already
ships (`mobile/src/screens/PublicMapScreen.tsx` and `mobile/src/screens/public-map/`). Phase 8's
own "own surveys" framing was superseded by Phase 2 (all members' surveys, not just the
contributor's own) — nothing here reopens that. In scope: a basemap switch that persists, an
area-download flow with size estimate/progress/list/delete that survives a relaunch, an offline
indicator plus a fully offline map (basemap, cached parcels, GPS, zoom/pan/selection), and a plain
warning + queued download when a parcel is not cached offline.

**Explicitly out of scope**: the survey-creation parcel picker (`ParcelMapModal.tsx` /
`useParcelMap.ts`). It never calls the public map-items/parcel-status endpoints this phase caches
(it works from the cadastre provider and local survey drafts, already offline-first), and
REQ-D wording and the roadmap phrasing ("the map screen") both point at the Explorer map Phase 2
repointed. Touching it would widen this phase well past a single coherent increment.

</domain>

<decisions>
## Implementation Decisions (Claude's discretion, no live owner session)

### Basemap tiles and offline rendering
- D-01: The app does not control what Apple/Google Maps caches for their native `mapType`
  imagery, so a real, downloadable, app-controlled basemap needs its own raster tile source — the
  same pattern the app already uses for the cadastre overlay (`IgnCadastreTileOverlay.tsx`,
  `UrlTile` against `data.geopf.fr/tms/1.0.0/{layer}/{z}/{x}/{y}.png`). Two IGN Géoplateforme TMS
  layers are added as basemaps: `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` ("Plan") and
  `ORTHOIMAGERY.ORTHOPHOTOS` ("Satellite"), rendered as an opaque `UrlTile` mounted below the
  existing cadastre overlay. `MapView.mapType` stays `"standard"` (the inert native background);
  the visible basemap is entirely this app-owned tile layer.
- D-02: `UrlTile.urlTemplate` accepts a `file://.../{z}/{x}/{y}.png` local-filesystem template
  directly (confirmed in `react-native-maps` 1.27's own type docs), so no native offline-tile
  module is needed. Online, the template points at the remote IGN URL. Offline, it points at the
  most-recently-downloaded ready `offline_areas` row whose bbox contains the current region
  center (`resolveOfflineAreaForPoint`); outside any downloaded area there is simply no basemap
  tile layer offline (native blank background), which matches criterion 4's "renders the
  downloaded basemap" (the one for the area the surveyor is in), not a promise of global offline
  coverage.
- D-03: Both basemaps are downloaded for every area (not just the one selected at download time),
  so switching Satellite/Map while offline (criterion 2 + 4 together) keeps working without a
  second download step. The size estimate shown before download already accounts for both.

### Area download
- D-04: An area is "the current map viewport" at download time — consistent with the rest of the
  Explorer map's viewport-driven design (`useMapViewport`) — not a free-hand drawn shape. The
  surveyor pans/zooms to the area of interest, opens the offline-areas sheet and taps "Download
  this area"; the surveyor names it.
- D-05: Fixed zoom range `MIN_TILE_ZOOM = 13` .. `MAX_TILE_ZOOM = 17` (`mobile/src/map/tile-math.ts`),
  chosen so the lower bound gives regional orientation and the upper bound matches
  `PARCEL_MIN_ZOOM = 15` already used for the cadastre layer plus two levels of headroom for
  close-in navigation. Not user-configurable in this phase.
- D-06: Size is an estimate only, computed client-side with no network round trip:
  `tileCount * AVERAGE_TILE_BYTES` (`AVERAGE_TILE_BYTES = 20_000`, a documented assumption for
  compressed raster tiles, not a measured average). Shown before the surveyor confirms.
- D-07: `MAX_TILES_PER_AREA = 3000` tiles per basemap (6000 total across both) is a hard cap; a
  viewport whose tile count at the fixed zoom range exceeds it is rejected with a message asking
  to zoom in, rather than silently truncated or downloading an unbounded amount of storage.
- D-08: Tiles are stored per-area (`documentDirectory/offline-tiles/{areaId}/{basemap}/{z}/{x}/{y}.png`),
  not deduplicated across overlapping areas. This trades some storage efficiency for a trivial,
  correct delete (`deleteAsync` the area's directory) — the right tradeoff at this scope over a
  shared-cache reference-counting scheme.
- D-09: Downloads run in fixed-size concurrent batches (6 at a time) with no cancel control in
  this phase (deferred — see below). A tile that fails to download is counted and skipped, not
  retried automatically; the loop always finishes. An area is marked `ready` as soon as at least
  one tile downloaded (partial coverage is still useful and matches criterion 3's "usable", not
  "complete"), and `failed` only when nothing came through at all (e.g. connectivity dropped
  before any tile succeeded). `failed_tiles` is kept and shown, so a heavily degraded download is
  visible rather than silently declared a full success.
- D-10: After the tile loop, the area's parcel statuses (`GET /public/parcels/status`) are fetched
  once for its bbox at zoom 16 and stored in `offline_area_parcels`, keyed by `(area_id,
  parcel_id)`. This is the "cached parcels" of criterion 4 — parcel status/geometry JSON, not a
  cadastre tile image (the polygon overlay is already vector data drawn from this JSON, so caching
  the tiles would duplicate data already fully covered by the parcel-status cache).
- D-11: Progress is persisted to SQLite every 10 tiles (not on every tile) to bound write volume;
  the in-memory hook state updates on every tile so the UI progress bar is smooth regardless.

### Offline detection
- D-12: `expo-network` (already a dependency) exposes `useNetworkState`/`addNetworkStateListener`
  natively — no need for `@react-native-community/netinfo`. `useIsOffline()`
  (`mobile/src/hooks/useIsOffline.ts`) treats the device as offline when `isConnected !== true` or
  `isInternetReachable === false`.

### Missing-parcel warning and queued download
- D-13: `usePublicMapExplorer`'s parcel loader, when offline, reads `offline_area_parcels` for any
  downloaded area overlapping the requested bbox instead of calling the network (no request is
  attempted, so there is nothing to time out or spin on).
- D-14: `ParcelHistoryCard` (tapping a studied parcel on the Explorer map, Phase 2's flow) is the
  concrete "an expected parcel is missing" surface for this phase: when offline and no cached
  history/status exists for the tapped parcel, it shows a plain message instead of the loading
  spinner and offers a "Download when back online" action. That action writes the parcel id to
  `offline_pending_parcels`; `useIsOffline` transitioning from offline to online drains that queue
  automatically (one fetch per pending parcel, then it's cleared) — never an infinite spinner,
  never a manual retry required.

### Persistence
- D-15: The basemap choice ("map" | "satellite") is written to `local_meta` (same key/value store
  and `INSERT ... ON CONFLICT` pattern as `saveCachedProfile`/`setLocalDataOwner`), so it survives
  both navigation within the session and an app relaunch — a strict superset of criterion 2's
  "persists while navigating".

### Deferred (explicitly out of this phase)
- Cancelling an in-progress area download.
- Automatic re-download / refresh of a stale area (the surveyor deletes and re-downloads by hand).
- Deduplicating tiles shared by overlapping areas.
- Any offline capability for the survey-creation parcel picker (see Phase Boundary above).

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` Phase 8 (goal, depends-on, success criteria) and Phase 2 (what it already
  repointed the Explorer map to)
- `.planning/REQUIREMENTS.md`: REQ-D-offline-map, REQ-D-area-download, REQ-D-offline-parcel-warning,
  REQ-D-basemap-switch
- `.planning/phases/01.5-mobile-sync-engine-reliability/`: the reference pattern for
  transactional local storage, retry/caching and SQLite migration structure this phase follows
- `mobile/src/components/IgnCadastreTileOverlay.tsx`: the existing raster-tile-overlay pattern this
  phase's basemap layer reuses
- `mobile/src/storage/db.ts`, `mobile/src/storage/local-owner.ts`,
  `mobile/src/storage/profile-cache.ts`: `local_meta` and migration conventions
- CLAUDE.md: `expo-file-system/legacy` is the file API this codebase uses (D-12 of phase 01.5); this
  phase follows the same convention for tile downloads

</canonical_refs>

---

*Phase: 08-offline-map-own-survey-navigation*
*Context gathered: 2026-09-27, autonomous execution*
