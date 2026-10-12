---
phase: 27-quick-survey-additions-inserted-v1
plan: 04
subsystem: api-config
tags: [config, weather, meteofrance, production-rules, check-env, env-schema]
requires:
  - phase: 27-01
    provides: "the owner-side Météo-France capture script (no key needed), which fixed the observation URL default"
provides:
  - "AppConfig.weather block (provider, credential, observationsUrl, timeoutMs, maxStationDistanceKm, timeToleranceMinutes), the only source the weather service (27-06) and provider (27-12) read"
  - "WEATHER_PROVIDER validation (meteofrance, synthetic, off, case-insensitive, blank = off) in the env schema"
  - "Production problem on WEATHER_PROVIDER=synthetic and production warning on a blank or CHANGE_ME METEOFRANCE_API_KEY with meteofrance"
  - "The same two rules, plus the unknown-value refusal, in infra/vps/check-env.sh with parity fixtures"
  - "WEATHER_PROVIDER=synthetic for every API test (unit and e2e share api/test/setup-env.js)"
affects: [27-06, 27-12, 27-11]
tech-stack:
  added: []
  patterns: ["unset provider defaults to off (unlike CADASTRE_PROVIDER = synthetic) so an unset production value can never store invented weather"]
key-files:
  created: []
  modified:
    - api/src/config/env.schema.ts
    - api/src/config/config.types.ts
    - api/src/config/app-config.ts
    - api/src/config/production-rules.ts
    - api/test/env.schema.spec.ts
    - api/test/check-config.spec.ts
    - api/test/setup-env.js
    - api/test/check-env-parity.spec.ts
    - infra/vps/check-env.sh
    - infra/vps/env.example
key-decisions:
  - "D-22: WEATHER_PROVIDER defaults to off; synthetic is a production problem (startup refused), a missing key is only a warning so weather never blocks a deploy"
  - "D-19: maxStationDistanceKm is a plain positive number (fractions kept), default 25 km until plan 27-12 sets the spike value; timeToleranceMinutes 90 and timeoutMs 4000 are whole numbers"
  - "An unknown WEATHER_PROVIDER value (typo such as meteo) fails the schema in the API and, added here, in check-env.sh, so the owner's pre-merge check catches what would refuse the startup"
requirements-completed: []
duration: ~30 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 04: Weather configuration and production rules Summary

The API now knows its weather mode, station distance cap, time tolerance and provider timeout from validated configuration, refuses `WEATHER_PROVIDER=synthetic` in production, only warns about a missing Météo-France key, and the owner's `check-env.sh` carries the same rules. The shell side could not be executed on this Mac (see Verification).

## What was built

- `env.schema.ts`: a `// Weather (phase 27)` block. `WEATHER_PROVIDER` is validated with a case-insensitive, trim-tolerant pattern over `meteofrance | synthetic | off` (blank allowed, read as off); the five other variables are optional strings. The pattern is built from an exported `WEATHER_PROVIDERS` constant.
- `config.types.ts`: `WeatherProvider` type and the documented `AppConfig.weather` block.
- `app-config.ts`: `loadAppConfig` fills `weather` (the only reader of `WEATHER_*` and `METEOFRANCE_*`; `grep process.env.(WEATHER|METEOFRANCE)` outside the file prints 0). Defaults: provider `off`, credential `""`, URL `https://public-api.meteofrance.fr/public/DPObs/v2`, timeout 4000, cap 25 km, tolerance 90 minutes.
- `production-rules.ts`: `findProductionProblems` pushes `WEATHER_PROVIDER` for `synthetic`; `findProductionWarnings` pushes `METEOFRANCE_API_KEY` for `meteofrance` with a blank or `change-me` key. Messages name the variable only, never a value.
- `check-env.sh`: refuses `synthetic` (same French reason), refuses an unknown value (`valeur de type invalide.`, mirrors the API schema error line), and after the Auth0 loop prints `ATTENTION : METEOFRANCE_API_KEY : vide ou exemple CHANGE_ME : la météo restera vide.` under the same condition. The key is never printed.
- `env.example`: commented weather block, `WEATHER_PROVIDER=meteofrance`, `METEOFRANCE_API_KEY=CHANGE_ME`, optional lines commented.
- `setup-env.js`: `WEATHER_PROVIDER = "synthetic"`. The e2e config already loads this file, so no second line was needed.
- Specs: New weather describe block in `env.schema.spec.ts`, 3 cases in `check-config.spec.ts`, and 12 weather fixtures plus warning parity (a new `warnings` comparison on every fixture) and a weather marker secret in `check-env-parity.spec.ts`.

## Task commits

| Task | Commit | Content |
|------|--------|---------|
| 1 | `548ac157` | config block, schema, production rules, specs, `setup-env.js` |
| 2 | `15c0085a` | `check-env.sh`, `env.example`, parity spec |

`api/test/config-helper.ts` needed no change: `buildTestConfig` already goes through `loadAppConfig` over `process.env`, so the synthetic default comes from `setup-env.js` and overrides win (covered by a test).

## Verification

Run locally and passing:
- `test/env.schema.spec.ts`, `test/check-config.spec.ts`, `test/vps-deploy-guard.spec.ts`: 115 tests pass.
- API unit suite minus the parity spec: 996 tests pass.
- The API half of every parity fixture (verdict, ERREUR names, ATTENTION names) was checked with a throwaway spec (deleted): all 11 weather cases give the expected verdict and variables.
- `bash -n infra/vps/check-env.sh`: syntax ok. The acceptance greps pass.
- `npm run lint`, `npm run typecheck`: clean. `npm run format:check`: only the untracked local `.claude/settings.local.json` is flagged (not part of the repo).

NOT verified locally (must be run by CI on Linux before merge):
- `api/test/check-env-parity.spec.ts` and anything that executes `check-env.sh`. `/bin/bash` here is 3.2, the script exits at `declare -A` (reproduced on the unmodified script from `HEAD~2`, so it is not caused by this plan). The Docker CLI is installed but its daemon was not running (`docker.sock` missing), so no Linux container run was possible. The spec compiles (a type error in my first version was caught and fixed) and its 50 shell-dependent tests fail here only for the bash reason. The shell rules were written to mirror the API ones line by line, but their runtime behaviour is unproven until CI runs.
- The `./src/config/` coverage ratchet (96/94/96/96) is not fully reproducible locally: without the parity spec statements read 95.90 % (branches 95.71 %). The baseline on `HEAD` measured the same way is 95.58 % statements and 93.49 % branches, so this plan raised both. The one remaining statement the ratchet needs is the "only commas" CORS fixture of the parity spec (`production-rules.ts` line 62), which runs in CI; with it the directory is at about 96.4 %. Confirm on CI.

## Deviations from Plan

### Auto-fixed / added

**1. [Rule 2 - Missing critical functionality] Unknown WEATHER_PROVIDER refused by check-env.sh too**
- **Found during:** Task 2
- **Issue:** the plan mirrors only the `synthetic` rule, but the API schema also refuses an unknown value (a typo such as `meteo`), so check-env.sh would have said OK for a file that stops the API from starting, breaking the "same verdict" truth.
- **Fix:** `*)` branch in the `case` raising `ERREUR : WEATHER_PROVIDER : valeur de type invalide.`; parity fixture "WEATHER_PROVIDER unknown value is refused".
- **Files modified:** `infra/vps/check-env.sh`, `api/test/check-env-parity.spec.ts`
- **Commit:** `15c0085a`

**2. [Rule 3 - Blocking] `setup-env.js` changed in Task 1, not Task 2**
- **Issue:** the Task 1 test that `buildTestConfig()` defaults to synthetic needs the line, so it went into the Task 1 commit.
- **Commit:** `548ac157`

### Not done

**`api/.env.example` was not edited.** The plan asks for `WEATHER_PROVIDER=synthetic` and `METEOFRANCE_API_KEY=` (empty, with a comment) there, but the permission settings deny this session any read of `api/.env.example`, so it could not be opened or edited; I did not work around the block. No test depends on it. To close it, add after the `CADASTRE_PROVIDER` block:

```
# Weather (phase 27): synthetic = invented weather, no network, development only.
# Refused in production. The real key belongs in the VPS env file, never in git.
WEATHER_PROVIDER=synthetic
METEOFRANCE_API_KEY=
```

## Threat model

- T-27-14 (invented weather stored as Météo-France data): mitigated. Default `off`; `synthetic` is a production problem in the API check and in `check-env.sh`.
- T-27-15 (credential in output or logs): mitigated. Messages name the variable only; specs assert marker secrets never appear in the API lines (`check-config.spec.ts`, `env.schema.spec.ts`) and the parity spec asserts the weather marker never appears in the shell output (shell part runs in CI).
- T-27-16 (missing key blocks deploys): mitigated. Blank key is an `ATTENTION` line, exit code 0.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED (with the gaps listed above)

- Files exist: all ten modified files and this summary (`[ -f ... ]` checked).
- Commits exist: `548ac157` and `15c0085a` found in `git log`.
- Not verified, stated plainly: the shell half of `check-env-parity.spec.ts` (bash 3.2 here, Docker daemon down), the full `./src/config/` coverage ratchet, and `api/.env.example` (denied, not edited).
