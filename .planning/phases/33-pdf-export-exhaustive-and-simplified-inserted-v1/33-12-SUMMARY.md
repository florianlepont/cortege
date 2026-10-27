---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 12
subsystem: mobile-survey-detail
tags: [export-choice, route-param, nonce, share]
requires: ["33-02", "33-09"]
provides:
  - "useExportRequest(request, share, onHandled): one export per nonce"
  - "share(mode: ExportMode) in useSurveyPdfExport"
  - "SurveyDetailScreen props exportRequest, onOpenExportChoice, onExportRequestHandled"
  - "SurveyDetailRoute opens surveyExportChoice and clears the request with setParams"
affects: ["33-13", "33-15"]
tech-stack:
  added: []
  patterns: ["handled-nonce ref per mount (RouteGuideRoute pattern)", "request consumed by the screen that owns the export lock"]
key-files:
  created:
    - mobile/src/screens/survey-detail/useExportRequest.ts
    - mobile/src/screens/survey-detail/useExportRequest.test.ts
  modified:
    - mobile/src/screens/survey-detail/useSurveyPdfExport.ts
    - mobile/src/screens/survey-detail/useSurveyPdfExport.test.ts
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/screens/SurveyDetailScreen.tsx
    - mobile/src/screens/SurveyDetailScreen.test.tsx
    - mobile/src/navigation/routes/SurveyDetailRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
key-decisions:
  - "The summary screen runs the export (it owns the lock, the notice and the alerts), so the OS share sheet never opens over the closing form sheet"
  - "A request is applied once per nonce: handled-nonce ref, then the route clears the parameter"
requirements-completed: [REQ-C-pdf-two-versions]
metrics:
  tasks: 2
  files: 9
status: complete
---

# Phase 33 Plan 12: Partager opens the choice sheet, the summary exports once Summary

The header's "Partager" now opens the `surveyExportChoice` sheet, and the summary screen exports in the mode the sheet returned, exactly once per request.

## What was built

- `useExportRequest`: ref of the last handled nonce; an effect on the request's nonce and mode records the nonce, calls `onHandled()` then `void share(mode)`; `share` and `onHandled` read through `useLatestCallback`.
- `useSurveyPdfExport.share(mode)` calls `buildSurveyExportInput(args, mode)`. The 33-02 draft guard coerces a summary on a draft to complete; the `running` lock, "Préparation du PDF…" notice and alerts are unchanged.
- `SurveyDetailScreen`: three new props, `useExportRequest(exportRequest, share, onExportRequestHandled)` right after `useSurveyPdfExport`, and `onShare` opens the sheet with the survey id unless `exporting`. File is 382 lines (cap 400).
- `SurveyDetailRoute`: reads `route.params?.exportRequest`, `onOpenExportChoice` navigates to `surveyExportChoice { surveyId }`, `onExportRequestHandled` calls `setParams({ exportRequest: undefined })`.
- `useSurveyDetailHeader.tsx`, the iOS native header item and the Android icon are untouched.

## Commits

- a0892b8a: useExportRequest and `share(mode)` with tests
- bd544022: screen props, screen, route wiring and tests

## Verification

- From `mobile/`: `npx jest -c jest.unit.config.js src/screens src/navigation src/__checks__ --coverage=false`: 205 suites, 2965 tests passed. The plan's task 2 run (screen, navigation, checks, survey-detail) passed (74 suites).
- Task 1 jest run: 2 suites, 23 tests passed.
- `SurveyDetailRoute.tsx` coverage under the plan's threshold command: 100 / 100 / 100 / 100.
- `npx tsc --noEmit -p .` in `mobile/`, repo-root `npm run lint` and `npm run typecheck`: exit 0.
- `npm run format:check`: only `.claude/settings.local.json` (untracked, pre-existing, unrelated) is reported.
- Between Task 1 and Task 2 the app typecheck was red (the screen still called `share()` without a mode), as the plan's ordering implies; Task 2 closes it.

## Deviations from Plan

None. `makeNavigation()` in `routes.test.tsx` gained a `setParams: jest.fn()` (additive, needed by the new assertion).

## Known Stubs

None. Until plan 33-13, `sectionsFor("summary")` is empty, so a summary export prints nothing; this is announced in the plan context and not fixed here.

## Threat Flags

None. T-33-28 (re-delivered request) is covered by tests for re-render, same nonce after the parameter was cleared or not, and new nonce; T-33-29 (summary on a draft) by a screen test showing `mode: "complete"` and `isDraft: true`.

## Notes for next plans

- 33-13: nothing to change here; the request already flows into `exportAndShareSurveyPdf` with `mode`.
- 33-15: on device, check that the share sheet appears over the summary after the form sheet has closed (Pitfall 3).

## Self-Check: PASSED

Created files exist; commits a0892b8a and bd544022 exist; STATE.md, ROADMAP.md and REQUIREMENTS.md untouched.
