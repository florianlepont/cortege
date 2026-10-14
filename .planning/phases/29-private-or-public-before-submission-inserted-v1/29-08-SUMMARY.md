---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 08
subsystem: mobile
tags: [visibility, privacy, navigation, finish-flow, summary]
status: complete
requires:
  - phase: 29-03
    provides: "resolveVisibilityLine, SummaryHeader visibilityLine prop"
  - phase: 29-07
    provides: "surveyFinish route { surveyId }, FinishSheet"
provides:
  - "Summary FinishBar opens the surveyFinish sheet (onOpenFinish) instead of submitting"
  - "Factor pager 'Terminer le relevé' pill opens the same sheet (usePagerFinish openFinish)"
  - "Read-only visibility line on the owner's summary header (D-15)"
affects: [29-10 device gate]
tech-stack:
  added: []
  patterns:
    - "The finish sheet is the single caller of submitSurvey; entry points only navigate"
key-files:
  modified:
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/screens/SurveyDetailScreen.tsx
    - mobile/src/screens/SurveyDetailScreen.test.tsx
    - mobile/src/navigation/routes/SurveyDetailRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/screens/survey-form/usePagerFinish.ts
    - mobile/src/screens/survey-form/usePagerFinish.test.ts
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - mobile/src/navigation/routes/FactorDetailRoute.test.tsx
  deleted:
    - mobile/src/screens/survey-form/PagerFinishNotice.tsx
    - mobile/src/screens/survey-form/PagerFinishNotice.test.tsx
key-decisions:
  - "D-04: both finish entries only navigate to surveyFinish; submitSurvey has one caller, FinishSheetRoute"
  - "D-15: SurveyDetailScreen passes visibilityLine={resolveVisibilityLine(selectedSurvey)} to SummaryHeader, nowhere else"
  - "PagerFinishNotice deleted: FinishStatusNotice was its only caller"
metrics:
  tasks: 2
  completed: 2026-10-13
requirements-completed: [REQ-C-privacy-choice]
---

# Phase 29 Plan 08: Finish entries point at the submission step Summary

**Both "Terminer le relevé" entries (summary FinishBar and factor pager pill) now open the `surveyFinish` sheet, and the owner's summary shows the stored visibility as a read-only line.**

## Accomplishments

- `screen-props.ts`: `onSubmitSurvey` replaced by `onOpenFinish(surveyId): void`.
- `SurveyDetailScreen.tsx`: FinishBar calls `onOpenFinish`; SummaryHeader receives `visibilityLine={resolveVisibilityLine(selectedSurvey)}`. File went 367 to 369 lines (cap 400).
- `SurveyDetailRoute.tsx`: `onOpenFinish` (`useLatestCallback`) navigates to `surveyFinish` with `{ surveyId }`; `actions.submitSurvey` is no longer passed to the screen.
- `usePagerFinish({ survey, draft, openFinish, onFinished })` returns `{ offered, finish }`. `finish` marks the finish as requested and calls `openFinish(survey.id)`; the status-`submitted` effect still calls `onFinished` once, so `FactorDetailRoute` still `popTo("surveyDetail")` on success. Flush, submit, busy and attempts are gone (the sheet owns them since 29-07).
- `FactorDetailRoute.tsx`: `FinishStatusNotice`, `useStatus`, `useState` and the surveys actions reader removed; `finishAction` has `loading: false`, `notice: null`.
- `PagerFinishNotice.tsx` and its test deleted (grep showed no other caller).
- Tests: summary press and the two line texts ("Partagé avec l'association" for a submitted shared survey, "Restera privé (choix à la fin)" for a private draft); route navigation and no submit call; hook behaviours (opens once for the survey id, onFinished once on submitted, no navigation for a status change not requested from here, no survey does nothing); FactorDetailRoute pill idle, no notice, opens `surveyFinish`; routes.test pager block rewritten (the pill opens the sheet, success pops to the summary, a closed sheet leaves the pager untouched).

## Task Commits

1. Task 1, summary path: `19970da7`
2. Task 2, pager path: `59136a0f`

## Deviations from Plan

None. The summary FinishBar test and routes.test already existed for the old prop and were moved to the new one; the old calm-failure notice tests in `routes.test.tsx` and `FinishStatusNotice` coverage were removed with the code they tested (a failed finish is now reported by the sheet, 29-07). TDD: tests written in the same pass as the code, no separate RED commit (as in 29-03/05/07).

## Known Stubs

None.

## Threat Flags

None. T-29-27: `grep -rn "\.submitSurvey" mobile/src/navigation mobile/src/screens` outside tests prints only `FinishSheetRoute.tsx`; `onSubmitSurvey` appears nowhere in `mobile/src`; `useStatus` and `submitSurvey` count 0 in `FactorDetailRoute.tsx` and `usePagerFinish.ts`. T-29-28: diff against the merge base with `origin/main` of `app/survey-pdf`, `screens/public-map`, `screens/global-search` and `CommunitySurveyScreen.tsx` is empty (D-16, D-17).

## Verification Run

- `npm run lint`, `npm run typecheck`: pass.
- `npm --workspace mobile run test:unit`: 409 suites, 5969 tests pass (includes `src/__checks__`).
- `npx prettier --check` on every changed file: pass.

## Notes for Later Plans

- 29-10 device gate: on the owner iPhone, check the pager pill opens the sheet over the pager, and that success returns to the summary with the haptic, halo and pop.

## Self-Check: PASSED

- Modified files present; the two PagerFinishNotice files are deleted on purpose.
- Commits found: `19970da7`, `59136a0f`.
- STATE.md and ROADMAP.md untouched.
