---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 05
subsystem: mobile
tags: [visibility, privacy, sync-queue, navigation, dead-code-removal]
status: complete
requires:
  - phase: 29-02
    provides: "updateSurveyVisibility result with frozen; queue-only storage guard"
provides:
  - "actions.setDraftVisibility(surveyId, visibility): silent queue-only write resolving stored, unchanged or frozen"
  - "submitSurvey resolves FinishOutcome: submitted, not_submitted or busy"
  - "Parcel history opens the owner's own surveys on the owner's summary"
affects: [29-07]
tech-stack:
  added: []
  patterns:
    - "Visibility is written through the queue only (empty token); the finish's own drain sends it"
key-files:
  created:
    - mobile/src/navigation/routes/SurveyHistoryRoute.test.tsx
  modified:
    - mobile/src/hooks/survey-sync/useSurveySyncSurveyOperations.ts
    - mobile/src/hooks/survey-sync/useSurveySyncSurveyOperations.test.ts
    - mobile/src/hooks/useSurveySync.ts
    - mobile/src/hooks/useSurveySync.test.ts
    - mobile/src/state/surveys-context.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/i18n/fr/status/survey-ops.ts
    - mobile/src/hooks/useSurveyList.ts
    - mobile/src/hooks/useSurveyList.test.ts
    - mobile/src/app/types.ts
    - mobile/src/app/survey-logic.ts
    - mobile/src/app/survey-logic.test.ts
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/navigation/routes/SurveyHistoryRoute.tsx
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/screens/survey-form/usePagerFinish.ts
key-decisions:
  - "D-05/D-07: setDraftVisibility is silent (no status, no sync); frozen after submit; a failed local write rejects"
  - "D-02: the toggle action chain, its eight status messages and the privé/public words block are deleted"
  - "D-15: the visibilityFilter list filter is removed, not given a UI (no screen has read or set it since the list rewrite)"
  - "D-10: a survey the phone holds opens the owner's summary (openSurvey then popTo surveyDetail); others open the community page"
metrics:
  tasks: 3
  completed: 2026-10-13
---

# Phase 29 Plan 05: setDraftVisibility, FinishOutcome and dead plumbing removal Summary

**The finish step can now store the privacy choice silently and learn whether the survey was really submitted; the unused toggle chain with its "public" wording and the dead visibility list filter are gone, and parcel history opens one's own surveys on the owner's summary.**

## Accomplishments

- `handleSetDraftVisibility` (exposed as `actions.setDraftVisibility`) calls `updateSurveyVisibility(apiUrl, "", id, visibility)` (queue only), refreshes the local list and resolves `"stored"`; `"unchanged"` when nothing was queued, `"frozen"` for a submitted survey; rejects on a local write failure; never sets a status or syncs.
- `finishSurvey` and `handleSubmitSurvey` return `FinishOutcome`: `"submitted"` only on a server accept; `"not_submitted"` for every other ending (not found, already submitted, conflict, name missing, draft missing or not ready, offline postponed, drain incomplete or blocked, owner mismatch, login required, refusal, failure); `"busy"` for a second call while the first runs. Status messages and their order are unchanged.
- The hook lost its now unused `accessToken` parameter.
- Deleted: `handleToggleVisibility` chain (hook, `useSurveySync` pass-through, `SurveyActions.toggleVisibility`, provider entry), the `visibility` words block and the eight visibility messages in `status/survey-ops.ts`.
- Deleted the `visibilityFilter` type, field, state, setter, reset, context fields, filter line and tests.
- `SurveyHistoryRoute`: own ids route to `openSurvey` then `popTo("surveyDetail")`; other ids still push `communitySurvey`. New route test covers both and the call order.

## Task Commits

1. Task 1: setDraftVisibility, FinishOutcome, toggle chain removed - `cc42588d`
2. Task 2: visibilityFilter removed - `8fbca204`
3. Task 3: parcel history own-survey routing - `652d63b5`

## Owner-facing decisions

- **D-15:** `visibilityFilter` is removed rather than given a UI.
- **Toggle removal:** the network-calling toggle action is removed and replaced by the queue-only action; no caller outside tests existed.

## Verification Run

- `npm run lint`, `npm run typecheck`: pass.
- `npm --workspace mobile run test:unit`: 406 suites, 5928 tests pass.
- `npx prettier --check` on every changed file: pass (`npm run format:check` only flags the untracked `.claude/settings.local.json`, ignored by instruction).
- `grep -rn "toggleVisibility\|handleToggleVisibility\|visibilityFilter\|VisibilityFilter" mobile/src`: nothing; `grep -c "visibilitySynced\|visibilityFailed"` on `survey-ops.ts`: 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened two caller prop types to `Promise<unknown>`**
- **Found during:** Task 1 (`tsc`)
- **Issue:** `submitSurvey` now resolves `FinishOutcome`; `usePagerFinish` (`submitSurvey`) and the survey detail screen props (`onSubmitSurvey`) were typed `Promise<void>`, which broke FactorDetailRoute and SurveyDetailRoute.
- **Fix:** both typed `Promise<unknown>`; they still ignore the value. Plan 29-07 will consume the outcome.
- **Files:** `mobile/src/screens/survey-form/usePagerFinish.ts`, `mobile/src/screens/survey-detail/screen-props.ts`
- **Commit:** `cc42588d`

**2. [Rule 1 - Dead parameter] Removed `accessToken` from `useSurveySyncSurveyOperations` params**
- Only the deleted toggle used it; keeping it would be an unused variable (lint). Caller in `useSurveySync.ts` and the test helper updated.

**3. TDD order:** Tasks 1 and 3 are marked `tdd="true"`; tests were written in the same pass as the implementation (Task 3 test file written before the route edit, but no separate RED run was recorded).

## Known Stubs

None.

## Threat Flags

None. T-29-14 (toggle chain deleted, only writer is the frozen-aware queue-only action), T-29-15 (explicit FinishOutcome, tests per ending) and T-29-16 (own ids routed to the owner's summary) mitigated as planned.

## Notes for Later Plans

- 29-07 (finish sheet) consumes `actions.setDraftVisibility` and the `FinishOutcome` of `actions.submitSurvey`; `usePagerFinish` and `onSubmitSurvey` still discard the result.

## Self-Check: PASSED

- Files: `SurveyHistoryRoute.test.tsx` and all modified files present.
- Commits found: `cc42588d`, `8fbca204`, `652d63b5`.
- STATE.md and ROADMAP.md untouched.
