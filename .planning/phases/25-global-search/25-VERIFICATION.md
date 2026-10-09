---
phase: 25-global-search
verified: 2026-10-09T00:00:00Z
status: human_needed
score: 4/5 roadmap criteria verified in code (criterion 5 is the owner phone check, human-needed by design)
behavior_unverified: 0
overrides_applied: 0
gaps: []
human_verification:
  - test: "Owner phone check, light and dark (plan 25-15 Task 2, ROADMAP criterion 5)"
    expected: "Owner replies 'go' after the 12 steps of 25-15-PLAN.md Task 2 on the iPhone (Release build), Reduce Motion on and off, and sees the Android fourth tab (emulator or JS tab tree)"
    why_human: "Blocking checkpoint, never auto-approved; real IGN place and parcel lookups need an API with CADASTRE_PROVIDER=ign"
  - test: "API e2e specs in CI: api/test/search.e2e-spec.ts and api/test/migration-022-unaccent.e2e-spec.ts"
    expected: "Green against the ibp_test database (auth 401/400, community accents and case, members, author filter, parcels by key and by section+number, unaccent extension, parcels key index, migration idempotent)"
    why_human: "No Docker database locally; CI e2e job only runs after a push, and the owner must say yes to the push question first"
  - test: "api/test/check-env-parity.spec.ts in CI (Linux bash)"
    expected: "Passes, including the new GEOCODING_IGN_SEARCH_URL parity across env examples"
    why_human: "Fails locally only because of macOS bash 3.2 (34 tests in that one suite, unrelated to the phase)"
  - test: "Device-only assumptions from 25-RESEARCH A4/A5 and D-02c"
    expected: "Accent folding on Hermes ('foret' finds 'Forêt'); place zoom values and PARCEL_FOCUS_SPAN_FACTOR give a good framing; searched parcel is drawn terracotta-selected once the viewport parcels load; native search tab round button beside the bar; Android fourth tab with the magnifier"
    why_human: "Runtime/visual behavior on device that unit tests with mocks cannot show"
  - test: "Plan 25-15 Task 3 after the owner's go"
    expected: "OA row added to docs/user-tests/owner-acceptance.md and REQ-B-global-search ticked in .planning/REQUIREMENTS.md (currently still [ ])"
    why_human: "Only after the owner's 'go' (not done yet, expected)"
---

# Phase 25: Global Search Verification Report

**Phase Goal:** One search field finds anything in the app: the member's own surveys, the other members' surveys, places and parcels on the map, and the other items the app exposes.
**Verified:** 2026-10-09
**Status:** human_needed
**Re-verification:** No (initial verification)

Starting hypothesis was "tasks done, goal missed". The code was read, not the summaries. No stub, no TODO, no dead or orphaned module and no unfulfilled decision was found. What remains is the owner phone check, the API e2e specs (CI), and the 25-15 close-out (Tasks 2 and 3), all expected.

## Goal Achievement

### ROADMAP success criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | One entry reachable from every main tab, grouped results, each leading straight to the item | VERIFIED | iOS: `NativeRootTabs.tsx` registers `<NativeTab.Screen name="search" options={{ role: "search" }} component={SearchTabNavigator}>`. Android/JS: `JsRootTabs.tsx` has a 4th `JsTab.Screen name="search"` (icon `search-outline`, `tab-config.tsx`; label `fr.navigation.tabs.search`). `SearchStack.tsx` registers `searchHome` -> `SearchHomeRoute` and `searchGroup` -> `SearchGroupRoute`. `SearchHomeRoute` opens: own survey (`actions.openSurvey` then `surveys/surveyDetail`), community survey (`communitySurvey`), member (`searchGroup` with `memberName`), place and parcel (`publicMap/publicMapHome` with `placeFocus` / `parcelFocus`). Groups mine / community / places / parcels in `SearchResults.tsx` with "Meilleur résultat" card and "Voir les N". The old Mes Relevés magnifier and `surveySearch` route / `SurveySearchRoute` / `survey-search` screens are gone (grep: 0 hits in `mobile/src` code; `SurveyListRoute` and `list-chrome.tsx` state search is its own tab). |
| 2 | Own surveys offline from local data; community and places need network and say so without hiding local results | VERIFIED | `matchOwnSurveys` (`app/global-search.ts`) runs on `state.surveys` on every keystroke, accent- and case-folded (`search-text.ts`), no network. `useSearchGroup` returns status `offline` with no request when `useIsOffline()`; `SearchResults.tsx` `networkNotice` draws `SearchGroupNotice variant="offline"` (catalogue `search.offline.*`, "Connexion nécessaire ...") inside each network group card; local group is always drawn. Offline no-result copy has its own variant. Reconnect re-queries (hook test "queries once when the connection returns"). |
| 3 | Place search resolves a name or address to a map position with a provider consistent with the cadastre choice, within budget | VERIFIED | `api/src/surveys/geocoder.service.ts`: IGN Géoplateforme `https://data.geopf.fr/geocodage/search` (`GEOCODING_IGN_SEARCH_URL`, default in `app-config.ts`, in `env.schema.ts`, all four env examples and `api/README.md`), `index=address,poi`, switched by `CADASTRE_PROVIDER === "ign"`, shared `ign-http.ts` (timeout), LRU cache 10 min / 500 entries, in-flight de-duplication, concurrency cap 8, 503 `search_provider_unavailable`, features mapped and validated (no raw forwarding). No key, no paid host in code. Explorer: `placeFocus` -> `useExplorerFocus` -> `focusTo(region)` + `PlacePinLayer` in `MapCanvas.tsx`; parcels: `parcelFocus` -> `focusParcelIds` -> `ParcelPolygonsLayer selectedParcelIds`. |
| 4 | Fast: debounced input, bounded groups, empty / no-result / error states, French catalogue | VERIFIED | `SEARCH_DEBOUNCE_MS = 350` in `useSearchGroup`; stale answers dropped (tests "ignores the answer of a request that a newer one replaced"); 3 rows per group (`SUMMARY_ROW_COUNT`), limits 50 / 10 / 10, API DTO caps (`q` 2..100, community limit 1..50, places 1..10), parcel answers capped at 10. States: start page with recents (`SearchStartPage`), no-result block, per-group loading / offline / error with its own "Réessayer" (`SearchGroupNotice`, `retry`), rate-limited 429 line. All text from `mobile/src/i18n/fr/search.ts`; no hard-coded French in the new screens (grep); `catalogue-dash.test.ts` passes; no em dash added anywhere in the phase diff (checked on all added lines of `mobile/src`, `api`, `packages`, `CLAUDE.md`, `docs`). |
| 5 | Owner confirms on phone, light and dark | HUMAN-NEEDED | 25-15 Task 2 (blocking owner check) not yet run, expected. |

### Locked decisions D-01 to D-17

| Decision | Status | Evidence |
|----------|--------|----------|
| D-01 entry (iOS native search tab only, Android 4th tab, one `SearchStack`, no field on Explorer) | VERIFIED | See criterion 1. No header magnifier remains in `SurveysStack` / `PublicMapStack` / `header-items.tsx`. |
| D-02 / D-02b layout and states (best-result card, groups, start page + recents, offline lines, per-group error + retry) | VERIFIED | `SearchResults.tsx`, `SearchBestResult.tsx`, `SearchStartPage.tsx`, `SearchGroupNotice.tsx`. |
| D-03 own surveys by name offline | VERIFIED | `matchOwnSurveys` compares `site_name` only. |
| D-04 community by survey name and member name | VERIFIED | `search.queries.ts` `buildSearchCommunitySurveysQuery` (site_name OR display_name, `unaccent ... ILIKE`, public predicate, `submitted_at IS NOT NULL`, caller excluded with `IS DISTINCT FROM`, anonymised surveys kept) and `buildSearchMembersQuery`; no profile page added. |
| D-05 places to map position, Explorer centred | VERIFIED | geocoder + `focus-region.ts` `placeZoom` + pin layer. |
| D-06 parcels by number, Explorer on the parcel | VERIFIED | `parcel-query.ts` parser, `ParcelSearchService`, `focus-region.ts` `parcelRegion`. |
| D-07 IBP factors / settings not searched | VERIFIED | Absent by design. |
| D-08 / D-09 IGN via own API, never from phone, no paid or OSM provider | VERIFIED | Phone only calls `/search/*` through `ibp-api.ts`; only IGN hosts in API. |
| D-10 / D-11 offline, grouped, bounded, debounced, states, catalogue | VERIFIED | See criteria 2 and 4. |
| D-12 geocoder URL, `index=address,poi` | VERIFIED | `geocoder.service.ts`, `app-config.ts`. |
| D-13 parcel by API Carto, not geocoder parcel index; four input forms | VERIFIED | `CadastreProviderService.lookupParcelByKey` (API Carto), commune name via `GeocoderService.resolveCommunes`, section+number via `buildParcelsBySectionNumberQuery`, DB fallback when IGN is off or fails, 503 only if IGN failed and DB empty. |
| D-14 best-result order parcel > member > place >= 0.85 (commune/POI) > own > community | VERIFIED | `pickBestResult` in `app/global-search.ts` matches exactly; `groupOrder` puts Parcelles first when the best is a parcel. |
| D-15 three endpoints, `search` throttle, LRU + de-dup + timeout | VERIFIED | `SearchController` (`@Controller("search")`, `@UseGuards(AuthGuard)`, `@Throttle(SEARCH_THROTTLE)` on `community`, `places`, `parcels`); registered in `surveys.module.ts` with `SearchService`, `GeocoderService`, `ParcelSearchService`; `rate-limit.config.ts` has `search: 240` and `SEARCH_THROTTLE`. |
| D-16 migration 022 `unaccent`, phone folds accents, recents in `local_meta` (`search_recents`, max 8) cleared by `clearLocalIbpData` | VERIFIED (migration SQL by reading; execution is CI) | `022_unaccent_search.sql` (extension in `public`, `idx_parcels_commune_section_number`, idempotent); `storage/search-recents.ts` (`SEARCH_RECENTS_MAX = 8`); `clearLocalIbpData` deletes `SEARCH_RECENTS_KEY` in its transaction; sqlite test covers it. |
| D-17 same-name members as one row, no user id on the wire, no attribution line | VERIFIED | `GROUP BY u.display_name`, only `author_name` + `survey_count` selected. |

### Wiring and data-flow

| Link | Status | Details |
|------|--------|---------|
| `SearchHomeRoute` -> `useGlobalSearch` -> `searchCommunity/searchPlaces/searchParcels` (`api/ibp-api.ts`) -> `/search/*` -> controller -> services -> SQL / IGN | WIRED | Real queries and real provider calls, no static returns. Token required (`accessToken !== null`). |
| `SearchGroupRoute` -> `useSearchGroup` + same client functions; "Mes relevés" from surveys context; chips reset on close | WIRED | |
| Result open -> `navigate("publicMap", { focus })` -> `PublicMapScreen` `useExplorerFocus` (nonce-once) -> `MapCanvas` pin / parcel highlight | WIRED | Unit tests cover place, parcel, survey focus, nonce and focus loss. |
| Every new component imported by a non-test file | WIRED | No orphan among `screens/global-search/*`, hooks, storage. |
| Old search stack removed | VERIFIED | No `SurveySearchRoute`, `SurveySearchScreen`, `useCommunitySurveys`, or search query in the surveys context left in `mobile/src`. |

### Behavior-dependent truths (stale answers, nonce-once focus, pin clears on blur, recents cleared on account change)

All four have a named passing test (`useSearchGroup.test.ts`, `useExplorerFocus.test.ts`, `search-recents.sqlite.test.ts`). Nothing left as PRESENT_BEHAVIOR_UNVERIFIED.

### Checks run

| Check | Result |
|-------|--------|
| `cd mobile && npx jest --config jest.unit.config.js src/screens/global-search src/navigation src/__checks__ ...` | 55 suites, 769 tests pass |
| `cd api && npx jest --config jest.unit.config.js test/search test/geocoder test/parcel` | 7 suites, 148 tests pass |
| `npm --workspace mobile run test:unit` | 287 suites, 3682 tests pass |
| `npm --workspace @cortege/ibp-domain run test` | 9 suites, 230 tests pass |
| `npm --workspace api run test:unit` | 44 of 45 suites pass; only `check-env-parity.spec.ts` fails (known macOS bash 3.2 limit, unrelated) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run format:check` | Only `.claude/settings.local.json` flagged (git-ignored local file, not part of the phase) |
| TODO / FIXME / XXX / TBD / HACK / PLACEHOLDER in phase files | none |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| REQ-B-global-search | Implemented, owner acceptance pending | Code delivers it; `.planning/REQUIREMENTS.md` line 100 is intentionally still `[ ]` until the owner's "go" (25-15 Task 3). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/src/navigation/stacks/SurveysStack.tsx` | 46-47 | Stale comment: "elsewhere the list draws its own title bar with the search and '+' buttons" (the search button was removed, D-01) | Info / WARNING (cosmetic) | Misleads readers only. Fix: drop "the search and" from the comment ("with the '+' button"). |
| `docs/design/component-inventory-phase-23.md` | 120, 193, 231, 258 | Historical Phase 23 inventory still names `survey-search/*` | Info | Dated snapshot of the pre-phase code; leave or add a one-line note. |

### Gaps Summary

No blocking gaps and no failed truth. Criteria 1 to 4 and decisions D-01 to D-17 are delivered and wired end to end in the real code. The remaining items are the ones the plan defers: the blocking owner phone check (criterion 5), CI-only API e2e specs and the env-parity spec, the device-only assumptions (Hermes accent folding, zoom values, parcel highlight drawn once viewport parcels load), and the 25-15 Task 3 close-out (owner acceptance row, REQ ticked) after the owner's "go". One cosmetic stale comment is noted above.

---

_Verified: 2026-10-09_
_Verifier: Claude (gsd-verifier)_
