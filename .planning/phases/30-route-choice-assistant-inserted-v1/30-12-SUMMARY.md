---
phase: 30-route-choice-assistant-inserted-v1
plan: 12
subsystem: mobile-form
tags: [uncapped-entry, survey-form, factor-details, autosave, completion]
requires: [30-06, 30-08]
provides:
  - "useUncappedEntry hook and UncappedEntry / UncappedState / UncappedPayload types (mobile/src/hooks/useUncappedEntry.ts)"
  - "Form actions setStratumCover(code, text), setDmhCount(code, count), setFSurface(text) in useSurveyForm and the form context"
  - "Form state uncapped: { strataCoverText, dmhCounts, fSurfaceText } in the form context"
  - "Payload keys factors.B.strata_cover, factors.F.dmh_counts, factors.F.surface_ha, written only with their scored keys"
affects: [30-19]
key-files:
  created:
    - mobile/src/hooks/useUncappedEntry.ts
    - mobile/src/hooks/useUncappedEntry.test.ts
  modified:
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/hooks/useSurveyForm.test.ts
    - mobile/src/state/survey-form-context.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/app/factor-selections.test.ts
    - mobile/src/storage/surveys.completion.sqlite.test.ts
decisions:
  - "The sub-hook returns the state flat (strataCoverText, dmhCounts, fSurfaceText) plus setters; its setters read a ref of the latest state so two calls in one batch both count and each can return its derived value synchronously"
  - "Covers are rounded to one decimal (spec section 7) both before they count toward the 20 % rule and before they are stored"
  - "A derivation with nothing valid (no valid cover; no count or no valid surface) returns null and the form writes nothing, so the scored field keeps its last value (U-O10)"
  - "Setting a cover un-ticks the strata chips (strata: null) as typing a count already does, because the ticked list no longer matches the count; F's ticked groups are kept"
  - "F's trees_per_ha is written unrounded (the package never rounds: rounding could cross a threshold of 2, 3 or 8)"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 12: Detail inputs of the releve deplafonne in the survey form Summary

The survey form now holds, saves, reloads and clears the detail inputs of the relevé déplafonné (B cover per stratum, F tree counts per dendromicrohabitat group with F's own surface), derives the scored `strata_count` and `trees_per_ha` through the package helpers, and publishes the three setters in the form context for the factor screens of plan 30-19.

## What was built

- `mobile/src/hooks/useUncappedEntry.ts` (on the `useFactorAnnotations` model)
  - State kept as typed: cover text per stratum, whole counts per group, F's surface text.
  - `setStratumCover` returns `strataCountFromCover` of the valid covers; `setDmhCount` and `setFSurface` return `dmhDensityPerHa(...).trees_per_ha` (null without a count or without a valid surface). No arithmetic of its own.
  - `loadUncapped(factors)` reads through `readStrataCover` and `readDmhCounts` (unknown codes and out-of-range values dropped) and a surface above zero; `resetUncapped()` clears all three; `uncappedPayload()` gives only valid entries in package code order, empty objects omitted.
- `useSurveyForm.ts`: composes the sub-hook; `buildFactorsPayload` adds `strata_cover` to B and `dmh_counts` plus `surface_ha` to F only when that factor's scored key is written (the D-12 rule, comment extended to phase 30); `applyDraftToForm` loads, `resetSurveyForm` clears; the three form actions write the derived value in `factorB.strata_count` or `factorF.trees_per_ha` when it is not null. The `uncapped` object is memoised.
- `survey-form-context.ts` and `AppStateProvider.tsx`: `uncapped` in the form state, the three setters in the form actions (stable through `useStableActions`). `useSurveySync` is untouched.
- Tests: 21 hook cases, 13 form cases (derivation, detail alone never goes out, autosave of another factor, draft round trip, reload clears, reset, retained scores equal with and without details), 2 SQLite cases (same stored `payload_completion` and `payload_factors_filled` with and without detail keys, on create and on update), 2 code-parity cases (`strataOptions` equals `B_STRATUM_CODES`, `dmhGroupOptions` equals `DMH_GROUP_CODES`).

## Verification

- `npm run lint`, `npm run typecheck` exit 0; Prettier clean on `mobile/src` and `packages`.
- Full mobile unit suite: 416 suites, 6161 tests, all pass.
- `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty.
- STATE.md, ROADMAP.md and REQUIREMENTS.md not edited.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `AppStateProvider.tsx` modified though not in the plan's file list**
- **Found during:** Task 2
- **Issue:** The form context is filled by `AppStateProvider` (the single assembler); the three actions and `uncapped` cannot reach the factor screens without it.
- **Fix:** Added the three actions to `formActions` and `uncapped` to the form state and its memo dependencies. No other change.
- **Files modified:** `mobile/src/state/AppStateProvider.tsx`
- **Commit:** 19fefad0

**2. Shape of the sub-hook's return**
- The plan names `UncappedEntry` with state and functions together; the hook returns them flat and `UncappedEntry` is `ReturnType<typeof useUncappedEntry>`. The state-only type is `UncappedState`. The form context exposes `uncapped` as the three state fields only.

**3. Decisions where the plan was silent (no rule of the validated spec changed)**
- A derivation with no valid input returns null and writes nothing (the scored field keeps its last value, consistent with U-O10); the plan only specified null for a missing surface.
- Setting a cover clears B's ticked-strata list (`strata: null`), the same as typing a count, since the list would no longer match the count.
- F's `surface_ha` goes out whenever it is valid and `trees_per_ha` is written, with or without counts (the plan: "surface_ha only when valid").

TDD note: Task 1 tests were written with the implementation in one pass (no separate RED commit); Task 2 tests were run red (TypeScript errors on the missing actions) before the implementation, and committed together with it.

## Threat model

- T-30-29 (out-of-range detail stored): covers must be 0 to 100 and rounded, counts whole numbers of 0 or more, surface above zero; loading goes through the package readers that keep only known codes. Tested.
- T-30-30 (detail lost by autosave): the details are part of the form state, rebuilt into every payload; tests cover editing another factor, a draft round trip and reset.

## Known Stubs

None. The setters are not yet called by a screen; plan 30-19 wires them (and the prefill of F's surface from the route's surface décrite).

## Self-Check: PASSED

- Files present: `mobile/src/hooks/useUncappedEntry.ts`, `mobile/src/hooks/useUncappedEntry.test.ts`.
- Commits present: a82622ad (Task 1), 19fefad0 (Task 2).
