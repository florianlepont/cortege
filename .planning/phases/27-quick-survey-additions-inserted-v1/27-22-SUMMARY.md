---
phase: 27-quick-survey-additions-inserted-v1
plan: 22
subsystem: docs
tags: [meteofrance, spike, weather, fixtures, api-contract, dpobs]
requires:
  - phase: 27-01
    provides: "capture script api/scripts/meteofrance-spike.mjs"
  - phase: 27-06
    provides: "weather service limits (cache TTLs, MAX_CONCURRENT_WEATHER_CALLS, weather throttle)"
  - phase: 27-20
    provides: "GET /weather section of the API contract, written from the synthetic contract"
provides:
  - "Real DPObs v2 captures as fixtures (stations excerpt, hourly recent and old, SYNOP sample) plus the official swagger"
  - "Spike README: auth, endpoints, parameters, fields and units, retention, station density, distance caps, D-21 decisions, quota, licence"
  - "27-RESEARCH.md assumptions A1 to A6, A9 marked against the spike"
  - "Spike paragraph of GET /weather in the API contract (caps, provider-filled values, units, retention)"
affects: [27-12, 27-21]
tech-stack:
  added: []
  patterns: ["spike facts carry a provenance tag (observed, reported, documented, to be confirmed by the owner)"]
key-files:
  created:
    - api/test/fixtures/meteofrance/README.md
    - api/test/fixtures/meteofrance/liste-stations.excerpt.json
    - api/test/fixtures/meteofrance/station-horaire.recent.json
    - api/test/fixtures/meteofrance/station-horaire.old.json
    - api/test/fixtures/meteofrance/synop.sample.json
    - api/test/fixtures/meteofrance/dpobs-v2.swagger.json
  modified:
    - .planning/phases/27-quick-survey-additions-inserted-v1/27-RESEARCH.md
    - .planning/phases/27-quick-survey-additions-inserted-v1/27-CONTEXT.md
    - docs/technical/api-contract-v1.md
key-decisions:
  - "Hourly station cap proposed at 30 km (default of WEATHER_MAX_STATION_DISTANCE_KM); the 25 km of D-29 leaves the Landes test point empty by 0.13 km. Awaiting the owner"
  - "Sky and rain over 24 h are both prefilled from the nearest SYNOP station within its own 50 km cap (n and ww for sky, rr24 for rain); the sum of 24 hourly readings is rejected"
  - "Catch-up window stays 24 h (D-28) although the API served about 96 h; the observed value is recorded, not relied upon"
requirements-completed: []
duration: owner run 2026-10-12, recording ~1 h
completed: 2026-10-12
status: complete
---

# Phase 27 Plan 22: Meteo-France spike findings Summary

The owner's real Météo-France run is recorded: redacted fixtures, a README of measured facts (units, parameters, retention, station density, distance caps, the two D-21 decisions) and a spike paragraph in the `GET /weather` contract, so plan 27-12 can map the real provider from written facts.

## What was built

- **Task 1 (checkpoint:human-action) was done by the owner**, not by Claude: account, subscription, credential, the capture run and the by-eye check of the files. Claude never read `api/.env` and never saw the credential. The captures are the four fixtures plus the official `dpobs-v2.swagger.json`.
- **Spike README** (`api/test/fixtures/meteofrance/README.md`), every fact tagged observed, reported, documented or "to be confirmed by the owner":
  - Authentication: `Authorization: Bearer` worked and the `apikey` header was refused; the credential generated on the portal is a 1 hour JWT (D-27), so production needs the application id exchanged at the token endpoint (OAuth2 client credentials, renewed in memory).
  - Units: temperature in Kelvin, wind in m/s, rain in mm; times in UTC. Hourly wind `ff` was `null` in 4 of 4 readings, SYNOP wind present in 10 of 10 rows.
  - `liste-stations` answers CSV only (2151 hourly stations); `station/horaire` takes `id_station`, `date`, `format`; `/synop` about 190 stations.
  - Retention: the 30 h request returned the exact hour (the research expected the oldest reading, wrong). Reported: exact hour up to 96 h, empty list from 108 h. The window stays 24 h (D-28).
  - Distance cap, hourly: 30 km proposed (nearest station 1.72, 2.69 and 25.13 km at Fontainebleau, Gérardmer and Mimizan).
  - D-21: sky and rain over 24 h both prefilled from the nearest SYNOP station within 50 km; wind stays on the hourly station (using SYNOP for wind is not decided).
  - Quota: no rate-limit header sent; the plan 27-06 limits (`MAX_CONCURRENT_WEATHER_CALLS = 4`, per-client throttle 30 per minute) do not strictly guarantee staying under the quota, a global limiter is flagged for plan 27-12.
- **27-RESEARCH.md**: the assumptions rows A1, A2, A3, A4, A6 and A9 carry the "Spike 2026-10" verdict (8 occurrences in the file).
- **API contract** (`docs/technical/api-contract-v1.md`): the stale "to be added once checked" bullet of `GET /weather` was replaced by the paragraph "Météo-France observations (spike 2026-10)": the two caps (marked as proposed defaults), the two D-21 statements, units served by the provider and returned by the API, the 24 h rule with the observed 96 h noted as not relied upon, and the quota and portal terms flagged as to be confirmed by the owner.

## Task commits

| Task | Commit | Content |
|------|--------|---------|
| 1 (owner) | `18d015bf` | real Météo-France captures (stations, hourly, SYNOP sample) |
| 1 (owner) | `12ffeb6c` | capture script tries a ready bearer token, masks the provider message |
| 1 (owner) | `ca9b9182` | D-27 to D-30 recorded in 27-CONTEXT.md after the first capture |
| 2 | `cd4c79a6` | spike README and assumption rows of 27-RESEARCH.md |
| 2 | `d169f35f` | README: keep a code span on one line |
| 3 | `1c11d48b` | spike paragraph in the GET /weather contract |

## Verification

- `npx prettier --check api/test/fixtures/meteofrance` passes; the README has the eight required headings, a numeric cap (30 km), one decision each for sky and rain, and the Quota section names `MAX_CONCURRENT_WEATHER_CALLS` and says the plan 27-06 limits do not strictly guarantee the quota.
- Task 3 grep passes (`Météo-France observations (spike 2026-10)` followed by a km value); the km values and the two D-21 statements match the README; no em dash in any added line (count 0).
- `git status --porcelain api/.env` prints nothing; no credential, token or header value in the README, the contract or the fixtures.
- `npm run lint`, `npm run typecheck`, `npm run format:check`: all clean; `format:check` flags only the untracked `.claude/settings.local.json`, ignored by instruction.
- The contract file is Markdown, outside the Prettier glob (`**/*.{ts,tsx,json}`); it was already not Prettier-clean before this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Stale text] Placeholder bullet removed from GET /weather**
- **Found during:** Task 3
- **Issue:** plan 27-20 left a bullet saying the cap, values and units "are added once the provider has been checked"; with the paragraph added it would have contradicted it.
- **Fix:** removed that bullet in the same scoped edit, in the same section.
- **Files modified:** `docs/technical/api-contract-v1.md`
- **Commit:** `1c11d48b`

### Notes

- The plan's threat model (T-27-72) forbids authentication detail in the contract, so the contract paragraph does not mention the application id or the one hour token (D-27); both are in the README only. This differs from the content list handed to the executor, which named them for Task 3; the plan's rule was kept.
- The Task 2 deliverable exceeds the plan: D-27 to D-30 changed the picture after the first capture (bearer token, two station lookups, 96 h retention), and the README records them with their provenance.

## Still unconfirmed

- Quota shown under "Mes API" and the portal terms of use (open question O6): not reported by the owner. The README and the contract say "to be confirmed by the owner"; nothing is invented. The subscription validity (about 2 years) is also unconfirmed.
- The application id has not been obtained: the application-id flow is unverified against the real portal (a made-up id gave `401 invalid_client`). Plan 27-12 builds it on a mocked token endpoint; the real check is in plan 27-21.
- The SYNOP 50 km cap could not be measured: `synop.sample.json` holds 10 rows chosen as the first stations within 150 km of any test point, no station list. `GET /liste-stations-synop` was not captured.
- Whether `rr24` is also reported at the other 3 hourly SYNOP steps was not observed (only the 06:00Z report was sampled). One `rr24` value of `-0.1` is probably the trace code, not confirmed.

## Decision awaiting the owner

- Hourly station cap: **30 km** (proposed, covers the Landes point by 0.13 km) or the **25 km** of D-29. It is one default (`WEATHER_MAX_STATION_DISTANCE_KM`); plan 27-12 sets 30 km unless the owner says otherwise. Also open: wind from SYNOP when the hourly wind is `null`.

## Known Stubs

None.

## Threat Flags

None. T-27-71 and T-27-72 mitigated: the owner ran the script, the credential never reached Claude, the README and the contract name the variable only. T-27-73: terms still to be read by the owner, attribution "Source : Météo-France" stays mandatory (D-26).

## Self-Check: PASSED

- Files found: the README, the four fixtures, the swagger, the edited `docs/technical/api-contract-v1.md`, `27-RESEARCH.md`.
- Commits `18d015bf`, `12ffeb6c`, `ca9b9182`, `cd4c79a6`, `d169f35f`, `1c11d48b` found in `git log`.
- Not verified by me: the owner-reported facts (auth mode, 96 h retention, token endpoint answers, SYNOP row count, absence of rate-limit headers) are taken from the README and 27-CONTEXT.md, not re-run; the rendering of the Markdown was not previewed.
