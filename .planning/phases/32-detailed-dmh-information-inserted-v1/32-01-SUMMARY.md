---
phase: 32-detailed-dmh-information-inserted-v1
plan: 01
subsystem: mobile-factor-detail
tags: [refactor, test-fixture, baseline, dmh, factor-f]
requires: []
provides:
  - renderFactorField module (renderFactorField, fieldVariantsFor, ignoreSelectionChange, type FieldVariant)
  - DMH_ENTRY_SCENARIOS (S1, S2), DMH_ENTRY_SURFACE_HA, OLD_FLOW_PRESSES, OLD_FLOW_F_PAYLOAD
affects: [32-06, 32-07, 32-14]
tech-stack:
  added: []
  patterns: [recorded baseline constants imported by later speed tests]
key-files:
  created:
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/screens/factor-detail/dmh-entry-scenarios.ts
    - mobile/src/screens/factor-detail/dmh-entry-cost.test.tsx
  modified:
    - mobile/src/screens/FactorDetailScreen.tsx
key-decisions:
  - "S2 stays provisional (9 groups, 20 trees); plan 32-07 replaces it with the owner's real tally"
  - "OLD_FLOW_PRESSES recorded: S1 = 8, S2 = 29 (one press per group plus one per tree)"
requirements-completed: [REQ-C-dmh-fast-entry]
duration: ~25 min
completed: 2026-10-26
status: complete
---

# Phase 32 Plan 01: Renderer move and old factor F flow baseline Summary

FactorDetailScreen.tsx is down from 400 to 197 lines (field renderers moved to `renderFactorField.tsx`, no behaviour change), and the old chips-then-counters flow of factor F is recorded by a deterministic test: S1 = 8 presses, S2 = 29 presses, with the exact F payload each replay writes.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Move the field renderers out of FactorDetailScreen.tsx | bab7169a |
| 2 | Scenario fixture and old-flow interaction-cost test | 93b57bbd |

## Recorded baseline (old flow, before any change to F)

- `OLD_FLOW_PRESSES`: S1 = 8 (3 chips + 5 "+"), S2 = 29 (9 chips + 20 "+").
- `OLD_FLOW_F_PAYLOAD` (surface typed first, 1 ha):
  - S1: `trees_per_ha` 5, `dmh_groups` [dmh_01, dmh_05, dmh_12], `dmh_counts` {dmh_01: 2, dmh_05: 2, dmh_12: 1}, `surface_ha` 1.
  - S2: `trees_per_ha` 16, nine groups, counts 3,2,2,3,2,3,1,3,1, `surface_ha` 1. The 20 trees give 16 because the package counts each group for at most 2 per ha (`DMH_GROUP_DENSITY_CAP_PER_HA`). trees_per_ha is the package's value, not recomputed.
- Final line count of `mobile/src/screens/FactorDetailScreen.tsx`: 197 (cap 400, requirement 280 or less).

## Verification

- `npm --workspace mobile run test:unit -- src/screens src/__checks__`: 184 suites, 2554 tests passed (includes FactorDetailScreen.test.tsx unchanged, structure.test.ts, the new replay with 2 passing scenarios).
- `npm --workspace mobile run typecheck`: exit 0 (a transient failure seen once came from another executor's in-progress `useHoldRepeat.test.ts`, gone on re-run).
- ESLint on `FactorDetailScreen.tsx` and `screens/factor-detail/`: clean. Prettier check on the four files: clean.
- `git diff origin/main -- packages/ibp-domain api mobile/src/storage`: empty. `FactorDetailScreen.test.tsx` not modified.
- Full `npm run lint` was not run (scoped as the run rules ask).

## Deviations from Plan

None in substance. Two small test-setup notes:
- The replay test mocks `AppCard` (plain wrapper), `FactorAGenusRecognitionEntry` and `DoubtNoteStrip` (null probes) because they pull native packages the minimal react-native mock lacks. None of them is part of the measured flow; `DmhCountFields`, `FactorChipsInput`, `FactorCounterInput` and the real `useSurveyForm` are not mocked.
- `FactorCounterInput.tsx` was being refactored onto a `useHoldRepeat` hook by another executor in the same tree while this plan ran; the measured behaviour is identical (one press in plus out gives one step), and the replay passes against it.

## Known Stubs

S2 is a provisional tally (documented in a comment in `dmh-entry-scenarios.ts`); plan 32-07 replaces it with the owner's real survey tally and must then re-record `OLD_FLOW_PRESSES.S2` and `OLD_FLOW_F_PAYLOAD.S2` against the old flow (or from the real survey counts).

## Self-Check: PASSED

Files found: renderFactorField.tsx, dmh-entry-scenarios.ts, dmh-entry-cost.test.tsx, FactorDetailScreen.tsx. Commits bab7169a and 93b57bbd exist.
