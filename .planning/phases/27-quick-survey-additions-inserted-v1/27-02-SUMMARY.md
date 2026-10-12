---
phase: 27-quick-survey-additions-inserted-v1
plan: 02
subsystem: domain
tags: [ibp-domain, contract, survey-note, weather, factor-annotations, parity]
requires: []
provides:
  - "@cortege/ibp-domain conditions: note limits, weather constants, normalizeNoteText, readFactorAnnotations, canonicalFactorAnnotations, withFactorAnnotations, factorAnnotationsIssues"
  - "Wire types SurveyWeather, WeatherObservation, WeatherResponse and related, FactorAnnotation(s)"
  - "survey_note and weather on SurveyUpsertPayload, SurveyDetail, SyncChangeSurvey; survey_note, weather, factor_annotations on CommunitySurveyDetail; survey_note on CommunitySurveyHistoryItem"
  - "Parity pairs MAT-ANN-01..03@both"
affects: [27-03, 27-04, 27-05, 27-06, 27-07, 27-08, 27-12]
tech-stack:
  added: []
  patterns: ["annotations container beside the factor keys, outside FACTOR_KEYS, so no scorer reads it", "parity fixture run through the package, the API adapter and the mobile adapter with no runner change"]
key-files:
  created:
    - packages/ibp-domain/src/conditions.ts
    - packages/ibp-domain/src/conditions.test.ts
    - packages/ibp-domain/src/contract/weather.ts
  modified:
    - packages/ibp-domain/src/contract/survey.ts
    - packages/ibp-domain/src/contract/sync.ts
    - packages/ibp-domain/src/contract/public-map.ts
    - packages/ibp-domain/src/contract/index.ts
    - packages/ibp-domain/src/index.ts
    - packages/ibp-domain/src/parity/cases.ts
    - packages/ibp-domain/src/evaluate.test.ts
    - docs/technical/ibp-validation-matrix-v2.md
key-decisions:
  - "D-23: doubt and note live in factors.annotations; the package owns the reader, canonicaliser and validator"
  - "D-14: no scorer, readiness or rule file changed; MAT-ANN cases pass because evaluateIbp iterates FACTOR_KEYS only"
  - "factorAnnotationsIssues returns each issue code once and rejects note: null as annotations_note_not_string (the canonicaliser never writes null)"
requirements-completed: []
duration: 25 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 02: Shared contract for notes, weather and factor annotations Summary

The shared contract of phase 27 now lives once in `@cortege/ibp-domain`: constants and pure helpers for notes, weather and the `factors.annotations` container, the wire types of the new survey fields and of `GET /v1/weather`, and three parity pairs proving a doubt or a factor note never moves a score.

## What was built

- `packages/ibp-domain/src/conditions.ts` (100 % covered): `SURVEY_NOTE_MAX_LENGTH` 1000, `FACTOR_NOTE_MAX_LENGTH` 300, `FACTOR_ANNOTATIONS_KEY`, the eight sky codes, weather sources, editable keys, numeric ranges (temperature -40..55, wind 0..350, rain 0..1000), `WEATHER_LOOKBACK_MS` (24 h), `isWeatherSkyCode`, `normalizeNoteText`, `readFactorAnnotations`, `canonicalFactorAnnotations`, `withFactorAnnotations`, `factorAnnotationsIssues`. The factor-key list is imported from `factors.ts`, not copied. All re-exported from the package entry.
- `contract/weather.ts` (new, types only): `WeatherSkyCode`, `WeatherSource`, `WeatherEditableKey`, `SurveyWeather`, `WeatherObservation`, `WeatherNoObservationReason`, `WeatherResponse`, `WeatherErrorCode`.
- `contract/survey.ts`, `sync.ts`, `public-map.ts`: optional `survey_note` and `weather` on upsert, detail and sync-change types; `factor_annotations` on the community detail; `survey_note` on the community history item; `FactorAnnotation(s)`. `SurveyPatchPayload` is unchanged (a comment says so, Pitfall 8).
- Parity: `MAT-ANN-01..03@both` in `IBP_PARITY_CASES` (submit with doubt and notes, C draft with a doubt, annotations alone with no scored factor), a with-and-without-container equality loop in `evaluate.test.ts`, and an "Annotation cases (phase 27)" section in matrix v2.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 2 (done first, Task 1 needs its types) | 2a9cb388 | feat(27-02): add wire types for survey note, weather and factor annotations |
| 1 RED | 9219a19f | test(27-02): add failing tests for conditions helpers |
| 1 GREEN | d5a85968 | feat(27-02): add conditions helpers for notes, weather and factor annotations |
| 3 | 69476ab9 | test(27-02): add MAT-ANN parity pairs proving annotations never move a score |

## Verification

- `npm --workspace @cortege/ibp-domain run test:coverage`: 269 tests, 100 % statements, branches, functions, lines
- `api/test/ibp-parity.spec.ts` (78 tests) and `mobile/src/app/ibp-parity.test.ts` (90 tests) pass with the new cases and no runner change
- `npm run typecheck` and `npm run lint` clean
- `git diff origin/main -- evaluate.ts readiness.ts rules` is empty: no scorer file changed
- `npm run format:check` reports only `.claude/settings.local.json` (a local settings file, not part of this plan). The new matrix Markdown file is outside the Prettier glob.
- Docker was not needed: this plan has no database part.

## Deviations from Plan

### Order of tasks

Task 2 (types) was committed before Task 1, as the plan itself allows ("do Task 2's type additions first if the compiler needs them"). No other deviation. The MAT-ANN-02 expected C score differs per version (v3.0 gives 0, v3.2 gives 1, mirroring MAT-VER-01), so its builder sets the score by suffix; this is what the hand-worked source case says, not a deviation from the intent.

### Deferred Issues (out of scope)

- `npm run test:unit` shows `api/test/check-env-parity.spec.ts` failing (34 tests: the API side of the check exits with status 2 where the shell script exits 0). The plan touches nothing near `check-env.sh` or the production config check, so it was not investigated or fixed. It was not compared against a clean `main` run; treat it as pre-existing until someone confirms. All other suites pass (45 of 46 api and mobile suites, the package's 10 of 10).

## Known Stubs

None.

## Threat Flags

None. The new validator (`factorAnnotationsIssues`) is the mitigation of T-27-04 (strict shape, 300-character cap, every branch tested); T-27-05 is mitigated by the container sitting outside `FACTOR_KEYS` with parity proof in three suites; T-27-06 by the clamp in `normalizeNoteText` (the API DTO cap arrives in plan 27-05).

## Self-Check: PASSED

- Files present: `packages/ibp-domain/src/conditions.ts`, `conditions.test.ts`, `contract/weather.ts`
- Commits present in `git log`: 2a9cb388, 9219a19f, d5a85968, 69476ab9
- Acceptance greps: `SURVEY_NOTE_MAX_LENGTH = 1000`, `FACTOR_NOTE_MAX_LENGTH = 300`, `factorAnnotationsIssues`, `from "./conditions"` in the entry, `FACTOR_KEYS` in `conditions.ts`, `survey_note?: string | null` twice in `survey.ts`, `factor_annotations?: FactorAnnotations | null` in `public-map.ts`, 6 `MAT-ANN-0[123]@both` lines in `cases.ts`, 4 `MAT-ANN-0` lines in the matrix
