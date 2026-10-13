---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 01
subsystem: api
tags: [postgres, migration, visibility, privacy, nestjs, e2e]
status: complete
requires:
  - phase: 11-association-only-sharing-scope-trim
    provides: "association member = any authenticated user; idx_surveys_public_submitted without the visibility clause (017)"
provides:
  - "PUBLIC_SURVEY_PREDICATE filtering on s.visibility = 'public' (single rule for every cross-member read)"
  - "submittedVisibleToCallerSql(callerParam): caller-aware sibling used by the parcel history only"
  - "Migration 024: submitted surveys backfilled to public, 'backfilled' pull events, partial index with the visibility clause"
  - "Read e2e fixtures that create shared surveys before submit"
affects: [29-02, 29-06, 29-09, 29-10]
tech-stack:
  added: []
  patterns:
    - "One SQL predicate constant plus one caller-aware function next to it; no hand-written visibility SQL elsewhere"
    - "Data-fix migration emits synthetic 'backfilled' survey_events so the owner's phone pulls the new value"
key-files:
  created:
    - api/migrations/024_private_or_public_visibility.sql
    - api/test/migration-024-visibility-backfill.e2e-spec.ts
  modified:
    - api/src/surveys/public-map.queries.ts
    - api/src/surveys/parcels.service.ts
    - api/src/surveys/parcels.controller.ts
    - api/src/surveys/community-surveys.service.ts
    - packages/ibp-domain/src/contract/survey.ts
    - packages/ibp-domain/src/contract/public-map.ts
    - api/test/parcels.service.spec.ts
    - api/test/public-map.service.spec.ts
    - api/test/public-map-items.e2e-spec.ts
    - api/test/public-map-bbox.e2e-spec.ts
    - api/test/public-map-method-version.e2e-spec.ts
    - api/test/community-surveys.e2e-spec.ts
    - api/test/community-survey-detail.e2e-spec.ts
    - api/test/search.e2e-spec.ts
    - api/test/public-routes-explain.e2e-spec.ts
key-decisions:
  - "D-09: PUBLIC_SURVEY_PREDICATE = submitted AND not deleted AND visibility = 'public'; map items, parcel statuses, community list/detail/attachments, community and parcel search all inherit it"
  - "D-10: parcel history is caller-aware (own submitted surveys whatever the visibility, plus shared ones of others); equality on user_id so a NULL author never matches"
  - "D-11: the version numbering queries are untouched and still count private surveys; pinned by a unit test"
  - "D-06: migration 024 backfills every submitted survey (deleted ones included) to public, one 'backfilled' event per survey with an author, partial index recreated with the visibility clause"
patterns-established:
  - "sql-no-unsafe-interpolation lint rule: a SQL fragment spliced into a template must come from a SCREAMING_SNAKE_CASE constant (PARCEL_HISTORY_VISIBLE_SQL)"
requirements-completed: [REQ-C-privacy-choice]
duration: ~45min
completed: 2026-10-13
---

# Phase 29 Plan 01: Server-side shared-only predicate, caller-aware parcel history and migration 024 Summary

**A private submitted survey is now invisible to every other member on every cross-member read path (one predicate, one caller-aware sibling for the parcel history), and migration 024 keeps all existing submitted surveys visible by backfilling them to `public` with pull events and the restored partial index.**

## Performance

- **Tasks:** 3 of 3
- **Files:** 2 created, 15 modified (13 under `api/`, 2 doc-comment edits under `packages/ibp-domain/`)

## Accomplishments

- Migration 024 (`api/migrations/024_private_or_public_visibility.sql`): data-modifying CTE sets `visibility = 'public'` on every submitted survey that is not yet public (updated_at untouched), inserts one `'backfilled'` event (`actor_id` NULL, payload `{"reason":"migration_024","visibility":"public"}`) per backfilled survey with an author, then recreates `idx_surveys_public_submitted ON surveys (submitted_at DESC) WHERE status = 'submitted' AND visibility = 'public' AND deleted_at IS NULL`. Idempotent. Its scratch-schema spec (`mig024_scratch`, real runner) proves: submitted -> public (anonymised and deleted included), drafts unchanged, events only for authored rows, index definition, runner no-op, raw second execution no-op.
- `PUBLIC_SURVEY_PREDICATE` now ends with `AND s.visibility = 'public'` (built from an unexported `SUBMITTED_ACTIVE_SURVEY`), and `submittedVisibleToCallerSql("$3")` is defined beside it. Unit specs pin both exact strings.
- `GET /v1/parcels/:parcelId/surveys/history` reads `@CurrentUser()` and `ParcelsService.getParcelSurveyHistory(callerId, parcelId, limit)` binds `["P1", 5, callerId]`.
- `getDefaultVersionNumber` and the submit-validation GROUP BY are untouched (comment lines added); a unit test asserts the SQL has no `visibility`.
- Read e2e fixtures flipped: shared surveys are created `public` before submit (no PATCH after submit anywhere in the touched suites); a private submitted survey is absent from map items, bbox results and the method-version map; a parcel whose only survey is private is not studied for another member; `public-routes-explain` compares the current queries with the legacy `visibility = 'public'` SQL again (helper `dropVisibilityPredicate` deleted).
- Package doc comments updated (`SurveyVisibility`, `CommunitySurveyItem`), no type change.

## Task Commits

1. **Task 1: Migration 024 and its scratch-schema spec** - `2b0e1529` (feat)
2. **Task 2: Predicate, caller-aware history, version numbering pinned** - `5183f142` (feat), plus lint fix `26de28c6` (fix)
3. **Task 3: Flip read fixtures, restore explain parity** - `c821c400` (test)

## Verification Run

- `npx jest -c jest.config.js --runInBand` on `migration-024-visibility-backfill`, `parcel-history`, `public-map-items`, `public-map-bbox`, `public-map-method-version`, `community-surveys`, `community-survey-detail`, `search`, `public-routes-explain`: all pass (every e2e ran on local `ibp_test`).
- API unit specs (`parcels.service`, `public-map.service`, `search.queries`, `community-surveys.service`, `parcel-search.service`): 102 tests pass.
- `npm run test:e2e` whole API: 45 of 47 suites pass; the 2 failures are environmental, see below.
- `npm run lint` (api and domain), `npm run typecheck`, `npm --workspace @cortege/ibp-domain run test:coverage` (100 %): pass. `prettier --check` on every changed file: pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `sql-no-unsafe-interpolation` lint error on the history query**
- **Found during:** Task 3 repo gate (`npm run lint`)
- **Issue:** `${submittedVisibleToCallerSql("$3")}` inside the template literal is rejected by the local ESLint rule (splice must be a SCREAMING_SNAKE_CASE constant).
- **Fix:** module constant `PARCEL_HISTORY_VISIBLE_SQL = submittedVisibleToCallerSql("$3")` in `parcels.service.ts`, interpolated in the query. The plan's grep pattern `submittedVisibleToCallerSql("$3")` still matches.
- **Commit:** `26de28c6`

**2. [Rule 1 - Bug] bbox EXPLAIN reference query missed the visibility clause**
- **Found during:** Task 3
- **Issue:** the hand-written reference query in `public-map-bbox.e2e-spec.ts` ("returns the latest public surveys...") compared against all submitted surveys, so the new predicate made the set comparison fail (28 ids missing).
- **Fix:** added `AND s.visibility = 'public'` to the reference.
- **Commit:** `c821c400`

### Interpretation notes

- `public-map-bbox`: instead of flipping the existing `insidePrivate` tuple to public and adding another private row, the existing private-inside row was kept as the private case (now asserted absent) and the shared inside row carries the `display_location` assertion. Same coverage, fewer rows.
- `public-map-method-version`: the third survey (`v32Private`) was kept private rather than made shared, because it is a useful private case; it is excluded from the exact-centre loop and its parcel is asserted not studied.
- `public-map-items`: the parcel-status test now creates one shared and one private parcel and asserts through another member's token; the zoom 14 check uses the other member's token so it proves the studied-only list excludes the private parcel.

## Known Issues (out of scope)

- `api/test/list-pagination.e2e-spec.ts` (1 test, "without params returns the same items...") fails on this machine: it compares `created_at` strings to `"2024-05-02 07:00:00+00"` but the local Postgres session timezone is `Europe/Paris`. Unrelated to this plan (no file of that test or of survey events changed). Not fixed.
- `api/test/migrate-lock.e2e-spec.ts` (2 tests) fails with `permission denied to create database` on the local role. Environmental, unrelated.
- `npm run format:check` reports only `.claude/settings.local.json` (untracked tooling file, not touched).

## Threat Flags

None. No new endpoint, auth path or trust-boundary file access beyond the plan's threat model (T-29-01 to T-29-04 mitigated as planned; T-29-05 accepted and pinned by the version-numbering unit test).

## Notes for Later Plans / CI

- Editing `packages/ibp-domain/src/contract/*.ts` (two doc comments) triggers the `native-android`, `native-ios` and `image-check` CI jobs; this is a CI cost only.
- Accepted consequence (29-RESEARCH Q1): the server routes are caller-blind, so the owner's own private-only parcel shows as not studied in server-coloured layers; the owner's markers come from the local overlay.
- Plan 29-06 will make the visibility PATCH after submit a 422; no fixture of this plan publishes after submit any more.

## Known Stubs

None.

## Self-Check: PASSED

- Files: migration 024, its spec, and all modified files present (`git status` clean after the commits).
- Commits found: `2b0e1529`, `5183f142`, `26de28c6`, `c821c400`.
- STATE.md and ROADMAP.md untouched.
