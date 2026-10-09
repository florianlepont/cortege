---
phase: 25-global-search
plan: 12
subsystem: mobile-search-ui
tags: [search, full-list, route, navigation, chips, member-list]
requires: ["25-01", "25-02", "25-03", "25-04", "25-07", "25-08", "25-09"]
provides:
  - "SearchGroupListScreen: full list of one search group (regular rows, chips of Mes relevés, loading/offline/error/empty states)"
  - "OwnSurveyChips: Brouillons, Terminés, Avec photo toggles and the sort cycle"
  - "SearchGroupRoute: route of searchGroup (data, title, haptics, navigation targets)"
  - "SearchGroupRouteProps type in navigation/types.ts"
affects: [25-14]
tech-stack:
  added: []
  patterns: ["one useSearchGroup call dispatching on the group (hooks cannot be conditional)", "screen title falls back to the group name until the count is known"]
key-files:
  created:
    - mobile/src/screens/global-search/OwnSurveyChips.tsx
    - mobile/src/screens/global-search/OwnSurveyChips.test.tsx
    - mobile/src/screens/global-search/SearchGroupListScreen.tsx
    - mobile/src/screens/global-search/SearchGroupListScreen.test.tsx
    - mobile/src/navigation/routes/SearchGroupRoute.tsx
    - mobile/src/navigation/routes/SearchGroupRoute.test.tsx
  modified:
    - mobile/src/navigation/types.ts
key-decisions:
  - "The screen's count prop is number | null (plan said number): null until the group answered, the title is then the bare group name instead of 'Communauté · 0'"
  - "Own survey rows play the selection haptic themselves (SurveyRow), so the route's own-survey handler only saves the recent search; community, member, place and parcel opens play feedback.selection() in the route"
  - "A member list (memberName set) draws community surveys only, and its count is the survey count; the unfiltered community list counts members plus surveys"
  - "matchCount (passed to the screen) is the number of own surveys matching the name before the chips, so 'Aucun relevé ne correspond.' (chips filtered everything) differs from 'Aucun résultat pour « q »' (no name matches)"
  - "The request is immediate (no 350 ms pause) because the page opens with a settled query"
  - "No '+' on the title for a capped community list: the catalogue title takes group and count only"
metrics:
  tasks: 2
  files: 7
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 12: Full list of one search group Summary

The "Voir les N" page: `SearchGroupListScreen` draws one group in the regular density with its own states and, for "Mes relevés", the chips and swipe delete of the old page; `SearchGroupRoute` fetches the group for the list's own query and opens every result at the same target as the summary.

## Tasks and commits

| Task | Name | Commits |
|------|------|---------|
| 1 | SearchGroupListScreen and OwnSurveyChips | f51cfab2 (chips), 6d9bc5a9 (screen) |
| 2 | SearchGroupRoute | 7b9fcd65 |

Tests were written with the code inside each commit (no separate `test(...)` commit), as in plans 25-01 and 25-07.

## What was built

- `OwnSurveyChips` rebuilds the chip row and the sort cycle (Plus récents, Plus anciens, Nom A-Z) of `SurveySearchScreen` in its own file; texts stay `fr.surveyList.search.chips/sort/sortA11y`. The old page is untouched (deleted in 25-14).
- `SearchGroupListScreen` (345 lines) is presentational. A `FlatList` (gap 12, padding 16, bottom = tab bar clearance + 24, or 24 under the native large title where iOS insets the content) with `PageTitle`, the caption (`Pour « q »` or `Relevés de {nom}`), the chips for "mine", then rows: `SurveyRow` (swipe delete), `CommunityRow`, `SearchResultRow density="regular"` for member, place and parcel, all inside `ListEntranceRow` with one `useListEntrance()`. States replace the rows: three `SkeletonRow`s (loading or waiting, no rows yet; previous rows stay while a reload runs), the group's offline sentence, the error sentence plus an `AppButton` secondary "Réessayer" (rate-limit has its own sentence), and "Aucun résultat pour « q »" or "Aucun relevé ne correspond." when the chips filtered every name match out.
- `SearchGroupRoute` (memoised) reads `route.params`, the session, the access token, the surveys context and `useIsOffline()`. "mine": `matchOwnSurveys(state.visibleSurveys, query)` so the context's chips and sort apply; chip handlers are the context setters; `actions.resetFilters()` runs when the page closes. Other groups: one `useSearchGroup` call (`enabled` false for "mine", without token or under 2 characters; `immediate: true`) with a fetcher per group: `searchCommunity({ q, author?, limit: 50 })`, `searchPlaces({ q, limit: 10 })` (empty list without a call under 3 characters, like the summary), `searchParcels({ q })`. A layout effect sets the native title (`Communauté · 6`, group name before the count is known). Opening: own survey `openSurvey` then `surveys > surveyDetail`; community survey `surveys > communitySurvey`; member `navigation.push("searchGroup", { group: "community", query: name, memberName: name })`; place and parcel `publicMap > publicMapHome` with `placeFocus` / `parcelFocus(item, Date.now())`. Each save the list's query as a recent search.

## Deviations from Plan

### Judgement calls

**1. [Rule 2 - correctness] `count: number | null` on the screen**
- **Found during:** Task 2
- **Issue:** with `count: number` the page title would read "Communauté · 0" during the first load and after an error.
- **Fix:** `null` until the group answered; the title is then the group name. Route sets the native title the same way. Test added.
- **Files modified:** `SearchGroupListScreen.tsx`, its test, `SearchGroupRoute.tsx`

**2. [Rule 3 - type] `SearchGroupRouteProps` added to `navigation/types.ts`**
- The route needed a typed `route` prop like `CommunityHistoryRouteProps`; nothing else in that file changed.

**3. Plan item left out: `capped`**
- The plan text mentions deriving `capped` in the route. `fr.search.list.title` takes `{ group, count }` only, so a "+" had nowhere to go; the catalogue was not changed. Nothing is lost when the server hit its cap of 50: the title shows 50.

No other deviation.

## Verification

- `cd mobile && npx jest --config jest.unit.config.js src/navigation/routes/SearchGroupRoute.test.tsx src/screens/global-search src/__checks__`: 18 suites, 256 tests pass.
- `npm run test:coverage:mobile`: exit 0 (290 suites, 3710 tests). `SearchGroupRoute.tsx` 100% on all four metrics, `OwnSurveyChips.tsx` 100%, `SearchGroupListScreen.tsx` 100% statements, functions, lines and 96.5% branches (two defensive `??` fallbacks for a missing `mine` prop).
- `npm run lint` and `npm run typecheck`: exit 0.
- Prettier check passes on every file of the plan. `npm run format:check` over the whole repo was not used (known git-ignored `.claude/settings.local.json` report).
- Acceptance greps pass: `useListEntrance()` and `<PageTitle` and `<OwnSurveyChips` in the screen, `chips.drafts` in the chips, `useSearchGroup(`, `matchOwnSurveys(`, `resetFilters` in the route, `grep -c useSurveySync` prints 0, screen under 400 lines.
- Not run: `api/test/check-env-parity.spec.ts` (known bash 3.2 failure), E2E (no API change).

## Notes for the next plans

- **25-14 (stack):** register `searchGroup` with `component={SearchGroupRoute}`, `headerShown: true`, `headerBackTitle: fr.search.list.backLabel`, `pageTitleOptions(theme)`. The route sets `title` itself with `navigation.setOptions` (so the initial `title` in the options is only a placeholder). The route reads `route.params` (type `SearchGroupRouteProps`) and `useNavigation()`; the render-counts scenario only needs `group: "mine"` and `query` in the mocked params. Tab bar hiding is not needed.
- **25-13/E2E:** the full list calls `GET /v1/search/community?q=&author=&limit=50` for a member, so the server must accept `author` together with `q`.
- The old `screens/survey-search` page and `SurveySearchRoute` still exist; `OwnSurveyChips` duplicates their chip code until 25-14 deletes them.
- `SearchGroupListScreen` keeps no state of its own; the query is in the route params and nothing is written to a context.

## Known Stubs

None.

## Threat Flags

None. T-25-33 (no deep link exposes `searchGroup`; params go through the encoded client functions) and T-25-34 (the `author` filter only narrows, applied server side) hold: the route adds no endpoint and no storage beyond the recent-search key.

## Self-Check: PASSED

- FOUND: OwnSurveyChips.tsx and .test.tsx, SearchGroupListScreen.tsx and .test.tsx, SearchGroupRoute.tsx and .test.tsx, navigation/types.ts (SearchGroupRouteProps)
- FOUND commits: f51cfab2, 6d9bc5a9, 7b9fcd65
