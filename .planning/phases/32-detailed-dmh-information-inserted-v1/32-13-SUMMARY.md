---
phase: 32-detailed-dmh-information-inserted-v1
plan: 13
subsystem: mobile-navigation
tags: [dmh-guide, navigation, form-sheet, search, accessibility]
requires: ["32-10", "32-12"]
provides:
  - "surveyDmhGuide route (typed, survey stack only) and DmhGuideRouteProps"
  - "DmhGuideScreen shell with catalogue, group and sources views"
  - "DmhCatalogue with local accent-insensitive search"
  - "SearchField optional texts prop"
affects: ["32-14 (F list navigates to surveyDmhGuide)"]
tech-stack:
  added: []
  patterns: ["one sheet with internal views (no sheet over a sheet)", "memoised route validating an untrusted param"]
key-files:
  created:
    - mobile/src/screens/dmh-guide/DmhCatalogue.tsx
    - mobile/src/screens/dmh-guide/DmhCatalogue.test.tsx
    - mobile/src/screens/dmh-guide/DmhGuideScreen.tsx
    - mobile/src/screens/dmh-guide/DmhGuideScreen.test.tsx
    - mobile/src/navigation/routes/DmhGuideRoute.tsx
  modified:
    - mobile/src/screens/global-search/SearchField.tsx
    - mobile/src/screens/global-search/SearchField.test.tsx
    - mobile/src/screens/dmh-guide/dmh-guide.styles.ts
    - mobile/src/navigation/types.ts
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/navigation/stacks/stack-options.ts
    - mobile/src/navigation/stacks/SurveysStack.tsx
    - mobile/src/navigation/navigation.test.tsx
decisions:
  - "The catalogue title lives in the shell header row (UI-SPEC S2 shell), so DmhCatalogue takes no titleRef"
  - "SearchField with its own texts drops the global search hint (it names places the guide does not search)"
metrics:
  tasks: 3
  completed: 2026-10-27
status: complete
---

# Phase 32 Plan 13: Guide sheet, catalogue and route Summary

One guide sheet (catalogue with search, group page, sources page) behind a typed, validated `surveyDmhGuide` route registered only in the survey stack, a form sheet on iOS (detents 0.65 and 1, grabber) and a modal on Android.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Catalogue view with search, `texts` prop on SearchField | b2a85713 |
| 2 | DmhGuideScreen shell, route type, DmhGuideRoute | dba5fd82 |
| 3 | Sheet options and registration in the survey stack only | 9a51e06e |

## What was built

- `SearchField` takes an optional `texts` (placeholder, field label, clear label). Without it the field renders as before; its tests are unchanged (zero removed lines) plus one override test.
- `DmhCatalogue`: lead, search field (not auto-focused, return key dismisses the keyboard), seven form headers over 56 high rows (empty query), one flat card with the form caption (query), the empty card with "Voir les 15 groupes", the sources link 32 below. The result count is announced once per folded query (not for the empty query). `searchDmhGroups` is called once.
- `DmhGuideScreen`: one `ScrollView` whose first item is the 56 high header row (title on the catalogue, back control elsewhere, close always). View state `catalogue | group { direct } | sources { previous }`, query kept in the shell. View content sits in an `Animated.View` keyed by the view (FadeIn/FadeOut at `brandMotion.durations.fast`, `ReduceMotion.System`), so typing never replays the fade. On a view change: scroll to top, accessibility focus on the new title, one announcement; the opening view is not announced. Android hardware back is handled (returns true) only for a group reached inside the sheet and for the sources page; a direct group and the catalogue return false so the sheet closes.
- `DmhGuideRoute`: validates `route.params?.group` with `DMH_GROUP_CODES.includes` (T-32-32, tested with "dmh_99"), reads only `ibpMethodVersion` from the form context, `onClose` is `navigation.goBack()`.
- `dmhGuideScreenOptions(theme)` and the single registration after `surveyFactorHelp`; `types.ts` has `surveyDmhGuide: { group?: DmhGroupCode } | undefined` and `DmhGuideRouteProps`.

## Verification

- Narrow jest: SearchField, DmhCatalogue, DmhGuideScreen, routes, navigation, `src/__checks__` all pass.
- `npm --workspace mobile run typecheck`, `npm --workspace mobile run lint`, `prettier --check` on the touched folders: clean.
- `npm run test:coverage:mobile`: exit 0; `src/navigation` keeps its thresholds (`DmhGuideRoute.tsx`, `SurveysStack.tsx`, `stack-options.ts` at 100 percent).
- Exactly one stack file names `surveyDmhGuide` (`SurveysStack.tsx`); `HomeStack`, `PublicMapStack`, `SearchStack` untouched; no map screen touched; every new file is under 400 lines.

## Deviations from Plan

**1. [Rule 1 - Bug] Global search hint dropped when `texts` is given**
- **Issue:** `SearchField` hard-codes `a11yHint` "Cherche dans vos relevés, la communauté, les lieux et les parcelles", wrong for the guide.
- **Fix:** with `texts` the hint is `undefined`; without it unchanged. Covered by the override test.
- **Commit:** b2a85713

**2. [Interface] `DmhCatalogue` has no `titleRef`**
- The catalogue title is the shell's header row (UI-SPEC S2), so the shell owns that focus target; the plan's optional `titleRef` prop would have been unused.

**3. [Style additions]** `dmh-guide.styles.ts` (plan 32-12 file) gained `sheetTitleBox`, `rowCopy`, `rowDivider`, `rowsCard`, `formSection`, `formHeader`, `catalogueFoot`, and `row` got padding. Catalogue rows are custom pressable rows in an `AppCard variant="glass"` instead of `AppGroupedList` nav rows, because those are 48 high, one-line, and cannot carry the form caption.

## Owner decisions / notes

- The back control reads "Tous les groupes" in every non-catalogue view (UI-SPEC S2), including the sources page opened from a group page, where it returns to that group. If that wording misleads, the label for that case needs a catalogue text (not added; the spec fixes one string).
- Detent 0.65 and the cross-fade are to be checked on the owner iPhone in plan 32-16.

## Known Stubs

None.

## Threat Flags

None. T-32-32 (group param validated), T-32-33 (survey stack only) mitigated and tested; T-32-34 accepted (no network call).

## Self-Check: PASSED

Files and commits b2a85713, dba5fd82, 9a51e06e verified present.
