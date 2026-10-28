---
phase: 32
plan: 21
subsystem: mobile-i18n
tags: [i18n, factor-pager, abbreviations, accessibility]
status: complete
key-files:
  modified:
    - mobile/src/i18n/fr/factor-pager.ts
    - mobile/src/screens/survey-form/FactorPager.tsx
    - mobile/src/screens/survey-form/FactorPager.test.tsx
    - mobile/src/__checks__/abbreviations.test.ts
    - CLAUDE.md
completed: 2026-10-28
---

# Phase 32 Plan 21: F page title reads "DMH" Summary

The title at the top of the factor F page now reads "DMH" (owner request 2026-10-28), while its spoken label stays "Dendromicrohabitats" and every other place keeps the full word.

## What changed

- `fr.factorPager.pageTitles` (`mobile/src/i18n/fr/factor-pager.ts`): `labelsFr.factorTitles` with only `F` overridden to "DMH". `fr.labels.factorTitles.F` is unchanged.
- `FactorPager` header (`mobile/src/screens/survey-form/FactorPager.tsx`): shows `t.pageTitles[activeFactor]`, with `accessibilityRole="header"` and `accessibilityLabel={FACTOR_TITLES[activeFactor]}`, so a screen reader says the full word and does not spell D-M-H.
- Abbreviation gate (`mobile/src/__checks__/abbreviations.test.ts`): new `file-only` treatment (a term allowed bare in the listed catalogue files only, no info button) and policy entry `DMH: file-only, files ["factor-pager.ts"]`. "DMH" anywhere else in the catalogue fails with reason `file-only-outside`; any other abbreviation still fails. A fixture test covers the listed and unlisted case.
- `CLAUDE.md` "Text and i18n": one clause added to the abbreviations line.

## Where the title appears now

Only the header Text of `FactorPager` (the factor page, factor F active). Unchanged and still "Dendromicrohabitats": survey summary and "Facteurs IBP" rows, score card, factor strip scrub value and VoiceOver value, the factors list, the doubt/note strip, route guide, PDF export, search, journal. The navigation header of the factor page is "Facteur F" (`fr.navigation.headers.factor`), not the title, so it needed no change.

## Verification

- Jest (`mobile/jest.unit.config.js`) on `src/screens/survey-form`, `src/screens/FactorDetailScreen`, `src/__checks__`, `src/i18n`, `src/navigation`: 805 tests pass; the one failing suite (`SearchHomeRoute.test.tsx`) fails to compile because of the other executor's unfinished global search edits (`guide` group), unrelated to this plan.
- `tsc --noEmit`: no error in the touched files; the remaining errors are all in global search files owned by the other executor.
- ESLint on the touched files: clean. Prettier applied to the touched ts/tsx files.
- The whole `test:unit` was not run, because the other executor is mid-edit in the same tree.
- Not seen on a device or simulator.

## Deviations from Plan

None beyond the scope note above. The gate could express "DMH for this page title only" (per file), so DMH is not allowed globally. The allowlist-exactness test (units, OK, PDF, GPS, IBP, ex.) is untouched because the new treatment is separate from `allowlist`.
