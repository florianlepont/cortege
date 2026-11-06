---
phase: 32-detailed-dmh-information-inserted-v1
plan: 08
subsystem: mobile-state
tags: [dmh, factor-f, form-context, plumbing]
requires: ["32-06"]
provides:
  - SurveyFormActions.bumpDmhGroup (form context, filled by AppStateProvider)
  - UncappedEntryProps.bumpDmhGroup (carried by the entry object of FactorDetailRoute)
affects: [32-14]
key-files:
  modified:
    - mobile/src/state/survey-form-context.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/screens/factor-detail/UncappedFieldBlock.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.test.tsx
    - mobile/src/screens/FactorDetailScreen.test.tsx
    - mobile/src/screens/survey-form/FactorPager.test.tsx
    - mobile/src/screens/factor-detail/dmh-entry-cost.test.tsx
    - mobile/src/hooks/useSurveyForm.test.ts
decisions:
  - "bumpDmhGroup follows the exact path of setDmhCount: form context type, AppStateProvider mapping (stable through the existing form actions object), memoised uncappedEntry."
metrics:
  tasks: 2
  completed: 2026-10-26
status: complete
---

# Phase 32 Plan 08: bumpDmhGroup plumbing Summary

The form action `bumpDmhGroup` (plan 32-06) now reaches the factor pages in the `uncappedEntry` object, ready for the F list of plan 32-14. No visible change: nothing renders it yet.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | `bumpDmhGroup` in the form context and the single assembler | ff75c1d7 |
| 2 | `bumpDmhGroup` in `UncappedEntryProps` and the route's entry object, fixtures updated | f3c23d74 |
| - | Test fix found on the way (see Deviations) | 64adc6b9 |

## Verification

- `npm --workspace mobile run typecheck` and `lint`: clean.
- `npm --workspace mobile run test:unit -- src/state src/navigation src/screens src/hooks src/__checks__`: 250 suites, 3764 tests pass.
- `src/navigation` coverage: 100% statements (FactorDetailRoute.tsx 100% statements).
- Prettier check on every touched file: clean.
- `useSurveySync` is still called only by `AppStateProvider`; `useSurveySync.ts`, `packages/`, `api/` and the stored payload are untouched. `FactorDetailRoute.test.tsx` asserts the entry's `bumpDmhGroup` is the form's action.

## Deviations from Plan

**1. [Rule 3 - Blocking] A fifth entry fixture**
- **Found during:** Task 2 typecheck
- **Issue:** `mobile/src/screens/factor-detail/dmh-entry-cost.test.tsx` also builds an `UncappedEntryProps` object, not listed in the plan, and failed typecheck once the prop became required.
- **Fix:** added `bumpDmhGroup: form.bumpDmhGroup` to its entry.
- **Commit:** f3c23d74

**2. [Rule 1 - Bug] Wrong expectation in the 32-06 test "the first + on an unticked group ticks it in option order and counts 1"**
- **Found during:** wider `src/hooks` run
- **Issue:** the test expected `trees_per_ha: 2` for one tree on a 1 ha surface (the package gives 1). It failed deterministically at the 32-06 head, so its summary's "all pass" was wrong. `useSurveyForm.test.ts` also had a prettier layout issue (formatting of one `withSelectionToggled` call).
- **Fix:** expectation set to 1; prettier applied. No implementation change.
- **Files modified:** `mobile/src/hooks/useSurveyForm.test.ts`
- **Commit:** 64adc6b9

## Owner decisions

None needed.

## Known Stubs

None. `bumpDmhGroup` is plumbed but not yet rendered by any screen (plan 32-14).

## Self-Check: PASSED

Commits ff75c1d7, f3c23d74 and 64adc6b9 exist; the modified files are present.
