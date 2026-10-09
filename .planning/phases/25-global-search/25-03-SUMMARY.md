---
phase: 25-global-search
plan: 03
subsystem: navigation
tags: [navigation, js-tabs, search, android, d-01]
requires: []
provides:
  - "Fourth JS tab `search` (Rechercher) mounting the shared SearchTabNavigator"
  - "SearchStackParamList.searchGroup: { group; query; memberName? }"
affects: [25-14]
tech-stack:
  added: []
  patterns: ["one search stack mounted by both tab trees"]
key-files:
  created:
    - mobile/src/screens/survey-list/list-chrome.test.tsx
  modified:
    - mobile/src/navigation/tabs/JsRootTabs.tsx
    - mobile/src/navigation/tab-config.tsx
    - mobile/src/navigation/tabs.test.tsx
    - mobile/src/navigation/navigation.test.tsx
    - mobile/src/navigation/types.ts
    - mobile/src/navigation/stacks/SurveysStack.tsx
    - mobile/src/navigation/routes/SurveyListRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/screens/SurveyListScreen.tsx
    - mobile/src/screens/SurveyListScreen.test.tsx
    - mobile/src/screens/survey-list/list-chrome.tsx
    - mobile/src/screens/survey-list/types.ts
    - mobile/src/i18n/fr/survey-list.ts
key-decisions:
  - "The ListTitleBar test is a new list-chrome.test.tsx because SurveyListScreen.test mocks list-chrome"
  - "Tests check 'no search entry left' with a /search/i filter on keys instead of naming the removed route, so the plan's case-insensitive greps stay empty"
metrics:
  tasks: 2
  files: 14
completed: 2026-10-09
status: complete
---

# Phase 25 Plan 03: Search tab on Android and the JS tree Summary

Android and the JS tab tree now reach the search page from a fourth bottom tab "Rechercher" (search-outline, bar hidden with the keyboard), the Mes Relevés title-bar magnifier and the `surveySearch` route are gone, and the `searchGroup` route params are typed for plan 25-14.

## Tasks and commits

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Fourth JS tab "Rechercher" | 43096bba |
| 2 | Remove the old Android entry, declare the searchGroup params | 5aac1ee4 |

## What was built

- `JsRootTabs.tsx`: `<JsTab.Screen name="search" options={{ headerShown: false, tabBarHideOnKeyboard: true }} component={SearchTabNavigator} />` after `publicMap`; doc comment now says four tabs. Label and glyph already existed (`TAB_TITLES.search`, `JS_TAB_ICONS.search`); nothing added there. The `ANDROID_TAB_ICONS.search` comment now says the PNG is only read by the native-tabs options.
- `types.ts`: `surveySearch` removed from `SurveysStackParamList`; `SearchStackParamList.searchGroup: { group: "mine" | "community" | "places" | "parcels"; query: string; memberName?: string }` with a doc comment.
- Removed: `surveySearch` screen and `SurveySearchRoute` import in `SurveysStack.tsx`, `onOpenSearch` in `SurveyListRoute`, `SurveyListScreen`, `SurveyListScreenProps`, the magnifier in `ListTitleBar`, and `fr.surveyList.a11y.openSearch`. `SurveySearchRoute` itself stays: it is still the page of the search stack until plan 25-14.
- Tests: JS tree registers `home, surveys, publicMap, search`; search tab options contain `tabBarHideOnKeyboard: true` (in `tabs.test.tsx` and `navigation.test.tsx`); no route or callback with "search" in its name besides the search tab/stack; new `list-chrome.test.tsx` checks `ListTitleBar` has the create button only.

## Notes for the next plans

- In the navigation test the registered screens containing "search" are `search` (the tab, on both trees) and `searchHome`. Plan 25-14 adds `searchGroup`, so that filter assertion in `navigation.test.tsx` (the halo-header test, near line 667) must list it.
- `routes.test.tsx` still has the `SurveySearchRoute` describe (uses the name `surveySearch` for its screen mock); remove it in 25-14.
- Until 25-14 the search tab shows today's Mes relevés / Communauté page on every platform.

## Deviations from Plan

### Minor

**1. New test file instead of editing SurveyListScreen.test.** The plan asks `SurveyListScreen.test.tsx` to assert the title bar has no search button, but that test mocks `list-chrome` (`ListTitleBar` is a string element), so it cannot see the buttons. The assertion lives in the new `mobile/src/screens/survey-list/list-chrome.test.tsx`; `SurveyListScreen.test.tsx` only drops the `onOpenSearch` fixture prop.

**2. Assertions phrased with a /search/i filter** (`navigation.test.tsx`, `routes.test.tsx`) rather than naming `surveySearch`/`onOpenSearch`, because the plan's case-insensitive `git grep -ni opensearch` must print nothing.

## Verification

- `cd mobile && npx jest --config jest.unit.config.js src/navigation src/screens/SurveyListScreen.test.tsx src/screens/survey-list src/i18n src/__checks__/structure.test.ts`: 23 suites, 304 tests pass.
- `npm run test:coverage:mobile`: 271 suites, 3452 tests pass, no threshold failure (navigation floor kept).
- `npm run lint`, `npm run typecheck`: exit 0. Prettier check passes on the touched files (whole-repo `npm run format:check` not run; plan 25-01 noted an unrelated report on `.claude/settings.local.json`).
- Task 1 greps: `name="search"` and `tabBarHideOnKeyboard: true` present; "Three tabs" 0; old tab-config comment 0.
- Task 2 greps: `git grep -n surveySearch mobile/src` prints nothing outside the allowed files; `git grep -ni opensearch mobile/src` prints nothing; `searchGroup:` present.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: mobile/src/screens/survey-list/list-chrome.test.tsx, mobile/src/navigation/tabs/JsRootTabs.tsx, mobile/src/navigation/types.ts
- FOUND commits: 43096bba, 5aac1ee4
