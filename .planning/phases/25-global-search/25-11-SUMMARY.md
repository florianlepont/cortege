---
phase: 25-global-search
plan: 11
subsystem: mobile-search-ui
tags: [search, screen, route, navigation, accessibility, recents]
requires: ["25-01", "25-02", "25-03", "25-04", "25-07", "25-08", "25-09"]
provides:
  - "SearchField: glass field (maxLength 100, return key, clear cross, busy spinner)"
  - "SearchStartPage: recent searches card or the intro 'Que cherchez-vous ?'"
  - "SearchResults: best result card, ordered groups with offline, error and loading lines, no-result block"
  - "GlobalSearchScreen: the page, start page or results under the field, result total announced once per settled query"
  - "SearchHomeRoute: route of the search tab home, ready to be mounted by 25-14"
affects: [25-12, 25-14]
tech-stack:
  added: []
  patterns: ["query kept in route state, never in a context", "presentational screen + route owning hooks and navigation"]
key-files:
  created:
    - mobile/src/screens/global-search/SearchField.tsx
    - mobile/src/screens/global-search/SearchField.test.tsx
    - mobile/src/screens/global-search/SearchStartPage.tsx
    - mobile/src/screens/global-search/SearchStartPage.test.tsx
    - mobile/src/screens/global-search/SearchResults.tsx
    - mobile/src/screens/global-search/SearchResults.test.tsx
    - mobile/src/screens/global-search/GlobalSearchScreen.tsx
    - mobile/src/screens/global-search/GlobalSearchScreen.test.tsx
    - mobile/src/navigation/routes/SearchHomeRoute.tsx
    - mobile/src/navigation/routes/SearchHomeRoute.test.tsx
  modified: []
key-decisions:
  - "The result announcement waits ANNOUNCE_DELAY_MS (500 ms) of unchanged settled state before speaking, and is keyed on the normalised query, so typing never floods a screen reader and the same query is announced once"
  - "A recent search is saved as the trimmed typed text (not the folded query), and only when the query is searchable"
  - "Member press opens searchGroup { group: community, query: name, memberName: name }; 'Voir les N' opens searchGroup { group, query: trimmed text }"
  - "Tab press listener is registered on navigation.getParent() and checks navigation.isFocused(), so it only acts when the tab was already active"
metrics:
  tasks: 3
  files: 10
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 11: Search page and route Summary

The search page is assembled: a glass field, the start page with recent searches, the best result and the four groups with their offline, error, loading and no-result states, and `SearchHomeRoute`, which wires the hooks, the recents and the navigation targets without writing the query to any shared context.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | SearchField and SearchStartPage | 0ace2a63 |
| 2 | SearchResults (best result, four groups, notices, no-result) | 087c8f5e |
| 3a | GlobalSearchScreen with its announcement test | ce62039d |
| 3b | SearchHomeRoute with its test | e7353b23 |

Tasks 1 and 2 and the untracked `GlobalSearchScreen.tsx` come from the interrupted executor. They were read against the plan and found complete. The screen was kept; one change: the tab bar fallback height now comes from `TAB_BAR_FALLBACK_HEIGHT` instead of a local `Platform.select`. The screen test and the whole route (component and test) were missing and were written here.

## What the route does

- Query and an `immediate` flag live in `useState`; `useGlobalSearch` gets `state.surveys`, `session.apiUrl` and the access token. No context action receives the query (`grep -c "setSurveyQuery\|useSurveySync"` prints 0).
- Own survey: `feedback.selection()`, save the query, `actions.openSurvey(id)`, navigate `surveys` > `surveyDetail` (`initial: false`). Community survey: `surveys` > `communitySurvey`. Member and "Voir les N": `search` > `searchGroup`. Place and parcel: `publicMap` > `publicMapHome` with `placeFocus` / `parcelFocus(item, Date.now())`.
- Return key: save (when searchable) and `Keyboard.dismiss()`. Tapped recent: haptic, `immediate` true, dismiss, save. Cross: empty the query, keep the keyboard.
- Tab `focus`: focus the field when the query is empty and reload the recents. Parent `tabPress` while focused: scroll to top and focus the field.

## Verification

- `npx jest --config jest.unit.config.js src/screens/global-search src/navigation src/__checks__`: 28 suites, 429 tests pass
- `npm run test:coverage:mobile` exits 0 (3658 tests); the five new files and `navigation/routes` are at 100% lines, functions and statements (routes branches 98.33%, the floor)
- `npm run lint`, `npm run typecheck` exit 0; Prettier clean on the plan's files
- All acceptance greps pass; `wc -l` under 400 on every screen file (`SearchResults.tsx` 388)
- Old `survey-search` page and `SurveySearchRoute` untouched, their tests still green

## Deviations from Plan

None in behaviour. The only change to inherited work is the tab bar height constant noted above.

## Notes for the next plans

- **25-12 (full lists):** the route navigates to `searchGroup` with `{ group, query }` (`query` is the trimmed typed text, not folded) and, for a member, `memberName` equal to the member's display name with `query` set to the same name.
- **25-14 (cutover):** mount `SearchHomeRoute` as `searchHome` in `navigation/stacks/SearchStack.tsx`. The route reads its navigation from `useNavigation()` and expects the tab navigator as parent for `tabPress`. The `searchGroup` screen must exist in the stack before the cutover, and `render-counts.test.tsx` still needs its keystroke scenario (T-25-31). `routes.test.tsx` has no `SearchHomeRoute` case because its test is its own file.
- `GlobalSearchScreen` exports `ANNOUNCE_DELAY_MS`.

## Known Stubs

None.

## Self-Check: PASSED

All ten files exist; commits 0ace2a63, 087c8f5e, ce62039d and e7353b23 are in the log.
