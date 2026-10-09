---
phase: 25-global-search
plan: 10
subsystem: api
tags: [search, parcels, ign, api-carto, cadastre]
requires:
  - "25-01 (SearchParcelItem, SearchParcelsResponse wire types)"
  - "25-06 (fetchIgnJson, GeocoderService.resolveCommunes)"
provides:
  - "parseParcelQuery(text) and ParcelQuery in api/src/surveys/parcel-query.ts"
  - "geometryBbox(geometry) and CadastreProviderService.lookupParcelByKey(commune, section, number) in cadastre-provider.service.ts"
  - "ParcelSearchService.search(rawQuery) and PARCEL_SEARCH_LIMIT = 10 in api/src/surveys/parcel-search.service.ts, not yet registered in a module"
  - "buildParcelByKeyQuery, buildParcelSurveyCountQuery, buildParcelsBySectionNumberQuery in parcel-search.queries.ts"
affects: [25-13, 25-15]
tech-stack:
  added: []
  patterns: ["IGN first, database fallback, 503 only when both give nothing", "cache of successful, non-degraded answers only"]
key-files:
  created:
    - api/src/surveys/parcel-query.ts
    - api/test/parcel-query.spec.ts
    - api/src/surveys/parcel-search.queries.ts
    - api/src/surveys/parcel-search.service.ts
    - api/test/parcel-search.service.spec.ts
  modified:
    - api/src/surveys/cadastre-provider.service.ts
    - api/test/cadastre-provider.service.spec.ts
key-decisions:
  - "The cache key is the parsed query (JSON of ParcelQuery), so '77186 ab 123', '77186AB0123' and 'parcelle 77186 AB n° 123' share one entry"
  - "An answer built while IGN failed (database fallback) is returned but not cached, so the 10 minute window never hides IGN recovering; an IGN failure with an item from the database is a 200, with nothing a 503"
  - "Commune-name form: lookups per commune (max 3, geocoder order); one commune failing does not hide the others, the answer just is not cached; all failing with nothing in the database is a 503"
  - "The word NO is dropped only after a section-like word ('AB no 123'), because NO is also a valid two-letter section"
  - "Letters-only forms are the only compact forms ('77186AB123'); numbered sections (Alsace-Moselle) need separated words, so a bare run of digits is never read as a parcel"
  - "Section+number alone and a department prefix never reach IGN; they read the parcels table (centroid required, newest finished survey first, max 10)"
requirements-completed: [REQ-B-global-search]
metrics:
  tasks: 3
  files: 7
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 10: Parcel search (server side) Summary

The API can now turn a typed parcel reference (full IDU, INSEE code + section + number, commune name + section + number in either order, section + number with an optional department) into parcels with centroid, IGN bounding box, commune name and the count of finished public surveys, falling back on registered parcels when IGN is off or fails.

## Tasks

| Task | Commit | Result |
|------|--------|--------|
| 1. `parseParcelQuery` | d2fd9381 | pure parser returning `key`, `communeName` or `sectionNumber` (with `departmentPrefix`), null for anything else; reuses `parseParcelIdu`, `normalizeParcelSection`, `normalizeParcelPartToDigits` |
| 2. `lookupParcelByKey`, `geometryBbox`, shared HTTP rule | a4b1c2e4 | API Carto lookup by key (Paris/Lyon/Marseille via city code + `code_arr`, one-letter sections as `0A`), throws on failure; `resolveGeometryFromApiCarto` split into a throwing `fetchApiCartoParcel` and the unchanged swallowing wrapper; private `fetchJson` now calls `fetchIgnJson` with label "cadastre provider" |
| 3. `ParcelSearchService` and SQL builders | 454d4139 | resolution, database fallback, survey count in one `unnest` query, LRU cache (10 min, 500), 503 `search_provider_unavailable`, no logging of the text |

## Verification

- `test/parcel-query.spec.ts`, `test/cadastre-provider.service.spec.ts`, `test/ign-http.spec.ts`, `test/parcel-search.service.spec.ts`: all pass (37 + 35 + 24 tests in the touched files' runs).
- Coverage: `parcel-search.service.ts` and `parcel-search.queries.ts` 100% across the board; `parcel-query.ts` 100% statements/lines (97.5% branches, one unreachable guard on a lettered compact section); `cadastre-provider.service.ts` unchanged at 94% statements (its uncovered lines are the pre-existing private helpers).
- `npm run test:coverage:api`: 43 of 44 suites pass; the only failure is `check-env-parity.spec.ts` (macOS bash 3.2 `declare -A`, known and unrelated).
- `npm run lint`, `npm run typecheck` exit 0. Prettier is clean on all seven files of this plan (whole-repo `format:check` not run: it reports the git-ignored `.claude/settings.local.json`).
- Greps: `export function parseParcelQuery`, `parseParcelIdu(` in the parser, `export function geometryBbox`, `async lookupParcelByKey(`, `fetchIgnJson(`, `resolveCommunes(`, `PUBLIC_SURVEY_PREDICATE` all present; `grep -c "AbortSignal.timeout" cadastre-provider.service.ts` prints 0; `grep -c 'index=parcel\|"parcel")' parcel-search.service.ts` prints 0.
- The e2e suites were not run (Docker is off); this plan adds none. The SQL is covered by builder specs (text and parameter arrays) only, so the first real execution of the three queries will be the 25-13 e2e in CI.

## Deviations from Plan

None in scope. Notes:

- The plan's Task 1 behaviour list says "AB 0123" and "section AB n° 123" parse; a glued "AB123" (section and number without a space) is not accepted, since the plan only lists spaced forms.
- A feature from API Carto without a usable `idu` (or key) is treated as "no parcel" (null) rather than inventing an id.

## Notes for the next plans

- 25-13 (endpoint): register `ParcelSearchService`, `GeocoderService` and the existing `CadastreProviderService` in the surveys module providers. `search(q)` takes the raw text (the controller validates 2..100 characters) and returns `{ items }` (never more than 10); it throws `ServiceUnavailableException({ code: "search_provider_unavailable" })` itself, so map nothing. The e2e DB runs with `CADASTRE_PROVIDER` synthetic, so e2e can only cover the database path (section/number, key with a registered parcel, department prefix) and that a draft is not counted in `survey_count`; this is where the three SQL builders get their first run against PostgreSQL.
- Wire item: `parcel_id` is the IDU when IGN answered, the registered `parcel_id` for a database item; `commune_name` and `bbox` are null for database items; `survey_count` is the count of finished public surveys of any member.
- The mobile cannot know whether a text is a valid parcel number: "valid" means "the response returned an item" (RESEARCH). Unparseable text costs no database or IGN call, so calling the endpoint on any parcel-looking query is cheap.
- 25-15 (docs): document the accepted forms (including the "77 AB 0123" department narrowing of the database fallback) and the `search_provider_unavailable` 503 for `/search/parcels`.

## Known Stubs

None.

## Threat Flags

None. Parsed values are digits or 1-2 letters by construction and still bound parameters (T-25-24); only parsed parts reach `URL.searchParams` of the configured API Carto base (T-25-25); the count uses the public predicate plus a submission date (T-25-26); at most 3 communes per query with the cache and the geocoder's cap (T-25-27); the service logs the failure message only (T-25-28).

## Self-Check: PASSED

- Files exist: `api/src/surveys/parcel-query.ts`, `api/src/surveys/parcel-search.queries.ts`, `api/src/surveys/parcel-search.service.ts`, `api/test/parcel-query.spec.ts`, `api/test/parcel-search.service.spec.ts`, modified `cadastre-provider.service.ts` and its spec, this SUMMARY.
- Commits exist: d2fd9381, a4b1c2e4, 454d4139.
