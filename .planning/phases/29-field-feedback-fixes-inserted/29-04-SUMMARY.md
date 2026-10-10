---
phase: 29-field-feedback-fixes-inserted
plan: 04
subsystem: mobile-map
tags: [explorer, offline, own-surveys, sqlite, map]

requires:
  - phase: 29-field-feedback-fixes-inserted
    provides: decisions D-01 and D-09 (finding F-2) from CONTEXT and RESEARCH
provides:
  - listLocalSurveyMapSources (storage/surveys.ts), every own survey row with its parsed payload
  - LocalSurveyMapSource (storage/types.ts)
  - map/own-surveys.ts: OwnSurveyMapItems, localSurveyTotal, cachedParcelCentre, ownSurveyMapItems
affects: [29-08]

tech-stack:
  added: []
  patterns:
    - "Map items built from local SQLite rows, position from the cached parcel bounds, score from the stored server total or the ibp-scoring adapters"

key-files:
  created:
    - mobile/src/storage/surveys.map-sources.sqlite.test.ts
    - mobile/src/map/own-surveys.ts
    - mobile/src/map/own-surveys.test.ts
  modified:
    - mobile/src/storage/types.ts
    - mobile/src/storage/surveys.ts

key-decisions:
  - "Decision D-01: the reader returns every local_surveys row (any status), payload parsed once per call in JS, an invalid payload skipped; no column, no migration, no local_meta key (SCHEMA_VERSION stays 5)"
  - "Decision D-09: position is the in-memory server display_location when finite (so an online marker never moves), else the centre of the bounding box of the cached parcels; none means the survey is not drawn"
  - "Score is the stored payload.scores.ibp_total when finite, else computed through computeRetainedScoresFromRawFactors + computeIbpTotalsFromRetainedScores (no rule re-implemented)"

patterns-established:
  - "knownPosition relies on Number.isFinite being false for undefined and non-numbers, instead of typeof guards"

requirements-completed: [D-01, D-09]

coverage:
  - id: D1
    description: "listLocalSurveyMapSources returns drafts and submitted rows newest first with parsed payload, skips invalid payloads, empty table gives [], no schema or local_meta change"
    requirement: D-01
    verification:
      - kind: unit
        ref: "mobile/src/storage/surveys.map-sources.sqlite.test.ts (real SQLite)"
        status: pass
    human_judgment: false
  - id: D2
    description: "ownSurveyMapItems splits drafts/own, dedups against publishedIds, positions from the in-memory server position then the cached parcel centre, skips unlocated surveys"
    requirement: D-09
    verification:
      - kind: unit
        ref: "mobile/src/map/own-surveys.test.ts (100 % statements, branches, functions, lines)"
        status: pass
    human_judgment: false
  - id: D3
    description: "localSurveyTotal uses the stored server total or the package adapters"
    requirement: D-01
    verification:
      - kind: unit
        ref: "mobile/src/map/own-surveys.test.ts"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-10-10
status: complete
---

# Phase 29 Plan 04: Own-survey map data layer Summary

**A real-SQLite reader of every own survey plus a pure builder that turns those rows into Explorer drafts and own-survey items, scored locally and positioned from the cached parcel geometry (nothing wired to the Explorer yet, plan 29-08 does that).**

## Accomplishments

- `listLocalSurveyMapSources()` selects `id, status, created_at, updated_at, payload_json` from `local_surveys` (newest `updated_at` first), parses each payload with `safeParseJson` and keeps it only when `isSurveyQueuePayload` holds. Documented as the one reader that parses payloads in JS, called only by the Explorer's local-markers hook.
- `map/own-surveys.ts` is pure (no react-native, no storage import beyond types): `localSurveyTotal`, `cachedParcelCentre` (via `parcelPolygonsFrom` then `boundsOfRings`) and `ownSurveyMapItems`.
- `own-drafts.ts` is left untouched; plan 29-08 switches the route and deletes it.

## Task Commits

1. Task 1: local reader of every own survey with its payload - `588ab102`
2. Task 2: pure builder of own-survey map items - `74a5ff02`

## Deviations from Plan

None - plan executed as written. The RED step of each task was not run separately (test and code written together, green on first run). One small simplification: `knownPosition` uses `Number.isFinite` alone (same behaviour as the old draft builder) rather than extra `typeof` guards.

## Known Stubs

None.

## Threat Flags

None. T-29-09 mitigated (the reader adds no source beyond the owner-gated `local_surveys`), T-29-10 mitigated (invalid payloads skipped, tested), T-29-11 accepted (no position is stored; computed at read time).

## Issues Encountered

- `npm run format:check` reports only the untracked local `.claude/settings.local.json` (out of scope, not touched).
- Verification: `npm run lint`, `npm run typecheck`, the two plan jest targets, and the full mobile unit suite with coverage (321 suites, 4298 tests, per-directory floors hold, exit 0) pass. `own-surveys.ts` is at 100 % on all four metrics.

## Next Phase Readiness

Plan 29-08 wires `listLocalSurveyMapSources` and `ownSurveyMapItems` into the Explorer route and removes `own-drafts.ts`.

## Self-Check: PASSED

- FOUND: mobile/src/storage/surveys.map-sources.sqlite.test.ts, mobile/src/map/own-surveys.ts, mobile/src/map/own-surveys.test.ts
- FOUND commits: 588ab102, 74a5ff02
