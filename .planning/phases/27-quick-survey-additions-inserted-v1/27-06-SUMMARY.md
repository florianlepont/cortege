---
phase: 27-quick-survey-additions-inserted-v1
plan: 06
subsystem: api-weather
tags: [weather, api, endpoint, throttle, cache, synthetic-provider, meteofrance-seam]
requires:
  - phase: 27-02
    provides: "WeatherObservation, WeatherResponse, WeatherSkyCode, WEATHER_RANGES, WEATHER_LOOKBACK_MS, isWeatherSkyCode in @cortege/ibp-domain"
  - phase: 27-04
    provides: "AppConfig.weather (provider, timeoutMs, maxStationDistanceKm, timeToleranceMinutes) and WEATHER_PROVIDER=synthetic in api/test/setup-env.js"
provides:
  - "GET /v1/weather?lat&lng&at behind AuthGuard and its own weather throttle (30 per minute per client in production)"
  - "WeatherProvider interface (listStations, readHourly), WEATHER_PROVIDER_TOKEN, SyntheticWeatherProvider, createWeatherProvider(config) with the meteofrance case left for plan 27-12"
  - "Pure station logic: haversineKm, rankStations, nearestUtcHour, isWithinTolerance, mergeStationReadings, roundOneDecimal"
  - "WeatherService.lookup with cache by station and UTC hour, in-flight de-duplication, concurrency cap 4, provider timeout, 24 h window and 503 weather_provider_unavailable"
affects: [27-09, 27-12, 27-20]
tech-stack:
  added: []
  patterns: ["geocoder pattern reused: LRUCache + in-flight Map + running counter, success-only cache", "cache values boxed ({ value }) so a null reading is a cacheable answer", "log label is the provider status or the error name, never the error message"]
key-files:
  created:
    - api/src/surveys/weather-stations.ts
    - api/src/surveys/weather-provider.ts
    - api/src/surveys/weather.service.ts
    - api/src/surveys/weather.controller.ts
    - api/src/surveys/dtos/weather-query.dto.ts
    - api/test/weather-stations.spec.ts
    - api/test/weather-provider.spec.ts
    - api/test/weather.service.spec.ts
    - api/test/weather.controller.spec.ts
    - api/test/weather.e2e-spec.ts
  modified:
    - api/src/surveys/surveys.module.ts
    - api/src/common/rate-limit.config.ts
    - api/test/rate-limit.config.spec.ts
key-decisions:
  - "D-08: the app reaches the provider only through the Cortege API; every provider failure, 429 included, is the same 503 { code: weather_provider_unavailable }"
  - "D-19: at most three stations within the configured cap, merged value by value in distance order; the lookup stops asking further stations once sky, temperature, wind and rain are all known"
  - "D-20: a time older than 24 h answers too_old before any provider call (checked before the disabled switch); a future or unreadable time is clamped to now"
  - "Pitfall 6: a reading whose own observed_at is more than the tolerance from the requested time is ignored; out-of-range values are dropped by the merge"
  - "The service also bounds every provider call with the configured timeout (unref'd timer), so a hung provider cannot hold a concurrency slot indefinitely"
patterns-established:
  - "A provider converts to app units and returns WeatherReading; the service and the merge never see provider field names"
requirements-completed: []
duration: ~45 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 06: GET /v1/weather on the synthetic provider Summary

An authenticated member can now ask the API for the observed weather at a point and a time. The API answers from the nearest stations through a provider seam, with a shared cache, de-duplication, a concurrency cap, a 24 hour window and a clean 503. The synthetic and off modes work with no network; the Météo-France provider plugs into the same interface in plan 27-12.

## What was built

- `weather-stations.ts` (pure, no Nest import): great-circle distance on a 6371 km sphere, `rankStations` (cap and limit use the exact distance, the output is rounded to one decimal), `nearestUtcHour` (half an hour rounds up), `isWithinTolerance` (false for an unreadable time), and `mergeStationReadings` (each value from the nearest station that has a usable one, kept only inside `WEATHER_RANGES` and one decimal, `sky` only when it is a catalogue code, `observed_at` and `station` from the nearest contributor, null when nothing contributed). `roundOneDecimal` never returns negative zero.
- `weather-provider.ts`: the `WeatherProvider` interface, `WEATHER_PROVIDER_TOKEN`, a `SyntheticWeatherProvider` (12 stations `SYN-001..012` over mainland France, one in Fontainebleau; readings derived from an FNV-1a hash of station id and hour, so the same input always gives the same output, values inside the ranges, sky from the catalogue), and `createWeatherProvider` (null for `off`, synthetic for `synthetic`, null plus a one-time warn for `meteofrance` until plan 27-12).
- `weather.service.ts`: `lookup({ lat, lng, at })` with the order: clamp the time, `too_old`, `disabled`, stations (cached 1 h), `no_station`, then the reading of the nearest UTC hour for each ranked station (cached by station id and hour: 24 h for a finished hour, 10 minutes for the current hour, 10 minutes for an empty hour), tolerance check, merge, `no_data` when nothing is left. Exports `MAX_CONCURRENT_WEATHER_CALLS = 4` and the TTL constants.
- `weather-query.dto.ts` and `weather.controller.ts`: `lat` and `lng` as bounded numbers, `at` optional ISO 8601 up to 40 characters; one `@Get()` handler under `@UseGuards(AuthGuard)` and `@Throttle(WEATHER_THROTTLE)` that only delegates.
- `rate-limit.config.ts`: `weather: 30` in `PRODUCTION_THROTTLE_LIMITS` and `WEATHER_THROTTLE`.
- `surveys.module.ts`: `WeatherController`, `WeatherService` and the provider registered under `WEATHER_PROVIDER_TOKEN` through `createWeatherProvider(appConfigOf(config).weather)`.

## Task commits

| Task | Commit | Content |
|------|--------|---------|
| 1 | `92f8714e` | pure station logic, provider seam, synthetic provider, two specs |
| 2 | `c4e0b386` | WeatherService and its spec (25 cases) |
| 3 | `e9e1d997` | DTO, controller, throttle kind, module wiring, controller spec, rate-limit spec, e2e |

## Verification

Run locally and passing:
- `npx jest --runInBand -c jest.unit.config.js` on the five unit specs of the plan: pass. The three new `weather*` source files are at 100 % branches and functions, 100 % statements after the added non-Error rejection case.
- `npx jest -c jest.config.js --runInBand test/weather.e2e-spec.ts` against the local PostgreSQL 16 `ibp_test` database: 10 of 10 pass (401 without a token, observation with source `meteo_france` and values inside the ranges, the same body twice, now by default, `too_old` at 25 h, `no_station` far from any station, 400 for lat 95, lng -181, a non-ISO time and missing coordinates).
- Whole API unit suite minus `check-env-parity.spec.ts` (bash 3.2 on this Mac): 50 suites, 1110 tests pass. The `./src/surveys/` and `./src/common/` coverage ratchets pass.
- `npm run lint`, `npm run typecheck`, `npm --workspace api run build`: clean. `npm run format:check`: only the untracked local `.claude/settings.local.json` is flagged.
- All acceptance greps of the three tasks pass (`rankStations`, `mergeStationReadings`, `WEATHER_PROVIDER_TOKEN`, `SyntheticWeatherProvider`, zero `@nestjs` import in `weather-stations.ts`, `weather_provider_unavailable`, `MAX_CONCURRENT_WEATHER_CALLS = 4`, `WEATHER_LOOKBACK_MS`, `@Throttle(WEATHER_THROTTLE)`, `@UseGuards(AuthGuard)`, `weather: 30`, `WeatherController`).

Not verified here:
- The `./src/config/` coverage ratchet reads 95.89 % (needs 96) when `check-env-parity.spec.ts` is excluded. This is the limitation already recorded in 27-04 (its fixtures run only on Linux CI); this plan touches nothing in `src/config/`.
- A real Météo-France call: none exists yet (plan 27-12).

## Deviations from Plan

### Added (Rule 2 - missing critical functionality)

**1. [Rule 2] Provider call timeout inside the service**
- **Found during:** Task 2
- **Issue:** the plan lists a concurrency cap but a provider call that never settles would hold one of the four slots forever and, after four such calls, turn every lookup into a 503 until restart. `AppConfig.weather.timeoutMs` exists for this.
- **Fix:** `callProvider` races the load against a `settings.timeoutMs` timer (unref'd, cleared in `finally`); the timeout is logged as `TimeoutError` and becomes the same 503. The Météo-France provider of plan 27-12 may add its own abort on top.
- **Files modified:** `api/src/surveys/weather.service.ts`, `api/test/weather.service.spec.ts` (timeout case)
- **Commit:** `c4e0b386`

### Choices within the plan's freedom

- `too_old` is checked before `disabled`, as the plan's action text orders them; so an `off` server answers `too_old` for a 25 hour old time and `disabled` otherwise. Both are 200 with no observation.
- If a provider fails on any one station of the up-to-three, the whole lookup is a 503 (the plan: "any thrown error"); no partial answer is built from the stations that did answer.
- `.git` was not a worktree-agent branch here (`claude/magical-wright-7df74e`); the sequential-mode instruction to commit on the current branch was followed, so the worktree-agent branch-name assertion of the generic protocol was not applied.

### Known gap (not caused by this plan)

- `api/.env.example` still lacks the weather lines (recorded in 27-04); nothing here depends on it.

## Threat model

- T-27-17 (anonymous use): mitigated. `@UseGuards(AuthGuard)`; spec asserts the guard metadata and the e2e asserts 401.
- T-27-18 (quota exhaustion): mitigated. Per-client throttle 30 per minute in production (spec asserts the metadata and the value), shared cache by station and hour, in-flight de-duplication, concurrency cap 4, provider timeout, and no provider call for a time older than 24 h (spec asserts neither `listStations` nor `readHourly` is called).
- T-27-19 (SSRF): mitigated. The query carries only a bounded latitude, longitude and an ISO time (DTO spec); the service builds no URL, station ids come from the provider's own list. The outbound host comes from config only and is used by plan 27-12.
- T-27-20 (location in logs): mitigated. The log label is `stations` or `reading` plus the provider status or the error name, never the message; the spec feeds an error whose message carries the coordinates, the time and a key and asserts none of them is logged.
- T-27-21 (stale reading stored): mitigated. 90-minute tolerance on the reading's own time (two specs), 24 hour window, out-of-range values dropped by the merge.

## Known Stubs

The `meteofrance` case of `createWeatherProvider` returns null and warns once ("needs the Météo-France provider of plan 27-12"). This is intentional and planned: the real provider is built in plan 27-12 on the owner's spike fixtures, and until then `WEATHER_PROVIDER=meteofrance` answers `disabled` (never invented weather). Production refuses `synthetic`, so no invented value can reach a production survey.

## Threat Flags

None. The only new network surface is the planned authenticated route.

## Self-Check: PASSED (with the gaps listed above)

- Files exist: the ten created files and three modified files listed in the frontmatter (`[ -f ... ]` checked).
- Commits exist: `92f8714e`, `c4e0b386`, `e9e1d997` found in `git log`.
- Not verified, stated plainly: the `./src/config/` ratchet without Linux CI, and any real provider call.
