---
phase: 27-quick-survey-additions-inserted-v1
plan: 01
subsystem: api
tags: [meteofrance, weather, spike, script, fixtures]
requires: []
provides:
  - "api/scripts/meteofrance-spike.mjs: owner-run capture script for the Meteo-France observation API"
affects: [27-12, 27-22]
tech-stack:
  added: []
  patterns: ["Node 22 built-ins only (fetch, AbortSignal.timeout, node:fs/promises)", "in-memory secret leak check before every file write"]
key-files:
  created:
    - api/scripts/meteofrance-spike.mjs
  modified: []
key-decisions:
  - "D-22 honoured: the credential is read from METEOFRANCE_API_KEY only and appears nowhere in output or files"
requirements-completed: [REQ-C-weather-provider]
duration: 10 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 01: Meteo-France capture script Summary

Owner-run capture script for the Meteo-France observation API (`DPObs` v2), ready for plan 27-22, checked on its missing-credential path only; no credential was needed, read or created.

## What was built

`api/scripts/meteofrance-spike.mjs`, run by the owner from the repo root with `node --env-file=api/.env api/scripts/meteofrance-spike.mjs [--base=<url>]`. It:

- reads `METEOFRANCE_API_KEY` from the environment; absent or blank prints "METEOFRANCE_API_KEY is not set: add it to api/.env first" and exits 1
- tries the key as an `apikey` header, and on 401 or 403 treats it as an application id, requests a bearer token at `https://portail-api.meteofrance.fr/token` (client credentials, Basic authorization) and prints only "auth mode: apikey" or "auth mode: application-id"
- captures `liste-stations` (JSON, then CSV when JSON yields no rows), keeps the 15 nearest stations for Fontainebleau, Vosges (Gerardmer) and Landes (Mimizan) with id as string, name, position, altitude and haversine distance (`liste-stations.excerpt.json`)
- captures `station/horaire` for the nearest station of each point, last round hour minus 2 h, under the date parameter `date` then `datetime`, recording the accepted name (`station-horaire.recent.json`)
- captures the same call 30 h back for the first point to show the 24 h retention behaviour of D-20, with the HTTP status recorded (`station-horaire.old.json`)
- tries `synop` for the sky decision of D-21 and keeps at most 10 stations near the test points (`synop.sample.json`); a non-200 is printed and skipped
- prints the `x-ratelimit*` and `ratelimit*` headers if any, and ends with "Run: npx prettier --write api/test/fixtures/meteofrance"

Every step prints only "name: HTTP status, bytes". Each file text is compared in memory with the credential and the token before writing; a match exits 2 without writing. Error messages carry a label and a status, never a URL, body or header. Fixtures go to `api/test/fixtures/meteofrance/` (created on the owner's run; not created by this plan).

## Verification

- `env -u METEOFRANCE_API_KEY node api/scripts/meteofrance-spike.mjs` exits 1 with the expected message; a blank value does the same
- `node --check api/scripts/meteofrance-spike.mjs` exits 0
- greps for `liste-stations`, `station/horaire` and `portail-api.meteofrance.fr/token` pass
- code read: the credential is used only in the request header (`apikey` or the token request) and in the in-memory leak check; no `console` call carries a variable holding it or the token
- `npx prettier --check` clean on the script (`.mjs` is outside the `format:check` glob; formatted anyway); `npm run lint --workspace api` clean (its glob covers `.ts` only)
- The real-capture paths (auth modes, parsing of real station columns, date parameter, SYNOP) are untested by design: they need the owner's key and run in plan 27-22. Column name candidates for the station list (`id_station`, `nom_usuel`, `latitude`, `longitude`, `altitude` and variants) are best guesses from the research and may need a small adjustment after the first real run.

## Task Commits

1. Task 1: capture script for the owner - `2c3e7a43` (feat)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Docker, typecheck and unit suites were not run: the plan touches only a standalone `.mjs` script outside every workspace test glob.

## Known Stubs

None.

## Threat Flags

None. T-27-01 and T-27-02 are mitigated as planned (leak check, label-and-status errors, token never printed).

## Self-Check: PASSED

- FOUND: api/scripts/meteofrance-spike.mjs
- FOUND: commit 2c3e7a43
