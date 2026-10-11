---
phase: 27-quick-survey-additions-inserted-v1
plan: 17
subsystem: api
tags: [sync-changes, community-survey, parcel-history, survey-note, weather, factor-annotations, account-deletion, e2e]
requires:
  - phase: 27-05
    provides: "Migration 023 columns survey_note and weather, wire types (CommunitySurveyDetail, CommunitySurveyHistoryItem, SyncChangeSurvey)"
  - phase: 27-11
    provides: "Write sites storing survey_note, weather and factors.annotations"
provides:
  - "survey_note and weather on every survey of GET /v1/sync/changes (factors already carry the annotations)"
  - "survey_note, weather and sanitised factor_annotations on GET /v1/public/community-surveys/:id, and survey_note on its history items"
  - "survey_note on the items of GET /v1/parcels/:parcelId/surveys/history"
  - "e2e proof for the owner feed, another member, a draft (404) and the retention of notes after the author deletes the account"
affects: [27-18, 27-19, 27-20]
tech-stack:
  added: []
  patterns:
    - "factors -> 'annotations' selected as its own column and passed through readFactorAnnotations({ annotations }) before leaving the API (empty result becomes null)"
key-files:
  created: []
  modified:
    - api/src/surveys/surveys-sync.service.ts
    - api/src/surveys/community-surveys.service.ts
    - api/src/surveys/parcels.service.ts
    - api/test/surveys-sync.service.spec.ts
    - api/test/community-surveys.service.spec.ts
    - api/test/parcels.service.spec.ts
    - api/test/surveys-note-weather.e2e-spec.ts
    - api/test/community-survey-detail.e2e-spec.ts
    - api/test/parcel-history.e2e-spec.ts
key-decisions:
  - "D-06, D-13: no WHERE clause or predicate changed; PUBLIC_SURVEY_PREDICATE and the parcel history filter (status submitted, not deleted) already hide drafts, so the new columns inherit the visibility"
  - "D-24: nothing is nulled on account deletion; the retained submitted survey keeps note, weather and annotations, author_name reads null"
  - "T-27-58: factor_annotations is sanitised in the service (A to J, true doubt or non-blank note); an empty container is returned as null"
requirements-completed: []
duration: 25 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 17: Changes feed, community and history reads, retention on account deletion Summary

Every API read that carries a survey now returns the new fields to the readers allowed to see them: the changes feed gives a reinstall or a second device the note and the weather back, the community detail gives other members the note, the weather and the sanitised doubt/notes of a finished survey, and the community and parcel histories carry the note.

## What was built

- **Changes feed** (`surveys-sync.service.ts`): `loadSyncChangeSurveys` selects `s.survey_note, s.weather` and maps them to `null` when absent. The `WHERE s.user_id = $1` predicate is untouched. `factors` already contained `annotations`.
- **Community detail** (`community-surveys.service.ts`): the detail SELECT adds `survey_note`, `weather` and `s.factors -> 'annotations' AS factor_annotations`. The result returns `survey_note`, `weather` and `factor_annotations` run through `readFactorAnnotations({ annotations })` (null when nothing remains). The history SELECT and items add `survey_note`. Both WHERE clauses still use `PUBLIC_SURVEY_PREDICATE` and `submitted_at IS NOT NULL`; `public-map.queries.ts` is unchanged.
- **Parcel history** (`parcels.service.ts`): `getParcelSurveyHistory` selects `s.survey_note`; the submitted-only filter is unchanged.
- **Unit specs** (written first, seen failing): the changes feed selects and passes through note and weather (with the `s.user_id` predicate), the detail sanitises annotations (drops `Z`, `doubt: false`, blank notes and extra keys), returns null when empty, carries history notes, and keeps the predicate text; the parcel history selects `survey_note` and keeps its filter.
- **E2E**: `/v1/sync/changes` returns note, weather and annotations (null for a bare survey); another member reads a submitted survey's note, weather and `{ A: { doubt, note } }` with notes on the history items; a draft is 404 and absent from the history, and its note never appears in the member's response; the parcel history items carry `survey_note`; after `DELETE /v1/me` of the author, a second member still reads the note, weather and factor notes with `author_name` null (D-24).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 13fa7104 | feat(27-17): return the survey note, weather and factor annotations from the changes feed and the community detail |
| 2 | 825a5ce4 | feat(27-17): return survey_note on the parcel history and prove the reads end to end |

## Verification

- `npx jest --runInBand -c jest.unit.config.js test/surveys-sync.service.spec.ts test/community-surveys.service.spec.ts test/parcels.service.spec.ts`: pass.
- E2E `surveys-note-weather`, `community-survey-detail`, `parcel-history`: 28 tests pass against `ibp_test`.
- `npm run test:e2e`: 44 of 46 suites pass (316 tests pass, 3 skipped). The failing ones are the known local limits: `migrate-lock` (2 tests) and `list-pagination` (first test). The `debug-surface` suite listed as failing in the 27-11 summary passes now.
- `npm run lint`, `npm run typecheck` pass; `npm --workspace api run test:unit`: 50 of 51 suites (only the known `check-env-parity`, bash 3.2); `npm run format:check` reports only `.claude/settings.local.json`.
- Acceptance greps: `factor_annotations` and `readFactorAnnotations` in `community-surveys.service.ts`; `survey_note` count 2 in `surveys-sync.service.ts` and 3 in `parcels.service.ts`; `git diff origin/main -- api/src/surveys/public-map.queries.ts` is empty.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Consistency] Explicit null mapping in the changes feed**
- **Found during:** Task 1
- **Issue:** the plan's acceptance criterion expects two `survey_note` occurrences in `surveys-sync.service.ts` (SELECT and mapping), but `loadSyncChangeSurveys` returned the rows as they came, so only the SELECT mentioned it.
- **Fix:** added a small `rows.map` giving `survey_note ?? null` and `weather ?? null`; the existing unit expectation `result.surveys` was updated to include the two null keys.
- **Files modified:** `api/src/surveys/surveys-sync.service.ts`, `api/test/surveys-sync.service.spec.ts`
- **Commit:** 13fa7104

Otherwise the plan was executed as written.

## Known Stubs

None.

## Threat Flags

None. T-27-56 (predicates unchanged, e2e asserts 404 for a draft and a submitted-only history), T-27-58 (annotations sanitised before leaving the API, unit tested) and T-27-59 (owner route unchanged) are mitigated; T-27-57 is accepted per D-24 and proven by the retention e2e. Documentation of the retention in the data contract stays with plan 27-20.

## Self-Check: PASSED

- Files present: the nine modified files above and this summary.
- Commits present in `git log`: 13fa7104, 825a5ce4.
- Gates run: lint, typecheck, api unit tests, targeted e2e suites, full e2e (two failing suites are the documented local limits), format:check (only the local settings file).
