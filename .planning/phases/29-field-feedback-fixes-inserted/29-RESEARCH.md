# Phase 29: Field-feedback fixes (INSERTED) - Research

**Researched:** 2026-10-10
**Domain:** React Native / Expo 57 mobile app (offline Explorer data, error-state layout, catalogue abbreviation gate, genus ordering, small-screen layout budget, recognition temp-file cleanup and measurement)
**Confidence:** HIGH on code facts (every claim below was read in the worktree, file:line given); MEDIUM on the layout root cause of F-1 (not reproduced) and on the small-screen heights (token arithmetic, not a device measurement)

**Naming collision, read first.** Three unrelated "D-0x" namespaces exist. In this file:
- **decision D-01..D-08** = the implementation decisions of `29-CONTEXT.md`.
- **device check DC-D-01..DC-D-05** (written "D-01" in `docs/user-tests/device-checks.md` and in ROADMAP criterion 7) = the carried-over phone checks.
- **ADR-002 D-05** = the 3,000 ms recognition latency budget (`docs/technical/adr-002-on-device-species-recognition-v1.md`, `docs/technical/species-recognition-spike-measurements-v1.md` section 7).
Plan frontmatter `requirements:` must use the decisions (`D-01`..`D-08`) plus the ROADMAP criteria `SC-1` and `SC-7` for the two criteria that are not decisions. A gate that greps for "D-01" must not be satisfied by a device-check mention.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Offline Explorer data (F-2)
- **D-01:** Offline, Explorer draws **every own survey the phone holds, draft or submitted**, from local data (extend `ownDraftMapItems` in `mobile/src/map/own-drafts.ts`, which keeps drafts only today). Other members' markers and clusters are **not** persisted: they stay online only. This narrows ROADMAP criterion 6 ("markers and clusters of the last Explorer view"): no cache of API markers, no `local_meta` key, SQLite schema stays at version 5.
- **D-02:** No stale-data marking needed: the existing red "Hors connexion" badge is enough.

#### Offline community survey (F-1)
- **D-03:** Opening another member's survey offline shows a **centred message** ("ce relevé nécessite une connexion") with a **Retry** button directly below, all inside the safe area. No back button beyond the header's. Reuse an existing empty/error state component if one fits. Text goes through the `fr` catalogue (`community-survey.ts`), no em dash.

#### Abbreviations
- **D-04:** Write the term out where it fits; where it does not, a tappable info icon opens a small sheet. One shared catalogue entry per abbreviation.
- **D-05:** The inventory is automated: scan the `fr` catalogue for abbreviations, list them in the plan, and add a unit test (in `mobile/src/__checks__/`) that fails on an abbreviation neither written out nor registered as explained.

#### Genus ordering
- **D-06:** Browsable and selectable genus lists sort by **Latin genus name**, locale-aware and accent-insensitive.
- **D-07:** Photo-recognition suggestions **keep confidence order** (best guess first). Alphabetical does not apply to them.

#### Small screens
- **D-08:** Below a height threshold the parcel-selection information message is compact (shorter text, smaller type, capped height) so the map keeps a usable share of the screen (target about half) on the smallest supported screen. Exact threshold chosen by the planner from device measurements.

#### Carried unchanged from the ROADMAP
- Recognition workflow rethink was set aside (owner, 2026-10-10); only temp-file cleanup (criterion 7) and DC-D-01 to DC-D-03 device measurements (median and p95 vs 3 s, online and airplane mode) remain.

### Claude's Discretion
Info-sheet visual design (within the charter), the height threshold of D-08, where the abbreviation registry lives.

### Deferred Ideas (OUT OF SCOPE)
- Persisting other members' markers/clusters for offline (dropped by D-01; revisit only if testers ask).
- Central glossary page (not chosen).
</user_constraints>

<phase_requirements>
## Phase Requirements

The roadmap lists no new REQ-ID ("to be traced when the phase is planned"). Follow the Phase 25.1 convention: trace by decision.

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01 | Offline Explorer draws every own survey held on the phone, draft or submitted | Sections "Offline own surveys (D-01, D-02)": the existing function is fed by API-loaded in-memory details, so generalising its status filter is NOT enough; a local reader, a score computation and a position source are needed |
| D-02 | No stale marking, existing badge only | `ScoreLegend` already renders `OfflineIndicatorBadge` from the `isOffline` prop (`mobile/src/screens/public-map/ScoreLegend.tsx:111`) |
| D-03 | Centred offline message + Retry in the safe area on the community survey page | Section "Offline community survey (D-03)": root cause, layout fix, shared state component, offline detection |
| D-04 | Write out, else info icon + sheet, one shared catalogue entry per abbreviation | Section "Abbreviations (D-04, D-05)": inventory table, registry, sheet primitives |
| D-05 | Automated inventory and a failing unit test in `__checks__` | Same section: operational gate definition, fixture-test conventions |
| D-06 | Genus lists sorted by Latin name, locale-aware, accent-insensitive | Section "Genus ordering (D-06, D-07)": every place genera appear, Hermes Intl facts, one shared helper |
| D-07 | Recognition suggestions keep confidence order | Same section: the only place is `GenusRecognitionModal.tsx:177`, `rankGenusSuggestions` sorts by confidence; pin it with a test |
| D-08 | Compact parcel-selection message below a height threshold | Section "Small screens (D-08)": layout arithmetic, threshold recommendation, Jest vs device split |
| SC-1 | Genus recognition works on Android (model loads in Release, PR #272; confirmed on two real phones) | Section "Recognition (SC-1, SC-7)": PR #272 anatomy, regression pitfalls, human checkpoint |
| SC-7 | Two temp files deleted explicitly; latency measured on real Android phones (DC-D-01..03) | Same section: file paths, deletion API, cleanup paths, measurement protocol |

Existing REQ-IDs this phase extends or fixes (verified in `.planning/REQUIREMENTS.md`):
- `REQ-C-species-recognition` (line 61, built Phase 15): SC-1, SC-7, D-06/D-07 (ordering of the picker beside it). Its text explicitly defers "a real Android device latency/accuracy run" to the field validation, which this phase now owns.
- `REQ-D-offline-map` (line 69, closed Phase 17): D-01/D-02/D-03 extend it ("map renders a basemap and locally available parcels"; own surveys and the community page were not covered).
- `REQ-B-own-surveys-map` (line 50): **do not use it for D-01.** It was redefined 2026-09-27 to "the surveys submitted by any association member", not own surveys. The own-draft markers come from owner acceptance item OA-59 (a comment in `own-drafts.ts`), which has no REQ-ID. Name `REQ-D-offline-map` only.
</phase_requirements>

## Summary

All seven success criteria are implementable with the installed stack and **no new package**. The hard parts are not where CONTEXT places them. (1) D-01 says "generalise the status filter of `ownDraftMapItems`", but that function reads `surveys.surveyDetails`, an **in-memory** map filled one survey at a time by `GET /v1/surveys/:id` (`mobile/src/hooks/useSurveySync.ts:62,393,508-520`), empty after every restart. SQLite holds **no position** for any own survey (the local payload has `parcel_ids` and `factors`, not a location) and no score for drafts. So offline-after-restart needs a new local reader, a local score computation (the repo already has one) and a position source (cached parcel geometry, optionally a persisted fallback). (2) D-03's page is a plain `View` placed inside `ScreenFrame largeTitle`, whose contract says the system insets only a **scroll view**; that, not a style typo, is the most likely cause of the message under the status bar (not reproduced). (3) D-06 sorts by Latin name but the pickers display **French** names, so a Latin sort will look unsorted to the user unless the Latin name is shown too (owner confirmation needed). (4) The tab bar is **never** hidden (rule OA-28), contrary to the assumption in the planning notes, which makes the parcel-selection card cost more of the screen than it seems.

**Primary recommendation:** Plan six independent work packages (recognition cleanup and timing, genus sort, community offline state, offline own surveys, parcel-selection compact mode, abbreviation registry and gate), run the abbreviation package last because it edits catalogue files the others also touch, and mark the two phone-measurement tasks (SC-1 on two real Android phones, SC-7 DC-D-01..03) `autonomous: false`.

### Flags: where the code or docs contradict CONTEXT, the roadmap or the planning notes

| # | Statement | Reality (evidence) | Consequence |
|---|-----------|--------------------|-------------|
| F-A | D-01: "extend `ownDraftMapItems`, generalise its status filter" | The only status filter is `own-drafts.ts:14` (`detail.status !== "draft"`), but its input `surveys.surveyDetails` is API-fed and in memory only (see Summary) | Removing the filter alone changes nothing after a restart. New local data path required |
| F-B | Planning note: "hidden tab bar via `shouldHideTabBar`" on parcel selection | `ROUTES_WITHOUT_TAB_BAR` is an empty set (`mobile/src/navigation/tab-bar.ts:10`, rule OA-28: tab bar stays on every screen) | The card sits above the native iOS bar: `cardBottomInset = max(tabBar, safeBottom, 12) + 12` (`SurveyParcelSelectionScreen.tsx:157`), about 96 pt on iOS |
| F-C | `docs/user-tests/device-checks.md:7` "Phase 29, which reworks the workflow first"; ROADMAP.md:81 "its workflow is rethought" | Owner set the rework aside on 2026-10-10 (ROADMAP criterion 1, CONTEXT) | Documentation task: reword both lines when closing the phase. Do not plan any workflow change |
| F-D | `GenusCameraView.tsx:24` ("kept in memory by the caller and never saved") and `GenusRecognitionModal.tsx` doc ("never persisted") | `takePictureAsync` writes a JPEG to `cacheDirectory/Camera/`, and `saveAsync` writes another to `cacheDirectory/ImageManipulator/` (verified in the expo-camera and expo-image-manipulator native sources); both stay until the OS purges the cache | The comments are wrong and must be corrected with the cleanup (DC-D-03 note says the same) |
| F-E | `REQ-B-own-surveys-map` suggested as a traced REQ | Redefined to members' surveys (REQUIREMENTS.md:50) | Trace D-01 to `REQ-D-offline-map` |
| F-F | D-06 "by Latin genus name, locale-aware and accent-insensitive" | Latin codes are pure ASCII (`Abies`, `Quercus_deciduae`), so accent-insensitivity only matters for the French display names. The chips show French names (`FactorGenusListInput.tsx:61` uses `fr.genus.displayName`) | Needs the open question below (show the Latin name, or sort by the displayed label) |
| F-G | `useCommunitySurvey` offline | Status is only `"loading" \| "ready" \| "error"` (`useCommunitySurvey.ts:15-23`); offline is not distinguished from any other failure, and with no `accessToken` the effect returns early leaving "loading" forever (`:44`) | Offline detection must come from `useIsOffline()` at the route, not from the hook |
| F-H | Explorer cluster list | `ClusterListSheet.tsx:19-24` renders the raw `item.region_code` ("ACA", "M", or "unknown") for non-v3.2 surveys: an abbreviation shown outside the "write it in the catalogue" path | The abbreviation gate (catalogue scan) would not catch it; map it through `fr.labels.regions` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Own-survey markers offline (read, score, position) | Mobile local storage (SQLite via `storage/`) | Mobile UI (route/hook/map) | No server involved offline; the data is the phone's `local_surveys` and `offline_area_parcels` |
| Dedup of own vs API markers online | Mobile UI (`PublicMapRoute`) | | Pure merge by `survey_id`, the same rule as `publishedIds` today |
| Server-side position of a pulled survey (optional Tier 2) | API / Backend (`sync/changes` payload) + `ibp-domain` wire type | Mobile storage | Only the server knows the exact centre of linked parcels (`AVG(centroid)` in `public-map.queries.ts:29-35`) |
| Offline error state of the community page | Mobile UI (`CommunitySurveyScreen`, shared state component) | `useIsOffline` hook | Display only |
| Abbreviation registry, gate, info sheet | Mobile catalogue (`i18n/fr`) + `__checks__` test | Mobile UI (sheet) | Text lives in the catalogue (structure gate forbids literals elsewhere) |
| Genus ordering | Mobile pure helper (`app/`) | UI (picker), PDF builder | Display order only; stored `genera` order and wire payload stay untouched |
| Parcel-selection compact mode | Mobile UI (pure layout budget + screen) | | Window-size dependent presentation |
| Temp-file deletion, timing | Mobile native wrappers (`recognition/`, `ui/GenusRecognitionModal`) | | `expo-file-system/legacy` calls on app cache files only |

## Standard Stack

No new dependency. Everything below is already installed and verified in `node_modules` on 2026-10-10 `[VERIFIED: node_modules package.json]`.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | 57.0.24 | SDK | Project baseline |
| react-native | 0.86.3 | Runtime (Hermes) | Project baseline |
| expo-file-system (`/legacy` entry) | 57.0.7 | `deleteAsync`, `getInfoAsync`, `cacheDirectory` | Every file operation in the repo uses the legacy entry (`attachment-files.ts:84`, `map-snapshot.ts:97`, `run-export.ts:97`); jest has a full in-memory double (`mobile/test/expo-file-system-legacy.mock.ts`) |
| expo-camera | 57.0.6 | `CameraView.takePictureAsync` (writes to `cache/Camera/`) | Already used by `GenusCameraView` |
| expo-image-manipulator | 57.0.20 | `manipulate().resize().renderAsync()` then `saveAsync` (writes to `cache/ImageManipulator/`) | Already used by `genusClassifierModel.ts` |
| react-native-fast-tflite | 3.0.1 | TFLite inference | Unchanged by this phase |
| supercluster | (installed) | Client-side marker clustering (`useMapClusters.ts`) | Clusters are computed on the phone, not by the API |
| typescript (compiler API) | 5.x | AST scan in `__checks__` gates | `catalogue-dash.test.ts` already uses it |

### Supporting (existing project code to reuse, not packages)
| Module | Path | Use |
|--------|------|-----|
| `foldSearchText` | `mobile/src/app/search-text.ts:41` | NFD accent fold with a fallback table, the repo's single accent-insensitive primitive |
| `computeRetainedScoresFromRawFactors`, `computeIbpTotalsFromRetainedScores` | `mobile/src/app/ibp-scoring.ts:37,44` | Local score of a draft or unsynced survey (same call chain as `useLocalDraftSummary.ts`) |
| `boundsOfRings`, `parcelPolygonsFrom` | `mobile/src/app/survey-pdf/map-projection.ts:72,160` | Centre of cached parcel geometry (used by the PDF export for the same purpose, `assemble-export-data.ts:261-264`) |
| `getCachedParcelById`, `getCachedParcelsForBounds` | `mobile/src/storage/offline-map.ts:189,208` | Parcel geometry of downloaded areas |
| `useIsOffline` | `mobile/src/hooks/useIsOffline.ts` | Offline flag (expo-network, same rule as the sync) |
| `layout-budget.ts` pattern | `mobile/src/screens/home/layout-budget.ts` + test | Pure, device-listed height budget asserted by a test; copy this pattern for D-08 |
| `AppPressable`, `AppButton`, `AppNotice`, `AppText` | `mobile/src/ui/` | Interactive/typographic primitives |
| `FactorHelpSheet` styles, `GenusTargetSheet` modal | `mobile/src/screens/FactorHelpSheet.tsx`, `mobile/src/screens/home/GenusTargetSheet.tsx:42-46` | Sheet content styles; `Modal presentationStyle="pageSheet"` precedent that needs no navigator route |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `FileSystem.deleteAsync` (legacy) | New `File.delete()` of `expo-file-system` 57 | The repo uses the legacy entry everywhere and has the jest double only for it; mixing styles needs a second mock. Use legacy |
| Route-based info sheet (like `surveyFactorHelp`) | `Modal` pageSheet | A route must be registered in each of the four stacks where abbreviations appear (`SurveysStack`, `PublicMapStack`, `SearchStack`, `AccountStack`); a `Modal` works anywhere. Use `Modal` |
| `Intl.Collator` alone for sorting | `Intl.Collator` on `foldSearchText` keys | Hermes supports Collator on both platforms (below) but Android < 7.1 does not decompose input; folding first removes any dependence |
| New SQLite column for position | Persist inside `payload_json` | D-01 forbids a schema change; `payload_json` is schemaless and the API strips unknown payload fields instead of rejecting them (`api/src/surveys/sync-operation-validation.ts:6-26`) |

**Installation:** none.

**Version verification:** versions above read from `node_modules/<pkg>/package.json` in this worktree. `npm view` was not needed (no package is added).

## Package Legitimacy Audit

No external package is introduced by this phase. `Intl.Collator` is a language built-in; `typescript` is already a dev dependency used by the existing gates.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | n/a | n/a | n/a | n/a | n/a | n/a |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
EXPLORER (offline-capable markers)                          [D-01, D-02]

 SQLite local_surveys ----> listLocalSurveyMapSources() --+
 (id,status,created_at,                                    |   (new reader, JSON parsed in JS,
  updated_at,payload_json)                                 |    payload never leaves the phone)
 SQLite offline_area_parcels --> cached parcel geometry ---+--> ownSurveyMapItems(sources, parcelLookup)
   (areas the user downloaded)       (centre of ring bbox)       - score: server total if pulled,
                                                                  else computed locally (ibp-scoring)
 API GET /public/map-items --> usePublicMapExplorer.items       - position: persisted or cached-parcel
        (online only, memory)         |                         - skip rows with no position/score
                                      v                                  |
                          PublicMapRoute: merge, drop own ids already in API items
                                      |   draftItems (status draft, dashed marker)
                                      |   ownItems   (status submitted, normal marker)
                                      v
              PublicMapScreen mapItems -> MapCanvas -> useMapClusters (supercluster, client side)
                   count pill ("Aucun relevé ici" at 0) + OfflineIndicatorBadge (isOffline)

COMMUNITY PAGE (F-1)
 tap marker/parcel -> handleOpenSurvey -> navigate("communitySurvey")
   -> useCommunitySurvey(fetch) -- fails --> status "error"
   -> route adds useIsOffline() -> screen: offline? CenteredState(offline copy) : CenteredState(error copy)
        inside ScrollView(contentInsetAdjustmentBehavior = frame behaviour, flexGrow, centred)

RECOGNITION CLEANUP (SC-7)
 CameraView.takePictureAsync -> cache/Camera/x.jpg --handlePhoto(uri)--> classifyGenusPhoto(uri)
     -> ImageManipulator.saveAsync -> cache/ImageManipulator/y.jpg -> read base64 -> decode -> run model
     finally: delete y.jpg (inside classify)          finally: delete x.jpg (inside handlePhoto)
```

### Recommended Project Structure (new or changed files)
```
mobile/src/
├── map/own-surveys.ts            # NEW (or extend own-drafts.ts): pure builder + test. src/map is under the GLOBAL 100% coverage floor
├── storage/surveys.ts            # + listLocalSurveyMapSources() ; sqlite test next to surveys.*.sqlite.test.ts
├── hooks/useOwnSurveyMapItems.ts # NEW: loads sources + parcel geometry, memoised; called by PublicMapRoute only
├── navigation/routes/PublicMapRoute.tsx # merge + two prop groups (draftItems / ownItems)
├── ui/CenteredState.tsx          # NEW shared centred message + optional retry (D-03)
├── screens/community-survey/     # both screens use CenteredState
├── i18n/fr/abbreviations.ts      # NEW registry (D-04) + section added to fr/index.ts and catalogue.test.ts key list
├── ui/AbbreviationInfo.tsx       # NEW tappable (i) + Modal sheet
├── __checks__/abbreviations.test.ts # NEW gate (D-05)
├── app/genus-order.ts            # NEW shared sort helper (D-06)
├── screens/parcel-selection/layout-budget.ts # NEW pure budget (D-08), SurveyParcelSelectionScreen.tsx is 392/400 lines
└── recognition/temp-files.ts     # NEW guarded delete helper (SC-7)
```

### Offline own surveys (D-01, D-02)

**What exists today (verified):**
- `ownDraftMapItems(surveyDetails, publishedIds)` (`mobile/src/map/own-drafts.ts:8-30`) builds a `PublicMapItem` per located draft: `survey_id`, `display_location`, `survey_date` (= `created_at.slice(0,10)`), `region_code` (= `region_version ?? ""`), `ibp_total`, `ibp_method_version`, `ibp_cas`. It skips ids in `publishedIds` (the API items) and anything without a finite position or total.
- `PublicMapRoute.tsx:53-56` calls it with `surveys.surveyDetails` and the API item ids, passes `draftItems` to the screen, and `handleOpenSurvey` (`:57-65`) routes any id found in `draftItems` to the owner's own `surveyDetail` (not the community page, which is unreachable offline).
- `PublicMapScreen.tsx:120-125` builds `draftIdSet` and `mapItems = [...items, ...draftItems]`; `MapCanvas` draws `draftIds` as dashed markers (`MapCanvas.tsx:164-181`), keeps them at parcel zoom (`parcel-coverage.ts:107-120`), and `ScoreLegend count={mapItems.length}` (`:286`) yields "Aucun relevé ici" at zero (`fr/public-map.ts:9-10`) beside the red badge from `isOffline`.
- **Clusters are client side** (`useMapClusters.ts`, supercluster, 60 px radius, max zoom 16). The API returns plain items, so anything added to `mapItems` is clustered offline for free. No cluster logic is needed for D-01.
- `usePublicMapExplorer.items` is React state only (`:35`); offline after a restart it is `[]` (consistent with D-01). `loadPublicMap` does not check `isOffline`, so it still attempts a request on every viewport change and sets `fr.status.map.loadFailed()` (`:88-92`).

**Why generalising the filter is not enough:** `surveyDetails` is populated by `handleLoadCanonicalDetails` only for the **selected** survey and only when it is `submitted` or `synced` (`useSurveySync.ts:499-518`); it is reset on session end and absent after restart. A draft is drawn today only if its detail happened to be loaded this session. And `SurveyDetailResponse.display_location` is the server's value (`surveys.service.ts:964-1008`).

**Local data actually available (verified):**
| Datum | Local source | Notes |
|-------|--------------|-------|
| status | `local_surveys.status` | Values written by the app: `"draft"`, `"submitted"`. Legacy `"expired"` rows were reset to `"draft"` by migration 4 (`db.ts:201-207`). `discardSurveyLocalChanges` can set a literal `"synced"` from `"error"` (`surveys.ts:627-631`), a legacy oddity: treat every status other than `"draft"` as submitted-like, filter nothing else |
| deleted survey | none | `queueDeleteSurvey` deletes the row immediately (`surveys.ts:244-285`); there is no "discarded" state to exclude |
| sync state | `sync_state` (`pending`/`synced`/`failed`), `sync_blocked` | Irrelevant for drawing: draw them all (the owner wants every survey the phone holds) |
| parcels | `payload_json.parcel_ids` | Only ids |
| factors/method | `payload_json.factors`, `ibp_method_version`, `ibp_cas`, `ibp_cas3_scale`, `region_version`, `vegetation_stage` | Enough to compute the score locally |
| server total | `payload_json.scores.ibp_total` for **pulled** surveys (`sync.ts:456`, read by `listLocalSurveys` with `json_extract`, `surveys.ts:495-501`) | Prefer it for submitted surveys; compute locally otherwise |
| **position** | **none** | GPS is form state only (`useSurveyForm.ts:215-220`), never stored; `display_location` is not in `SurveyQueuePayload` (`storage/types.ts:98-113`) nor in `SyncChangeSurvey` (`packages/ibp-domain/src/contract/sync.ts:55-75`) |
| parcel geometry | `offline_area_parcels.payload_json` (a `PublicParcelStatusItem` with GeoJSON `geometry`) | Only for parcels inside an area the user downloaded (`useOfflineAreas.ts:160-170`) |

**Fields of `PublicMapItem` a local survey cannot provide exactly:** `survey_date` (server uses `submitted_at`; locally `created_at` or `updated_at` is the closest; a submitted-and-pulled payload does not keep `submitted_at`), `region_code` (v3.0 only; v3.2 surveys show "Cas N" from `ibp_cas`, `ClusterListSheet.tsx:19-23`), and `display_location` (server = average of linked parcel centroids; local approximation = centre of the bounding box of the cached ring points; the marker may differ by tens of metres, and at zoom 15+ the scored parcel replaces the marker anyway). No type change is needed: `PublicMapItem` has no owner, visibility or geometry field.

**Position source, options (the key decision for the planner):**
1. **Tier 1, read-time, no payload change (recommended core):** for each survey, look up `parcel_ids` in `offline_area_parcels`, take `parcelPolygonsFrom` + `boundsOfRings`, use the bounding-box centre. Zero changes to the four payload write sites. Limit: a survey whose parcels lie outside every downloaded area is not drawn offline.
2. **Tier 2, persist a position (optional, wider):** store `display_location` in `payload_json`. The codebase's own pattern is "precomputed at the payload-write sites" (`computePayloadCompletion`/`computePayloadFactorsFilled` at `surveys.ts:66,456`, `sync.ts:304,341`). Writing it at detail load is a three-line extension of `cacheSurveyCanonicalFields` (`surveys.ts:335-366`), but covers only surveys the user has opened. Full coverage for pulled surveys needs `display_location` added to `SyncChangeSurvey` (domain package + API changes query + `buildSurveyPayloadFromRemote`) which is an API change beyond the stated scope. The API accepts and strips an extra payload field (`sync-operation-validation.ts:6-26`), so a mobile-only persisted field is safe on the wire, but `updateLocalDraft` and `applyRemoteSurvey` rebuild the payload and would drop it unless carried over.
3. Recommendation: commit Tier 1 as the plan scope, state the limit in the plan and in `device-checks.md`, and let the owner decide whether Tier 2 (server-sent position) is wanted. See Open Question 1.

**Merge rules (online duplicates):** an own submitted survey appears in both `explorer.items` and the local list. Keep the existing rule: drop a local item whose `survey_id` is in the API item set (`publishedIds`). Offline after restart the API set is empty so the local item shows. Keep two groups so styling stays right: `draftItems` (status `draft`: dashed marker via `draftIds`, kept at parcel zoom) and `ownItems` (not draft: a normal score marker, opening the owner's detail). `handleOpenSurvey` must route ids of **both** groups to `surveyActions.openSurvey` + `navigate("surveys", { screen: "surveyDetail" })`; routing an own submitted survey to `communitySurvey` is exactly the offline failure F-1. Existing assertions to update: `routes.test.tsx:1850-1880` (draft case) and `PublicMapScreen.test.tsx:354`.

**Read cost:** a new reader selecting `id, status, created_at, updated_at, payload_json` for all rows. The list reader deliberately avoids parsing payloads (`listLocalSurveys`, comment at `surveys.ts:487-494`); the map needs `factors` for drafts, so parse in JS once per change. A user holds tens to low hundreds of surveys; reading and scoring them is milliseconds. Re-run when the survey list identity changes (`surveys.surveys` from `useSurveys()`), not on every render. Never put it in `useSurveySync` (single-assembler rule): call the new hook from `PublicMapRoute`.

**Safety:** `local_surveys` holds only the signed-in owner's rows (single-device owner gate, `useLocalDataOwner`); nothing foreign is drawn. No new `local_meta` key, no migration (`SCHEMA_VERSION` stays 5).

**Optional hygiene (small, recommended):** pass `isOffline` into the explorer so `loadPublicMap` returns early offline (`usePublicMapExplorer.ts` already receives `isOffline`), avoiding a failing request and a "load failed" status line on every pan. Cover with the existing hook test.

**Existing tests to extend:** `mobile/src/map/own-drafts.test.ts` (3 cases), `mobile/src/navigation/routes/routes.test.tsx` PublicMapRoute block (`:1776-1880`, mocks the explorer), `mobile/src/screens/public-map/PublicMapScreen.test.tsx`, and `*.sqlite.test.ts` files in `mobile/src/storage/` (they run a real SQLite through `mobile/test/node-sqlite-db.ts`, needed to test any `json_extract` reader).

### Offline community survey (D-03)

**Where:** `CommunityHistoryScreen.tsx:66-76` and `CommunitySurveyScreen.tsx:111-125` have the same copy-pasted block: `<View style={[scrollStyle, own.centered]}>` with `t.error` and `<AppButton label={t.retry} variant="secondary" onPress={state.reload} />`. Texts: `fr.communitySurvey.error` ("Ce relevé n'a pas pu être chargé. Vérifiez votre connexion.") and `retry`. The page is reached from three entrances through the same route: a marker (`handleSelectSurvey`), a tapped studied parcel (`handleSelectParcel` in `PublicMapScreen.tsx`, device check DC-D-05) and search. Fix once, both screens benefit.

**Root cause (MEDIUM confidence, not reproduced):**
- `CommunitySurveyRoute.tsx` wraps the screen in `<ScreenFrame largeTitle={usesNativeLargeTitle()}>`. In the native iOS tab tree (the owner's Release build) `LargeTitleFrame` adds **no** header padding and relies on the page's first **scroll view** with `contentInsetAdjustmentBehavior="automatic"` to be inset below the large title (`ui/ScreenFrame.tsx:63-100`, `ui/frame-large-title.ts:15-32`; the success path does this at `CommunitySurveyScreen.tsx:141-143`). The loading/error branch returns a bare `View`, so nothing insets it: content starts under the status bar. Introduced by commit `e72038b5` (12.2-17) which added the large-title frame without touching this branch.
- The "tall empty capsule in the middle, Réessayer at the bottom" is not explained by the styles read (`centered` is `flex: 1`, centred; `AppButton` md is `minHeight 44`; `AppPressable` outer/inner split puts `minHeight` on the outer view and `flexGrow: 1` on the inner). It may be the native iOS 26 header or scroll-edge effect rendering with no scroll view to follow. **First task of the plan: reproduce** (iOS simulator, native tabs, force `status: "error"` or airplane mode on a Release-like build), screenshot, then fix.
- Android and Expo Go use `HeaderInsetFrame` (`paddingTop: headerHeight`), where this branch is already inset, so the owner's report is iOS-only.

**Fix design (robust to the unverified part):**
1. New `mobile/src/ui/CenteredState.tsx`: props `icon` (Ionicons outline), `message`, optional `actionLabel`/`onAction`, `testID`. Render a `ScrollView` with `contentInsetAdjustmentBehavior={useFrameInsetBehavior()}`, `contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: brandSpacing4.lg, gap: brandSpacing4.smd }}`, so iOS finds a scroll view first, insets it below the header and above the tab bar, and centres the group; Android is padded by the frame. The button directly under the message (CONTEXT: "directly below"), `alignSelf: "center"`, `AppButton variant="secondary"`.
2. A11y: `accessibilityLiveRegion="polite"` on the message group (as `SearchGroupNotice.tsx:88`), button via `AppButton` (already 44 pt via `hitSlopFor`). Icon `cloud-offline-outline` for offline, `alert-circle-outline` for error (both already used in the app; outline only per `icons.test.ts`).
3. No existing component fits as is: `AppNotice` is an inline banner (row, 16 radius, optional small underlined action, `ui/AppNotice.tsx`), `SearchGroupNotice` is a list row, `DownloadStatusView` is panel content. The block above is the only centred empty/error state, duplicated twice. So extract it (satisfies "reuse an existing ... if one fits": none fits; the extraction is the reuse for the two pages).
4. Offline detection: add `isOffline` via `useIsOffline()` in `CommunitySurveyRoute` and `CommunityHistoryRoute` (or inside the screens) and choose copy: `status === "error" && isOffline` → new key `fr.communitySurvey.offline` ("Ce relevé nécessite une connexion." per CONTEXT; no em dash) else `error`. `ApiError` carries only `status`/`body` (`api/client.ts:1-10`); a dropped network is a `TypeError` from `fetch`, so do not branch on error kinds. Keep the retry handler `state.reload` (increments `attempt`, refetches). Optional: retry while offline just fails again; acceptable. Also fix F-G (no token leaves "loading" forever) only if cheap: show the error state when `!accessToken`.
5. Catalogue: add `offline` (and an `a11y` label for the retry) to `communitySurveyFr`; the `catalogue.test.ts` leaf checks apply (non-empty strings, no id-like patterns).

**Tests:** extend `CommunitySurveyScreen.test.tsx:136-146` and `CommunityHistoryScreen.test.tsx:139-146` (they find `AppButton` by type; keep it so they still pass); add a `CenteredState.test.tsx`; assert `contentInsetAdjustmentBehavior` follows `FrameLargeTitleContext`. **Device-only:** the actual inset/centring on the native iOS large-title frame (and the capsule).

### Abbreviations (D-04, D-05)

**Screen inventory:** none exists as a document (searched `docs/`, `.planning/`, `mobile/src`; "REQ-QA-screen-tests" is about test coverage, `component-inventory-phase-23.md` is a component list, `ux-ui-audit-2026-09.md` is findings). The structure gate `findUserFacingLiterals` guarantees that **no user-facing string lives outside `src/i18n`**, so the catalogue scan is itself the inventory of what the app can show. Complement it with a short derived screen list for the plan (from `mobile/src/navigation/types.ts`): tabs Accueil (`homeRoot`), Mes Relevés (`surveysHome`, `surveyDetail`, `surveyContext`, `surveyScore`, `surveyHistory`, `surveyJournal`, `surveyForm`, `surveyFactorDetail`, `surveyFactorHelp`, `surveyParcels`), Explorer (`publicMapHome`, `communitySurvey`, `communityHistory`), Rechercher (`searchHome`, `searchGroup`), Compte (`accountHome`, `settings`, `offlineAreas`), plus modals and sheets (genus recognition modal, genus target sheet, nearby parcels sheet, Explorer sheet, offline areas sheet), the auth gate, onboarding, profile setup, owner conflict and welcome. The table below maps each abbreviation to its screens.

**Scan method (done for this research):** a TypeScript-AST pass over every string, template part and JSX text of `mobile/src/i18n/fr/**` (non-test), regexes for capitalised tokens, dotted forms and units. All-caps shouted eyebrows (`"HORS LIGNE"`, `"BIENVENUE"`, `"SCORE MOYEN DU SECTEUR"`, ...) are whole words in capitals, not abbreviations: the gate must ignore a string whose letters are all capitals and contains a space.

**Inventory** (counts are catalogue string hits; "Treatment" is a proposal for the plan, the owner may move items between columns):

| Abbreviation | Meaning (source) | Where it appears | Proposed treatment |
|--------------|------------------|------------------|--------------------|
| IBP | Indice de Biodiversité Potentielle (`fr/onboarding.ts:13`, `fr/auth-gate.ts:7`, `fr/survey-export.ts:24`) | 60+ strings: "Score IBP" header, "Nouveau relevé IBP", method names "IBP v3.2", settings, status lines, PDF | The product subject. Already written out in onboarding, auth gate and PDF subtitle. Registry treatment `definedOnce` + info sheet on the "Score IBP" header and method row; do not decorate all 60 uses. Owner decision (Open Question 3) |
| BMg | bois morts de grosse dimension (`fr/survey-export.ts:93`) | Factors C and D: help (`ibp-method.ts` x6, `labels.ts` x6), field label "Nombre de BMg" (`factor-detail.ts:26`, `validation.ts:24`), PDF | Write out in help and labels ("Nombre de bois morts de grosse dimension"); in dense threshold lines keep the short form only after the long form in the same string |
| BMm | bois morts de dimension moyenne (`survey-export.ts:94`) | Same as BMg | Same |
| TGB | très gros bois (`survey-export.ts:95`) | Factor E: help (`ibp-method.ts` x3, `labels.ts` x3), label (`factor-detail.ts:29`), PDF | Write out |
| GB | gros bois (`survey-export.ts:96`) | Factor E, same places | Write out |
| S0, S1, S2, S5 | score 0, 1, 2, 5 (CNPF threshold classes; the PDF already prints bare "= 0 ; = 1 ; = 2 ; = 5", `survey-export.ts:110-135`) | Factor hints, 19 strings (`ibp-method.ts` x10, `labels.ts` x9) | Replace by "0 point", "1 point", "2 points", "5 points" or the PDF's bare numbers; no abbreviation left |
| ha | hectare | Hints, labels ("Surface (ha)"), PDF, 20+ | Allowlist unit (see below) |
| cm, m, km, %, Mo, Ko | centimetre, metre, kilometre, percent, mégaoctet (`offline-map.ts`, `settings.ts:11`), kilo-octet (`survey-detail.ts:209`) | Hints, offline areas, home distances | Allowlist units |
| GPS | Global Positioning System | `status/gps.ts` (6 strings, status lines and alert) | Allowlist (universal) or write "position" ("Position GPS indisponible" -> "Position indisponible") |
| PDF | Portable Document Format | Export button, errors, share label (`survey-detail.ts:162,226`, `survey-export.ts:26`, comment in `genus.ts:7`) | Allowlist (universal) |
| IGN | Institut national de l'information géographique et forestière | Map attribution (`public-map.ts:27`), PDF basemap source (`survey-export.ts:144`) | Legal attribution, keep. Registry `proper-name` |
| CNPF | Centre national de la propriété forestière | Only in code comments today (`factor-input.ts:39,74,118,136`, `survey-detail.ts:142`, `genus.ts:7`), no user string | Not shown; if added later it must be registered. Already inside comments, which the gate ignores |
| INSEE | Institut national de la statistique et des études économiques | PDF "Commune (code INSEE)" (`survey-export.ts:40`) | Registry `proper-name`, or write "code officiel de la commune" |
| WGS 84 | World Geodetic System 1984 | PDF coordinates (`survey-export.ts:39`) | Technical, PDF only; registry `technical` |
| GBIF, CC0, CC BY | Global Biodiversity Information Facility, Creative Commons | Account "about" licence paragraph (`account.ts:39`): written out for GBIF; licence names are legal text | Keep, registry `legal` |
| URL, API, IP | technical | Developer settings and auth-gate dev modal (`auth-gate.ts:28,30`, `settings.ts:27`), shown only when `__DEV__` | Dev only (`shouldShowDevTools`); registry `dev-only` |
| DEV | developer badge (`settings.ts:26`) | Dev builds | `dev-only` |
| OK | acknowledgement button (`common.ts:11`) | System-style button | Allowlist (universal) |
| JSON | `survey-detail.ts:199` journal subtitle "Type et contenu JSON de chaque événement" | Journal screen (owner's own survey) | Rewrite without the term ("Type et contenu de chaque événement") |
| ACA, M | region codes | **Runtime, outside the catalogue**: raw `region_code` in `ClusterListSheet.tsx:19-24`; the catalogue has the long forms in `fr.labels.regions` | Map through `fr.labels.regions` (flag F-H) |
| `bmg_count`, `bmm_count`, `tgb_count`, `gb_count`, `surface_ha`, `trees_per_ha`, `open_flowering_percent`, `class_score`, `type_count` | database field identifiers | **User-visible hint text of the v3.0 method**, e.g. "Renseigner bmg_count, bmm_count, surface_ha (> 0)" (`labels.ts` factorInputHints C to J) | Not abbreviations but leaked identifiers of the same family: rewrite using the field labels shown in the form. Include in the same package |
| ex., M., Ex. | exemple, Monsieur | Placeholders (`account.ts:12-16`, `profile-setup.ts`, `offline-map.ts:29`) | Allowlist dotted forms `ex.` (conventional) or write "par exemple" |
| v3.0, v3.2 | method version tags | Method names | Not abbreviations; keep |

**Recommended universal allowlist** (needs owner confirmation, Open Question 3): units (`ha cm m km % Mo Ko`), `OK`, `PDF`, `GPS`, `ex.`. These are understood by the target readers and cannot reasonably each carry an info icon. Everything else must be written out or registered as explained.

**Registry location (Claude's Discretion): `mobile/src/i18n/fr/abbreviations.ts`**, exported as `fr.abbreviations`. Reason: the text belongs to the catalogue, the structure gate allows strings only there, and "one shared catalogue entry per abbreviation" (D-04) is literally a catalogue entry. Shape (all static strings so `catalogue.test.ts`, which renders every function leaf, needs nothing special):
```ts
export const abbreviationsFr = {
  BMg: { long: "Bois morts de grosse dimension", explanation: "...", treatment: "written-out" },
  IBP: { long: "Indice de Biodiversité Potentielle", explanation: "...", treatment: "info" },
  PDF: { long: "Portable Document Format", explanation: "", treatment: "allowlist" },
  ...
} as const
```
Adding a key to `fr` requires updating the exact-key assertion in `mobile/src/i18n/catalogue.test.ts:78-` ("exposes every section"). Type `Catalog` widens automatically.

**Operational gate (D-05), modelled on `catalogue-dash.test.ts`:**
- A pure finder `findUnexplainedAbbreviations(files, registry)` exported from the test (or a `scripts/` module like `structure-report`), plus fixture tests with a temp dir (`writeFixture`) for: a flagged token, a registered token, a shouted eyebrow, a comment (ignored), an allowlisted unit, a written-out form.
- Walk the same leaf tokens as `catalogue-dash` (TS AST, string literal, no-substitution template, template parts, JSX text; skip comments and JSDoc). Scope: `src/i18n/fr/**` non-test files. Add a second small test for the runtime-displayed codes (`region_code`) so F-H cannot regress.
- Candidate token regex over each string's words: `/(?<![A-Za-zÀ-ÿ0-9_])(?:[A-Z]{2,}[0-9]*|[A-Z][a-z]?[A-Z][A-Za-z]*|[A-Z][0-9])(?![A-Za-zÀ-ÿ0-9_])/` (all-caps of 2+ letters, optionally with digits: `IBP`, `S0`, `CC0`; mixed case with two capitals: `BMg`, `BMm`). Skip a string when all its letters are uppercase and it has a space (shouted eyebrow) and skip tokens inside a single-quoted field identifier pattern.
- A token passes if (a) it is in the registry with `treatment` in `allowlist | proper-name | legal | dev-only | technical`, or (b) treatment `written-out` AND the same string also contains the registry `long` text (case-insensitive), or (c) treatment `info` AND the section has a registered info anchor. (c) cannot be proven by a catalogue scan: back it with screen tests that assert `testID="abbreviation-info-<KEY>"` renders on the owning screen. A token not in the registry fails the test with the file, line and token. Also fail on a registry key never used in the catalogue (the registry shrinks by itself, same idea as `scripts/audit-allowlist.json`).
- Dotted forms and identifiers: a second rule for `\b[a-z]+_[a-z_]+\b` (snake_case identifiers in user strings) fails outright.

**Info icon and sheet (reusable primitives, charter section 13 and CLAUDE.md rules):**
- Glyph: `information-circle-outline` (outline only, already used by `MapLegend`, `ScoreLegend.tsx:100`), colour from `useBrandTheme()`.
- Control: `AppPressable` (accessibility label mandatory by type; `accessibilityRole="button"`), minimum touch target 44 pt: `brandInteraction.hitTarget.min = 44` (`brand-tokens.ts:406`); draw 20-24 pt and use `hitSlop` computed like `hitSlopFor` (`AppButton.tsx`), or `MAP_CONTROL_HIT_SLOP` for map overlays. A11y label from the catalogue, e.g. `Qu'est-ce que BMg ?`.
- Sheet: a `Modal` with `presentationStyle="pageSheet"` on iOS (precedent `GenusTargetSheet.tsx:42-46`, charter 11.6 and 13.10b native-first) and `animationType`: `"slide"`, or `"none"` when `useReducedMotion()` (Reanimated) is true. Content: reuse the look of `FactorHelpSheet` (`screens/FactorHelpSheet.tsx`, `createDetailStyles`: `sheetTitle`, `sheetBody`, close `AppPressable` with `close-outline`), colours `theme.semanticColors.backgroundCanvas`/`textStrong`. `onRequestClose` closes it (Android back). Haptics only through `ui/feedback.ts`. React Native `Animated` is forbidden outside the allowlist of `src/__checks__/motion.test.ts`; a `Modal` needs none.
- Placement: label rows where the short form is unavoidable (screen headers such as "Score IBP", field labels). Do not put icons inside running paragraphs; rewrite those strings.

**Order of work inside the package:** rewrite strings first (they are the bulk of the hits: `ibp-method.ts`, `labels.ts`, `factor-detail.ts`, `validation.ts`, `status/gps.ts`, `survey-detail.ts`), then add the registry and make the gate pass, then the sheet for the few remaining `info` cases.

### Genus ordering (D-06, D-07)

**Every place genera appear (verified by grep across `mobile/src`):**
| # | Place | Order today | Action |
|---|-------|-------------|--------|
| 1 | Factor A picker `ui/FactorGenusListInput.tsx:58-66` (selectable chips, French labels via `fr.genus.displayName`) | `CNPF_FACTOR_A_GENUS_CODES`: the 29 main taxa in Latin order (`Abies`..`Ulmus`, with `Quercus_deciduae`, `Quercus_sempervirens` between `Pyrus` and `Salix`) **then** the 5 supplementary (`Ceratonia, Cercis, Olea, Phillyrea, Pistacia`) appended at the end (`packages/ibp-domain/src/genus.ts:57-60`). So the list is NOT globally alphabetical today | Sort at render |
| 2 | Recognition suggestions `ui/GenusRecognitionModal.tsx:166-190` (top 1 + 4 alternatives) | confidence descending (`rankGenusSuggestions`, `genusClassifierModel.ts:122-131`) | **Keep** (D-07). Pin with a test that the rendered order equals confidence order after the sort helper exists |
| 3 | PDF export `app/survey-pdf/factor-fields.ts:105-175` (`genusName` prints "Sapin (Abies)"; list order = `rawA.genera` = selection order) | selection order | Sort the selected genera by the same helper at print time. "Everywhere it is shown" (criterion 4) covers this printed list |
| 4 | Single-genus mentions: `ToolsSection.tsx:81,99`, notices | n/a | Nothing to sort |
| 5 | Stored `factors.A.genera` (`useSurveyForm.ts:238-244,340-344`) | selection order | **Do not reorder stored data**: it is the sync payload and the parity fixtures; sort only for display |
| 6 | Model labels `genusClassifierModel.ts` / `genus_classifier_manifest.json` | manifest label order = output tensor index | **Never** reorder the package constant or the manifest; the model maps index to label |

No other list exists (search results, home, survey detail show no genus list). Data source and Latin field: the code itself is the Latin genus (`CnpfFactorAGenusCode`); display Latin = `code.replace(/_/g, " ")` (already done in `factor-fields.ts:108-110`). The French name is `fr.genus.displayName[code]` (`i18n/fr/genus.ts`).

**Sorting facts:**
- Hermes supports `Intl.Collator` and `String.prototype.localeCompare` on both Android and iOS; the only documented Android caveat is API < 24 where inputs are not canonically decomposed `[CITED: github.com/facebook/hermes doc/IntlAPIs.md]`. `String.prototype.normalize` is not listed on that page; the repo guards for it at runtime anyway (`search-text.ts:38-39`, `RUNTIME_DECOMPOSES` plus a fallback table).
- Repo practice: accent-insensitive comparison is `foldSearchText` (used by global search); existing sorts are bare `localeCompare` without locale (`survey-logic.ts:163`, `useSurveyDetailData.ts:60`). Node (jest) has full ICU, a device may not behave the same, so a test passing in jest proves little about Hermes ICU.
- Recommendation: one pure helper in `mobile/src/app/genus-order.ts`:
```ts
const collator = typeof Intl !== "undefined" && Intl.Collator ? new Intl.Collator("fr", { sensitivity: "base" }) : null
const key = (code: string) => foldSearchText(code.replace(/_/g, " "))
export const compareGenus = (a: string, b: string) =>
  collator ? collator.compare(key(a), key(b)) : key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0
export const sortGenusCodes = <T extends string>(codes: readonly T[]): T[] => [...codes].sort(compareGenus)
```
Fold first (no ICU dependence for the French letters), collator second (locale rule), plain comparison as the last fallback. Tests: the 34 codes come out strictly ascending, `Quercus_deciduae` before `Quercus_sempervirens`, supplementary genera interleaved (`Ceratonia` falls after `Celtis` and before `Cercis`), input array not mutated, French-label variant if the owner picks it (below). `src/app/` coverage floor is 95 % lines.

**The visible-order problem (F-F, Open Question 2):** with French labels, a Latin sort shows "Sapin, Érable, Aulne, Arbousier, Bouleau, Charme, Châtaignier..." which a user will read as unsorted. Options: (a) keep D-06 and show the Latin name in the chip ("Abies, Sapin" or two lines), making the order visible and matching the PDF's "Sapin (Abies)"; (b) sort by the displayed French label with the same helper (deviates from D-06 wording). Recommendation: (a), because it honours the locked decision and the ecologists' vocabulary, and it costs one label change. Needs the owner's yes before planning the chip label.

### Small screens (D-08)

**Screen:** `mobile/src/screens/SurveyParcelSelectionScreen.tsx` (392 of the 400-line cap, `structure.test.ts`: any addition must be extracted), mounted by `ParcelSelectionRoute`; texts `fr.parcelSelection` (`i18n/fr/parcel-selection.ts`).

**Layout facts (read from the file):** the map is **full screen**; the "message" is an overlay: `overlayLayer` (absoluteFill, `justifyContent: flex-end`, `paddingHorizontal: 16`, `paddingBottom: cardBottomInset`) holding one `AppCard glass` (`padding 16`, `gap 8`) with, top to bottom: title (20/24 `bottomTitle`), meta (13/18), a danger `AppNotice` only while no parcel is chosen, hint (12/16), and an `AppButton size="lg"` (minHeight 50, `marginTop 4`). `cardHeight` is measured by `onLayout` (`:127,327`) and the map controls and legend sit `12` above it (`controlsBottom = cardBottomInset + cardHeight + 12`, `:158`). `cardBottomInset = max(max(tabBarHeight, insets.bottom), 12) + 12` (`:157`): the tab bar is never hidden (flag F-B), so on iOS it is the native bar (measured; fallback 84, `TAB_BAR_FALLBACK_HEIGHT`) and on Android the in-flow JS bar leaves only the gesture inset. iOS header is transparent over the map (`controlsTop = insets.top + 6`, `capsuleTop = headerHeight + 8`); Android header is opaque.

**Estimated card height** (token arithmetic: `brandTypography`/`brandTypeScale`/`brandComponentTokens`, text widths estimated at roughly 0.55 em per character; replace by measurement):
| State | iPhone SE (375 wide, content 311) | small Android (360 wide, content 296) |
|-------|-----------------------------------|----------------------------------------|
| No parcel chosen: padding 32 + title 24-48 + meta 18 + notice 66 (2 lines) + hint 32 (2 lines) + button 50 + gaps 32 + marginTop 4 | about 258 to 282 | about 258 to 282 |
| Parcel chosen (no notice): minus 66 and one gap | about 184 to 208 | same |
| Plus bottom inset | + 96 (iOS native bar 84 + 12) | + about 24 to 36 |
| Share of screen height | 667: card + inset = 354 to 378 = 53 to 57 %. The legend/dock row (about 44 + 12) above it takes 8 % more: unobstructed map about 35 to 39 % before the top controls | 640 dp window, about 496 dp of map area under header and in-flow tab bar: card + inset = 282 to 318 = 57 to 64 %, unobstructed about 30 to 36 % |

So the target "about half" is missed on both. To keep about half after the dock row, the compact card must be about 170 to 180 or less: e.g. one-line title (24) + one merged meta/notice line (18) + lg button (50) + padding 2 x 12 + two gaps 8 = about 132. Concretely: below the threshold drop the separate notice and the hint (merge the requirement into the meta line with a short catalogue string such as `compact.selectionRequired`), title to 17/22 (`brandTypeScale.headline`), card padding to `brandComponentTokens.card.compactPadding` (12), keep the lg 50 pt button (field use, 44 pt minimum), cap with `numberOfLines`.

**Smallest supported screen:** not declared anywhere. Evidence: iOS deployment target 16.4 (`mobile/README-native.md`) so the smallest supported iPhones are iPhone 8, SE 2 and SE 3 at **375 x 667 pt**; ADR-002 D-18 names the SE 2nd/3rd gen as the low-spec floor; for Android nothing is written (the ADR spike asks for "a mid-range 2022-2023 Android") `[ASSUMED]` small Android reference **360 x 640 dp**. `screens/home/layout-budget.ts:106-111` lists only 393 x 852 and 375 x 812. Record 375 x 667 and 360 x 640 as the floor in the new budget file.

**Threshold recommendation:** compact when the font-scale-adjusted window height is under 700: `const { height, fontScale } = useWindowDimensions(); compact = height / Math.max(1, fontScale) < 700` (covers SE 667 and small Androids under 700 dp, leaves iPhone 13 mini 812 and common Androids 780+ on the full card; `fontScale` is in the `useWindowDimensions` result). Do not switch on the measured `cardHeight` (feedback loop: compact makes it shorter, which would flip it back). Also clamp the title with `maxFontSizeMultiplier` through `AppText` caps (`brandFontScaleCaps`, DS-05) so a large system font cannot re-inflate the card.

**Pattern to follow:** `screens/home/layout-budget.ts` (pure constants plus a function that sums the same numbers the styles use, asserted per device in `layout-budget.test.ts`). Create `screens/parcel-selection/layout-budget.ts` exporting `isCompactParcelCard(height, fontScale)`, `parcelCardHeight(compact, hasSelection)`, `PARCEL_BUDGET_DEVICES` (375 x 667 and 360 x 640 plus 393 x 852), and a test asserting the card plus inset stays under 50 % of each device's height in compact mode. The screen reads those numbers; extract the card into its own component file to stay under 400 lines.

**Jest vs device:** Jest can assert the pure budget, that the compact copy is chosen at a mocked `useWindowDimensions` of 667 and the full copy at 852, and the catalogue keys. Only a device or simulator confirms the real heights, text wrapping and the share of map left: use an `xcrun simctl create` iPhone SE (3rd generation) simulator (the device type exists on this Mac; the existing simulators are all newer iPhones) and, on Android, `adb shell wm size 720x1280` plus `adb shell wm density 320` on the `Pixel_8` AVD (the only AVD) to emulate 360 x 640 dp, then reset with `wm size reset; wm density reset`. The onLayout `cardHeight` is a ready measurement hook (temporary dev log).

### Recognition (SC-1, SC-7)

**Flow (verified):** Home tool "Identifier un arbre" (`ToolsSection.tsx`) and Factor A's `FactorAGenusRecognitionEntry.tsx` both open `ui/GenusRecognitionModal.tsx`, which requests the camera permission, shows `GenusCameraView` (`expo-camera` `CameraView`), the shutter calls `takePictureAsync({ quality: 0.8 })` (`GenusCameraView.tsx:49`) and hands the file URI to `handlePhoto` (`GenusRecognitionModal.tsx:83-91`), which sets "classifying", calls `classifyGenusPhoto(uri)` and then sets `results` (the "suggestion shown" moment) or `unavailable`. `expo-image-picker` is not part of this flow.

**Files written (verified in the native sources of the installed versions):**
1. Camera capture: `cacheDirectory/Camera/<random>.jpg` (expo-camera Android `ResolveTakenPicture.kt:36` `DIRECTORY_NAME = "Camera"`; iOS `ExpoCameraUtils.swift:224`).
2. Resized JPEG: `cacheDirectory/ImageManipulator/<random>.jpg` written by `saved = await resized.saveAsync(...)` (`genusClassifierModel.ts:93-96`; expo-image-manipulator Android `FileUtils.kt:9-10`, iOS `ImageManipulatorUtils.swift:114-118`), read back as base64 and decoded with `jpeg-js` (`:97-100`).
Neither is ever deleted (DC-D-03 note confirms).

**Deletion API:** `import * as FileSystem from "expo-file-system/legacy"` and `FileSystem.deleteAsync(uri, { idempotent: true })`, exactly as `attachment-files.ts:84`. The jest double (`mobile/test/expo-file-system-legacy.mock.ts`) tracks files by URI in a `Map`, `cacheDirectory = "file:///mock/cache/"`, and the manipulator double registers `file:///mock/cache/manipulated-N.jpg` in it, so a test can assert `__listMockFiles()` is empty after a recognition.

**Where to delete (all paths):**
- The resized file: a `finally` inside `preprocessPhoto` / `classifyGenusPhoto` right after the base64 read (it is not needed after decode), so it goes on success, decode failure and inference failure alike.
- The camera capture: a `finally` in `handlePhoto` after `await classifyGenusPhoto(uri)` (runs for ok and unavailable outcomes). This is slightly earlier than "once the suggestion is shown" (it is after classification, before `setStep` renders), which is strictly safer; the criterion is met because nothing needs the file once classification ended.
- Cancel paths: closing the camera before a shot writes nothing; a camera error writes nothing usable. **Unmount/close while classifying**: `handleClose` sets `idle` but the in-flight `handlePhoto` continues; the deletion lives in the async function's `finally`, so it still runs, but the later `setStep` can reopen a stale "results" state (existing race, `GenusRecognitionModal.tsx:83-91`); add a "still current" token check.
- Retake / "Essayer une autre photo": each shot goes through `handlePhoto` again, same cleanup.
- App killed mid-classification: not preventable in app code; the OS cache purge remains the fallback. Optional hardening: at modal open, sweep `cacheDirectory + "Camera/"` and `"ImageManipulator/"` of leftovers older than an hour, mirroring `run-export.ts` stale-file cleanup (`:85-103`, uses `readDirectoryAsync` and `getInfoAsync().modificationTime`). Only if the plan wants belt and braces.
- **Guard:** new `recognition/temp-files.ts` `deleteTempPhoto(uri)`: do nothing unless `uri.startsWith(FileSystem.cacheDirectory)` and it contains no `..`, swallow errors (`.catch(() => {})`), never log the URI. Mirrors `isInAttachmentsDir` in `deleteAttachmentFile`.

**PR #272 (merge `8bf21fc1`, only `genusClassifierModel.ts` and its test changed):** the Android loader of `react-native-fast-tflite` accepts a real URL only, so `loadModel` now does `Asset.fromModule(MODEL_ASSET).downloadAsync()` then `loadTensorflowModel({ url: asset.localUri ?? asset.uri }, [])` (`genusClassifierModel.ts:63-77`). Regression pitfalls for this phase:
- `asset.localUri` lives in `cacheDirectory` (expo-asset copies the bundled model there). **Never sweep a cache directory or delete by prefix**: delete only the two exact URIs the recognition created. A directory sweep of `cache/` would delete the model copy.
- Do not touch `loadModel`, the cache variables or `__resetGenusClassifierModelForTests`; add deletion around `preprocessPhoto` only. Run `genusClassifierModel.test.ts` (it asserts the local-file load path) after the change.

**Latency measurement (DC-D-01, DC-D-02, DC-D-03; SC-7):**
- Existing timing: none (`performance.now`/`Date.now` appear nowhere in `recognition/` or `ui/Genus*`). The only references are the iOS spike figures (iPhone 15 Pro, Release: online median 90.41 ms / p95 115.30, airplane median 90.49 / p95 93.61, n = 30 each; 3,000 ms budget "ADR-002 D-05"), where "total" = preprocess + inference, protocol "1 discarded warm-up + 10 timed runs per press, pooled" (`species-recognition-spike-measurements-v1.md` section 7). The emulator already gave 189 ms first call (61 ms model load), then 43 to 78 ms (`device-checks.md` DC-D-01 notes), which is not representative.
- Minimal instrumentation (Jest-testable): make `classifyGenusPhoto` return `timings: { loadMs, preprocessMs, inferenceMs, totalMs }` in both outcomes using an injectable clock, and have the modal record `captureToSuggestionMs` (shutter callback to `results`). Output channel: `logStatusDetail("genus.timing", ...)` prints only in dev builds (`i18n/status.ts`, via `shouldShowDevTools`), so a Release APK shows nothing. For Release-build measurement on real phones use a build-time flag in the style of `feature-flags.ts` (`EXPO_PUBLIC_GENUS_TIMING === "true"` adds one `console.info("[genus-timing] ...")` line, readable with `adb logcat -s ReactNativeJS` `[ASSUMED]` that Expo's Babel preset keeps console calls in Release). Counters/timings only, never URIs, ids or coordinates. Alternative with no code: measure in a development build (JS slower, so a pass there is conservative).
- Protocol (`autonomous: false`): at least two real Android phones including one low-end (floor 2022-2023 mid-range); Release build of the PR #272 line; per phone, 1 warm-up plus at least 10 timed photos of real trees, leaves and bark, in normal mode and again in airplane mode (toggle after install; the model is bundled so nothing needs the network); record median, p95, worst of total per network state and the top-1 genus compared with the iPhone on the same photos; fill the rows DC-D-01, DC-D-02 and DC-D-03 of `docs/user-tests/device-checks.md` (status column and notes). DC-D-03 check: after several recognitions list `cache/Camera` and `cache/ImageManipulator` of the app (debug build: `adb shell run-as fr.etatssauvages.cortege ls cache/Camera cache/ImageManipulator`; a Release APK is not debuggable so `run-as` fails there: use a debuggable build for this one check; iOS: `xcrun devicectl device copy from` as the spike did). Expected: both empty. Also confirm no attachment row and nothing synced (SQLite untouched by the flow).
- Automatable: deletion calls, no leftover file in the mock FS on success and on failure, timings returned, flag gating of the log line, race guard. Human only: SC-1 on two real phones, medians/p95, DC-D-01..03 recording.

### Pattern code examples already in the repo (copy these)

**Local score of a draft from its payload** (`mobile/src/screens/survey-detail/useLocalDraftSummary.ts:76-100`):
```ts
const context = {
  ibp_method_version: draft.ibp_method_version, ibp_cas: draft.ibp_cas,
  ibp_cas3_scale: draft.ibp_cas3_scale, region_version: draft.region_version,
  vegetation_stage: draft.vegetation_stage,
}
const retained = computeRetainedScoresFromRawFactors(factorsObject, context)
const totals = computeIbpTotalsFromRetainedScores(retained) // { ibp_total, ... }
```
**Centre of cached parcels** (`assemble-export-data.ts:246-264`): `parcelPolygonsFrom(items, parcelIds)`, then `boundsOfRings(polygons.flatMap(({ rings }) => rings))`, centre = `((south+north)/2, (west+east)/2)`.
**Guarded file delete** (`mobile/src/storage/attachment-files.ts:78-85`): resolve, `isInAttachmentsDir` guard, `FileSystem.deleteAsync(resolved, { idempotent: true })`.
**Fixture-based source gate** (`mobile/src/__checks__/catalogue-dash.test.ts`): finder over TS AST leaves, `writeFixture`, `beforeEach` temp dir, one `describe` of fixture cases and one of the real gate.
**Height budget asserted by a test** (`mobile/src/screens/home/layout-budget.ts` and `.test.ts`).
**Modal sheet** (`mobile/src/screens/home/GenusTargetSheet.tsx:42-46`): `<Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>`.
**Frame-aware scroll view** (`CommunitySurveyScreen.tsx:141-143`): `contentInsetAdjustmentBehavior={insetBehavior}` from `useFrameInsetBehavior()`.

### Anti-Patterns to Avoid
- **Deleting by directory or prefix in `cache/`**: removes the model copy PR #272 depends on.
- **Reordering `CNPF_FACTOR_A_GENUS_CODES`, the manifest labels or the stored `genera` array** to get an alphabetical list: breaks model index mapping, sync payload and parity fixtures. Sort at display time.
- **Branching on error classes to detect offline**: use `useIsOffline()`.
- **Putting the new local-markers call into `useSurveySync`**: single-assembler rule; call a route-level hook.
- **A new `local_meta` key or SQLite migration** for markers: forbidden by D-01 (schema stays 5).
- **Adding hex/rgba literals, RN `Animated`, em dashes, filled Ionicons, or strings outside `i18n/fr`**: gates fail.
- **Info icons inside running text**: rewrite the text instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accent-insensitive compare | A new accent table or regexes | `foldSearchText` (`app/search-text.ts`) + `Intl.Collator` | One fold shared with the server-side unaccent tests (D-16 of Phase 25) |
| Score of a local survey | A second scoring function | `ibp-scoring.ts` adapters over `@cortege/ibp-domain` | CLAUDE.md: never re-implement a rule; parity fixtures |
| Parcel geometry centre | New GeoJSON walkers | `parcelPolygonsFrom` + `boundsOfRings` | Already validates coordinates (`buildParcelFeatureCollection`) |
| Offline detection | Error-class sniffing, `NetInfo` | `useIsOffline` (expo-network, `isOnlineNetworkState`) | Same rule as sync |
| Hit target math | Hard-coded 44 | `brandInteraction.hitTarget.min`, `hitSlopFor` | Keeps D-05 touch target token |
| Height-dependent layout test | Snapshotting styles | `layout-budget.ts` pattern | Test asserts the numbers the styles read |
| Source scan | Regex over raw text | TypeScript AST leaves (`catalogue-dash.test.ts`) | Skips comments correctly |
| File deletion mock | Hand-written fs mock | `mobile/test/expo-file-system-legacy.mock.ts`, `expo-image-manipulator.mock.ts` | Already wired in `jest.unit.config.js` moduleNameMapper |

**Key insight:** every piece has a local precedent; the work is wiring and one honest data-gap decision (position), not new technology.

## Runtime State Inventory

Not a rename/refactor/migration phase. For completeness (explicitly checked):

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `payload_json` of local surveys (Tier 2 optional field only if chosen); SQLite stays at `user_version` 5 | None unless Tier 2: then carry the field through `updateLocalDraft` and `applyRemoteSurvey` |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | Optional new public build flag `EXPO_PUBLIC_GENUS_TIMING` (not a secret) | Document in `mobile/.env.example` if added |
| Build artifacts | Android Release APK must be rebuilt for the on-phone measurement | Build step in the human checkpoint |

## Common Pitfalls

### Pitfall 1: "Generalise the filter" ships a no-op
**What goes wrong:** removing `status !== "draft"` changes nothing offline after a restart; own markers are still absent.
**Why:** the input map is API-fed memory (`useSurveySync.ts:62,393`).
**Avoid:** build from SQLite rows; test with a real-SQLite fixture and an empty `surveyDetails` and empty API items.
**Warning signs:** a unit test that passes only because it hands `surveyDetails` a hand-built detail.

### Pitfall 2: Own submitted survey opens the community page offline
**What goes wrong:** F-1 reappears from the user's own marker.
**Avoid:** route every local id (drafts and own submitted) to `surveyActions.openSurvey` + `surveys/surveyDetail`. Keep the dedup so online the same id is not drawn twice.

### Pitfall 3: Duplicate markers online
**What goes wrong:** an own submitted survey is both in `explorer.items` and local.
**Avoid:** drop local items whose id is in the API set (existing `publishedIds` rule); test online and offline merge.

### Pitfall 4: Coverage floors
**What goes wrong:** `npm run test:unit:coverage` (the CI `unit-mobile` job) fails: `jest.unit.config.js` applies **global 100 % statements and lines** to any directory without its own floor (`src/map/`, `src/recognition/`, `src/__checks__/`), 100 % statements/lines for `src/i18n/` and `src/navigation/`, 95 % lines for `src/app/`.
**Avoid:** new code under `map/`, `recognition/`, `i18n/` must be fully covered by tests; prefer pure helpers with injected deps.

### Pitfall 5: 400-line cap
`SurveyParcelSelectionScreen.tsx` is 392 lines. Extract the card and the budget before adding anything (`structure.test.ts`, `findLongFiles`, applies to `src/screens` and `src/navigation`, including `.styles.ts`).

### Pitfall 6: Catalogue edit collisions
D-03 edits `community-survey.ts`, D-08 `parcel-selection.ts`, D-04 rewrites `ibp-method.ts`, `labels.ts`, `factor-detail.ts`, `validation.ts`, `status/gps.ts`, `survey-detail.ts`, and adds `abbreviations.ts` plus the exact-key list in `catalogue.test.ts`. Sequence the abbreviation package last (or give each package its own keys first) so plans do not conflict on the same files in one wave.

### Pitfall 7: The abbreviation gate flags shouted eyebrows and units
Handle with the all-caps-with-space skip and the unit allowlist; add fixtures for both.

### Pitfall 8: Latin sort looks wrong with French labels
See F-F. Do not ship the sort without the owner's answer on the label.

### Pitfall 9: Stale recognition state after close
Existing race (close during classifying, then `setStep` fires). Add a token check while touching `handlePhoto`.

### Pitfall 10: Compact mode flicker
Do not switch on measured `cardHeight`; switch on `useWindowDimensions` (height / fontScale).

## Code Examples

### Own-survey item builder shape (new, pure, easily 100 % covered)
```ts
// mobile/src/map/own-surveys.ts  (sketch; reuse names from ibp-scoring.ts and map-projection.ts)
export type LocalMapSource = { id: string; status: string; created_at: string; payload: SurveyQueuePayload | null }

export function ownSurveyMapItems(
  sources: readonly LocalMapSource[],
  locate: (source: LocalMapSource) => { lat: number; lng: number } | null,
  publishedIds: ReadonlySet<string>,
): { drafts: PublicMapItem[]; own: PublicMapItem[] } {
  const drafts: PublicMapItem[] = []
  const own: PublicMapItem[] = []
  for (const source of sources) {
    if (publishedIds.has(source.id) || source.payload === null) continue
    const position = locate(source)
    const total = localTotal(source.payload) // server scores.ibp_total if finite, else computed locally
    if (position === null || total === null) continue
    const item: PublicMapItem = { survey_id: source.id, display_location: position, /* date, region_code, method, cas as in own-drafts.ts */ ibp_total: total }
    ;(source.status === "draft" ? drafts : own).push(item)
  }
  return { drafts, own }
}
```
### Centred state (D-03)
```tsx
<ScrollView
  contentInsetAdjustmentBehavior={useFrameInsetBehavior()}
  contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: brandSpacing4.lg, gap: brandSpacing4.smd }}
>
  <View accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: brandSpacing4.sm }}>
    <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.textSecondary} />
    <Text style={styles.message}>{t.offline}</Text>
  </View>
  <AppButton label={t.retry} variant="secondary" onPress={onRetry} />
</ScrollView>
```
### Temp-file cleanup (SC-7)
```ts
// mobile/src/recognition/temp-files.ts
import * as FileSystem from "expo-file-system/legacy"
export async function deleteTempPhoto(uri: string | null | undefined): Promise<void> {
  const root = FileSystem.cacheDirectory
  if (!uri || !root || !uri.startsWith(root) || uri.includes("..")) return
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)
}
// in handlePhoto: try { outcome = await classifyGenusPhoto(uri) } finally { await deleteTempPhoto(uri) }
// in preprocessPhoto: const saved = await resized.saveAsync(...); try { read + decode } finally { await deleteTempPhoto(saved.uri) }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `require()`d model asset passed to fast-tflite | Copy to a local file first (`Asset.downloadAsync`, `localUri`) | PR #272, 2026-10-10 | Android Release loads the model; do not revert |
| Legacy `expo-file-system` API | New `File`/`Directory` classes exist in SDK 57 | SDK 54+ | The repo stays on `expo-file-system/legacy` everywhere; follow it |
| Mix of `localeCompare` without locale | `foldSearchText` for accent-insensitive search | Phase 25 | Use it for sorting too |

**Deprecated/outdated in this repo:** the Phase 15 comments claiming the recognition photo is "never saved" (F-D); the roadmap/device-check wording that Phase 29 "reworks the workflow" (F-C).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Small Android reference screen is 360 x 640 dp (no Android floor is written anywhere) | Small screens | Threshold 700 may be too low or high for the real floor; the budget test device list would be adjusted |
| A2 | Expo's Babel preset keeps `console.info` in Release so `adb logcat -s ReactNativeJS` shows the timing line | Recognition | If stripped, use a dev build or an in-app dev-only readout for the measurement |
| A3 | Universal allowlist (units, OK, PDF, GPS, `ex.`) is acceptable to the owner | Abbreviations | The owner may want PDF/GPS written out or explained too; larger string rewrite |
| A4 | IBP can be "defined once" (onboarding, auth gate, PDF) plus an info sheet on the main headers instead of on every use | Abbreviations | If the owner wants every occurrence handled, expect 60+ string edits |
| A5 | Text widths (0.55 em per character) behind the card height estimates | Small screens | Heights shift a few lines; the plan must measure on a simulator before fixing constants |
| A6 | The F-1 "tall capsule" is caused by the large-title frame having no scroll view to follow | Offline community survey | Fix still correct for the message position; the capsule may need its own fix after reproduction |
| A7 | An approximate marker position (centre of ring bbox) is acceptable offline | Offline own surveys | The server uses the average of parcel centroids; markers may differ by tens of metres until the parcel layer takes over at zoom 15 |
| A8 | `survey_date` of local items from `created_at` (draft) or `updated_at` (submitted) is acceptable | Offline own surveys | Cluster list rows could show a date different from the online one |

## Open Questions

1. **Position of own surveys with no cached parcel geometry (criterion 6, D-01)**
   - Known: no position is stored locally; Tier 1 draws a survey only if its parcels are in a downloaded area (the owner's F-2 recording had a downloaded area).
   - Unclear: whether "every survey the phone holds" must also include surveys outside downloaded areas or pulled from another device.
   - Recommendation: plan Tier 1; ask the owner whether to add the server-sent position (extend `SyncChangeSurvey` with `display_location`, API sync-changes query, `buildSurveyPayloadFromRemote`), which covers every pulled survey. Prod is test data (memory note), so a one-step API+app change is acceptable if wanted.
2. **Latin sort with French chip labels (D-06)** - recommendation (a): show the Latin name in the chip; needs a yes before the planner writes the label task.
3. **Which abbreviations are exempt** (units, OK, PDF, GPS, `ex.`, IBP "defined once") - owner call; default proposed above.
4. **Is Tier 2 persistence at detail load worth it** as a cheap partial coverage (three lines in `cacheSurveyCanonicalFields`) or should only the server-sent position be used? Recommendation: skip it unless the owner picks the server route, to avoid a second source of truth.
5. **Two real Android phones available?** SC-1 and SC-7 need them; mark the tasks `autonomous: false` and sequence them after the cleanup and instrumentation are merged and a Release APK is built.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | All tests | yes | Node >= 22.5 (jest ran: own-drafts and catalogue-dash tests pass in 2.6 s) | n/a |
| Jest + ts-jest | Validation | yes | `mobile/jest.unit.config.js` | n/a |
| adb | Android checks | yes | `/Users/florian/Library/Android/sdk/platform-tools/adb` | n/a |
| Android AVD | Emulator checks | yes | `Pixel_8` only | emulate small screen with `wm size`/`wm density` |
| iOS simulators | Visual checks | yes | iPhone 17 family; **no iPhone SE** | `xcrun simctl create` with device type `iPhone SE (3rd generation)` (type available) |
| Real Android phones (>= 2) | SC-1, SC-7, DC-D-01..03 | unknown | n/a | none: human checkpoint; phase cannot close SC-1/SC-7 without them |
| Real iPhone | Cross-check top-1 genus | yes (owner's iPhone 15 Pro) | n/a | n/a |

**Missing dependencies with no fallback:** real Android phones for SC-1 and SC-7.
**Missing dependencies with fallback:** iPhone SE simulator (create one), small Android (adb `wm size`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29 + ts-jest, `--runInBand` |
| Config file | `mobile/jest.unit.config.js` (module mappers for expo-file-system/legacy, expo-image-manipulator, expo-network, expo-sqlite, reanimated, maplibre, `@cortege/ibp-domain` from source) |
| Quick run command | `cd mobile && npx jest -c jest.unit.config.js <path or pattern> --coverage=false` |
| Full suite command | `npm run test:unit` (root) ; CI uses `npm --workspace mobile run test:unit:coverage` |
| Quality gates | `npm run lint`, `npm run typecheck`, `npm run format:check` |

### Phase Requirements to Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| D-01 | Local reader returns every own survey, drafts and submitted, with score and parcel_ids (real SQLite) | sqlite unit | `npx jest -c jest.unit.config.js src/storage/surveys.map-sources.sqlite.test.ts` | Wave 0 (new) |
| D-01 | Builder: draft vs own split, dedup against API ids, skip no position/score, server total preferred, local total fallback | unit | `... src/map/own-surveys.test.ts` | Wave 0 (new; extend `own-drafts.test.ts`) |
| D-01 | Route merges both groups, opens own detail for both, community page for others | unit | `... src/navigation/routes/routes.test.tsx -t PublicMapRoute` | exists, extend |
| D-02 | Badge rendered when `isOffline`, count 0 text | unit | `... src/screens/public-map/ScoreLegend.test.tsx` | exists |
| D-03 | Offline copy + retry, both screens; `CenteredState` insets follow frame | unit | `... src/screens/community-survey src/ui/CenteredState.test.tsx` | partly exists |
| D-03 | Real centring/inset on native large-title frame | manual (iOS simulator and device) | n/a | human |
| D-04 | Registry entries present, info sheet opens/closes, a11y label, 44 pt hit slop | unit | `... src/ui/AbbreviationInfo.test.tsx` | Wave 0 |
| D-05 | Gate: fixtures + real catalogue has zero unexplained abbreviations | unit | `... src/__checks__/abbreviations.test.ts` | Wave 0 |
| D-06 | `sortGenusCodes` ascending, Quercus order, no mutation; picker renders sorted; PDF genus list sorted | unit | `... src/app/genus-order.test.ts src/ui/FactorGenusListInput.test.tsx src/app/survey-pdf` | partly exists |
| D-07 | Modal still renders suggestions in confidence order | unit | `... src/ui/GenusRecognitionModal.test.tsx` | exists, add case |
| D-08 | `isCompactParcelCard` at 667/640/852, budget under 50 % per listed device, compact copy chosen | unit | `... src/screens/parcel-selection/layout-budget.test.ts` | Wave 0 |
| D-08 | Real heights, wrapping, map share | manual (SE 3 simulator, Android `wm size`) | n/a | human |
| SC-7 | No leftover file in mock FS after ok, unavailable and thrown paths; guard refuses foreign URIs; timings returned | unit | `... src/recognition` | partly exists |
| SC-1 / SC-7 | Model loads and latency on two real Android phones; DC-D-01..03 recorded | manual, `autonomous: false` | n/a | human |
| Gates | No em dash, outline icons, 400-line cap, no literals outside i18n, motion rules, hex rules | unit/lint | `... src/__checks__` + `npm run lint` | exists |

### Sampling Rate
- **Per task commit:** the targeted jest file(s) above, `--coverage=false`.
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`.
- **Before the phase gate:** `npm --workspace mobile run test:unit:coverage` (floors: global 100 % statements/lines for `src/map/` and `src/recognition/`, 100 % for `src/i18n/` and `src/navigation/`) and full suite green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `mobile/src/map/own-surveys.test.ts` and `mobile/src/storage/surveys.map-sources.sqlite.test.ts`
- [ ] `mobile/src/ui/CenteredState.test.tsx`
- [ ] `mobile/src/__checks__/abbreviations.test.ts` and `mobile/src/ui/AbbreviationInfo.test.tsx`
- [ ] `mobile/src/app/genus-order.test.ts`
- [ ] `mobile/src/screens/parcel-selection/layout-budget.test.ts`
- [ ] `mobile/src/recognition/temp-files.test.ts`
- Framework install: none.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (only `workflow._auto_chain_active`), so it is treated as enabled. No new network, auth or API surface is expected (unless Open Question 1 picks the server-sent position, which then needs API review).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged (Auth0 session) |
| V3 Session Management | no | Unchanged |
| V4 Access Control | yes (light) | Offline markers read only `local_surveys` of the signed-in owner (single-owner gate); never draw other members' data offline (D-01) |
| V5 Input Validation | yes | File path guard before delete (`startsWith(cacheDirectory)`, no `..`); registry/gate input is static source |
| V6 Cryptography | no | None |
| V8 Data Protection | yes | Recognition photos must not linger (SC-7); timing logs carry numbers only, no URIs, ids or coordinates (`logStatusDetail` rule) |
| V12 Files and Resources | yes | Delete only the two exact URIs created by the flow; never sweep a directory (also protects the model copy) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal / deleting an unrelated file via a crafted URI | Tampering | Guarded `deleteTempPhoto`, idempotent, swallow errors |
| Leftover personal photos (GPS EXIF) in the app cache | Information disclosure | Explicit deletion in `finally`, optional stale sweep of the two known subfolders |
| Leaking survey ids or locations through debug/timing logs | Information disclosure | Counts and durations only; flag-gated line; no URIs |
| Showing another account's local data after a user switch | Information disclosure | Rely on the existing `useLocalDataOwner` purge; do not read `local_surveys` before the owner gate resolves (hook runs inside the authenticated Explorer route) |
| HTML/JS injection through registry text in the sheet | Tampering | Plain `Text` rendering; the PDF path keeps its single escape in `survey-pdf/html.ts` |

## Sources

### Primary (HIGH confidence)
- Repository code read in this session (paths and lines cited inline): `mobile/src/map/own-drafts.ts`, `navigation/routes/PublicMapRoute.tsx`, `screens/PublicMapScreen.tsx`, `hooks/usePublicMapExplorer.ts`, `hooks/useSurveySync.ts`, `storage/surveys.ts`, `storage/sync.ts`, `storage/db.ts`, `storage/types.ts`, `storage/offline-map.ts`, `screens/community-survey/*`, `hooks/useCommunitySurvey.ts`, `ui/ScreenFrame.tsx`, `ui/frame-large-title.ts`, `ui/AppButton.tsx`, `ui/AppPressable.tsx`, `ui/AppNotice.tsx`, `screens/SurveyParcelSelectionScreen.tsx`, `screens/home/layout-budget.ts`, `navigation/tab-bar.ts`, `recognition/genusClassifierModel.ts`, `ui/GenusRecognitionModal.tsx`, `ui/GenusCameraView.tsx`, `ui/FactorGenusListInput.tsx`, `app/survey-pdf/*`, `i18n/fr/*`, `__checks__/*`, `jest.unit.config.js`, `.github/workflows/ci.yml`.
- `api/src/surveys/public-map.queries.ts`, `public-map.utils.ts`, `surveys.service.ts`, `sync-operation-validation.ts`; `packages/ibp-domain/src/genus.ts`, `contract/public-map.ts`, `contract/sync.ts`.
- Installed native sources: `node_modules/expo-camera/android/.../ResolveTakenPicture.kt`, `ios/Common/ExpoCameraUtils.swift`; `node_modules/expo-image-manipulator/android/.../FileUtils.kt`, `ios/ImageManipulatorUtils.swift`; versions from each `package.json`.
- Docs: `docs/user-tests/device-checks.md`, `docs/technical/adr-002-on-device-species-recognition-v1.md`, `docs/technical/species-recognition-spike-measurements-v1.md` section 7, `docs/design/charte-graphique-etats-sauvages-spec.md` section 13, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, git commit `8bf21fc1` (PR #272).
- Local tooling checks: jest run of `own-drafts` and `catalogue-dash` tests (pass); `xcrun simctl list devicetypes` (iPhone SE types exist); `~/.android/avd` (Pixel_8 only).

### Secondary (MEDIUM confidence)
- Hermes Intl support: [facebook/hermes doc/IntlAPIs.md](https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md) via WebFetch: `Intl.Collator` and `String.prototype.localeCompare` supported on Android and iOS; Android 7.0-7.1 does not canonically decompose input; `normalize` not listed.

### Tertiary (LOW confidence)
- Behaviour of `console.info` in Release builds with the Expo Babel preset (A2) and `adb shell run-as` on non-debuggable builds: general platform knowledge, not verified in this session.

The research-plan / research-store seam (`gsd-tools query research-plan`) was not used: all questions were answered from the repository itself plus one documentation fetch; no digest was cached.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new package; versions read from `node_modules`.
- Architecture (offline markers, deletion, gate, sort helper): HIGH - read from code with line references; the position-source decision is flagged as an owner question, not guessed.
- F-1 root cause: MEDIUM - mechanism consistent with the frame contract and commit history but not reproduced.
- Small-screen numbers: MEDIUM - token arithmetic with estimated text wrapping; must be measured on an SE 3 simulator and a 360 x 640 emulation.
- Pitfalls: HIGH.

**Research date:** 2026-10-10
**Valid until:** 2026-11-10 (stable codebase; revalidate if Phase 30 changes `SurveyQueuePayload` or the parcel selection screen, since Phase 30 depends on this one)
