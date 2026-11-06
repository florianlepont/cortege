---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 09
subsystem: mobile-navigation
tags: [export-choice, navigation, form-sheet, page-estimate]
requires: ["33-05"]
provides:
  - "estimateCompletePages and COMPLETE_BASE_PAGES, exported by the facade"
  - "surveyExportChoice route, exportChoiceScreenOptions, SurveyExportRequest, surveyDetail exportRequest param"
  - "ExportChoiceRoute"
affects: ["33-12", "33-13", "33-15"]
tech-stack:
  added: []
  patterns: ["finish-sheet route copied", "phase 30 pickNonce popTo merge pattern for the result"]
key-files:
  created:
    - mobile/src/app/survey-pdf/page-estimate.ts
    - mobile/src/app/survey-pdf/page-estimate.test.ts
    - mobile/src/navigation/routes/ExportChoiceRoute.tsx
    - mobile/src/navigation/routes/ExportChoiceRoute.test.tsx
  modified:
    - mobile/src/app/survey-pdf-export.ts
    - mobile/src/app/survey-pdf-export.test.ts
    - mobile/src/navigation/types.ts
    - mobile/src/navigation/stacks/stack-options.ts
    - mobile/src/navigation/stacks/SurveysStack.tsx
    - mobile/src/navigation/navigation.test.tsx
key-decisions:
  - "The route imports estimateCompletePages from its own module, not the facade, so the navigation tree does not load expo-print and expo-sharing"
metrics:
  tasks: 2
  files: 10
status: complete
---

# Phase 33 Plan 09: Export choice route and page estimate Summary

The choice sheet of 33-05 is now a route of the survey stack (`surveyExportChoice { surveyId }`), presented as a native form sheet on iOS (grabber, detents 0.65 and 1, no header) and a modal on Android, and it hands the chosen mode back to the summary through `popTo("surveyDetail", { exportRequest: { mode, nonce } }, { merge: true })`. The route never exports and never opens the share sheet.

## What was built

- `page-estimate.ts`: `COMPLETE_BASE_PAGES = 5` and `estimateCompletePages({ photoCount })` = base + ceil(min(max(count, 0), 24) / 6), never below 2, NaN read as 0. Re-exported by the facade (now four functions and three types).
- `types.ts`: `SurveyExportRequest`, `surveyDetail: { exportRequest?: SurveyExportRequest } | undefined` (existing `navigate("surveyDetail")` callers compile unchanged), `surveyExportChoice`, `ExportChoiceRouteProps`.
- `stack-options.ts`: `exportChoiceScreenOptions(theme)`; `SurveysStack.tsx` registers the screen right after `surveyFinish`.
- `ExportChoiceRoute`: survey read from the local list (missing: the sheet closes through `useExportChoice` and nothing is drawn), `isDraft = status !== "submitted"` (D-09, D-18), photo count from the selected survey's attachments only when it is this survey, cancel goes back only when focused.

## Commits

- ce51762b: page estimate and facade export
- 3fc52a83: route, options, stack registration, types and tests

## Verification

- From `mobile/`: `npx jest -c jest.unit.config.js src/navigation src/app/survey-pdf src/app/survey-pdf-export.test.ts src/__checks__ --coverage=false`: 55 suites, 1177 tests passed.
- `ExportChoiceRoute.tsx` coverage under the plan's threshold command: 100 / 100 / 100 / 100.
- `npx tsc --noEmit -p .` (mobile): clean. Repo root: `npm run lint` and `npm run typecheck` exit 0.
- `npm run format:check`: only `.claude/settings.local.json` is reported (untracked, pre-existing, unrelated); every file of this plan is formatted.
- `types.ts` 212 lines, `SurveysStack.tsx` 283 lines (cap 400).

## Deviations from Plan

**1. [Rule 3 - Blocking] The route imports `estimateCompletePages` from `survey-pdf/page-estimate`, not the facade.**
- **Found during:** Task 2 navigation run
- **Issue:** importing the facade made `wizard-reset-flow.test.tsx` (which mounts the real survey stack) load `expo-print`, which Jest cannot parse
- **Fix:** direct module import with a comment; the facade still exports the same function (identity checked by the facade test)
- **Commit:** 3fc52a83

## Known Stubs

None. `COMPLETE_BASE_PAGES = 5` is the planned provisional value; plan 33-13 replaces it from the final builder and pins it to the fixtures. Nothing opens `surveyExportChoice` yet: plan 33-12 does that and consumes `exportRequest`.

## Notes for next plans

- 33-12: open with `navigation.navigate("surveyExportChoice", { surveyId })`; consume `route.params?.exportRequest` once per `nonce` in the summary screen, then run the export.
- 33-13: set `COMPLETE_BASE_PAGES` from the builder and add the fixture pin test.
- 33-15: confirm the 0.65 detent on the owner iPhone (only the number in `exportChoiceScreenOptions` changes).

## Self-Check: PASSED

All 4 created files exist; commits ce51762b and 3fc52a83 exist; STATE.md, ROADMAP.md and REQUIREMENTS.md untouched.
