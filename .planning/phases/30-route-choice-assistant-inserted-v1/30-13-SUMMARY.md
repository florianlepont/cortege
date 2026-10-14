---
phase: 30-route-choice-assistant-inserted-v1
plan: 13
subsystem: mobile-ui
tags: [radio-card, info-sheet, glossary, ui-primitives]
requires: [30-11]
provides:
  - "RadioCard optional props tag (accent word, 12 SemiBold) and trailing (node outside the press target) in mobile/src/ui/RadioCard.tsx"
  - "InfoSheet / InfoSheetProps (mobile/src/ui/InfoSheet.tsx): shared sheet shell"
  - "GlossaryInfo / GlossaryTermId (mobile/src/ui/GlossaryInfo.tsx): info glyph for the words of the method"
affects: [30-14, 30-15, 30-16, 30-17]
key-files:
  created:
    - mobile/src/ui/InfoSheet.tsx
    - mobile/src/ui/InfoSheet.test.tsx
    - mobile/src/ui/GlossaryInfo.tsx
    - mobile/src/ui/GlossaryInfo.test.tsx
  modified:
    - mobile/src/ui/RadioCard.tsx
    - mobile/src/ui/RadioCard.test.tsx
    - mobile/src/ui/AbbreviationInfo.tsx
decisions:
  - "RadioCard keeps AppPressable as its root; with a trailing node it wraps the card in a View and places the node absolutely in the top-right corner of the card, as a sibling of the press target, so a press on the glyph never selects the card and the glyph stays its own button for a screen reader. Without the node the render tree is exactly as before"
  - "The tag is hidden from a screen reader (accessible false, importantForAccessibility no), like the decorative icon: the caller puts it in accessibilityLabel"
  - "A title with a trailing node gets a 28 pt right padding so a long title never runs under the glyph"
  - "InfoSheet takes eyebrow and body as strings; AbbreviationInfo passes the term as eyebrow, the explanation as body"
  - "GlossaryInfo reuses ABBREVIATION_INFO_ICON_SIZE and the same hit-slop formula; its accessibility label is fr.routeGuide.a11y.glossaryInfo(term) from 30-11, test id glossary-info-<term>"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 13: Shared UI primitives for the route step Summary

`RadioCard` can now carry a "Conseillé" tag and a glossary glyph, and abbreviations and the words of the method open the same small `InfoSheet`.

## What was built

- **RadioCard** (phase 29 component, reused; no `ChoiceCard` exists): optional `tag` (accent colour, `brandTypography.meta` = Jost SemiBold 12, on the title line) and `trailing` (outside the press target). CasPicker and VisibilityPicker are untouched and their tests pass unchanged.
- **InfoSheet**: the sheet part of `AbbreviationInfo` (page sheet, header with title, labelled close button, optional eyebrow, body, `animationType` none under Reduce Motion, mounted only while open; T-30-31).
- **AbbreviationInfo**: renders `InfoSheet`; its test file was not edited and passes.
- **GlossaryInfo**: 20 pt `information-circle-outline` in the accent, 44 pt hit area, opens the sheet with `fr.routeGuide.glossary.terms[term].term` and `.text`, close label `fr.routeGuide.glossary.close`. `GlossaryTermId = keyof typeof fr.routeGuide.glossary.terms`; a `@ts-expect-error` test proves a wrong key fails typecheck.

## Tasks and commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1. RadioCard tag and trailing slot | e5229f5a | RadioCard.tsx, RadioCard.test.tsx |
| 2. InfoSheet, AbbreviationInfo refactor, GlossaryInfo | fd7025d1 | InfoSheet.tsx(+test), GlossaryInfo.tsx(+test), AbbreviationInfo.tsx |

Tests were written first and confirmed failing (type errors for the missing props and modules) before the implementation.

## Verification

- Mobile unit suite: 418 suites, 6178 tests, all pass (includes the source gates: motion, icons, fonts, structure, abbreviations, catalogue-dash).
- `npm run lint` and `npm run typecheck`: exit 0.
- `npm run format:check`: only `.claude/settings.local.json` is flagged (not part of this plan).
- `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts`: empty.
- No colour literal added to RadioCard; no `ChoiceCard.tsx`.

## Deviations from Plan

None - plan executed as written. (The unused `cardFill` style first drafted for RadioCard was removed before the commit.)

## Known Stubs

None.

## Threat Flags

None. T-30-31 mitigated: the sheet is mounted only while open (a test asserts no Modal before the press and none after close).

## Self-Check: PASSED

- Files exist: InfoSheet.tsx, InfoSheet.test.tsx, GlossaryInfo.tsx, GlossaryInfo.test.tsx, RadioCard.tsx, AbbreviationInfo.tsx.
- Commits e5229f5a and fd7025d1 exist.
