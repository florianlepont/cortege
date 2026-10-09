---
phase: 25-global-search
plan: 14
subsystem: mobile-navigation
tags: [search, navigation, cutover, cleanup, render-counts, d-01]
requires: ["25-03", "25-07", "25-08", "25-11", "25-12"]
provides:
  - "SearchStack mounts searchHome (SearchHomeRoute) and searchGroup (SearchGroupRoute) on every platform"
  - "Keystroke render-count scenario: typing in the search field leaves Accueil and the Mes Relevés list untouched"
  - "Old search page, community hook, old client function and their catalogue keys removed"
  - "Surveys context without a search query"
affects: [25-15]
tech-stack:
  added: []
  patterns: ["static idle hook mocks in the render-count harness", "probe that captures its onChangeText prop to type into a mocked screen"]
key-files:
  created: []
  modified:
    - mobile/src/navigation/stacks/SearchStack.tsx
    - mobile/src/navigation/navigation.test.tsx
    - mobile/src/state/render-counts.test.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/api/ibp-api.ts
    - mobile/src/api/ibp-api.test.ts
    - mobile/src/i18n/fr/survey-list.ts
    - mobile/src/i18n/fr/navigation.ts
    - mobile/src/hooks/useSurveyList.ts
    - mobile/src/hooks/useSurveyList.test.ts
    - mobile/src/state/AppStateProvider.tsx
    - mobile/src/state/surveys-context.ts
    - mobile/src/app/survey-logic.ts
    - mobile/src/app/survey-logic.test.ts
    - mobile/src/app/types.ts
    - mobile/src/screens/survey-detail/SeeOnMapAction.tsx
  deleted:
    - mobile/src/navigation/routes/SurveySearchRoute.tsx
    - mobile/src/screens/survey-search/SurveySearchScreen.tsx (and .test.tsx)
    - mobile/src/screens/survey-search/search.styles.ts (and .test.ts)
    - mobile/src/hooks/useCommunitySurveys.ts (and .test.ts)
key-decisions:
  - "searchHome keeps the navigator default headerShown false (the page draws its own field); searchGroup sets headerShown true, headerBackTitle 'Rechercher' (fr.search.list.backLabel), title fr.navigation.tabs.search as a placeholder and pageTitleOptions(theme)"
  - "The keystroke scenario is a sixth EXPECTED entry (searchKeystroke, all zeros) without a new CountKey: the search page's own renders are asserted separately (exactly 3 for the keystrokes f, fo, for) so the proof that typing reached the page sits next to the proof that nothing else rendered"
  - "fr.navigation.search (placeholder) removed: git grep showed no reader; tabs.search kept"
requirements-completed: [REQ-B-global-search]
metrics:
  tasks: 3
  files: 16
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 14: Cutover and cleanup Summary

The search tab now runs the new page and its full lists on every platform, typing is proven not to re-render the rest of the app, and nothing of the old Mes relevés / Communauté page or of the surveys context's search query is left.

## Tasks and commits

| Task | Name | Commit |
|------|------|--------|
| 1 | Cutover of the search stack and the keystroke render-count scenario | 71ad0c61 |
| 2 | Remove the old search page, hook, client function and catalogue keys | a7767488 |
| 3 | Remove the unwritten search query from the surveys context | 9c265c2d |
| - | Prettier fix of a file left unformatted by 25-08 (see Deviations) | 7b0ac513 |

Tests were edited with the code inside each commit.

## What was done

- **Stack:** `SearchStack.tsx` mounts `searchHome` with `SearchHomeRoute` and registers `searchGroup` with `SearchGroupRoute` and `{ title, headerShown: true, headerBackTitle: "Rechercher", ...pageTitleOptions(theme) }`; the doc comment states D-01 (one stack, native search tab on iOS, fourth JS tab elsewhere).
- **navigation.test.tsx:** the old route mock is replaced by mocks of both new routes; a test on iOS (native tabs) and Android (JS tabs) checks both screens are registered in the same navigator, `searchHome` has no header, `searchGroup` has `headerShown: true`, back title "Rechercher". The "search" filtered-names assertion now lists `search`, `searchHome`, `searchGroup`.
- **render-counts.test.tsx:** the old screen mock became probes of `GlobalSearchScreen` (counts renders, keeps `onChangeText`) and `SearchGroupListScreen`; `useGlobalSearch` and `useSearchRecents` are mocked with static idle values; `mockDefaultParams` gained `group: "mine"`, `query: "fo"`. Scenario `searchKeystroke` types "f", "fo", "for" in `act`: the search page rendered 3 times, every counted screen (Accueil, list, rows, others) 0.
- **Removals:** `SurveySearchRoute`, `SurveySearchScreen` + styles + tests (folder `screens/survey-search` gone), `useCommunitySurveys` + test, `searchCommunitySurveys` + its test (endpoint `/public/community-surveys` stays on the API), the `routes.test.tsx` mocks, describe block and table entry, `fr.surveyList.search.{placeholder,cancel,clear,segments,results,communityHint,communityLoading,communityError,communityNone,communityOffline}` and `fr.navigation.search`, the now unused `plural` helper and `CommunitySurveyItem` import. Kept: `search.chips`, `sort`, `sortA11y`, `none` and the `community` block.
- **Context:** `surveyQuery`/`setSurveyQuery` removed from `SurveyListFilters`, `filterAndSortSurveys` (its text filter step), `useSurveyList` (state, memo deps, `resetFilters`, return), `surveys-context.ts`, `AppStateProvider.tsx` and every fixture/test.

## Verification

- `npx jest ... src/navigation src/state/render-counts.test.tsx`: 15 suites pass; task 2 command (`src/navigation src/api src/i18n src/screens src/hooks src/__checks__`): 167 suites, 2072 tests pass; task 3 command: 19 suites, 346 tests pass.
- Whole mobile unit suite: 287 suites, 3682 tests pass. `npm run test:coverage:mobile` exits 0; `mobile/src/navigation` 100/100/100/100, `navigation/routes` 100 statements, 98.96 branches, 100 functions and lines, `navigation/stacks` 100.
- `npm run lint` and `npm run typecheck` exit 0.
- `git grep -n "SurveySearchRoute\|SurveySearchScreen\|useCommunitySurveys\|searchCommunitySurveys\|survey-search/" mobile/src` and `git grep -n "surveyQuery\|setSurveyQuery" mobile/src` print nothing; `test ! -d mobile/src/screens/survey-search` holds; `communityHint|communityOffline|segments:` absent from `survey-list.ts`, `chips:` present.
- `npm run format:check`: only the git-ignored `.claude/settings.local.json` is reported (known, unrelated).
- `npm run test:unit` exits 1 only because of `api/test/check-env-parity.spec.ts` (bash 3.2 `declare -A`, known and unrelated); the api suite otherwise passes (44 of 45 suites), the domain package (9 suites) and the whole mobile suite pass.
- Not run: E2E (no API change), device checks (plan 25-15).

## Deviations from Plan

**1. [Rule 3 - blocking] Prettier fix of `mobile/src/screens/survey-detail/SeeOnMapAction.tsx`**
- **Found during:** final `npm run format:check`
- **Issue:** one line longer than 100 characters, left by plan 25-08 (commit a79b186a); `format:check` is a CI gate and the plan's must-have says every gate is green on the whole phase.
- **Fix:** `prettier --write`, one line wrapped, no logic change.
- **Commit:** 7b0ac513

**2. Test name kept: `mockSearchNavigation` in `routes.test.tsx`.** The community routes' tests still use it; only its comment was reworded.

Otherwise the plan ran as written.

## Notes for plan 25-15

- `CLAUDE.md` line 195 still describes the old page: "The search page (`SurveySearchRoute`: Mes relevés / Communauté) is that tab on iOS and a screen pushed from Mes Relevés on Android and the JS tabs; there is one survey stack". That is now wrong: the search tab exists on every platform (native search tab on iOS, fourth JS tab "Rechercher" on Android and Expo Go), the stack is `SearchStack` (`searchHome` = `SearchHomeRoute`, `searchGroup` = `SearchGroupRoute`), and the query lives in route state, not in the surveys context.
- `docs/design/component-inventory-phase-23.md` mentions `survey-search/` files (a Phase 23 audit snapshot); left untouched as a historical document.
- `useSurveys().state` no longer has `surveyQuery`; `actions.resetFilters()` still resets chips, dates and sort (the group list route calls it on close).
- The render-count harness header lists the six events; `EXPECTED.searchKeystroke` is all zeros. If a later plan makes `SearchHomeRoute` write to a shared context, this scenario fails first.

## Known Stubs

None.

## Threat Flags

None. T-25-40 (dangling references) is covered by the greps, typecheck and the full unit suite; T-25-41 (render regression) by the `searchKeystroke` scenario.

## Self-Check: PASSED

- FOUND: SearchStack.tsx (`SearchHomeRoute`, `name="searchGroup"`, `headerBackTitle`), render-counts.test.tsx (`GlobalSearchScreen`), 25-14-SUMMARY.md
- MISSING (as intended): SurveySearchRoute.tsx, screens/survey-search/, useCommunitySurveys.ts
- FOUND commits: 71ad0c61, a7767488, 9c265c2d, 7b0ac513
