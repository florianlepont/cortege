---
phase: 32
plan: 22
subsystem: mobile-factor-f-list
tags: [dmh, factor-f, guide, ui]
status: complete
key-files:
  modified:
    - mobile/src/screens/factor-detail/DmhGroupList.tsx
    - mobile/src/screens/factor-detail/DmhGroupRow.tsx
    - mobile/src/screens/factor-detail/dmh-group-list.styles.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/navigation/routes/FactorDetailRoute.tsx
    - CLAUDE.md
metrics:
  completed: 2026-10-28
---

# Phase 32 Plan 22: F list without guide entry, bolder info button

Removed the "Guide des dendromicrohabitats" entry card from the top of the factor F group list and made each row's info button a visible 32 pt filled disc.

## Changes

- `DmhGroupList`: the entry (`dmh-guide-entry`, its grouped container, `onOpenCatalogue`) is gone. The guide stays reachable from each row's info button, from Accueil and from the global search (both open the sheet by navigation, not through `onOpenDmhGuide`).
- `onOpenDmhGuide` is now `(group: DmhGroupCode) => void` through `DmhGroupList`, `renderFactorField`, `FactorDetailScreen`, `FactorPager` and `FactorDetailRoute`: the no-argument use existed only for the entry. The Accueil prop (`HomeScreen`, `ToolsSection`) is a separate, untouched prop.
- `DmhGroupRow`: the 44 x 44 target (testID `dmh-info-{code}`, accessibility label and hint unchanged) now holds a 32 pt circle filled with `visual.control.fill` and the `information-circle-outline` glyph at 22 in `visual.accentText`. No haptic (it navigates, changes no state; the test that pins no `feedback.selection()` on it is kept).
- Helper: one line under the heading, `fr.factorDetail.dmhList.infoHelper` ("Touchez l'icône i d'un groupe pour apprendre à le reconnaître, même sans réseau."). In the capped mode it is the only helper; in the counted-in-full mode it is merged into the single existing helper Text after the cap sentence (joined in the component, one Text, no stacked lines).
- Tests: entry tests removed, a no-entry test added, the open-section container count is 1, helper tests for both modes, disc size/radius/fill test on the row, the "no group opens the catalogue" route test removed. Press counts in `dmh-entry-cost.test.tsx` are unchanged and pass.
- `CLAUDE.md` (Phase 32 guide paragraph) no longer mentions the entry card.

## Deviations

- The `dmhList.entry` catalogue strings are now unused but left in place, as instructed (no test or gate requires removal).
- Wording differs slightly from the suggestion ("apprendre à le reconnaître, même sans réseau" instead of "savoir le reconnaître, hors ligne"): better French; the abbreviations gate passes.

## Verification

- Ran and green: jest for `src/screens/factor-detail`, `FactorDetailScreen`, `FactorPager`, `src/navigation`, `src/__checks__` (structure, abbreviations, catalogue-dash, motion, icons), `src/i18n`; eslint on touched files; prettier on touched files.
- `tsc --noEmit` on mobile reports one error, in `src/screens/global-search/SearchResultRow.test.tsx` (the other executor's unfinished work); none in touched files.
- Not run: the full suite and the `src/navigation` 100 percent coverage gate over the whole folder together with the other executor's files (a narrow run on `FactorDetailRoute.tsx` shows the handler fully covered; its one uncovered branch at line 65 is pre-existing and unrelated). No device or simulator check: I could not see the result on screen.
