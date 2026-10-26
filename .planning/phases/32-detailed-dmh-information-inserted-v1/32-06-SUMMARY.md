---
phase: 32-detailed-dmh-information-inserted-v1
plan: 06
subsystem: mobile-form
tags: [dmh, factor-f, form-action, counters, equivalence]
requires: ["32-01"]
provides:
  - withSelectionToggled (option-order toggle of a factor selection)
  - bumpDmhCount in useUncappedEntry (latest-ref, clamped 0..999)
  - bumpDmhGroup in useSurveyForm (lever (a) of D-08)
affects: [32-08, 32-11, 32-14]
tech-stack:
  added: []
  patterns: [latest-ref read for fast taps, functional setter for the tick]
key-files:
  created: []
  modified:
    - mobile/src/app/factor-selections.ts
    - mobile/src/app/factor-selections.test.ts
    - mobile/src/hooks/useUncappedEntry.ts
    - mobile/src/hooks/useUncappedEntry.test.ts
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/hooks/useSurveyForm.test.ts
decisions:
  - "bumpDmhCount clamps to 0..999 itself; setDmhCount keeps its integer check and is unchanged."
  - "A negative bump on a never-counted group stores a count of 0 without ticking it (the plan's 'at 0 stays 0'); the row UI (32-14) never offers minus on a 0 row."
metrics:
  tasks: 2
  completed: 2026-10-26
status: complete
---

# Phase 32 Plan 06: bumpDmhGroup form action Summary

One form action, `bumpDmhGroup(code, delta)`, ticks an unticked DMH group and counts it in a single call, moves an existing count up or down, never unticks on the way down, and is proven to write the same F payload as the old chips-plus-counters flow on scenarios S1 and S2.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | `withSelectionToggled` (option order) and the store's `bumpDmhCount` | 16ac25e8 |
| 2 | `bumpDmhGroup` in `useSurveyForm` with the S1/S2 payload equivalence | 4708df59 |

## What was built

- `withSelectionToggled(factor, methodVersion, selected, code, on)` in `mobile/src/app/factor-selections.ts`: same output order as `FactorChipsInput` (which is untouched).
- `bumpDmhCount(code, delta)` in `mobile/src/hooks/useUncappedEntry.ts`: reads the latest ref (two bumps in one batch both count), clamps 0..999, returns the package-derived trees per hectare or null.
- `bumpDmhGroup(code, delta)` in `mobile/src/hooks/useSurveyForm.ts`: one functional `setFactorF` that ticks (delta > 0 only) in option order and writes `trees_per_ha` only when the store derived one. Payload assembly (`payload.F`) is untouched. It is returned from the hook; exposure through the form context is plan 32-08.

## Verification

- `npm --workspace mobile run test:unit -- src/app src/hooks src/screens/factor-detail`: 115 suites, 2286 tests pass (includes `ibp-parity.test.ts` and `dmh-entry-cost.test.tsx`).
- `npm --workspace @cortege/ibp-domain run test`: 13 suites, 468 tests pass; `git diff HEAD -- packages` empty.
- `npm --workspace mobile run typecheck` and `lint`: clean. Prettier check on the six files: clean.
- Equivalence describe: for S1 and S2 the F payload written by `bumpDmhGroup` equals the one written by the old actions and equals `OLD_FLOW_F_PAYLOAD`.
- `git diff` of `useSurveyForm.ts` has no `payload.F` line changed; `FactorChipsInput.tsx` unchanged; no em dash added.

## Deviations from Plan

None. Tests and implementation were written in the same step per task (the new tests do not fail before the code exists only because they reference a function that did not exist yet).

## Owner decisions

None needed.

## Known Stubs

None.

## Self-Check: PASSED

Both commits exist (16ac25e8, 4708df59); the six modified files are present.
