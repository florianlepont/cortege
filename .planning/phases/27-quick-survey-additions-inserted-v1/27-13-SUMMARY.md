---
phase: 27-quick-survey-additions-inserted-v1
plan: 13
subsystem: mobile-app
tags: [weather, prefill, catch-up, offline, draft-patcher, surveys-context, narrow-context]
requires:
  - phase: 27-07
    provides: "patchLocalSurveyConditions, listWeatherCandidates, loadWeatherPoint/saveWeatherPoint, the requested_at stamp"
  - phase: 27-08
    provides: "form context pattern for annotations (unchanged here)"
  - phase: 27-09
    provides: "mergeWeatherObservation, needsWeatherLookup, resetWeatherForRefill, canonicalWeather, fetchWeather"
provides:
  - "SurveyActions.updateSurveyNote and updateSurveyWeather (silent, draft-only writes)"
  - "useWeatherPrefill: app-level lookup and catch-up, called once by useAppController"
  - "weather-context.ts: WeatherPrefillProvider, useWeatherPrefillState (narrow context)"
  - "SurveyParcelSelectionScreen onSave(weatherPoint) and the rememberPoint handoff in ParcelSelectionRoute"
affects: [27-16, 27-18, 27-19, 27-21]
tech-stack:
  added: []
  patterns: ["app-level hook with its own narrow context (like useNearbyParcels)", "single-flight pass with a queued re-run instead of an interval timer", "settled window (60 min) for an empty provider answer, unavailable set for rejections"]
key-files:
  created:
    - mobile/src/hooks/useWeatherPrefill.ts
    - mobile/src/hooks/useWeatherPrefill.test.ts
    - mobile/src/state/weather-context.ts
    - mobile/src/screens/SurveyParcelSelectionScreen.test.tsx
  modified:
    - mobile/src/hooks/useSurveyDraftPatcher.ts
    - mobile/src/hooks/useSurveyDraftPatcher.test.ts
    - mobile/src/state/surveys-context.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/state/contexts.test.tsx
    - mobile/src/state/render-counts.test.tsx
    - mobile/src/screens/SurveyParcelSelectionScreen.tsx
    - mobile/src/navigation/routes/ParcelSelectionRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
key-decisions:
  - "D-10/D-11/D-20: one app-level pass over listWeatherCandidates, filtered by needsWeatherLookup, asking for each draft's own requested_at (never the reconnection time)"
  - "A 200 without observation settles the survey for WEATHER_SETTLED_RETRY_MS (60 min), even across network changes; a rejection goes to unavailableIds and is retried only on network back, foreground, retry() or a new explicit action"
  - "A list change retries nothing that was rejected; only a network return or foreground clears unavailableIds (no storm, no timer)"
  - "Errors reach logStatusDetail as a kind only (status code or 'request failed'), never the token or the point (T-27-45)"
  - "rememberPoint is fired after a successful save and not awaited, so the weather lookup never delays the navigation"
requirements-completed: []
duration: 55 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 13: App-level weather prefill and silent conditions writes Summary

The weather now fills itself: `useWeatherPrefill` (called once by `useAppController`) asks the Cortege API for each draft's weather at parcel choice and again when the network or the foreground returns, for the survey's own time within 24 h, merges per value without touching hand edits, and writes through two silent, draft-only actions (`updateSurveyNote`, `updateSurveyWeather`).

## What was built

- **Draft patcher and surveys context.** `handleUpdateSurveyNote` (`normalizeNoteText` with `SURVEY_NOTE_MAX_LENGTH`, an emptied note is stored as `null`) and `handleUpdateSurveyWeather` (`canonicalWeather(update(current))` inside the storage function) both go through `patchLocalSurveyConditions`, refresh the local list once, post no status message, resolve `false` for a submitted survey (storage returned `null`) and log through `logStatusDetail` on an error. They bypass `patchSurveyDraftDirectly`. Published as `SurveyActions.updateSurveyNote` / `updateSurveyWeather` through `useStableActions`.
- **`useWeatherPrefill`.** `WEATHER_SETTLED_RETRY_MS`, `WeatherPrefillState` (`inFlightIds`, `unavailableIds`), `WeatherPrefillActions` (`rememberPoint`, `retry`, `refill`). One single-flight pass (a trigger during a run queues exactly one more run, requests are sequential): candidates from `listWeatherCandidates`, filtered by `needsWeatherLookup`, not in flight, not unavailable, not settled; the point from `loadWeatherPoint`, else the centre of the cached parcel geometry (`getCachedParcelById` + `cachedParcelCentre`), else nothing and no error; `fetchWeather(..., at: weather.requested_at)`; an observation is merged by `updateSurveyWeather(id, mergeWeatherObservation)`. Triggers: a new token or a change of the drafts' `id:updated_at` signature, the online flag going false to true, and `AppState` returning to `active`. No timer. No request without a token or while offline.
- **`weather-context.ts`** (`WeatherPrefillProvider`, `useWeatherPrefillState`) next to `NearbyParcelsProvider`; the hook is called once in `useAppController` after the draft patcher; `useSurveySync` is still called once.
- **Parcel-centre handoff.** `SurveyParcelSelectionScreen` calls `onSave(cachedParcelCentre(parcelStatuses, selectedParcelIds))`; `ParcelSelectionRoute` reads `state.editingSurveyId` before the save and, after a successful wizard `createDraft` or edit `saveSurveyEdits`, calls `rememberPoint(id, point)`. Navigation is unchanged. The rare path with no editing id gets no stored point and falls back to the cached geometry (commented in the route).

## Commits

| Step | Commit | Message |
|------|--------|---------|
| 1 RED | ab90b2c4 | test(27-13): add failing tests for the silent note and weather writes |
| 1 GREEN | 8a7c1770 | feat(27-13): add silent note and weather writes to the draft patcher and surveys context |
| 2 RED | cd103a35 | test(27-13): add failing tests for the weather prefill hook |
| 2 GREEN | 5901f99b | feat(27-13): add the app-level weather prefill hook with its narrow context |
| 3 | 49e4fccb | feat(27-13): hand the centre of the chosen parcels to the weather hook |

## Verification

- Task commands: `useSurveyDraftPatcher.test.ts` + `src/state` + `routes.test.tsx`; `useWeatherPrefill.test.ts` + `src/state`; `routes.test.tsx` + `src/__checks__`: all pass.
- `npm --workspace mobile run test:unit:coverage`: 338 suites, 4585 tests pass, coverage ratchets hold.
- `npm --workspace mobile run typecheck` and `npm --workspace mobile run lint` clean; `npm run format:check` reports only the local untracked `.claude/settings.local.json` (ignored by instruction).
- Acceptance greps: `useWeatherPrefill(` appears once and `useSurveySync(` once in `AppStateProvider.tsx`; 0 `setInterval` in the hook; `SurveyParcelSelectionScreen.tsx` is 355 lines (cap 400).
- New tests: 8 patcher cases, 17 hook cases (fetch for `requested_at`, offline catch-up, 24 h / provider-filled / all-edited skips, geometry fallback, rejection and retry, no retry on a list change, settled window, `rememberPoint`, `refill`, single-flight, silent storage failure, stable actions), a real-assembler test that an in-flight request changes only the weather context value, two route cases and two screen cases for the point.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Storage mock added to the render-count and context harnesses**
- **Found during:** Task 2
- **Issue:** the real assembler now calls `listWeatherCandidates`, which reached the harnesses' throwing `getDb` mock and flooded the log with caught errors.
- **Fix:** `jest.mock("../storage/weather")` returning no candidates in `render-counts.test.tsx`; the same plus a controllable candidate and a pending `fetchWeather` in `contexts.test.tsx`, where it also backs the new in-flight test. Neither file was in `files_modified`.
- **Commit:** 5901f99b

**2. [Rule 2 - Coverage] Screen test for the point handoff**
- The plan's behaviour "on save, the screen calls onSave(point)" had no test home (the screen is mocked in `routes.test.tsx`). Added `mobile/src/screens/SurveyParcelSelectionScreen.test.tsx` with stubbed map, card and sheets. **Commit:** 49e4fccb

### Notes

- The plan asked for fixture mocks of the two new actions in `routes.test.tsx`; the fixture builds surveys actions through `actionsProxy`, so no change was needed there. `routes.test.tsx` did get a weather context fixture and an `editingSurveyId` option for Task 3.
- The hook test drives the online flag through a mocked `useIsOffline` and the foreground through a mocked `AppState`, instead of the expo-network store: a store test would start from the store's initial "online" value and race the first lookup.
- Known limit: the network store starts at "online" until its first probe, so an app started offline can fire one lookup that fails silently and lands in `unavailableIds` until the network-back or foreground trigger. No error is shown.
- Device check of the offline catch-up stays with plan 27-21, as planned.

## Known Stubs

None. `retry` and `refill` have no caller yet by design: the Conditions section (27-18) and the summary card (27-19) consume them.

## Threat Flags

None. T-27-43 (write into a submitted survey) is mitigated by `patchLocalSurveyConditions` re-reading the status in its transaction and candidates being drafts only (tested: a refused write resolves `false`, a refill with a refused write does not fetch); T-27-44 (request storm) by sequential single-flight passes, the 60 min settled window, no timer and no automatic retry of rejections on a list change; T-27-45 by logging only a kind of failure; T-27-46 by no request when the access token is null (tested).

## Self-Check: PASSED

- Files present: `mobile/src/hooks/useWeatherPrefill.ts`, `mobile/src/hooks/useWeatherPrefill.test.ts`, `mobile/src/state/weather-context.ts`, `mobile/src/screens/SurveyParcelSelectionScreen.test.tsx`
- Commits present in `git log`: ab90b2c4, 8a7c1770, cd103a35, 5901f99b, 49e4fccb
- Acceptance greps: `handleUpdateSurveyNote` / `handleUpdateSurveyWeather` in the patcher, `updateSurveyNote` in the surveys context, `export function useWeatherPrefillState`, `cachedParcelCentre` in the screen, `rememberPoint` in the route
