---
phase: 33-pdf-export-exhaustive-and-simplified-inserted-v1
plan: 05
subsystem: mobile-ui
tags: [export-choice, catalogue, radio-card, accessibility]
requires: ["33-02"]
provides:
  - "fr.surveyExportChoice catalogue module"
  - "useExportChoice hook"
  - "ExportModePicker and ExportChoiceSheet components"
affects: ["33-09", "33-12"]
tech-stack:
  added: []
  patterns: ["finish-sheet pattern copied (ScrollView sheet, styles factory, useLatestCallback hook)"]
key-files:
  created:
    - mobile/src/i18n/fr/survey-export-choice.ts
    - mobile/src/i18n/fr/survey-export-choice.test.ts
    - mobile/src/screens/export-choice/useExportChoice.ts
    - mobile/src/screens/export-choice/useExportChoice.test.ts
    - mobile/src/screens/export-choice/ExportModePicker.tsx
    - mobile/src/screens/export-choice/ExportChoiceSheet.tsx
    - mobile/src/screens/export-choice/export-choice.styles.ts
    - mobile/src/screens/export-choice/ExportChoiceSheet.test.tsx
  modified:
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/catalogue.test.ts
key-decisions:
  - "The picker receives the group and dimmed style keys from the sheet's styles factory, so every style key is read (structure gate) and the 4-grid gap lives in one file"
  - "The late draft fallback is derived (mode is complete whenever isDraft) rather than synced by an effect, so no frame ever reports summary on a draft"
metrics:
  tasks: 2
  files: 10
status: complete
---

# Phase 33 Plan 05: Export choice sheet content Summary

The content of the export choice sheet (UI-SPEC Surface A): its own catalogue module `fr.surveyExportChoice`, a selection hook where a draft can never reach the summary, a two-card radio picker and the sheet layout. The sheet never exports; confirm hands the chosen mode to the caller (route in 33-09, export run in 33-12).

## What was built

- `fr.surveyExportChoice` (title, group label, "Complet" with `caption({ count })` ending "Environ N pages.", "Résumé" ending "1 page.", draft sentence and its spoken form, "Exporter le PDF" with per-mode spoken labels, cancel shared with `fr.common.actions.cancel`). Registered in `fr` next to `surveyFinish`; `survey-detail.ts` untouched. The singular "1 page" is handled for a count of 1.
- `useExportChoice({ isDraft, surveyFound, onConfirm, onClose })` returns `{ mode, select, confirm }`: state starts at complete on every mount (nothing remembered), `select` ignores the summary on a draft and the current mode, one `feedback.selection()` on a real change, `confirm` passes the effective mode, an effect calls `onClose` once when the survey is missing.
- `ExportModePicker`: `radiogroup` "Type de PDF", `RadioCard` "Complet" (`documents-outline`, `export-option-complete`) and "Résumé" (`document-text-outline`, `export-option-summary`); on a draft the summary card is disabled, wrapped in an `opacity: 0.55` view and spoken as unavailable.
- `ExportChoiceSheet`: one `ScrollView` (title as header, picker, polite live region with the 16 pt hidden `lock-closed-outline` glyph and the draft sentence, primary "Exporter le PDF" `export-choice-confirm`, secondary "Annuler" `export-choice-cancel`), spoken confirm label by mode and site name.
- `createExportChoiceStyles(theme, insets)` on the 4-grid (16, 12, 8, 24; sheet padding 20).

## Commits

- b6136bdf: catalogue module, registration, `useExportChoice` and their tests
- 93200c6a: picker, sheet, styles, sheet test, catalogue key list update

## Verification

- `npx jest -c jest.unit.config.js src/screens/export-choice src/i18n src/__checks__ --coverage=false` (from `mobile/`): 19 suites, 257 tests passed (structure, icons, dash, abbreviations, motion and fonts gates included)
- `npm run lint`: clean. `npm run typecheck`: clean.
- `npm run format:check`: only `.claude/settings.local.json` is reported (untracked, pre-existing, unrelated); every file of this plan is formatted.
- `RadioCard.tsx`, `VisibilityPicker.tsx` and `FinishSheet.tsx` unchanged.

## Deviations from Plan

**1. [Rule 3 - Blocking] `mobile/src/i18n/catalogue.test.ts` lists every `fr` section.**
- **Found during:** Task 2 full i18n run
- **Issue:** registering `surveyExportChoice` in `fr` made the section-list test fail
- **Fix:** added `"surveyExportChoice"` to the expected list (file not named in the plan)
- **Commit:** 93200c6a

## Known Stubs

None. The sheet is not yet mounted by any route; that is plan 33-09 by design.

## Notes for next plans

- 33-09 (route): pass `isDraft = survey.status !== "submitted"`, `surveyFound`, `siteName`, `completePages` (the page-count estimate) to `useExportChoice` / `ExportChoiceSheet`; `onConfirm(mode)` should navigate back to `surveyDetail` with `exportRequest { mode, nonce }`.
- `ExportMode` is imported as a type from `app/survey-pdf-export`.
- The 0.65 detent still needs confirming on the owner iPhone (UI-SPEC A.1).

## Self-Check: PASSED

All 8 created files exist; commits b6136bdf and 93200c6a exist; STATE.md, ROADMAP.md and REQUIREMENTS.md untouched.
