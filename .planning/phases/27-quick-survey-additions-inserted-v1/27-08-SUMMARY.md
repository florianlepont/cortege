---
phase: 27-quick-survey-additions-inserted-v1
plan: 08
subsystem: mobile-form
tags: [survey-form, factor-annotations, doubt-flag, factor-note, autosave, form-context]
requires: ["27-02"]
provides:
  - "useFactorAnnotations hook and FactorAnnotationDraft type (mobile/src/hooks/useFactorAnnotations.ts)"
  - "useSurveyForm: factorAnnotations, setFactorDoubt, setFactorNote; factors.annotations written canonical beside the factor keys"
  - "Form context: state.factorAnnotations and stable actions.setFactorDoubt / setFactorNote"
affects: [27-13, 27-14, 27-16, 27-19]
tech-stack:
  added: []
  patterns: ["note kept as typed in the form state, canonical form applied only when the payload is built", "annotations container beside the factor keys so no scorer reads it and a doubt-only factor writes no factor key"]
key-files:
  created:
    - mobile/src/hooks/useFactorAnnotations.ts
    - mobile/src/hooks/useFactorAnnotations.test.ts
  modified:
    - mobile/src/hooks/useSurveyForm.ts
    - mobile/src/hooks/useSurveyForm.test.ts
    - mobile/src/hooks/useEditingDraft.autosave.test.ts
    - mobile/src/state/survey-form-context.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/state/contexts.test.tsx
    - mobile/src/navigation/routes/routes.test.tsx
key-decisions:
  - "D-12 and D-23: the form holds one doubt flag and one note per factor and writes them as factors.annotations through withFactorAnnotations(payload, canonicalFactorAnnotations(...))"
  - "An annotation entry with no doubt and an empty note is removed from the hook state, so a toggled-off doubt leaves {} and no annotations key"
  - "No change to useEditingDraft: storedDraftSignature already round-trips a canonical container (same key order as the form payload)"
requirements-completed: []
duration: 25 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 08: Form doubts and factor notes Summary

The survey form now carries a doubt flag and a note per factor A to J and writes them canonical under `factors.annotations`, beside the factor keys and never inside one, through the existing autosave; the form context publishes them for the strip of plan 27-14.

## What was built

- `useFactorAnnotations` (new): `useState` of `FactorAnnotationDraft` (`doubt` and `note` per factor, the note as typed), stable `useCallback` setters `setFactorDoubt` / `setFactorNote`, `loadAnnotations(stored)` and `resetAnnotations()`. An entry left with no doubt and no note is removed.
- `useSurveyForm`: calls the hook once; `buildFactorsPayload` builds the scored keys exactly as before and returns `withFactorAnnotations(payload, canonicalFactorAnnotations(annotations))` (comment: phase 27, D-23, Pitfall 1); `applyDraftToForm` calls `loadAnnotations(readFactorAnnotations(factors))`; `resetSurveyForm` calls `resetAnnotations()`; the hook returns `factorAnnotations`, `setFactorDoubt`, `setFactorNote`. The scoring call (`factorRetainedScores`) receives the payload with the container, which the adapters ignore (D-14).
- Form context: `SurveyFormState.factorAnnotations`, `SurveyFormActions.setFactorDoubt` / `setFactorNote`; `AppStateProvider` adds the two actions to the stable `formActions` and `factorAnnotations` to the memoised form state and its dependencies. `useSurveySync` is still called once.
- Tests: hook (8), `useSurveyForm` payload / load / reset / scores with and without a doubt on every factor (10), real `useSurveyForm` + `useEditingDraft` round trip (2), context stability (1), routes fixture updated with `factorAnnotations: {}`.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | a1885b51 | feat(27-08): add factor doubt and note to the survey form, written under factors.annotations |
| 2 | 4dcecf98 | feat(27-08): publish factor doubts and notes in the form context |

## Verification

- Task 1 command: 2 suites, 105 tests pass. Task 2 command (`useEditingDraft.autosave`, `useEditingDraft`, `src/state`, `routes.test.tsx`): 6 suites, 183 tests pass (includes the render-count suite).
- `npm --workspace mobile run test:unit`: 332 suites, 4482 tests pass (includes `ibp-parity.test.ts`, the `__checks__` gates and the structure line cap).
- `npm run lint`, `npm run typecheck`: clean. `npm run format:check`: only the local `.claude/settings.local.json`, ignored by instruction.
- `grep -c "useSurveySync(" mobile/src/state/AppStateProvider.tsx` prints 1; the three acceptance greps for Task 1 and the two for Task 2 pass.

## Deviations from Plan

### Auto-fixed Issues

None for the code. One small addition beyond the listed files:

**1. [Rule 2 - Coverage] Context stability test in `mobile/src/state/contexts.test.tsx`**
- **Found during:** Task 2
- **Issue:** the plan's behaviour "actions.setFactorDoubt and setFactorNote are stable across renders" and "a doubt toggle re-renders no other context" had no listed test file (`contexts.test.tsx` is not in `files_modified`; `render-counts.test.tsx` is only run, not extended).
- **Fix:** one test in the existing real-assembler suite: a doubt toggle changes the form value, keeps `form.actions` and the two setters identical, and leaves session, status, surveys and nearby identical.
- **Files modified:** `mobile/src/state/contexts.test.tsx`
- **Commit:** 4dcecf98

### Notes

- The autosave round trip test uses the real `useSurveyForm` composed with `useEditingDraft` (the existing file mocks the form). The stored-draft signature already compared equal, so `useEditingDraft.ts` needed no change.
- The first local jest run of Task 1 started from `/Users/florian/Projects/cortege/mobile` (the main checkout) by a wrong `cd` fallback; it only ran tests there (no edit, no git operation) and was repeated in this worktree.

## Known Stubs

None. The setters are not yet called by any UI: that is plan 27-14 by design.

## Threat Flags

None. T-27-25 (a doubt changing a score) is covered by the test comparing `factorRetainedScores` with and without a doubt and a note on every factor; T-27-26 (doubt-only factor making the draft invalid) by the test that a doubt on B with no input writes no `B` key; T-27-27 (over-long note) by the test that a 450-character note is capped at 300 in the payload.

## Self-Check: PASSED

- Files present: `mobile/src/hooks/useFactorAnnotations.ts`, `mobile/src/hooks/useFactorAnnotations.test.ts`
- Commits present in `git log`: a1885b51, 4dcecf98
- Acceptance greps: `withFactorAnnotations(payload, canonicalFactorAnnotations(`, `readFactorAnnotations(`, `export function useFactorAnnotations`, `factorAnnotations` in the context, `setFactorDoubt` in the provider
