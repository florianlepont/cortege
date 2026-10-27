---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 02
subsystem: pdf-export
tags: [pdf, export-mode, palette, fixtures, loader]
requires: []
provides:
  - ExportMode type and required `mode` on SurveyExportInput and SurveyExportData
  - PdfBlock.pageStyle ("cover" | "summary")
  - seven forest keys of the print palette
  - SUMMARY_MAP_FRAME_SIZE (515 x 228)
  - mode-aware loader (summary reads no photo, own frame size, draft guard)
  - typical and summary fixtures plus summaryVariant(kind)
affects: [33-03, 33-04, 33-05, 33-12, 33-13, 33-14]
tech-stack:
  added: []
  patterns: [mode carried as data, field-by-field copy kept, three guards against a draft summary]
key-files:
  created: []
  modified:
    - mobile/src/app/survey-pdf/types.ts
    - mobile/src/app/survey-pdf/palette.ts
    - mobile/src/app/survey-pdf/palette.test.ts
    - mobile/test/survey-export-fixtures.ts
    - mobile/src/app/survey-pdf/assemble-export-data.ts
    - mobile/src/app/survey-pdf/assemble-export-data.test.ts
    - mobile/src/app/survey-pdf/export-settings.ts
    - mobile/src/app/survey-pdf/export-settings.test.ts
    - mobile/src/app/survey-pdf-export.ts
    - mobile/src/app/survey-pdf-export.test.ts
    - mobile/src/screens/survey-detail/useSurveyPdfExport.ts
    - mobile/src/screens/survey-detail/useSurveyPdfExport.test.ts
    - mobile/src/app/survey-pdf/run-export.test.ts
decisions:
  - "Mode travels as data (required field), so no pipeline signature changes and the facade keeps three functions"
  - "A summary is coerced to complete in the hook (canEditSurvey) and in the loader (isDraft), each with a debug log tag"
  - "Only the solid-contract palette keys were added; the probe-gated keys (forestEnd, bar-top tints) are not"
metrics:
  tasks: 3
  completed: 2026-10-24
status: complete
---

# Phase 33 Plan 02: Export mode, forest palette and mode-aware loader Summary

The export mode (`complete` or `summary`) is now a required field of the input and the data, the print palette has its seven forest colours with their contrast pinned, and the loader skips photos, uses a 515 x 228 map frame for the summary and never lets a draft become a summary.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Export mode, page kind and the forest palette keys | 986d7a2f |
| 2 | Fixtures with a mode, and a loader that reads per mode | 64ef7525 |
| 3 | Facade type export and the hook's input with the draft guard | 24c3f628 |

## What was built

- `types.ts`: `ExportMode`, required `mode` on `SurveyExportInput` (inherited by `SurveyExportData`), `PdfBlock.pageStyle?: "cover" | "summary"`, seven `PdfPalette` keys.
- `palette.ts`: `forest` (brand forest), `forestDeep` (`forestStops.a`), `onForest`, `onForestAccent`, `onForestBody`, `contourMoss` (light theme `visual.forest`), `contourSage` (sage at `contourDrift.sageOpacity` pre-blended over forest with `compositeOver`, an opaque hex). Tests pin the UI-SPEC contrast pairs (text 4.5, graphics 3, contour decoration 2).
- `export-settings.ts`: `SUMMARY_MAP_FRAME_SIZE = 515 x 228`, flagged as not yet measured on a device (plan 33-14).
- `assemble-export-data.ts`: effective mode computed once; summary gets `NO_PHOTOS` with no `listPhotos` or `preparePhotos` call; frame size by mode into `frameFor`/`loadMapPiece` and `map.frameSize`; a summary of a draft becomes complete and logs `surveyExport.modeCoerced`; `mode` added to the field-by-field copy (no spread of the input).
- Fixtures: `mode: "complete"` on the two base fixtures (worst case inherits), plus `exportFixtureTypical`, `exportFixtureTypicalConditioned`, `exportFixtureSummary`, `exportFixtureSummaryWorst` and `summaryVariant(kind)` (`noBasemap`, `noGeometry`, `noParcel`, `noHistory`, `firstSurvey`, `staleCache`). The worst-case complete fixture keeps its literal 515 x 340 frame, so the pinned page counts did not move.
- Facade exports the `ExportMode` type (runtime keys unchanged). `buildSurveyExportInput(args, requested)` coerces a summary to complete when `canEditSurvey` is true, logging `surveyDetail.exportModeCoerced`. `share()` still takes no argument and asks `"complete"` (plan 33-12 gives it the mode).

## Verification

- `cd mobile && npx jest -c jest.unit.config.js src/app/survey-pdf src/app/survey-pdf-export.test.ts src/screens/survey-detail src/__checks__ --coverage=false`: 76 suites, 1130 tests green. `SurveyDetailScreen.test.tsx` green (40 tests).
- `npx tsc --noEmit -p .` in `mobile/`, `npm run lint`, `npm run typecheck`: green (exit 0).
- `npm run format:check`: all files I touched pass; the only warning is `.claude/settings.local.json` (an untracked local settings file, not part of the repo and not touched by this plan; pre-existing).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `mode` added to nine more test literals**
- **Found during:** Task 3 (`tsc` after making `mode` required)
- **Issue:** `conditions-section`, `factor-chart-svg`, `factor-section`, `identity`, `map-section`, `photos-section`, `route-section`, `score-section` and `trend-section` tests build a `SurveyExportData` literal, which no longer typechecked.
- **Fix:** added `mode: "complete"` to each `makeData` literal (the plan's Task 3 allows fixing the literals `tsc` reports).
- **Files modified:** the nine `*.test.ts` files under `mobile/src/app/survey-pdf/`
- **Commit:** 24c3f628

Otherwise the plan was executed as written. The whole-app typecheck was red between Tasks 1 and 3 as the plan announced.

## Notes for the next plans

- Read `data.mode`, `PdfBlock.pageStyle` and the seven palette keys; nothing else in this plan needs to change.
- `summaryVariant("firstSurvey")` has one history item, the current survey (`survey-v32`); `staleCache` has three items none of which is the current survey.
- `exportFixtureTypical` carries a 515 x 340 basemap built from `MAP_FRAME_SIZE`; the summary fixtures use `SUMMARY_MAP_FRAME_SIZE`.
- `eslint` must be run from the workspace folder (`mobile/`) or through `npm run lint`; running `npx eslint` from the repo root fails with a tsconfig parsing error.

## Known Stubs

None.

## Threat Flags

None. T-33-03 (token/URL leak) is covered by a loader test on the serialised summary; T-33-04 (draft summary) by the hook and loader guards; T-33-05 (photo cost on the summary path) by a test asserting the photo readers are never called.

## Self-Check: PASSED

- Commits 986d7a2f, 64ef7525, 24c3f628 exist in the branch.
- All thirteen plan files exist and are modified as listed.
