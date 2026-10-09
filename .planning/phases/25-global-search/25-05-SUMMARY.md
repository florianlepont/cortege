---
phase: 25-global-search
plan: 05
subsystem: api
tags: [search, postgres, unaccent, community, migration]
requires:
  - "25-01 (SearchCommunityResponse, SearchMemberItem wire types)"
provides:
  - "Migration 022: unaccent extension (public schema) and idx_parcels_commune_section_number"
  - "buildSearchCommunitySurveysQuery, buildSearchMembersQuery and the SEARCH_* limits (api/src/surveys/search.queries.ts)"
  - "SearchService.community(input, userId) (api/src/surveys/search.service.ts), not yet registered in a module"
  - "CommunitySurveyDbRow and toCommunitySurveyItem exported from public-map.queries.ts"
affects: [25-10, 25-13]
tech-stack:
  added: []
  patterns: ["unaccent(col) ILIKE unaccent($n) with escapeLikePattern", "service without logger so the search text cannot be logged"]
key-files:
  created:
    - api/migrations/022_unaccent_search.sql
    - api/test/migration-022-unaccent.e2e-spec.ts
    - api/src/surveys/search.queries.ts
    - api/test/search.queries.spec.ts
    - api/src/surveys/search.service.ts
    - api/test/search.service.spec.ts
  modified:
    - api/src/surveys/public-map.queries.ts
    - api/src/surveys/public-map.service.ts
    - api/test/public-map.service.spec.ts
    - docs/technical/data-contract-v1.md
key-decisions:
  - "Caller excluded from both the surveys and the members of the community search (the Mes releves group already lists own surveys); controller (25-13) passes the authenticated user id"
  - "With author, q is ignored and members is []"
  - "Members are grouped by exact display_name (case and accent variants stay separate rows)"
metrics:
  tasks: 3
  files: 10
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 05: Community search server side Summary

Migration 022 (unaccent plus a parcels key index), parameterised SQL builders for other members' finished surveys and for matching members, and `SearchService.community`; the old community endpoint now folds accents too.

## Tasks and commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Migration 022, unaccent and the parcels key index | 72210c74 |
| 2 | Community and member SQL builders, shared row mapping | 1d618118 |
| 3 | SearchService.community | 8ebc0056 |

## What was built

- `022_unaccent_search.sql`: `CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public` and `CREATE INDEX IF NOT EXISTS idx_parcels_commune_section_number`; no CONCURRENTLY; the `translate()` fallback is named in a comment only. Data contract documents the index and the extension.
- `search.queries.ts`: `buildSearchCommunitySurveysQuery({ q, author, excludeUserId, limit })` values `[pattern|author, excludeUserId, limit]`; `buildSearchMembersQuery({ q, excludeUserId, limit })` values `[pattern, excludeUserId, limit]`. Both use `PUBLIC_SURVEY_PREDICATE` plus `submitted_at IS NOT NULL`. Surveys use a LEFT JOIN with `IS DISTINCT FROM` (anonymised surveys stay visible); members use an INNER JOIN, `display_name <> ''`, `GROUP BY display_name`, no id or email selected.
- `public-map.queries.ts`: exports `CommunitySurveyDbRow` and `toCommunitySurveyItem` (moved from the service); `buildCommunitySurveysQuery` uses `unaccent(...) ILIKE unaccent($n)`; contract unchanged.
- `search.service.ts`: trims, clamps the limit 1..50 (default 30), members limit 5 in parallel, `author` runs only the surveys query, text shorter than 2 characters without author answers empty with no query, blank member names dropped, no logger.

## Verification

- `cd api && npx jest --config jest.unit.config.js test/search.queries.spec.ts test/search.service.spec.ts test/public-map.service.spec.ts`: pass.
- `npm run lint`, `npm run typecheck`: pass. `npm run format:check`: only the pre-existing untracked `.claude/settings.local.json` is reported.
- API unit suite with coverage: 831 tests pass. `check-env-parity.spec.ts` fails locally on macOS bash 3.2 (`declare -A`, known and unrelated, passes in CI). Because that spec is a failing suite locally, the `./src/config/` coverage threshold also reports not met in a local run excluding it; the `./src/surveys/` ratchet was not flagged.
- Acceptance greps: all hold (extension and index lines, 0 `concurrently`, `buildSearchMembersQuery`, `IS DISTINCT FROM`, `unaccent(s.site_name) ILIKE unaccent`, `toCommunitySurveyItem`, 0 interpolations of `q`, 0 `Logger` in the service, index in the data contract).

## E2E not run locally

Docker was not running and `api/.env.test` does not exist, so `migration-022-unaccent.e2e-spec.ts` and the migration 019/020/021 specs could not run here. They were only linted and type-checked (the lint and typecheck gates pass). The CI `e2e` job is their gate. Migration 022 inside the 019/020/021 scratch-schema specs: the extension is created `IF NOT EXISTS` in `public` and is already present from globalSetup, and the index is created in the scratch schema, so those specs should be unaffected; CI will confirm.

## unaccent for oe and ae (RESEARCH assumption A7)

Not verified against a live PostgreSQL. The e2e spec pins the expectation that PostgreSQL 16 `unaccent.rules` maps the ligatures to two letters ("oe", "ae"), the same as the phone. If CI shows otherwise, correct `FOLDED` in the spec and record the difference here.

## Deviations from Plan

None. The RED/GREEN steps were done inside each task and committed as one `feat` commit per task, as in plan 25-01.

## Notes for the next plans

- 25-13 must register `SearchService` in the surveys module and pass `@CurrentUser()` id as `userId`; the controller DTO must accept `q`, `author`, `limit`. The service answers empty for `q` under 2 trimmed characters (DTO counts raw characters).
- 25-10 can rely on `idx_parcels_commune_section_number`.
- Any query using `unaccent` needs migration 022 applied (the e2e globalSetup does it).
- `unaccent` is STABLE, not IMMUTABLE: it cannot back an expression index without a wrapper; not needed here.
- Members are not de-duplicated across case or accent variants of a display name.

## Known Stubs

None.

## Threat Flags

None (T-25-08 to T-25-12 mitigated as planned: bound parameters, predicate on both queries, no logger, extension pinned to public).

## Self-Check: PASSED

- FOUND: api/migrations/022_unaccent_search.sql, api/test/migration-022-unaccent.e2e-spec.ts, api/src/surveys/search.queries.ts, api/test/search.queries.spec.ts, api/src/surveys/search.service.ts, api/test/search.service.spec.ts
- FOUND commits: 72210c74, 1d618118, 8ebc0056
- NOT RUN: the e2e migration specs (no Docker locally); left to the CI e2e job
