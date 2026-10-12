---
phase: 27-quick-survey-additions-inserted-v1
plan: 05
subsystem: api
tags: [migration, dto, validation, sync, read-only, body-limit, survey-note, weather]
requires:
  - phase: 27-02
    provides: "SURVEY_NOTE_MAX_LENGTH, WEATHER_* constants, factorAnnotationsIssues, SurveyWeather and SurveyUpsertPayload wire types"
provides:
  - "Migration 023: nullable surveys.survey_note and surveys.weather with three validated CHECK constraints"
  - "SurveyUpsertDto.survey_note, SurveyUpsertDto.weather (nested SurveyWeatherDto) and the FactorAnnotationsConstraint on factors"
  - "SurveyRow.survey_note and SurveyRow.weather (optional)"
  - "survey_note and weather in the submitted read-only and same-version comparison"
  - "JSON_BODY_LIMIT = 2mb applied by configureApp"
affects: [27-06, 27-11, 27-17]
tech-stack:
  added: []
  patterns:
    - "Nested DTO with every key declared, so /v1/sync (whitelist strips undeclared nested keys) keeps the overwrite-guard fields"
    - "class-validator constraint that only delegates to a package validator (no shape rule in api)"
key-files:
  created:
    - api/migrations/023_survey_note_weather.sql
    - api/test/migration-023-survey-note-weather.e2e-spec.ts
    - api/src/surveys/dtos/survey-weather.dto.ts
    - api/src/surveys/dtos/factor-annotations.constraint.ts
    - api/test/survey-upsert.dto.spec.ts
  modified:
    - api/src/surveys/dtos/survey-upsert.dto.ts
    - api/src/surveys/surveys.types.ts
    - api/src/surveys/surveys-normalize.utils.ts
    - api/test/surveys-normalize.utils.spec.ts
    - api/src/app.setup.ts
    - api/test/app-setup.spec.ts
key-decisions:
  - "D-01: nullable columns like 016, constraints added NOT VALID then validated, no backfill, no two-step migration"
  - "D-04: survey_note compared by strict string equality, weather by deep equality, annotations ride on the existing factors deep comparison; absent or null is never a change"
  - "D-25: JSON body limit 2 MB, applied with app.useBodyParser before the global pipes"
  - "Pitfall 8: SurveyPatchBody and SurveyPatchDto unchanged; a local SubmittedReadOnlyField union adds the two upsert-only keys"
requirements-completed: []
duration: 25 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 05: API storage contract for note, weather and annotations Summary

The API can now store, validate and compare a survey note, a nested weather and the `factors.annotations` container on both `POST /v1/surveys` and `POST /v1/sync`, and it no longer refuses a large sync batch: migration 023, the upsert DTO fields, the read-only and same-version rules, and a 2 MB JSON body limit.

## What was built

- **Migration 023** (`api/migrations/023_survey_note_weather.sql`): `survey_note TEXT` and `weather JSONB`, nullable, no default, no index, no backfill. Three guarded constraints added `NOT VALID` then validated: `chk_surveys_survey_note_length` (at most 1000 characters), `chk_surveys_weather_object` (jsonb object), `chk_surveys_weather_size` (at most 2048 bytes as text). Its scratch-schema e2e builds the 001..022 shape, seeds a draft and a submitted survey, lets the real runner apply 023 only, and proves nullable columns, NULL rows, validated constraints, the bounds (1001 characters rejected with 23514, array and oversize weather rejected), a no-op second runner pass and a no-op raw second execution.
- **DTOs**: `SurveyWeatherDto` declares every weather key (sky, the three numeric values with the package `WEATHER_RANGES`, ISO `observed_at` and `requested_at`, source, `edited` capped at the editable-key count). `SurveyUpsertDto` gains `survey_note` (string, max 1000), `weather` (`@ValidateNested` + `@Type`) and `@Validate(FactorAnnotationsConstraint)` on `factors`. The constraint calls `factorAnnotationsIssues` from the package on `value.annotations` and has a constant message, so no note text is echoed. `SurveyRow` gets optional `survey_note` and `weather`.
- **Comparison**: `getChangedSubmittedReadOnlyFields` lists `survey_note` (strict `!==`, no trimming server side) and `weather` (`jsonDeepEqual`, key order irrelevant); `classifySameVersionContent` therefore answers `conflict` for a changed note and `identical` for a replay carrying note, weather and annotations. A changed doubt or factor note is reported as `factors`.
- **Body limit**: `JSON_BODY_LIMIT = "2mb"` exported from `app.setup.ts`, applied with `app.useBodyParser("json", { limit })` before the global pipes.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | d8b5cd72 | feat(27-05): add migration 023 for survey note and weather columns |
| 2 | ea9a75d3 | feat(27-05): validate survey note, nested weather and factor annotations |
| 3 | 9f4b5196 | feat(27-05): compare note and weather as read-only and raise the JSON body limit |

## Verification

- `api/test/migration-023-survey-note-weather.e2e-spec.ts`: 9 tests pass against `ibp_test`. Surveys e2e suites `surveys-idempotency`, `surveys-submit`, `surveys-method-version` (30 tests) still pass with the new body parser and DTO.
- `api/test/survey-upsert.dto.spec.ts` (new), `surveys-normalize.utils.spec.ts` and `app-setup.spec.ts` pass; `npm --workspace api run test:unit`: 46 of 47 suites pass.
- `npm run lint`, `npm run typecheck` (includes the api build) pass; `npm run format:check` reports only `.claude/settings.local.json`, the local untracked file outside this plan.
- Acceptance greps: `ADD COLUMN IF NOT EXISTS` x2, `VALIDATE CONSTRAINT` x3, one `023_` file, `@ValidateNested()` and `@Type(() => SurveyWeatherDto)` present, `factorAnnotationsIssues` in the constraint, `WEATHER_RANGES` in the weather DTO, `"survey_note",` and `case "weather"` in normalize utils, `JSON_BODY_LIMIT = "2mb"` and `useBodyParser` in app.setup. `git diff origin/main -- api/src/surveys/dtos/survey-patch.dto.ts` is empty.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Weather DTO property types narrowed to the package types**
- **Found during:** Task 2 (api build)
- **Issue:** `SurveyWeatherDto` declared `sky`, `source` and `edited` as plain `string` types, so `SurveyUpsertDto` was no longer assignable to `SurveyUpsertPayload` in `surveys.controller.ts` (TS2345).
- **Fix:** typed them `WeatherSkyCode | null`, `WeatherSource | null` and `WeatherEditableKey[]` (type imports from the package). Runtime validation is unchanged.
- **Files modified:** `api/src/surveys/dtos/survey-weather.dto.ts`
- **Commit:** ea9a75d3

**2. [Rule 3 - Blocking] Migration test search_path includes public**
- **Found during:** Task 1
- **Detail:** the scratch connection sets `search_path` to the scratch schema then `public` (the 016 test used the scratch schema alone), so migration 022 (`unaccent`, installed in `public` by globalSetup) replays cleanly in the scratch schema. The runner itself is still pinned to the scratch schema alone. Tables are created in the scratch schema because it comes first.

### Notes

- The plan's behaviour list says the 1.5 MB body is "answered 201 or 200"; the test pins 201 (the echo route is a `@Post()`).
- TDD order in Tasks 2 and 3: the specs were written first and confirmed failing (Task 2 failed to compile before the DTO existed), but each task is a single commit rather than separate RED and GREEN commits, because the plan is `type: execute`.

### Deferred Issues (out of scope)

- `api/test/check-env-parity.spec.ts` fails on this Mac (bash 3.2 has no `declare -A`); CI on Linux runs it. Unrelated to this plan.

## Known Stubs

None. `SurveyRow.survey_note` and `weather` are declared but not yet read or written by the SQL; plan 27-11 writes them at the four write sites and plan 27-17 adds them to the reads, as the plan states.

## Threat Flags

None beyond the plan's register. T-27-09 (nested DTO, package validator, jsonb CHECKs), T-27-10 (max length 1000, CHECK, 2 MB body with batch cap 100), T-27-12 (read-only list) and T-27-13 (property names only, constant constraint message) are mitigated as planned; T-27-11 holds because no SQL string is built from input here.

## Self-Check: PASSED

- Files present: `api/migrations/023_survey_note_weather.sql`, `api/test/migration-023-survey-note-weather.e2e-spec.ts`, `api/src/surveys/dtos/survey-weather.dto.ts`, `api/src/surveys/dtos/factor-annotations.constraint.ts`, `api/test/survey-upsert.dto.spec.ts`
- Commits present in `git log`: d8b5cd72, ea9a75d3, 9f4b5196
- Gates run: lint, typecheck, api unit tests (only the known `check-env-parity` suite fails), migration e2e and three survey e2e suites, format:check (only the local settings file)
