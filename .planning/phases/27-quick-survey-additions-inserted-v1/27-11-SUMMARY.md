---
phase: 27-quick-survey-additions-inserted-v1
plan: 11
subsystem: api
tags: [survey-write-path, survey-note, weather, sync, cas, e2e]
requires:
  - phase: 27-05
    provides: "Migration 023 columns, upsert DTO fields, read-only and same-version comparison of note and weather"
provides:
  - "survey_note and weather stored at the four survey write sites (fast-path create and update CTEs, locked insert and draft update)"
  - "D-04 rules: absent key keeps the stored value, explicit null clears"
  - "survey_note and weather on GET /v1/surveys/:id"
  - "surveys-note-weather.e2e-spec.ts: round trip, same-version, installed app, submitted, validation, event journal"
affects: [27-12, 27-17]
tech-stack:
  added: []
  patterns:
    - "Fast-path parameters $26 survey_note and $27 weather; the xmin CAS token moved to $28"
    - "weatherParameter(): a bound JSON string or null for the jsonb parameter"
key-files:
  created:
    - api/test/surveys-note-weather.e2e-spec.ts
  modified:
    - api/src/surveys/surveys.repository.ts
    - api/src/surveys/surveys.service.ts
    - api/test/surveys-upsert-fast-path.spec.ts
key-decisions:
  - "D-01: both columns are written by every draft write path; the restricted update of a submitted survey does not write them (the 27-05 read-only check refuses a changed value first)"
  - "D-04: body.survey_note === undefined keeps existing.survey_note, null clears; same for weather. Create stores body value or null"
  - "Survey events keep their payload (sync_version, site_name, warnings): no free text enters the journal"
requirements-completed: []
duration: 30 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 11: API write sites and round-trip e2e Summary

The survey note and the weather are now stored at all four survey write sites of the API and returned by `GET /v1/surveys/:id`, with the D-04 rules (absent keeps, null clears, same-version compare, submitted read-only) proven end to end on both `POST /v1/surveys` and `POST /v1/sync`.

## What was built

- **Repository** (`surveys.repository.ts`): `SurveyFastWriteInput` gains `surveyNote` and `weather`; `fastWriteValues` appends them as `$26` (text) and `$27` (JSON string or null), so a create binds 27 parameters and an update 28 with the CAS token last (`xmin = $28::xid`). `CREATE_SURVEY_ATOMIC_SQL` lists `survey_note, weather`; `UPDATE_SURVEY_IF_UNCHANGED_SQL` sets them. Values are bound, never interpolated.
- **Service** (`surveys.service.ts`): fast create stores `body.survey_note ?? null` and `body.weather ?? null`; fast update and locked update use the undefined-keeps rule against the stored row; the locked insert adds `$23::text, $24::jsonb`; the locked draft update adds `survey_note = $20::text, weather = $21::jsonb`; the restricted submitted update and `upsertEventPayload` are untouched; `getSurveyById` returns `survey_note` and `weather`. All three read paths feeding the comparison are `SELECT *`, so no explicit SELECT needed new columns.
- **Tests**: the pinned parameter numbering and lengths in `surveys-upsert-fast-path.spec.ts` were updated first (red) then the code; six new unit tests cover the keep, clear and replace rules at the fast and locked sites and the untouched restricted update. The new e2e suite has 18 tests: round trip on both entry points (nested weather through `/v1/sync`, Pitfall 2), annotation-only factors accepted (Pitfall 1), keep / clear / replace on a higher version, identical replay with no write and no new event, 409 `sync_version_conflict` for a changed note, weather or annotation (both entry points), installed-app body never conflicts, submitted survey 409 `survey_submitted_read_only` listing `survey_note`, `weather`, `factors` and an identical resend accepted, bounds (1001-character note, sky, temperature, annotation key, 301-character factor note: `invalid_sync_operation`; undeclared weather key 400), and no note text in `survey_events.payload`.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 + 2 | 351f9a17 | feat(27-11): store the survey note and weather at the four survey write sites |
| 3 | 0b7ce913 | test(27-11): prove note, weather and annotations end to end on both entry points |

## Verification

- `npx jest --runInBand -c jest.unit.config.js test/surveys-upsert-fast-path.spec.ts test/surveys.repository.spec.ts` pass (29 and the repository suite); the Task 2 command (`npm run build` and three unit suites) passes.
- E2E: `surveys-note-weather`, `surveys-same-version`, `sync-installed-app-compat`, `surveys-submit` pass (40 tests) against `ibp_test`.
- `npm run test:e2e`: 43 of 46 suites pass; see Deferred Issues for the three that fail.
- `npm run lint`, `npm run typecheck` pass; `npm --workspace api run test:unit`: 50 of 51 suites (only the known `check-env-parity`); `npm run format:check` reports only `.claude/settings.local.json`.
- Acceptance greps: `xmin = $28::xid` and `$27::jsonb` present, `xmin = $26::xid` count 0, `body.survey_note === undefined` count 2, `survey_note: survey.survey_note` present, 18 `it(` in the new e2e (12 required).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tasks 1 and 2 committed together**
- **Found during:** Task 1
- **Issue:** `SurveyFastWriteInput` now requires `surveyNote` and `weather`, so the service no longer compiled until Task 2, and ts-jest type-checks the service imported by the Task 1 spec. A Task 1-only commit would not build.
- **Fix:** one commit for both tasks (351f9a17); TDD order kept (expectations changed and seen failing before the SQL).
- **Commit:** 351f9a17

**2. [Rule 2 - Missing coverage] Unit tests for the locked write sites**
- **Found during:** Task 3
- **Issue:** the locked insert and draft update only run on a race or a missed CAS, so the e2e suite does not reach them deterministically.
- **Fix:** added unit tests that run the locked transaction callback against a fake queryable and assert the parameters and SQL, including that the restricted submitted update does not mention the new columns.
- **Files modified:** `api/test/surveys-upsert-fast-path.spec.ts`
- **Commit:** 0b7ce913

### Notes

- The e2e payloads omit `location` (the suite uses `configureApp`, whose whitelist rejects it with 400); the submitted survey is created with a resolved parcel, year and version number instead.
- The plan lists `api/test/surveys.repository.spec.ts` among the files to update; it needed no change (it does not pin fast-path values).

### Deferred Issues (out of scope, not caused by this plan)

- `api/test/debug-surface.e2e-spec.ts` (4 tests): "Configuration de production refusée : WEATHER_PROVIDER". The production rules for the weather config block were added by plan 27-04 (`548ac157`); the production-mode e2e does not set `WEATHER_PROVIDER`. Needs a fix in a config-owning plan or in that spec's environment.
- `api/test/migrate-lock.e2e-spec.ts` (2 tests): `permission denied to create database`; the local `ibp` role lacks CREATEDB. Environment, CI runs it.
- `api/test/list-pagination.e2e-spec.ts` (1 test, events tiebreak): compares `created_at` as the text `2024-05-02 07:00:00+00`, which depends on the local PostgreSQL session time zone. Not touched by this plan (no events or list code changed); I did not re-run it on the previous commit, so "unrelated" is by reading, not by a baseline run.
- `api/test/check-env-parity.spec.ts` fails on this Mac (bash 3.2); known.

## Known Stubs

None.

## Threat Flags

None. T-27-34 (bound parameters, `sql-no-unsafe-interpolation` lint green), T-27-35 (event payload unchanged, e2e asserts no note text), T-27-36 (every statement keeps its `user_id` predicate, no new route) and T-27-37 (undefined keeps, e2e) are mitigated as planned.

## Self-Check: PASSED

- File present: `api/test/surveys-note-weather.e2e-spec.ts`
- Commits present in `git log`: 351f9a17, 0b7ce913
- Gates run: lint, typecheck, api unit tests, targeted e2e suites, full e2e (three failing suites documented above as outside this plan), format:check (only the local settings file)
