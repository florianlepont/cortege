---
phase: 30-route-choice-assistant-inserted-v1
plan: 07
subsystem: api
tags: [postgres, migration, nestjs, class-validator, survey-route]
requires:
  - phase: 30-02
    provides: validated route spec (section 8)
  - phase: 30-03
    provides: "validateSurveyRoute, route constants and SurveyRoute wire type in @cortege/ibp-domain"
provides:
  - "Migration 025: nullable jsonb surveys.survey_route with object and 4096-byte size checks"
  - "SurveyRouteDto family and SurveyRouteConstraint (package-backed) on SurveyUpsertDto.survey_route"
  - "SurveyRow.survey_route, read-only after submit and same-version comparison"
affects: [30-09, 30-10, 30-23]
tech-stack:
  added: []
  patterns: ["Phase 27 weather pattern reused: every nested key declared, constant constraint message, jsonDeepEqual"]
key-files:
  created:
    - api/migrations/025_survey_route.sql
    - api/test/migration-025-survey-route.e2e-spec.ts
    - api/src/surveys/dtos/survey-route.dto.ts
    - api/src/surveys/dtos/survey-route.constraint.ts
  modified:
    - api/src/surveys/dtos/survey-upsert.dto.ts
    - api/src/surveys/surveys.types.ts
    - api/src/surveys/surveys-normalize.utils.ts
    - api/test/survey-upsert.dto.spec.ts
    - api/test/surveys-normalize.utils.spec.ts
key-decisions:
  - "Migration number is 025: after git fetch, no 025 to 029 file exists on origin/main, any remote branch or any local branch"
  - "The nested DTOs use loose numeric bounds (0 to the package maximum); the strict rules (above 0, rounded to 2 decimals, total not below the zone) stay in the package validator run by the class constraint, so they are written once"
patterns-established:
  - "survey_route absent or null is never a change; a different value on a submitted survey is"
requirements-completed: [REQ-C-route-record]
duration: 25min
completed: 2026-10-14
status: complete
---

# Phase 30 Plan 07: API storage contract of the recorded route Summary

**Nullable checked jsonb column `surveys.survey_route` (migration 025), nested request validation backed by the package validator `validateSurveyRoute`, and read-only-after-submit comparison that never lets a null erase a route.**

## Performance

- **Duration:** about 25 min
- **Completed:** 2026-10-14
- **Tasks:** 3 of 3
- **Files:** 4 created, 5 modified

## Accomplishments

- Migration `025_survey_route.sql`: `ADD COLUMN IF NOT EXISTS survey_route JSONB`, checks `chk_surveys_survey_route_object` and `chk_surveys_survey_route_size` (at most 4096 bytes), each added NOT VALID then validated inside guarded blocks. No backfill: a survey stored before the phase stays valid without a route (O-07). Its e2e test builds the pre-025 shape in a scratch schema (migrations 001 to 024) and lets the real runner apply 025, then checks column type and nullability, NULL on existing rows, both checks, and that a second runner pass and a raw second execution change nothing.
- `SurveyRouteDto`, `SurveyRouteComplementDto`, `SurveyRouteGuideDto`, `SurveyRouteSuggestionDto`, `SurveyRouteAnswersDto`: every key of spec section 8 declared, enums from the package constants (`ROUTE_METHODS`, `COUNTING_MODES`, `UNCAPPABLE_FACTORS`, `ROUTE_HOMOGENEITY_VALUES`, `ROUTE_EXPERIENCE_VALUES`, `ROUTE_CHOSEN_BY_VALUES`), bounds from `ROUTE_SURFACE_MAX_HA` and `ROUTE_HOURS_MAX`, `@Equals(SURVEY_ROUTE_VERSION)`. `SurveyRouteConstraint` runs `validateSurveyRoute` on a present value with the constant message "survey_route is invalid". `SurveyUpsertDto.survey_route` is optional and nullable.
- `getChangedSubmittedReadOnlyFields` reports `survey_route` through `jsonDeepEqual` (key order irrelevant); absent or null body value is never a change; `classifySameVersionContent` follows, so an identical replay is "identical" and a different route is a "conflict".

## Task Commits

1. Task 1, migration 025 and its e2e test: `5262d22b`
2. Task 2, nested DTOs, constraint, upsert field and DTO spec: `09476ec9`
3. Task 3, row type, read-only rule, same-version rule and normalize spec: `8bdca686`

Tasks 2 and 3 were written test first (RED confirmed by the compile failure on the missing field, then green); each task is one commit rather than a test/feat pair.

## Verification

- `npx jest -c jest.config.js test/migration-025-survey-route.e2e-spec.ts`: 10 of 10 passed against the local Homebrew PostgreSQL 16 (`ibp_test`).
- E2E regression: all `test/migration*` specs and `test/surveys-idempotency.e2e-spec.ts` (12 suites, 95 tests) passed against the same database, so the new column does not break the existing write paths.
- API unit tests: 56 of 57 suites pass (1392 tests). The only failure is `test/check-env-parity.spec.ts`, the known bash 3.2 failure on this Mac that CI runs under bash 4; unrelated.
- `survey-upsert.dto.spec.ts`: 68 passed; `surveys-normalize.utils.spec.ts`: 127 passed.
- `npm run lint` and `npm run typecheck` pass; `npm run build` in `api` passes. `prettier --check` is clean for every file of this plan; the only flagged files (`api/eslint-local-rules/sql-no-unsafe-interpolation.js`, `api/jest.unit.config.js`, two README files) are pre-existing and not touched here.
- The full e2e suite (`npm run test:e2e`) was not run; only the specs listed above were.

## Deviations from Plan

None to a rule. Two small clarifications:

- The plan's migration test template wording ("alter the 023 template") was followed; the pre-migration filter compares against `025_survey_route.sql`, so the test stays valid when a later migration is added.
- The DTO numeric bounds are `@Min(0)` rather than "above 0": the strict "above 0, rounded to two decimals, total not below the zone" rules are the package validator's, applied by the class constraint, so no copy of the rule lives in the API. A zone of 0 is rejected through the constraint (tested).

## Known Stubs

None.

## Threat Flags

None. All five threats of the plan (T-30-14 to T-30-18) are mitigated: read-only rule with deep equality and null never a change, all nested keys declared (stripped on /sync, rejected on POST /v1/surveys, both tested), size bounded in the DTO, package validator and database check, constant constraint message that echoes no value (tested), and no dynamic SQL in the migration. The parameterised write path itself is plan 30-09.

## Notes for next plans

- Plan 30-09 must write and read the column at every site; the restricted UPDATE used for submitted surveys must not gain it.
- Plan 30-10 decides whether a route is required (from `X-Cortege-Features`); this plan accepts both absent and null.
- Plan 30-23 (docs) must name migration 025 and the `chk_surveys_survey_route_*` constraints.
- A legacy submitted survey without a route that receives a replay carrying a route is reported as a read-only change (409 on the same version), the same behaviour as note and weather.

## Self-Check: PASSED

Files verified present: `api/migrations/025_survey_route.sql`, `api/test/migration-025-survey-route.e2e-spec.ts`, `api/src/surveys/dtos/survey-route.dto.ts`, `api/src/surveys/dtos/survey-route.constraint.ts`. Commits `5262d22b`, `09476ec9`, `8bdca686` exist on the branch.
