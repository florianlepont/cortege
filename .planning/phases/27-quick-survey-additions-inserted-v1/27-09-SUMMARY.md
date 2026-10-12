---
phase: 27-quick-survey-additions-inserted-v1
plan: 09
subsystem: mobile-app
tags: [weather, prefill, merge, edit-guard, catch-up, api-client, pure-functions]
requires:
  - phase: 27-02
    provides: "SurveyWeather, WeatherObservation, WeatherResponse, WEATHER_EDITABLE_KEYS, WEATHER_RANGES, WEATHER_LOOKBACK_MS, isWeatherSkyCode"
  - phase: 27-03
    provides: "fr.conditions (sky labels, weather.parts line builders)"
provides:
  - "mobile/src/app/weather.ts: the app's weather rules, pure and tested (parse, format, merge, edit, refill, canonical form, lookup need, view state, attribution)"
  - "mobile/src/api/weather-api.ts: fetchWeather, the GET /v1/weather client"
affects: [27-13, 27-16, 27-18, 27-19]
tech-stack:
  added: []
  patterns: ["one pure module for a feature's behaviour, read by hook, section, card and PDF", "canonical form applied on the phone before write so a replay compares equal (Pitfall 4)"]
key-files:
  created:
    - mobile/src/app/weather.ts
    - mobile/src/app/weather.test.ts
    - mobile/src/api/weather-api.ts
    - mobile/src/api/weather-api.test.ts
  modified: []
key-decisions:
  - "D-10 and U-02: a provider answer fills only values that are empty and not in edited; a cleared value counts as edited"
  - "D-21: 'a provider answer merged' is source === meteo_france, set even when every value was protected or the provider gave no sky, so the catch-up never loops"
  - "Rounding is half away from zero (like toFixed), never -0, so -3.25 gives -3,3 and a replay compares equal"
  - "canonicalWeather omits an empty edited list and keeps explicit nulls (a cleared value is not an absent one)"
requirements-completed: []
duration: 30 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 09: App weather rules and the weather API client Summary

The app's weather behaviour is now defined once, as pure tested functions in `mobile/src/app/weather.ts`, with a thin `fetchWeather` client for `GET /v1/weather`, so the prefill hook (27-13), the PDF (27-16), the Conditions section (27-18) and the summary card (27-19) share the same merge, edit guard, refill, 24 h window, seven display states and attribution rule.

## What was built

- `weather.ts` (no React Native, no storage; imports only the package, the catalogue and nothing else):
  - Formats: `formatWeatherNumber` (French comma, one decimal), `formatWeatherLine` (sky, temperature, wind, rain through the `fr.conditions` parts; an unknown stored sky code is skipped), `formatObservationTime`, `parseObservationTimeInput` ("1430", "14:30", "14h30", " 9:05 "), `withObservationTime` (typed time on the local date of the base), `parseWeatherValueInput` (comma or point, range from `WEATHER_RANGES`, empty clears, anything else is `{ error: "range" }`), `roundWeatherCoordinate` (four decimals).
  - State rules: `mergeWeatherObservation` (per value, protects present and edited values, drops an unknown sky code, rounds, marks the source), `editWeatherValue` (adds to `edited` in canonical order, source stays `meteo_france` or becomes `manual`), `resetWeatherForRefill` (keeps `requested_at` only), `canonicalWeather`, `needsWeatherLookup` (24 h, source, all-edited), `weatherViewState` (seven states, never an error), `hasWeatherValues`, `weatherProvenance` (prefilled, edited, manual, for the read-only source line), `showsProviderAttribution` (D-26).
- `weather-api.ts`: `fetchWeather(apiUrl, accessToken, { lat, lng, at })` through `apiRequest`, coordinates rounded to four decimals, `at` URL-encoded, Bearer token. `ibp-api.ts` untouched (still 400 lines).

## Notes for the plans that consume this

- `weatherViewState` takes the hook's `unavailable` flag but does not need it: with no value on screen, a parcel, a network and no request in flight, the answer is `unavailable` either way. Values on screen win over every other condition (a request in flight or a lost connection never hides them). With no parcel but typed values the state is `manual`; with every provider value cleared by the observer it stays `edited` (the refill link remains reachable).
- `canonicalWeather` returns null when there is neither `requested_at` nor any of the five editable values; callers write that as an absent weather. It omits `edited` when empty, so 27-13 should read `weather.edited ?? []`. `resetWeatherForRefill` still returns `edited: []` explicitly; pass it through `canonicalWeather` before writing.
- `editWeatherValue` takes a number for the three numeric keys, a sky code for `sky` and an ISO string for `observed_at`; anything else becomes a clearing. Parse the typed text first with `parseWeatherValueInput` and `parseObservationTimeInput` / `withObservationTime`.
- `mergeWeatherObservation` fills `observed_at` from the station reading unless the observer set the time. The survey's own time stays in `requested_at`, which the merge keeps.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 RED | edfc9e30 | test(27-09): add failing tests for the app weather rules |
| 1 GREEN | 0df6faed | feat(27-09): add the app weather rules |
| 2 | 68ba44b6 | feat(27-09): add the GET /v1/weather client |

## Verification

- `weather.test.ts`: 46 tests, `weather.ts` at 100 % statements, branches, functions and lines
- `weather-api.test.ts`: 4 tests (path and query, token, rounding, typed body with an empty answer, 503 rejection)
- `npm --workspace mobile run test:unit:coverage`: 334 suites, 4532 tests pass, coverage ratchets hold
- `npm run lint`, `npm run typecheck` (mobile) clean; `npm run format:check` reports only `.claude/settings.local.json` (local file, not part of the repo)
- Acceptance greps: the three exported functions, 0 `from "react-native"` in `weather.ts`, `WEATHER_LOOKBACK_MS` used, `export async function fetchWeather`, `ibp-api.ts` at 400 lines
- Docker and the API tests were not needed: no API change

## Deviations from Plan

### Auto-fixed Issues

None for correctness. Two small choices the plan left open:

- `parseWeatherValueInput` uses a strict pattern then `Number(...)` instead of `parseFiniteNumberInput`, because that shared parser accepts forms such as "1e2" that the UI-SPEC range rule must refuse. The comma-to-point step is the same.
- Task 2 had no separate RED commit: its test and client were written back to back and committed together (Task 1 has the RED and GREEN pair).

## Known Stubs

None. The functions are not read by a screen yet; that is the job of 27-13, 27-16, 27-18 and 27-19.

## Threat Flags

None. T-27-28 (overwrite of the observer's values) is mitigated by the per-value merge and tested for edited, cleared, present and fully-protected cases; T-27-29 by dropping unknown sky codes, rounding, and range-checking typed values; T-27-30 is accepted as planned (only a 4-decimal parcel centre is sent).

## Self-Check: PASSED

- Files present: `mobile/src/app/weather.ts`, `mobile/src/app/weather.test.ts`, `mobile/src/api/weather-api.ts`, `mobile/src/api/weather-api.test.ts`
- Commits present in `git log`: edfc9e30, 0df6faed, 68ba44b6
