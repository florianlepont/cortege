---
phase: 27-quick-survey-additions-inserted-v1
plan: 12
subsystem: api-weather
tags: [weather, meteofrance, provider, synop, apikey, dpobs]
requires:
  - phase: 27-06
    provides: "WeatherProvider seam, WeatherService, createWeatherProvider"
  - phase: 27-22
    provides: "real DPObs v2 captures and the spike README (units, parameters, caps, D-21 decisions)"
provides:
  - "MeteoFranceHttp / MeteoFranceHttpError: authenticated GET, whole-exchange timeout, errors with label and status only; modes apikey, bearer, application-id"
  - "MeteoFranceWeatherProvider: station list (CSV), hourly reading (Kelvin to C, m/s to km/h), SYNOP reports (sky from ww and n, rain over 24 h from rr24)"
  - "WeatherService second lookup (D-29): sky and rain over 24 h from the nearest SYNOP station within its own cap"
  - "AppConfig.weather.synopMaxDistanceKm (50 km), authMode; hourly cap default 30 km"
affects: [27-21]
tech-stack:
  added: []
  patterns: ["ES private fields for the credential and token", "optional readSynopReports on the provider seam"]
key-files:
  created:
    - api/src/surveys/meteofrance-http.ts
    - api/src/surveys/meteofrance-provider.ts
    - api/test/meteofrance-http.spec.ts
    - api/test/meteofrance-provider.spec.ts
  modified:
    - api/src/surveys/weather-provider.ts
    - api/src/surveys/weather.service.ts
    - api/src/surveys/weather-stations.ts
    - api/src/config/app-config.ts
    - api/src/config/config.types.ts
    - api/src/config/env.schema.ts
    - api/src/config/production-rules.ts
    - api/test/env.schema.spec.ts
    - api/test/weather-provider.spec.ts
    - api/test/weather.service.spec.ts
    - infra/vps/env.example
    - infra/vps/README.md
    - CLAUDE.md
    - docs/technical/api-contract-v1.md
    - api/test/fixtures/meteofrance/README.md
    - .planning/phases/27-quick-survey-additions-inserted-v1/27-CONTEXT.md
key-decisions:
  - "D-27 corrected: the portal API Key (3 years) in the apikey header is the production mode; bearer (1 h JWT) and application-id (plan B) stay"
  - "Mode chosen by the optional METEOFRANCE_AUTH_MODE, else by shape: JWT-shaped is sent as apikey, anything else read as an application id"
  - "D-29: two lookups; sky and rain over 24 h only from the nearest SYNOP station within 50 km, nulls stay null, no farther station fills them"
  - "Hourly cap default 30 km (README proposal; owner may switch to 25)"
  - "A SYNOP failure is a 503 like any provider failure"
requirements-completed: []
duration: ~3 h
completed: 2026-10-12
status: complete
---

# Phase 27 Plan 12: Real Météo-France provider Summary

`WEATHER_PROVIDER=meteofrance` now reads real Météo-France observations: temperature and wind from the nearest hourly stations, sky and rain over 24 h from the nearest SYNOP station, converted to degrees C, km/h and mm. Everything is proven on the owner's real captures and on a mocked `fetch`; no live call was made by me.

## What was built

- `meteofrance-http.ts`: `getJson` / `getText` over a fixed union of three endpoint paths, base URL from config only, `AbortSignal.timeout` on the whole exchange (body included), `redirect: "error"`. Errors read `meteofrance <label> returned HTTP <status>` (or `timed out`, `request failed`, `returned an unreadable answer`), never the URL, credential or token. An HTML page, even answered with 200 ("Request Rejected"), is a failure. Credential and token live in ES private fields. Modes:
  - `apikey` (production): secret in the `apikey` header, no renewal.
  - `bearer`: the one hour JWT as `Authorization: Bearer`.
  - `application-id` (plan B): Basic exchange on `https://portail-api.meteofrance.fr/token`, token cached in memory, renewed 60 s before expiry, concurrent requests share one exchange, one renewal on a 401, a second 401 rejects.
- `meteofrance-provider.ts`: `parseStationList` (CSV, delimiter `;` or `,`, quotes, BOM, decimal comma, ids kept as strings and short numeric ids zero-padded to 8, rows without a finite position skipped), `parseHourlyReading` (`t` minus 273.15, `ff` times 3.6, one decimal, `WEATHER_RANGES` filter, `observed_at` = `validity_time`, nearest row to the hour), `skyFromSynop`, `parseSynopReports` (one report per station, nearest to the hour, station and position from the row itself), and `MeteoFranceWeatherProvider` (`listStations`, `readHourly`, `readSynopReports`). An empty station list is thrown, never cached as "no station".
- Sky table (research A10, documented in the file): thunderstorm 17 and 95-99; snow 70-79, 85-86, 93-94; rain 50-69, 80-84, 91-92; fog 41-49 (40 excluded: fog at a distance). Any other `ww` falls back to `n` cut at oktas boundaries: up to 25 % clear, up to 50 % partly cloudy, up to 87.5 % cloudy, above overcast. Nothing known gives null (`nbas` is no substitute). Negative `rr24` (the `-0.1` trace) is read as 0 mm.
- `weather.service.ts`: when the provider has `readSynopReports`, the reports of the hour are cached by hour (24 h past, 10 min current or empty), the nearest SYNOP station within `synopMaxDistanceKm` whose report is inside the time tolerance is appended to the merge, and `no_station` is answered only when neither kind of station is in range (`no_data` when a SYNOP station is in range but unusable). Hourly stations stop being asked once temperature and wind are known.
- Config: hourly cap default 25 to 30 km; new `WEATHER_SYNOP_MAX_DISTANCE_KM` (50) and `METEOFRANCE_AUTH_MODE`. `createWeatherProvider` returns the provider for a real credential and null for blank or `CHANGE_ME`.
- Docs: `CLAUDE.md` (surveys row, API env table with the two caps, auth modes), `infra/vps/README.md` and `env.example` (API key, not application id), spike README Authentication section, 27-CONTEXT D-27 correction, SYNOP cap env name in the API contract.

## Task commits

| Task | Commit | Content |
|------|--------|---------|
| 1 | `f87a1afd` | HTTP helper and spec |
| 2 | `2b32a8eb` | provider, SYNOP lookup in the service, caps, factory branch |
| 2b | `05ab4c1b` | `apikey` mode and `METEOFRANCE_AUTH_MODE` (coordinator update) |
| 3 | `bccbe71c` | CLAUDE.md, VPS README, spike README, CONTEXT, contract |

## Deviations from Plan

1. **[Rule 2/3 - D-29 two lookups]** The plan assumed one hourly lookup. Following D-29 and the README, the `WeatherProvider` interface gained an optional `readSynopReports`, and `WeatherService` gained the second lookup. Because each SYNOP row carries its position, no separate `liste-stations-synop` call is made (that endpoint was never captured).
2. **[Coordinator update] apikey mode**: after the owner's API Key worked in the `apikey` header, `apikey` became the default for a JWT-shaped secret and the plan's "application-id" mode stayed as plan B. A selector was needed because the API key and the one hour token are both JWT-shaped. It is deliberately lenient (unknown value means auto), so no production rule and no `check-env.sh` change were needed.
3. **[Rule 1/2] Credential in private fields** (`#credential`, `#token`) so serialising or inspecting the provider cannot show them; found when a failing assertion printed the object.
4. **Hourly `n` and `rr1` are not read**: sky comes only from SYNOP (the hourly `n` was null in every capture and its unit is unverified); the plan's optional hourly-24 sum was rejected by the README.
5. **Wind stays on the hourly station** (D-29). The hourly `ff` was null in every capture, so wind will often be null; SYNOP wind as a fallback is still an open owner decision.
6. **Files outside the plan's list** were edited for coherence: `weather-stations.ts` (exported `inRange` and `Range`), `production-rules.ts` (exported `PLACEHOLDER_PREFIX`, reused by the factory), `infra/vps/env.example`, `infra/vps/README.md`, the fixtures README, 27-CONTEXT, the API contract.
7. **Global limiter not added**: the quota is still unreported by the owner; a quota refusal (429) already becomes the clean 503.

## Verification

Passing locally:
- New and touched specs: `meteofrance-http` (30 tests), `meteofrance-provider` (85, on the real fixtures), `weather-provider`, `weather.service` (SYNOP block of 10), `env.schema`: 298 tests across the weather and config specs. `weather.service.ts`, `weather-provider.ts`, `weather-stations.ts` at 100 %; `meteofrance-provider.ts` 100 % statements.
- `npm --workspace api run test:unit`: 52 of 53 suites, 1256 tests pass. The only failing suite is `check-env-parity.spec.ts` (50 tests), which fails on this Mac because `/bin/bash` is 3.2; it failed the same way before this plan. `infra/vps/check-env.sh` was not changed, `bash -n` passes.
- `npm run lint`, `npm run typecheck` (includes the API build): clean. `npm run format:check`: only the untracked `.claude/settings.local.json`.
- `npm run test:e2e`: 316 pass; the 3 known local failures only (migrate-lock twice, list-pagination first test).
- No em dash added (diff check count 0).

## Verified only against fixtures and mocks

- Mapping, units, caps and the service lookups: real captures from 2026-10-12 (the station CSV is rebuilt from `liste-stations.excerpt.json` with the real column names, because the raw CSV was not stored; its delimiter is auto-detected).
- Token flow (`application-id`): mocked token endpoint only. It needs the owner's application id to be proven (plan B; with the API key it is not on the production path).
- The `apikey` header and `bearer` header formats come from the owner's reports of the capture script, not from a call I made. Plan 27-21 must do the real end-to-end check with the API key on the VPS: station CSV parsing on the raw answer, the `synop` call with `date_debut` and `date_fin` (90 minute window, untested live; the answer size and the 4 s default timeout are untested), whether the hourly `date` parameter returns the requested hour from the VPS, and the 50 km SYNOP cap against the real density.

## Open points for the owner

- Hourly cap: 30 km set (README proposal); change to 25 with `WEATHER_MAX_STATION_DISTANCE_KM=25` if wanted.
- Wind from SYNOP when the hourly wind is null: not done.
- `METEOFRANCE_AUTH_MODE=bearer` is needed to try a one hour token locally.
- A SYNOP outage turns the whole lookup into a 503 (consistent with the contract); a degrade-to-hourly-only behaviour is possible if preferred.

## Known Stubs

None.

## Threat Flags

None beyond the threat model: T-27-38 (spec asserts marker credential, token and URL never appear in any rejection), T-27-39 (paths are a union, host from config, station ids guarded), T-27-40 (defensive parsing, unknown sky dropped, no raw object), T-27-41 (timeout, concurrency cap, 503) mitigated; T-27-42 unchanged (source `meteo_france`).

## Self-Check: PASSED (with the gaps listed above)

- Files found: `meteofrance-http.ts`, `meteofrance-provider.ts`, both new specs, the modified files listed in the frontmatter.
- Commits found in `git log`: `f87a1afd`, `2b32a8eb`, `05ab4c1b`, `bccbe71c`.
- Not verified, stated plainly: any live Météo-France call, the application-id flow against the real portal, `check-env-parity.spec.ts` (bash 3.2 here).
