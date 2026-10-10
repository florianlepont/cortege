---
phase: 29-field-feedback-fixes-inserted
plan: 07
subsystem: mobile-ui
tags: [abbreviations, info-sheet, ibp, accessibility]
status: complete

requires:
  - phase: 29-field-feedback-fixes-inserted
    provides: fr.abbreviations.terms and fr.abbreviations.sheet (plan 29-06)
provides:
  - ui/AbbreviationInfo.tsx: AbbreviationInfo, AbbreviationInfoProps, ABBREVIATION_INFO_ICON_SIZE
  - MapLegend infoTerm prop (ScoreLegend passes "IBP")
  - testID abbreviation-info-IBP on the Score IBP page, the wizard method step and the Explorer legend
affects: [29-10]

tech-stack:
  added: []
  patterns:
    - "Info control mounts its Modal only while open; 20 pt outline glyph with 12 pt hit slop reaches the 44 pt target"

key-files:
  created:
    - mobile/src/ui/AbbreviationInfo.tsx
    - mobile/src/ui/AbbreviationInfo.test.tsx
  modified:
    - mobile/src/screens/SurveyScoreScreen.tsx
    - mobile/src/screens/SurveyScoreScreen.test.tsx
    - mobile/src/screens/survey-wizard/SurveyWizardScreen.tsx
    - mobile/src/screens/survey-wizard/SurveyWizardScreen.test.tsx
    - mobile/src/screens/survey-wizard/wizard.styles.ts
    - mobile/src/screens/public-map/ScoreLegend.tsx
    - mobile/src/screens/public-map/ScoreLegend.test.tsx

key-decisions:
  - "Decision D-04: one reusable control and native page sheet reading fr.abbreviations.terms[term].long and .explanation; plain Text only, no markup"
  - "Decision D-11: IBP explained on three headers only (Score IBP page row, method step glyph, Explorer legend glyph in the map-control ink); no anchor in the survey detail score card, whose accessible group would make a nested button unreachable by VoiceOver"
  - "Reduce Motion switches the sheet animation to none through useReducedMotion"

requirements-completed: [D-04, D-11]

metrics:
  tasks: 2
  files: 9
  completed: 2026-10-11
---

# Phase 29 Plan 07: AbbreviationInfo sheet and IBP anchors Summary

One reusable `AbbreviationInfo` control (icon or row) opens a native page sheet with the long form and explanation of the shared catalogue entry, placed on the Score IBP page, the wizard method step and the Explorer legend.

## What was built

- `AbbreviationInfo`: trigger is an `AppPressable` (button role, label "Que signifie IBP ?", testID `abbreviation-info-<term>`). Icon variant: `information-circle-outline` at 20 pt with 12 pt hit slop on each side (44 pt). Row variant: glyph plus visible label, `minHeight` 44. The Modal (`pageSheet`, `slide`, `none` under Reduce Motion) is mounted only while open and closes by its `close-outline` button or `onRequestClose`.
- Score IBP page: row variant right after the `PageTitle`, so it shows whether or not the native large title draws the page title.
- Wizard: title wrapped in a `titleRow` (new style in `wizard.styles.ts`), glyph only when `step === "method"`. File is 317 lines, under the 400 cap.
- Explorer legend: `MapLegend.infoTerm?: AbbreviationTerm`; the expanded panel puts the glyph beside the title with `theme.visual.mapControl.icon`; `ScoreLegend` passes `"IBP"`; the parcel picker's legend is unchanged and tested to show none.

## Deviations from Plan

None - plan executed as written. The tests use the real `AbbreviationInfo` (adding `Pressable` and the icon/text mocks to the Score screen test) rather than a host mock, so the `abbreviation-info-IBP` testID is asserted on the real host element. Tasks were committed as one feat commit each (tests and code together).

## Verification

- `npx jest -c jest.unit.config.js src/ui/AbbreviationInfo.test.tsx src/screens/SurveyScoreScreen.test.tsx src/screens/survey-wizard src/screens/public-map src/__checks__ --coverage=false`: 26 suites, 292 tests pass
- `npm --workspace mobile run test:unit:coverage`: 325 suites, 4347 tests pass, coverage floors hold
- `npm run lint` and `npm run typecheck` exit 0; `npm run format:check` reports only the untracked local `.claude/settings.local.json` (not touched)
- The sheet's look on iOS and Android is checked in plan 29-10

## Commits

- 7560444b feat(29-07): AbbreviationInfo control and explanation sheet
- bd6aee7f feat(29-07): IBP info sheet on the Score IBP page, method step and Explorer legend

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Files and both commits verified present.
