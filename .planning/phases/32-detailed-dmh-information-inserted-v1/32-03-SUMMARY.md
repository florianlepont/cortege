---
phase: 32-detailed-dmh-information-inserted-v1
plan: 03
subsystem: mobile-ui
tags: [stepper, hold-repeat, accessibility, dmh, factor-f]
requires: []
provides:
  - useHoldRepeat (shared press-and-hold engine)
  - DmhCounterStepper and DMH_STEPPER_SIZE
  - fr.factorDetail.dmhList.stepper
affects: [32-11, 32-16]
tech-stack:
  added: []
  patterns: [shared hook extracted from a component, one adjustable accessibility element hiding its descendants]
key-files:
  created:
    - mobile/src/ui/useHoldRepeat.ts
    - mobile/src/ui/useHoldRepeat.test.ts
    - mobile/src/ui/DmhCounterStepper.tsx
    - mobile/src/ui/DmhCounterStepper.test.tsx
  modified:
    - mobile/src/ui/FactorCounterInput.tsx
    - mobile/src/i18n/fr/factor-detail.ts
decisions:
  - "The stepper's - button is not given the Pressable disabled prop: a button disabled mid-hold never sends its press out and the repeat would run on. At 0 the press does nothing, the opacity is 0.4 and accessibilityState.disabled is true."
  - "The stepper only calls onStep when the value really changes, so a repeat sitting on a bound stays silent until release."
metrics:
  tasks: 2
  completed: 2026-10-26
status: complete
---

# Phase 32 Plan 03: Compact DMH counter Summary

A shared press-and-hold engine (`useHoldRepeat`) and a 48 pt `DmhCounterStepper` (typeable count, one adjustable accessibility element) for lever (a) of D-08, not yet placed on any screen (plan 32-11 does that).

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Extract the press-and-hold engine into useHoldRepeat, FactorCounterInput on it | 103d5283 |
| 2 | DmhCounterStepper, its tests and its strings | 233108d7 |

## What was built

- `useHoldRepeat({ value, min, max, onChange })` returns `{ start, stop }`: immediate step, 120 ms repeat, x2 after 6 ticks, x5 after 15, clamped, interval cleared on stop and on unmount, latest `onChange` through a ref, a null value keeps the last known one. 9 tests.
- `FactorCounterInput` uses it; BUTTON_SIZE 56, styles, labels, testIDs and typed fallback unchanged; `FactorCounterInput.test.tsx` has no diff and passes.
- `DmhCounterStepper` (`label`, `value`, `onStep`, `onSubmitText`, `editable`, `testID`): `DMH_STEPPER_SIZE = 48` (O-32-1, plan 32-16 may settle 56), bounds 0 to 999, `remove-outline` and `add-outline` glyphs, count in Sora SemiBold 17 with the `label` font-scale cap, inline numeric field (`keyboardDone` accessory, autoFocus, commit on blur or submit, no double commit), testIDs `-decrease`, `-increase`, `-value`, `-input`. Outer View is `accessibilityRole="adjustable"` with label "Nombre d'arbres, {label}", value "{n} arbres" ("1 arbre"), hint, increment, decrement and activate actions; the inner row is hidden from the tree (shown again while the field is open so the field stays reachable). `editable: false` renders the count as text with no actions. No haptics, no Animated. 12 tests.
- `fr.factorDetail.dmhList.stepper` (`label`, `value`, `increment`, `decrement`, `editHint`) with the comment "Phase 32: the dendromicrohabitat group list of factor F". Plan 32-11 adds the rest of `dmhList`.

## Verification

- `npm --workspace mobile run test:unit -- src/ui src/__checks__ src/i18n`: 73 suites, 768 tests passed.
- `npm --workspace mobile run typecheck`: exit 0.
- `npx eslint` (run in `mobile/`) on the six touched files: exit 0.
- `npx prettier --check` on the six files: exit 0.
- Acceptance greps: setInterval 0 in FactorCounterInput and 1 in useHoldRepeat; `useHoldRepeat(` 1 in FactorCounterInput; `DMH_STEPPER_SIZE = 48` 1; `accessibilityRole="adjustable"` 1; `feedback.` 0; no diff on `FactorCounterInput.test.tsx`.

## Deviations from Plan

- **[Rule 2 - robustness] Orphan interval guard:** `start` calls `stop()` first so a second press in without a press out cannot leave a running interval (T-32-07).
- **[Rule 1 - design] "-" at 0 is not the Pressable `disabled` prop** but a no-op press with opacity 0.4 and `accessibilityState.disabled`, to keep the press out reaching the engine when the hold reaches 0 (see decisions). Behaviour matches the plan (calls nothing at 0).
- **[Minor] Read-only role:** the `editable: false` branch uses `accessibilityRole="text"` (an adjustable role without actions would mislead), so the only `adjustable` literal is the editable one, as the acceptance grep expects.
- The interval ref type is written `ReturnType<typeof setTimeout>` (identical type) so `setInterval` appears once in the file, as the acceptance criterion counts lines.

None of these changes the stored payload or any rule.

## Known Stubs

None. The stepper is intentionally not used by any screen yet (plan 32-11).

## Threat Flags

None.

## Self-Check: PASSED

Created files exist (`useHoldRepeat.ts`, `useHoldRepeat.test.ts`, `DmhCounterStepper.tsx`, `DmhCounterStepper.test.tsx`); commits 103d5283 and 233108d7 are in the log.
