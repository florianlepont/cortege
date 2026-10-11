---
phase: 27-quick-survey-additions-inserted-v1
plan: 20
subsystem: docs
tags: [docs, api-contract, data-contract, sync-conflict, form-spec, user-stories, claude-md, vps-readme, weather]
requires:
  - phase: 27-04
    provides: "weather env contract (WEATHER_PROVIDER off by default, synthetic refused in production, key warning only)"
  - phase: 27-06
    provides: "GET /v1/weather on the synthetic provider (four reasons, 24 h window, 503, own throttle)"
  - phase: 27-11
    provides: "write sites and D-04 rules (absent keeps, null clears)"
  - phase: 27-17
    provides: "changes feed, community detail, history reads and retention on account deletion"
provides:
  - "data-contract-v1: survey_note and weather (migration 023), weather shape, factors.annotations, read-only after submit, retention after account deletion (D-24), weather_point local_meta key"
  - "api-contract-v1: new fields on POST /surveys, GET /surveys/{id}, POST /sync, GET /sync/changes, community detail and both histories; Factor annotations (phase 27); GET /weather; weather_provider_unavailable; 2 MB body limit"
  - "sync-conflict-resolution-v1: survey_note and weather in the Case B compared fields"
  - "ibp-form-spec section 10, US-C10, US-C11, US-C12, user-stories scope"
  - "CLAUDE.md and infra/vps/README.md updated for the phase"
affects: [27-22, 27-12, 29, 33]
tech-stack:
  added: []
  patterns: ["contract facts that depend on the Meteo-France spike are left out and named as arriving with plans 27-22 and 27-12"]
key-files:
  created: []
  modified:
    - docs/technical/data-contract-v1.md
    - docs/technical/api-contract-v1.md
    - docs/technical/sync-conflict-resolution-v1.md
    - docs/specs/ibp-form-spec.md
    - docs/specs/epic-c-ibp-survey-data-entry.md
    - docs/specs/user-stories.md
    - CLAUDE.md
    - infra/vps/README.md
key-decisions:
  - "The GET /weather section states only the synthetic and env contract; the distance cap value, the values the provider fills and its units are explicitly left to plan 27-22 (and the provider file names to 27-12)"
  - "The VPS README is in French, so the Weather paragraph is written in French under 'Meteo (phase 27)'"
requirements-completed: []
duration: ~50 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 20: Contracts, specs, CLAUDE.md and VPS README Summary

The data contract, API contract, sync conflict rules, form spec, epic C stories, `CLAUDE.md` and the VPS README now describe what phase 27 built (note, weather, factor annotations, `GET /v1/weather`, the 2 MB body limit), written from the synthetic and env contracts only, so nothing here waits on the owner's Météo-France key.

## What was built

- **Data contract** (`data-contract-v1.md`): `survey_note` (text, 1000 characters) and `weather` (jsonb, 2048 bytes) in "3) Survey" with migration 023 and its three CHECK constraints; a "Survey note and weather" block with the weather shape and bounds (sky codes, -40..55, 0..350, 0..1000, the two ISO times, source, `edited`), the `factors.annotations` container (A to J, `{ doubt?: true, note?: string }` at 300 characters, never read by a scorer, `MAT-ANN-*`); two Consistency Rules lines (read-only after submit, D-03; notes kept after account deletion, D-24); the `weather_point:<SURVEY_ID>` local-only key.
- **API contract** (`api-contract-v1.md`): a "Survey note, weather and factor annotations (phase 27)" block under `POST /surveys` (absent keeps, null clears, validation, read-only after submit, visibility, the 2 MB body limit next to the batch cap of 100); both read-only sentences extended; `GET /surveys/{id}` example and note; the subsection "Factor annotations (phase 27)" after "Factor detail arrays"; `POST /sync` rules (nested weather validated, undeclared nested keys stripped on `/sync` and rejected on `POST /surveys`); `GET /sync/changes` carries `survey_note`, `weather` and `factors`; community detail gets `survey_note`, `weather`, `factor_annotations` (sanitised), history items get `survey_note`, retention note; parcel history items get `survey_note`; a new section `### GET /weather?lat=&lng=&at=` (query bounds, nearest stations within `WEATHER_MAX_STATION_DISTANCE_KM`, 90 minute tolerance, 24 h window, nullable values, cache and de-duplication, `weather` throttle 30 per minute in production, mandatory "Source : Météo-France", the four `reason` values, 400/401/429/503 answers); `weather_provider_unavailable` in the error codes; the status paragraph and the entity coverage list.
- **Sync conflict rules** (`sync-conflict-resolution-v1.md`): Case B lists `survey_note` (strict string equality) and `weather` (by value), says annotations ride on `factors`, keeps "absent or null is never a change", and adds the read-only-after-submit sentence.
- **Specs**: `ibp-form-spec.md` section 10 (10.1 types, 10.2 container and `evidence.notes` stays the canonical shape, 10.3 payload example, 10.4 read-only and "the doubt never changes a score", D-14); `epic-c` stories US-C10 (notes), US-C11 (pre-filled weather), US-C12 (doubt flag) with acceptance criteria from the three ROADMAP criteria; `user-stories.md` scope entries with the requirement ids.
- **CLAUDE.md**: `weather_point:` key, `useWeatherPrefill` and `useWeatherPrefillState`, the weather endpoint in the `surveys` module row (no Météo-France file names), the IBP domain paragraph (annotations, `conditions.ts`, `MAT-ANN-*`, D-24), migration 023 in Key files, the five weather variables in the API env table (no default number for the distance cap), the PDF conditions block and doubt badge.
- **VPS README**: a French paragraph "Météo (phase 27)" telling the owner to add `WEATHER_PROVIDER=meteofrance` and `METEOFRANCE_API_KEY=<key>` to `/home/ubuntu/cortege.env`, run `check-env.sh`, and renew the portal subscription when asked. No key value anywhere.

## Task commits

| Task | Commit | Content |
|------|--------|---------|
| 1 | `b5ca1bc7` | data contract, API contract, sync conflict rules |
| 2 | `925d045c` | form spec, epic C stories, user stories |
| 3 | `f761a6a3` | CLAUDE.md and VPS README |

## Verification

- All greps of the three tasks pass (`survey_note`, `GET /weather`, `weather_provider_unavailable`, "Factor annotations (phase 27)", `D-24`, "2 MB", `US-C10`, `US-C12`, `REQ-C-doubt-flag`, `WEATHER_PROVIDER`, `weather_point:`, `useWeatherPrefill`, `023_survey_note_weather`, `METEOFRANCE_API_KEY`, `factors.annotations`).
- No em dash (U+2014) in any added line (`git diff | grep '^+'` count 0 for each task).
- `npm run lint` and `npm run typecheck` clean. `npm run format:check` reports only the untracked local `.claude/settings.local.json` (not part of the repo, ignored by instruction); the changed files are Markdown, outside the Prettier glob.
- Every documented fact was read from the code or the earlier summaries (migration 023, `survey-weather.dto.ts`, `weather.controller.ts`, `weather-query.dto.ts`, `rate-limit.config.ts`, `app-config.ts`, `contract/weather.ts`, `useWeatherPrefill.ts`, `env.example`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `user-stories.md` has no epic C story list**
- **Found during:** Task 2
- **Issue:** the plan says to add the stories "to the epic C list", but that file holds a V1 scope list (section 4) and an epic document index; the stories themselves live in `epic-c-ibp-survey-data-entry.md`.
- **Fix:** added a "Quick survey additions (phase 27, epic C, V1)" entry with the three stories and the requirement ids to the section 4 scope list.
- **Files modified:** `docs/specs/user-stories.md`
- **Commit:** `925d045c`

**2. [Rule 3 - Language] VPS README paragraph written in French**
- **Issue:** the plan names the paragraph "Weather (phase 27)", but the whole README is French.
- **Fix:** heading "Météo (phase 27)" and French text, matching the file.
- **Commit:** `f761a6a3`

### Notes

- The Case B field list in `sync-conflict-resolution-v1.md` did not mention the phase 01.8 method fields (`ibp_method_version`, `ibp_cas`, `ibp_cas3_scale`); `api-contract-v1.md` does. I added only the phase 27 fields, as scoped, and did not touch that older gap.
- The `GET /weather` section ends with a sentence stating that the measured distance cap, the values the provider fills and its units are added once the provider has been checked (plan 27-22). The example observation uses illustrative values only.
- `CLAUDE.md` existing lines that use an em dash were left as they were; none was edited or added.

## Known Stubs

None.

## Threat Flags

None. T-27-66 mitigated: documents name the variable only, the README says the key lives in `/home/ubuntu/cortege.env`, no env file was read. T-27-67 mitigated: D-24 is written in the data contract Consistency Rules and repeated in the API contract (community detail) and in `CLAUDE.md`.

## Self-Check: PASSED

- All eight edited files exist and contain the planned markers (greps above).
- Commits `b5ca1bc7`, `925d045c` and `f761a6a3` found in `git log`.
- Not done, stated plainly: no spike-dependent number or provider unit is documented (by design); the rendering of the Markdown was not previewed.
