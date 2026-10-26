---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 17
subsystem: mobile-pdf-export
tags: [pdf, export-choice-sheet, factor-chart, identity-card, gap-closure, owner-review]
requires: [33-16]
provides:
  - export choice sheet without "Annuler", with a close cross (Fermer), 24 of room, fitted to its content on iOS
  - grouped factor chart (stand and context panels with the domain sub-scores) in the complete and the summary PDF
  - identity card that prints the whole parcel list with a line-counting estimate, and the observation year only when it adds information
  - exportFixtureManyParcels (30 ids), used by 33-18 too
affects: [33-18]
key-files:
  modified:
    - mobile/src/i18n/fr/survey-export-choice.ts
    - mobile/src/i18n/fr/survey-export-choice.test.ts
    - mobile/src/screens/export-choice/ExportChoiceSheet.tsx
    - mobile/src/screens/export-choice/export-choice.styles.ts
    - mobile/src/screens/export-choice/ExportChoiceSheet.test.tsx
    - mobile/src/navigation/routes/ExportChoiceRoute.tsx
    - mobile/src/navigation/routes/ExportChoiceRoute.test.tsx
    - mobile/src/navigation/stacks/stack-options.ts
    - mobile/src/navigation/navigation.test.tsx
    - mobile/src/app/survey-pdf/factor-chart-svg.ts
    - mobile/src/app/survey-pdf/factor-chart-svg.test.ts
    - mobile/src/app/survey-pdf/summary-section.ts
    - mobile/src/app/survey-pdf/summary-section.test.ts
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/i18n/fr/survey-export.test.ts
    - mobile/src/app/survey-pdf/identity.ts
    - mobile/src/app/survey-pdf/identity.test.ts
    - mobile/test/survey-export-fixtures.ts
    - mobile/src/app/survey-pdf/build-html.test.ts
decisions:
  - "The identity estimate now counts the card's 2 unit border (CARD_BORDER): without it the 30-id wide list printed 387.75 against an estimate of 386"
  - "The close cross shows on iOS and Android (orchestrator default, U-17)"
  - "No year row when the year is unknown (orchestrator default)"
metrics:
  tasks: 4
  completed: 2026-10-26
status: complete
---

# Phase 33 Plan 17: the owner's iPhone review, first half (sheet, grouped charts, identity card) Summary

The export choice sheet loses "Annuler" for a close cross and fits its content on iOS, both factor charts show the stand and context groups as two labelled solid panels, and the identity card prints every parcel id with an honest height estimate and the observation year only when it differs from the date's year; no page-count pin moved.

## What changed

| Task | Commit | Change |
|---|---|---|
| 1 | e7cbbce0 | `fr.surveyExportChoice.cancel` removed, `closeA11y` ("Fermer", shared with `fr.common.actions.close`) added; sheet title and an `AppPressable` close cross (44 x 44, `close-outline` 20, testID `export-choice-close`) share one row; one `GlassButton` left (the primary); `SHEET_PADDING_X` 24 and `paddingTop` 24 (plus the Android inset); the prop `onCancel` became `onClose`, the route passes `handleClose` (goes back only when focused) |
| 2 | d880d0a1 | `exportChoiceScreenOptions.sheetAllowedDetents` is `"fitToContents"` (finish sheet keeps `[0.65, 1]`); `createExportChoiceStyles(theme, insets, windowHeight)`: the scroll view has no `flex`, `flexGrow: 0` and `maxHeight: windowHeight - insets.top`; the sheet reads `useWindowDimensions().height` |
| 3 | 5ece3751 | `chartGroupLabels(scores)`, `ChartGroups`, required 4th argument of `buildFactorChartSvg`; two `chart-group` rects (rx 8, 1 unit `line` stroke, fill `paper` in the complete chart and `panel` in the summary) with a `chart-group-label` each; plot top 34, bottom margin 18; grid lines per panel; caption row and its constants removed; `fr.surveyExport.scores.groupNames`, `stand` and `context` built from the same two names |
| 4 | 81c129eb | `Row.lines`, `PARCEL_IDS_PER_LINE = 3`, year helper and year rule, `CARD_BORDER` in the estimate, `exportFixtureManyParcels`, build-html "whole blocks" case and a no-ellipsis test for the identity block |
| fix | fb945cb3, 20ca02c0 | prettier on `summary-section.ts` (a blank line left by task 3); the chart test's dash assertion written as `"—"` so the added-lines check is clean |

## Chrome observations (harness of 33-RENDER-HARNESS.md, layout android 4/3, one unit = one point)

### Grouped charts (Task 3)

- Complete PDF, page 2 of `exportFixtureTypical` (120 dpi). The chart card (beige) holds two white rounded panels with a thin line border. The left one (A to G) is headed "Peuplement et gestion : 20 / 35", the right one (H to J) "Contexte : 12 / 15", both centred in the header band in dark ink at 8. The bars start under the header with their values above them, the grey grid lines stop inside each panel, the 18 unit gap between the panels is clean, the letters sit inside the panel at the bottom. The ochre bars keep a visible contrast against the white fill. The chart block is the same height as before (page 2 layout unchanged: identity card, chart card, factor heading, factor A).
- Summary, `exportFixtureSummary` (120 dpi). In Z2 right, the same two panels in the beige `panel` fill on the paper page, headed "Peuplement et gestion : 20 / 35" and "Contexte : 12 / 15". The context panel (about 84 wide) holds its label with a few units to spare. The forest card, map and trend zones did not move; the page is still one page.
- `pdftotext -bbox`. Page 2 of the complete PDF: "Peuplement" 159.1 to 201.6, the last word of the stand label ("35") ends at 276.1, "Contexte" 439.8 to 471.8, its "15" ends at 506.4, all under the chart's right edge (544). Summary: "Peuplement" 296.0 to 338.5, "35" ends at 413.1, "Contexte" 479.7 to 511.8, "15" ends at 546.4, under 555.

### The 30-parcel identity card (Task 4)

| Fixture | Printed id lines | Parcels row (Commune top minus Parcelle(s) top) | Row estimate | Printed card (Score heading top minus Identification heading top) | Card estimate |
|---|---:|---:|---:|---:|---:|
| `77186000AB0001` to `0030` (narrow) | 8 | 109.5 | 136 | 361.5 | 388 |
| `2A004000WM0001` to `0030` (wide) | 10 | 135.75 | 136 | 387.75 | 388 |

Both are at or under their estimates. Both renders (page 2, 80 dpi) show the whole list wrapped between ids with no ellipsis, no year row (the date is in 2026 as is the year), the Commune row `2A004 (département 2A)` for the wide list, and the chart card right under the identity card on the same page. The builder counts 5 pages for both fixtures (the cover still shortens the list: plan 33-18).

Page counts of the harness cases after all changes, builder equal to the earlier values: v3.2 4, v3.2 with route 5, v3.0 draft 4, typical 6, typical with conditions and route 7, worst 10, summaries 1.

## Sheet check

Not checked on a simulator: no simulator was booted and reaching the sheet needs the throwaway in-app harness of 33-14, which is plan 33-18 Task 4's job. What the tests prove: the options object (`fitToContents` on iOS, modal on Android, grabber visible), the scroll view style (no `flex`, `flexGrow` 0, `maxHeight` 852 with a 0 inset and 793 with a 59 inset), the tree order (title, cross, cards, draft sentence, button), a single `GlassButton`, the cross pressing `onClose` and never `onConfirm`, and the route going back only when focused. The look at the default and the largest text size and the fixed-detent fallback (UI-SPEC A.7) remain for 33-18.

## Verification

- `npm run lint`, `npm run typecheck`: clean. `npm run format:check`: only the pre-existing `.claude/settings.local.json`.
- `mobile` full unit run with coverage: 455 suites, 7135 tests passed, coverage thresholds held.
- No U+2014 in an added line (the plan's added-lines grep for the character prints 0). `map-projection.ts`, `sections.ts` and `survey-pdf-export.ts` untouched. No page-count pin of `build-html.test.ts` edited (`git diff` shows no removed `pages:` line); the file only gained the 30-parcel entries.
- Greps of the acceptance criteria: `export-choice-close` 1, `close-outline` 1, `<GlassButton` 1, `export-choice-cancel` 0, `closeA11y: commonFr.actions.close` 1, `SHEET_PADDING_X = 24` 1, `fitToContents` 1 and `[0.65, 1]` 1, `maxHeight: windowHeight - insets.top` 1, `ExportChoiceSheet.tsx` 113 lines, `PARCEL_IDS_PER_LINE = 3` 1, `exportFixtureManyParcels` 1, `chartGroupLabels` exported, no code `chart-caption`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The identity estimate was below the Chrome print by the card's border**
- **Found during:** Task 4, Chrome check
- **Issue:** with the plan's id-count rule alone, the 30-id wide list printed a card of 387.75 against an estimate of 386 (the plan requires the estimate at or above the print). The 1-parcel baseline showed the same gap (289.5 printed against 288): the 2 unit border (1 + 1) of the card was never counted, so the shortfall predates this plan and was hidden by the fill factor and the shorter lists.
- **Fix:** `CARD_BORDER = 2` added to the identity block height. The two exact-estimate tests of `identity.test.ts` moved by 2 (the "29 units shorter" test reads 27); no page-count pin moved.
- **Files modified:** `mobile/src/app/survey-pdf/identity.ts`, `mobile/src/app/survey-pdf/identity.test.ts`
- **Commit:** 81c129eb

Otherwise the plan was executed as written. The "RED first" order was followed for Task 1 (the tests failed on the missing prop and key), Tasks 2 to 4 were written test and code together within the task and checked red or green by the same runs.

## Known Stubs

None.

## Threat Flags

None. T-33-39 (escaped label and fill, tested with a `"><script>` pair), T-33-40 (an `<i>` id inside a 30-id list, tested), T-33-41 (cross and hardware back, scroll view bound, tested; simulator look is 33-18) and T-33-43 (labels from `data.scores`, a mismatching total is never used, tested) are mitigated.

## For plan 33-18

- `exportFixtureManyParcels` exists (30 ids `77186000AB0001` to `0030`, no map, no history, no photo); the cover still shortens a long list, and the identity block test of `build-html.test.ts` is scoped to the identity block for that reason.
- The identity estimate now includes the 2 unit border, so any re-measure compares against 388 for the 30-id fixture and 20 + 2 + 24 + rows + 1 + 24 + rows + 10 in general.
- The wide 30-id list takes 10 lines (136 units); the identity card plus the chart card still share page 2 with no map in the body.
- `MAP_FRAME_SIZE` is untouched; the cover map and the removal of the body map are not started.
- The sheet's look on the iOS simulator (default and largest text size, draft and submitted) is not done.

## Self-Check: PASSED

Commits found in git log: e7cbbce0, d880d0a1, 5ece3751, 81c129eb, fb945cb3, 20ca02c0. Created files: this summary, `exportFixtureManyParcels` in `mobile/test/survey-export-fixtures.ts`.
