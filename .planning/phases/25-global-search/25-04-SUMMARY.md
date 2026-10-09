---
phase: 25-global-search
plan: 04
subsystem: mobile-ui
tags: [search, rows, compact-density, ripple, u-05]
requires: []
provides:
  - "CompactSurveyRow { survey, surveyDetails, index, onOpen, testID? }: the slim own-survey row shared by Accueil and the search summary"
  - "CommunityRow { item, onOpen, density? } moved to screens/community-survey, compact = 52 pt row with the 32 pt ring"
  - "SearchResultRow { kind, title, meta, accessibilityLabel, onPress, density?, testID? } for member, place and parcel"
affects: [25-14]
tech-stack:
  added: []
  patterns: ["one frame (SurveyRowFrame compact) for own and community survey rows", "texts as props, callers build them from fr.search.rows"]
key-files:
  created:
    - mobile/src/screens/survey-list/CompactSurveyRow.tsx
    - mobile/src/screens/survey-list/CompactSurveyRow.test.tsx
    - mobile/src/screens/global-search/SearchResultRow.tsx
    - mobile/src/screens/global-search/SearchResultRow.test.tsx
  modified:
    - mobile/src/screens/home/RecentSurveysSection.tsx
    - mobile/src/screens/community-survey/CommunityRow.tsx (git mv from survey-search)
    - mobile/src/screens/community-survey/CommunityRow.test.tsx (git mv from survey-search)
    - mobile/src/screens/survey-search/SurveySearchScreen.tsx
    - mobile/src/screens/survey-list/SurveyRow.test.tsx
key-decisions:
  - "SearchResultRow meta uses the footnote 13 pt size with a 16 pt line (brandTypography.meta.lineHeight) instead of the footnote 18: 20 + 4 + 16 + 2 x 6 = 52, the exact height of a survey row, so the rows of one card are all the same height"
  - "CompactSurveyRow styles (chip, meta) are a module-level StyleSheet, they read no theme value"
requirements-completed: [REQ-B-global-search]
metrics:
  tasks: 3
  files: 9
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 04: Result rows Summary

Three row components for the search summary and the full lists: the Accueil slim survey row extracted and shared, the community row moved with a compact density, and one row for members, places and parcels.

## What was built

- `CompactSurveyRow` holds the composition that was inline in `RecentSurveysSection` (compact `SurveyRowFrame`, tone, 32 pt `RowIndicator`, status chip, short date, a11y label, press calls `onOpen(survey.id)`). Accueil renders it inside its existing `EntranceView` and keeps its own `open` callback (haptic then navigation). `RecentSurveysSection.test.tsx` is untouched and green.
- `CommunityRow` moved with `git mv` to `mobile/src/screens/community-survey/` (history kept). New optional `density: "regular" | "compact"`: compact passes `density="compact"` to the frame and `RECENT_LAYOUT.ringSize` (32) to `ScoreRing`. Regular output is unchanged. The old page and the `SurveyRow.test.tsx` file list import the new path.
- `SearchResultRow` (`screens/global-search/`): 32 pt tile (`person-outline` / `location-outline` / `grid-outline`, 18 pt, `iconTile` fill, `iconTint` glyph), one-line 16 SemiBold title, one-line 13 meta, trailing `chevron-forward-outline` 18. Compact = flat 52 pt row (padding 6 / 16, wave drawn square for the shared card); regular = own glass card, min height 56, wave radius `brandRadius.card - 1`. One `RipplePressable` button with the given label and testID; tile and chevron hidden from accessibility. No literal text, no colour literal, no entrance animation.

## Commits

- 462ddfdf feat(25-04): extract CompactSurveyRow from the Accueil recent surveys
- db590bab feat(25-04): move CommunityRow to community-survey and add a compact density
- 2cbbad2a feat(25-04): add SearchResultRow for member, place and parcel results

## Deviations from Plan

### Auto-fixed / judgement calls

**1. [Rule 1 - layout] Meta line height 16 instead of the footnote 18**
- **Found during:** Task 3
- **Issue:** UI-SPEC asks for a 52 pt row with a 4 pt gap between a 20 pt title and the 13 pt meta; with the footnote token (line 18) the content is 54 pt, so member/place/parcel rows would be 2 pt taller than the survey rows in the same card.
- **Fix:** meta keeps `brandTypeScale.footnote` size (13) with `lineHeight: brandTypography.meta.lineHeight` (16); a test asserts 20 + 4 + 16 + 12 = 52.
- **Files modified:** `mobile/src/screens/global-search/SearchResultRow.tsx`

Otherwise the plan was executed as written.

## Verification

- Plan jest commands for each task: pass (47, 69, 11 tests); wider run over `screens/survey-list`, `home`, `community-survey`, `survey-search`, `global-search` and `src/__checks__`: 28 suites, 320 tests pass.
- `npm run lint` and `npm run typecheck`: pass.
- `npm run format:check`: reports only `.claude/settings.local.json`, which is not part of this plan (pre-existing, untracked-config file); every file touched here is formatted.
- `git diff --quiet -- mobile/src/screens/home/RecentSurveysSection.test.tsx`: unchanged. `git grep "survey-search/CommunityRow" mobile/src`: empty. 0 colour literals in `SearchResultRow.tsx`.

## Notes for the next plans

- Summary lists: wrap `CompactSurveyRow` / `CommunityRow density="compact"` / `SearchResultRow` (default compact) in one glass card with `RECENT_LAYOUT` hairline separators, as `RecentSurveysSection` does; the card must clip (`overflow: hidden`, radius `brandRadius.card - 1`) because compact rows draw the wave square.
- Full lists: `SurveyRowFrame` regular for surveys, `SearchResultRow density="regular"` for member/place/parcel, `CommunityRow` default density.
- Callers build `title`, `meta` and `accessibilityLabel` from `fr.search.rows.*` (the row has no text of its own) and call `feedback.selection()` themselves on open, as Accueil does.
- `CompactSurveyRow` has no haptic; the caller's `onOpen` owns it.
- The old `survey-search` page still renders the moved `CommunityRow` (plan 25-14 deletes the page).

## Known Stubs

None.

## Threat Flags

None. Server text (author, place and parcel labels) is rendered as plain one-line `Text` (T-25-07, accepted).

## Self-Check: PASSED

- Files exist: CompactSurveyRow.tsx and .test.tsx, community-survey/CommunityRow.tsx and .test.tsx, global-search/SearchResultRow.tsx and .test.tsx; survey-search/CommunityRow.tsx is gone.
- Commits 462ddfdf, db590bab, 2cbbad2a are in `git log`.
