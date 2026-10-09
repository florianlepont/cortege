---
phase: 24-survey-history-split
plan: 11
subsystem: mobile-community-survey
tags: [typescript, react-native, parcel-history, navigation, community]
requires:
  - phase: 24-survey-history-split
    provides: plan 24-02 (useCommunitySurvey withPhotos option), 24-03 (fr.navigation.headers.communityHistory), 24-04 (buildEntriesFromCommunity, historyRowState), 24-07 (toHistoryRow), 24-10 (ParcelHistoryView, variant community)
provides:
  - "Historique de la parcelle" row on another member's survey page, replacing the inline history list
  - CommunityHistoryScreen and CommunityHistoryRoute (parcel history of another member's survey, loaded without photos)
  - communityHistory route registered in the survey stack and the Explorer stack; surveyJournal stays out of the Explorer stack
  - source tests proving no community file reaches the change log (T-24-06)
affects: [24-12]
tech-stack:
  added: []
  patterns: ["the row value comes from the same toHistoryRow rule as the owner's summary", "source-text tests (readFileSync) guard a trust boundary"]
key-files:
  created:
    - mobile/src/screens/community-survey/CommunityHistoryScreen.tsx
    - mobile/src/screens/community-survey/CommunityHistoryScreen.test.tsx
    - mobile/src/navigation/routes/CommunityHistoryRoute.tsx
  modified:
    - mobile/src/screens/community-survey/CommunitySurveyScreen.tsx
    - mobile/src/screens/community-survey/CommunitySurveyScreen.test.tsx
    - mobile/src/i18n/fr/community-survey.ts
    - mobile/src/navigation/routes/CommunitySurveyRoute.tsx
    - mobile/src/navigation/types.ts
    - mobile/src/navigation/stacks/SurveysStack.tsx
    - mobile/src/navigation/stacks/PublicMapStack.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/navigation/navigation.test.tsx
    - mobile/src/state/render-counts.test.tsx
    - mobile/src/navigation/tab-bar.test.ts
key-decisions:
  - "The community page's history row uses historyRowState with hasParcel true and no loading, error or offline: the detail already carries history[], so the row has no state of its own"
  - "The row is shown only when detail.history.length > 1 (same condition as the old inline list)"
  - "The Explorer-stack test identifies that stack by the navigator that registers publicMapHome, because the fake navigator keeps only the last registration per screen name; mockRegistrations records them all"
requirements-completed: []
status: complete
duration: 35min
completed: 2026-10-09
---

# Phase 24 Plan 11: Community history page Summary

Another member's survey now ends with one row, "Historique de la parcelle" (value such as "24 → 31", shown when the parcels have more than one survey), that opens a new `communityHistory` page: the same trend card and list as the owner's history, with the author first in each row and no per-factor card. The page loads the survey with `withPhotos: false`, reuses the community loading, error and "Réessayer" texts, and is registered in both stacks that register `communitySurvey`. Nothing on this path reaches the change log. REQ-C-history-split is deliberately left unchecked (`- [ ]`); the owner closes it after the phone check in plan 24-12.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | History row on another member's survey page | 9b8bf24e |
| 2 | Community history page and its route | 9102f367 |
| 3 | Register communityHistory in both stacks, navigation tests and coverage | f9e54978 |

## What changed

- `CommunitySurveyScreen.tsx` (290 lines, was 329): `onOpenSurvey` prop replaced by `onOpenHistory`. After `FactorsList`, when `detail.history.length > 1`, one `AppGroupedList` row (`label: fr.surveyDetail.rows.history`, `multiline`, value and accessibility label from `toHistoryRow(historyRowState(..., buildEntriesFromCommunity(detail.history)))`, memoised on `detail`). The inline list, its six style keys (`historyList`, `historyRow`, `historyRowCurrent`, `historyCopy`, `historyTitle`, `historyTotal`; this includes the local `historyRow` style 24-10 left for this plan) and the `AppPressable` import are gone.
- `i18n/fr/community-survey.ts`: removed `history.title`, `current`, `total`, `open` (grep found no other reader); `history.row` kept, it is read by `HistoryList`.
- `CommunitySurveyRoute.tsx`: `onOpenHistory` pushes `communityHistory` with the route's `surveyId`; `useNavigation` generic lists both `communitySurvey` and `communityHistory`.
- `CommunityHistoryScreen.tsx` (95 lines): loading and error blocks as on the survey page; ready state is `PageTitle` (`fr.navigation.headers.communityHistory`), the subtitle `fr.parcelHistory.page.subtitle`, then `ParcelHistoryView variant="community"` with `buildEntriesFromCommunity(detail.history)`. No refresh control, no header items.
- `CommunityHistoryRoute.tsx`: `useCommunitySurvey(apiUrl, accessToken, surveyId, { withPhotos: false })`, `onOpenSurvey` pushes `communitySurvey`, one `ScreenFrame` with `usesNativeLargeTitle()`, no `setOptions`.
- `types.ts`: `communityHistory: { surveyId: string }` in `SurveysStackParamList` and `PublicMapStackParamList`; `CommunityHistoryRouteProps`.
- `SurveysStack.tsx` / `PublicMapStack.tsx`: `communityHistory` registered after `communitySurvey` (title `headers.communityHistory`, `pageTitleOptions`; the Explorer one with `headerShown: true`). `surveyJournal` is not registered in the Explorer stack.

## Tests

- `CommunitySurveyScreen.test.tsx`: history row value "24 → 31", label, `multiline`, accessibility label "Historique de la parcelle. de 24 à 31 sur 50", placement after `FactorsList`, `onOpenHistory` on press, no `community-history-` testID; no row with one or zero entries; source test that the file contains none of `EventsTab`, `SurveyJournal`, `surveyJournal`, `useSurveyDetailHeader`, `surveyEvents`.
- `CommunityHistoryScreen.test.tsx` (new): loading, error with retry, ready state props, native large title versus plain insets, source test over the screen and the route (those five plus `unstable_headerRightItems` and `headerRight`).
- `routes.test.tsx`: `CommunitySurveyRoute` pushes `communityHistory`; new `CommunityHistoryRoute` describe (state passed, `{ withPhotos: false }` recorded, `onOpenSurvey` pushes `communitySurvey`); `communityHistory` added to `framedRoutes` and `largeTitleRoutes`.
- `navigation.test.tsx`: `communityHistory` in `SURVEY_SUB_PAGES`, `titles` and the halo list; new test over `mockRegistrations` that the Explorer stack registers it with `headerShown: true` and the right title, that neither `surveyJournal` nor `surveyHistory` is in the Explorer stack, and that the survey stack registers it too.
- `render-counts.test.tsx` mock and `tab-bar.test.ts` case added.

## Verification actually run

| Check | Result |
|-------|--------|
| `npx jest ... src/screens/community-survey src/navigation/routes/routes.test.tsx src/i18n src/__checks__/structure.test.ts` (Task 1) | 6 suites, 149 tests passed |
| `npx jest ... src/screens/community-survey` (Task 2) | 3 suites, 26 tests passed |
| `npx jest ... src/navigation src/state/render-counts.test.tsx` (Task 3) | 13 suites, 211 tests passed |
| `npx tsc --noEmit` (mobile), after each task | exit 0 |
| `npm run test:coverage:mobile` | exit 0, 266 suites, 3360 tests passed; `src/navigation` 100/100/100/100; `CommunityHistoryScreen.tsx` and `CommunityHistoryRoute.tsx` 100/100/100/100; `CommunitySurveyScreen.tsx` 98.41/100/94.44/98.24 (uncovered line 232, the existing `onOpenFactor={() => undefined}`) |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run format:check` | only the warning on the git-ignored `.claude/settings.local.json` |
| `npm run test:unit` | ibp-domain 9 suites / 230 tests passed; API 36 of 37 suites passed, the only failing suite is `test/check-env-parity.spec.ts` (34 tests, pre-existing, environment related, also fails on main, unrelated to this phase); the script stops there, so the mobile suite was run separately: `cd mobile && npx jest --config jest.unit.config.js` gave 266 suites, 3360 tests, all passed |
| Acceptance greps (`push("communityHistory"`, `toHistoryRow(`, `onOpenHistory`, `community-history-` count 0, `readFileSync`, line count 290, `withPhotos: false`, `communityHistory: { surveyId: string }` count 2, `buildEntriesFromCommunity(`) | all as required |

### Not run

- API e2e: not applicable (mobile-only plan) and `api/.env.test` does not exist locally, so it could not run anyway.
- No simulator, device or Android check. Everything was exercised through `react-test-renderer` with mocked `react-native`, the history view and the hooks. The real layout of the new row, the page at 375 pt, Dynamic Type, the native large title on iOS 26 for `communityHistory`, and the push from both the Mes Relevés stack and the Explorer stack are unverified until the phone check in plan 24-12.
- `render-counts.test.tsx` prints `console.debug` lines about `communitySurvey.photos` ("Cannot read properties of undefined (reading 'filter')") from the real hook against a mocked API; they come from the existing `CommunitySurveyRoute` mounting in that test, not from this plan's changes, and the test passes.

## Deviations from Plan

None. Rules 1 to 3 did not apply. TDD ordering: per task the tests and the code were written in the same pass and committed together (one commit per task), not as separate `test(...)` and `feat(...)` commits.

## Note on the one-frame flash (from 24-10)

The community history page does not show it: the `useCommunitySurvey` hook starts in the `loading` phase and `CommunityHistoryScreen` shows the spinner for `status === "loading" || !detail`, so the loaded view is never drawn before the loading state. The survey page has the same property. (Without an access token the hook stays in `loading`, so the page keeps the spinner.)

## Known Stubs

None.

## Threat Flags

None. T-24-06 mitigated as planned: no community file imports the events list, the journal or the owner's header hook (source tests in both community test files), `surveyJournal` is not registered in the Explorer stack (navigation test), and the community pages set no header items. T-24-17, T-24-14 and T-24-SC accepted; no package installed.

## Self-Check: PASSED
