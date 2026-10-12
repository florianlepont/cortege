---
phase: 27-quick-survey-additions-inserted-v1
plan: 07
subsystem: mobile-storage
tags: [sqlite, survey-note, weather, conditions, sync-pull, local-meta]
requires: ["27-02"]
provides:
  - "SurveyQueuePayload.survey_note and weather (payload only), ConditionsPatch"
  - "stampWeatherRequest (pure) and the requested_at stamp at createLocalDraft / updateLocalDraft"
  - "patchLocalSurveyConditions: guarded, draft-only conditions write"
  - "listLocalSurveyNotes: own-note reader for the search (json_extract)"
  - "storage/weather.ts: weather_point:<SURVEY_ID> store and listWeatherCandidates"
affects: [27-09, 27-10, 27-11, 27-15]
tech-stack:
  added: []
  patterns: ["payload-only fields, no SQLite migration (user_version stays 5)", "one shared writeDraftPayload so the stored counters are recomputed in one place", "SQL json_valid/json_type guards before any JS parse"]
key-files:
  created:
    - mobile/src/storage/weather.ts
    - mobile/src/storage/weather.sqlite.test.ts
    - mobile/src/storage/surveys.conditions.sqlite.test.ts
  modified:
    - mobile/src/storage/types.ts
    - mobile/src/storage/utils.ts
    - mobile/src/storage/surveys.ts
    - mobile/src/storage/sync.ts
    - mobile/src/storage/sync.pull.sqlite.test.ts
key-decisions:
  - "D-02: note and weather live in payload_json; SCHEMA_VERSION stays 5 (asserted by a test)"
  - "D-03: patchLocalSurveyConditions re-reads status inside the transaction and returns null for a non-draft"
  - "D-10/D-11: requested_at is stamped once, by the first write that takes parcel_ids from empty to non-empty"
  - "writeDraftPayload extracted from updateLocalDraft and shared with the conditions write"
requirements-completed: []
duration: 35 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 07: Phone storage for note, weather and conditions Summary

The phone now stores a survey note and a weather in the draft payload, stamps the survey time once when a parcel is first chosen, writes the Conditions section only into drafts, keeps both fields through autosave and pull, exposes the own notes for search, and holds the weather lookup point and the catch-up candidates in `local_meta`. SQLite stays at version 5.

## What was built

- `types.ts`: `survey_note` and `weather` on `SurveyQueuePayload`; `ConditionsPatch` (a weather may be a function of the stored weather, for the late-answer merge).
- `utils.ts`: pure `stampWeatherRequest(previous, next, current, nowIso)`, which only acts when parcels go from none to some and no `requested_at` exists.
- `surveys.ts`: `createLocalDraft` and `updateLocalDraft` stamp `weather.requested_at` (a payload without weather stays without the key); the form autosave keeps the stored note and weather through the payload spread; new private `writeDraftPayload` (queue replace + row update + both counters), used by `updateLocalDraft` and the new `patchLocalSurveyConditions`; new `listLocalSurveyNotes`; `clearLocalIbpData` deletes the `weather_point:` prefix.
- `sync.ts`: `buildSurveyPayloadFromRemote` copies `survey_note` and `weather` (insert and update branches both use it). `cacheSurveyCanonicalFields` and the other writers already spread the stored payload, so no further change was needed.
- `weather.ts`: `WEATHER_POINT_KEY_PREFIX`, `saveWeatherPoint` (4 decimals, best-effort), `loadWeatherPoint` (defensive parse), `listWeatherCandidates` (drafts with a text `weather.requested_at`, guarded in SQL, parsed in JS only for those rows).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | ad93ffb4 | feat(27-07): add survey note and weather to the draft payload with a guarded conditions write |
| 2 | bb0203dc | feat(27-07): keep the pulled note and weather and add the own-note reader |
| 3 | 31bd4c86 | feat(27-07): add the local weather point store and the catch-up candidates |

## Verification

- `npx jest -c jest.unit.config.js src/storage --coverage=false`: 31 suites, 420 tests pass (real SQLite harness).
- `npm --workspace mobile run test:unit:coverage`: 331 suites, 4461 tests pass, coverage ratchet holds.
- `npm run lint`, `npm run typecheck` clean; `npm run format:check` reports only the local untracked `.claude/settings.local.json`.
- Counter parity (Pitfall 10) is proven at create, update, conditions write and both pull branches against twin payloads without the new fields.

## Deviations from Plan

### Auto-fixed Issues

None. One note on method: the three tasks touch `surveys.ts` in overlapping places, so the commits were assembled by committing each task's subset of the file in turn (each commit passes its own task's verify command), not by writing the file three times.

The tests were written alongside the code in one pass rather than as separate RED commits; the plan's `tdd="true"` red/green commit split was not produced for these storage tasks.

### Deferred Issues (out of scope)

- `api/test/check-env-parity.spec.ts` fails on this Mac (bash 3.2), as briefed; not touched.

## Known Stubs

None. `listLocalSurveyNotes` and `listWeatherCandidates` have no caller yet by design: plan 27-15 (search) and the weather catch-up plans consume them.

## Threat Flags

None. T-27-22 is mitigated (status re-read inside the transaction, tested with a submitted survey), T-27-23 (`clearLocalIbpData` deletes the `weather_point:` prefix, tested, and survey rows with their notes), T-27-24 (`json_valid` / `json_type` guards, `safeParseJson` + `isSurveyQueuePayload`, invalid rows skipped, tested).

## Self-Check: PASSED

- Files present: `mobile/src/storage/weather.ts`, `weather.sqlite.test.ts`, `surveys.conditions.sqlite.test.ts`
- Commits present in `git log`: ad93ffb4, bb0203dc, 31bd4c86
- Acceptance greps: `patchLocalSurveyConditions`, `stampWeatherRequest`, `SCHEMA_VERSION = 5`, `survey_note: survey.survey_note ?? undefined`, `weather: survey.weather ?? undefined`, `listLocalSurveyNotes`, `WEATHER_POINT_KEY_PREFIX = "weather_point:"` and its use in `surveys.ts`
- STATE.md and ROADMAP.md diffs limited to this plan's progress (counters, checkbox, last activity)
