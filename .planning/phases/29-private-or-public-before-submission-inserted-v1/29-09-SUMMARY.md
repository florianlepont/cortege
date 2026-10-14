---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 09
subsystem: api
tags: [visibility, privacy, guarantee-suite, typescript-compiler-api, nestjs, e2e]
status: complete
requires:
  - phase: 29-01
    provides: "PUBLIC_SURVEY_PREDICATE (shared only), submittedVisibleToCallerSql, caller-aware parcel history"
  - phase: 29-04
    provides: "POST /v1/reports answers the unknown-id 404 for a hidden survey"
  - phase: 29-06
    provides: "visibility frozen at submit on every write channel"
provides:
  - "SURVEY_ROUTE_CLASSES / MEMBER_READ_ROUTES: one classification of every API route"
  - "Database-free guarantee spec: route enumeration through Nest metadata, per-site SQL scan of every text reading surveys, counted owner-scoped allowlist, in-memory mutation self-tests, D-11 pins"
  - "Two-user e2e matrix over every member read route with unknown-id 404 bodies"
  - "D-11 numbering and D-13 account deletion e2e proofs"
affects: [29-10]
tech-stack:
  added: []
  patterns:
    - "Guarantee by enumeration: a route or SQL site that is not classified fails the unit run (CI unit-api), with no database"
    - "SQL guard judged on the AST at its site (file#Class.method, file#function, file#CONSTANT), never on hand-written text"
key-files:
  created:
    - api/test/helpers/survey-read-routes.ts
    - api/test/survey-read-paths.spec.ts
    - api/test/private-visibility.e2e-spec.ts
    - api/test/private-visibility-retention.e2e-spec.ts
  modified: []
key-decisions:
  - "D-12: the route enumeration is a unit spec (no PostgreSQL), so it guards every PR in unit-api"
  - "D-09: a span is a guard only when it is PUBLIC_SURVEY_PREDICATE, a submittedVisibleToCallerSql(...) call, a module const of the same file initialised with exactly one of them, or a const conditions array whose initializer holds one of them; a hand-written visibility clause or a later push never counts"
requirements-completed: [REQ-C-privacy-choice]
duration: ~35min
completed: 2026-10-13
---

# Phase 29 Plan 09: Server guarantee suite (D-12) Summary

**A database-free spec now fails if any controller route is unclassified or any SQL text reading `surveys` skips the shared predicate outside a counted owner-scoped allowlist, and two e2e suites prove route by route that a private survey never reaches another member (identical 404 bodies), keeps counting for numbering (D-11) and stays hidden after account deletion (D-13).**

## Accomplishments

- `api/test/helpers/survey-read-routes.ts`: `SurveyRouteClass`, `SURVEY_ROUTE_CLASSES` (49 routes, each with its reason, built from the enumeration), `MEMBER_READ_ROUTES` (12: 10 shared, the caller-aware history, report creation).
- `api/test/survey-read-paths.spec.ts` (17 tests, unit run):
  - (a) walks `api/src` for `*.controller.ts` (11 files), loads each, reads `CONTROLLER_WATERMARK`, `PATH_METADATA`, `METHOD_METADATA`, builds `METHOD /v1/...` and compares both ways with `SURVEY_ROUTE_CLASSES`.
  - (b) `scanSurveySql(relativePath, sourceText)` with the TypeScript compiler API: string and template literals whose own text matches `(FROM|JOIN) surveys`, site = nearest `Class.method`, function or module-level constant (anonymous callbacks skipped), guard decided on the spans.
  - The real tree is compared with `OWNER_SCOPED_SURVEY_SQL` (per-site counts), `GUARDED_BY_CONDITIONS_ARRAY` and `GUARDED_INLINE` using `toEqual`.
  - (b2) mutation self-tests on in-memory copies of the real sources: map items, community search, parcel search and parcel history, each asserting that the mutated text differs. Synthetic sources cover a hand-written clause, a predicate pushed inside an `if`, aliases (hand-written vs caller-aware) and the accepted initializer.
  - (c) the D-11 pin: 3 next-version texts with no `visibility`. (d) the predicate text.
- `api/test/private-visibility.e2e-spec.ts` (14 tests): users A, B, C; `MATRIX` keys pinned to `MEMBER_READ_ROUTES`; owner routes (survey, events, attachments, download URL) give B the unknown-id 404 and still serve A `visibility: "private"`. No `expect(403)`.
- `api/test/private-visibility-retention.e2e-spec.ts` (2 tests): D-11 (default version v+1, forced v answers 409 `parcel_version_conflict` with `expected_version_number` v+1, no id leaks, private survey absent from map, statuses, history for B, present for A) and D-13 (DELETE /v1/me 204, private retained survey 404 = unknown body, shared one 200 with `author_name` null, map and history, SQL `user_id NULL` with visibility kept).

## Measured on the current tree (after 29-01, 29-04, 29-06)

`OWNER_SCOPED_SURVEY_SQL` (unguarded texts per site, each owner-scoped, a write, or D-11 numbering):

| Site | Count | Reason |
|------|-------|--------|
| `debug/debug.service.ts#DebugService.resetIbpData` | 1 | debug reset, DELETE FROM surveys, dev-only gate |
| `debug/debug.service.ts#DebugService.resetUserData` | 1 | debug reset, DELETE FROM surveys, dev-only gate |
| `surveys/parcels.service.ts#ParcelsService.getDefaultVersionNumber` | 1 | next version, D-11 |
| `surveys/parcels.service.ts#ParcelsService.validateParcelSubmit` | 1 | next version at submit, D-11 |
| `surveys/surveys.repository.ts#FAST_PATH_VERSION_NUMBER_SQL` | 1 | next version on the upsert fast path, D-11 |
| `surveys/surveys.repository.ts#SurveysRepository.findOwned` | 1 | ownership lookup, id = $1 AND user_id = $2 |
| `surveys/surveys.repository.ts#SurveysRepository.readForUpsert` | 1 | upsert read of the caller's row |
| `surveys/surveys.repository.ts#buildListForUserQuery` | 1 | owner list, conditions start with user_id = $1 |
| `surveys/surveys-sync.service.ts#SurveysSyncService.getSyncChanges` | 1 | owner sync pull, s.user_id = $1 |
| `surveys/surveys-sync.service.ts#SurveysSyncService.resolveSyncChangesStart` | 1 | owner sync pull, legacy cursor |
| `surveys/surveys-sync.service.ts#SurveysSyncService.loadSyncChangeSurveys` | 1 | owner sync pull |
| `surveys/surveys-sync.service.ts#SurveysSyncService.loadSyncChangeAttachmentsByIds` | 1 | owner sync pull, attachments |
| `users/users.service.ts#UsersService.deleteAccount` | 3 | account deletion, user_id = $1 |

`GUARDED_BY_CONDITIONS_ARRAY`: `surveys/public-map.queries.ts#buildCommunitySurveysQuery`, `surveys/public-map.queries.ts#buildPublicMapItemsQuery`, `surveys/search.queries.ts#buildSearchCommunitySurveysQuery`.

`GUARDED_INLINE`: `reports/reports.service.ts#ReportsService.findSurveyForReport`, `surveys/community-surveys.service.ts#CommunitySurveysService.assertPublicSurvey`, `#CommunitySurveysService.getDetail`, `surveys/parcel-search.queries.ts#buildParcelSurveyCountQuery`, `#buildParcelsBySectionNumberQuery`, `surveys/parcels.service.ts#ParcelsService.getParcelSurveyHistory`, `surveys/public-map.queries.ts#LATEST_PUBLIC_SURVEY_OF_PARCEL`, `surveys/search.queries.ts#buildSearchMembersQuery`.

## End-to-end mutation runs (real files, never committed)

1. **Map items:** `PUBLIC_SURVEY_PREDICATE, ` deleted from the `conditions` initializer of `buildPublicMapItemsQuery` in `api/src/surveys/public-map.queries.ts`. `npx jest --config jest.unit.config.js test/survey-read-paths.spec.ts` gave **exit 1**, 3 failed: the allowlist diff shows `+ "surveys/public-map.queries.ts#buildPublicMapItemsQuery": 1`, the conditions-array diff shows `- "surveys/public-map.queries.ts#buildPublicMapItemsQuery"`, and the in-spec self-test fails too. File copied back from the scratch copy.
2. **Community search:** same deletion in `buildSearchCommunitySurveysQuery` of `api/src/surveys/search.queries.ts`. **Exit 1**, 3 failed: `+ "surveys/search.queries.ts#buildSearchCommunitySurveysQuery": 1` in the allowlist diff, `- "surveys/search.queries.ts#buildSearchCommunitySurveysQuery"` in the conditions-array diff. File copied back.
3. After both: `git diff --exit-code -- api/src/surveys/public-map.queries.ts api/src/surveys/search.queries.ts` exit 0 (restored), spec green again (17 passed, exit 0).

Extra check of the e2e matrix (not committed): with `AND s.visibility = 'public'` removed from `PUBLIC_SURVEY_PREDICATE`, `private-visibility.e2e-spec.ts` failed on all 11 predicate-based member routes. The history route passed with the weakened constant because it is caller-aware; that is expected. The matrix-keys test and the two owner-route tests also passed. The file was restored with `git checkout` and the diff was empty.

## Task Commits

1. **Task 1: Route classification, route enumeration and the SQL scan** - `6c5f3e5a` (test)
2. **Task 2: Two-user guarantee matrix and identical 404 bodies** - `a332e02e` (test)
3. **Task 3: Version numbering over private surveys and account deletion** - `0c5c2da0` (test)

## Verification Run

- `npx jest --config jest.unit.config.js test/survey-read-paths.spec.ts`: 17 pass.
- `npx jest -c jest.config.js --runInBand test/private-visibility.e2e-spec.ts` (14 pass) and `test/private-visibility-retention.e2e-spec.ts` (2 pass).
- Full e2e (`npm run test:e2e`, ibp_test): 47 suites pass, 356 tests pass. The 2 failing suites (3 tests) are the known environmental ones, `list-pagination` (timezone) and `migrate-lock` (create database permission).
- API unit (`npm --workspace api run test:unit`): 55 suites pass. The only failure is `check-env-parity.spec.ts` (bash 3.2, known).
- `npm run lint`, `npm run typecheck`: exit 0. `npm run format:check` flags only the untracked `.claude/settings.local.json`; every changed file passes `prettier --check`.

## Deviations from Plan

**1. [Rule 1 - Bug in the plan's scanner rule] A module constant alias of the caller-aware guard counts as inline**
- **Found during:** Task 1 (first measurement)
- **Issue:** Plan 29-01 put the caller-aware history guard in a module constant: `PARCEL_HISTORY_VISIBLE_SQL = submittedVisibleToCallerSql("$3")`. The local `sql-no-unsafe-interpolation` rule only accepts SCREAMING_SNAKE_CASE constants inside SQL templates, so this is the form the code has to use. Under the plan's rule, `ParcelsService.getParcelSurveyHistory` came out unguarded. Allowlisting it would have hidden a future removal of the guard on a cross-member read.
- **Fix:** a span is also inline when it is an identifier naming a `const` declared at module level in the same file, initialised with exactly `PUBLIC_SURVEY_PREDICATE` or a `submittedVisibleToCallerSql(...)` call. Two tests pin it:
  - a real-source mutation that removes `AND ${PARCEL_HISTORY_VISIBLE_SQL}` makes the history unguarded;
  - a synthetic source shows that an alias holding a hand-written clause stays unguarded.
- **Files:** `api/test/survey-read-paths.spec.ts`. **Commit:** `6c5f3e5a`

**2. [Precision] A literal's own text, not `getText`**
- **Issue:** with `getText`, an outer template that embeds an inner `FROM surveys` template would count that inner text twice.
- **Fix:** the surveys-read regex is matched against the literal's own text: the head plus the span literals, without the interpolated expressions. The guard is still decided on the AST spans.

**3. [Addition] Extra pins**
- `GUARDED_INLINE` is pinned with `toEqual`, so a guarded read that disappears or moves is noticed.
- The e2e suites use `configureApp`, the production bootstrap with the validation pipe. They build their own fixtures because `createSubmittedSurvey` sends `location`, which that pipe refuses.

No production code changed. The suite found no leak.

## Known Stubs

None.

## Threat Flags

None. T-29-29, T-29-30, T-29-31 and T-29-32 are mitigated as planned. T-29-33 is accepted and tested (D-11 numbering leak).

## Self-Check: PASSED

- Files present: `api/test/helpers/survey-read-routes.ts`, `api/test/survey-read-paths.spec.ts`, `api/test/private-visibility.e2e-spec.ts`, `api/test/private-visibility-retention.e2e-spec.ts`.
- Commits found: `6c5f3e5a`, `a332e02e`, `0c5c2da0`.
- STATE.md and ROADMAP.md untouched.
