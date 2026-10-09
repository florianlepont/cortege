---
phase: 24-survey-history-split
plan: 03
subsystem: mobile-ui
tags: [react-native, navigation, i18n, journal]
requires:
  - phase: 24-survey-history-split
    provides: independent (wave 1)
provides:
  - SurveyJournalScreen and SurveyJournalRoute ("Journal du relevé", route surveyJournal in the survey stack)
  - EventsTab hideHeader option
  - catalogue strings headers.surveyJournal, surveyDetail.menu.journal, surveyDetail.journal.subtitle, surveyDetail.events.title changed
affects: [24-survey-history-split]
tech-stack:
  added: []
  patterns: ["sub-page = ScreenFrame route + ScrollView screen with PageTitle, load-once effect and pull to refresh"]
key-files:
  created:
    - mobile/src/screens/SurveyJournalScreen.tsx
    - mobile/src/screens/SurveyJournalScreen.test.tsx
    - mobile/src/navigation/routes/SurveyJournalRoute.tsx
  modified:
    - mobile/src/screens/survey-detail/EventsTab.tsx
    - mobile/src/screens/survey-detail/EventsTab.test.tsx
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/i18n/fr/navigation.ts
    - mobile/src/navigation/types.ts
    - mobile/src/navigation/stacks/SurveysStack.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/navigation/navigation.test.tsx
    - mobile/src/state/render-counts.test.tsx
    - mobile/src/navigation/tab-bar.test.ts
key-decisions:
  - "No error notice and no journal.loadFailed string: loadSurveyEvents swallows errors and exposes no error state (UI-SPEC correction 12)"
  - "surveyJournal is registered in SurveysStackParamList only, never in PublicMapStackParamList (D-03, T-24-06)"
requirements-completed: []
status: complete
duration: 20min
completed: 2026-10-09
---

# Phase 24 Plan 03: Journal du relevé page Summary

The survey's change log now has a page and a typed route of its own, "Journal du relevé" (`surveyJournal`): page title, one subtitle line, then today's event timeline without its duplicate header, with pull to refresh and no reload button. Nothing opens it yet: the "…" menu entry is plan 24-06 and `surveyHistory` still shows the old combined page until plan 24-10.

REQ-C-history-split is deliberately left unchecked (the owner closes it after the phone check in plan 24-12).

## Accomplishments

- `EventsTab` gets `hideHeader?: boolean` (default false); the existing header assertion is kept and a `hideHeader` case added.
- `SurveyJournalScreen` (75 lines): `PageTitle`, footnote subtitle in `textSecondary`, `EntranceView index={0}` around `EventsTab hideHeader`; loads once per survey id, `RefreshControl` (tint `theme.colors.forest`, spinner follows the loading id), tab-bar clearance and native large title inset like the other sub-pages.
- `SurveyJournalRoute`: reads `useSurveys()` only, renders nothing without a selected survey, `ScreenFrame largeTitle={usesNativeLargeTitle()}`. No session or token read.
- `SurveysStack` registers `surveyJournal` right after `surveyHistory` with `pageTitleOptions(theme)`; `SurveyJournalRouteProps` and the param list entry added.
- Catalogue: `headers.surveyJournal`, `menu.journal`, `journal.subtitle` = "Ce qui s'est passé sur ce relevé.", `events.title` = "Journal du relevé"; the `menu` comment now describes Renommer, Journal du relevé and Supprimer.
- Navigation tests: route props and null case, `framedRoutes` and `largeTitleRoutes`, title, native large title, halo header, render-counts mock, tab-bar list.

## Task Commits

1. Task 1 (TDD): `6e2776eb` feat(24-03): journal page, EventsTab hideHeader and the journal strings
2. Task 2: `94aac06c` feat(24-03): surveyJournal route in the survey stack
3. Task 3 (TDD): `01482cf2` test(24-03): cover the surveyJournal route in the navigation suites

TDD note: tests for the screen and the `hideHeader` cases were written before the implementation, but a separate failing run (RED) was not recorded; the first run of the screen test was already against the implementation, which then needed two test fixes (the `RefreshControl` is a `ScrollView` prop, not a child, and `AppText` had to be mocked as a host `Text`). Task 3 tests cover code written in task 2, so they could not be RED.

## Verification actually run

| Check | Result |
|-------|--------|
| `jest SurveyJournalScreen.test.tsx EventsTab.test.tsx src/i18n src/__checks__` | pass, 9 suites, 104 tests |
| `cd mobile && npx tsc --noEmit` | exit 0 |
| `jest src/__checks__/structure.test.ts motion.test.ts i18n/catalogue.test.ts` | pass, 3 suites, 54 tests |
| `jest src/navigation src/state/render-counts.test.tsx` | pass, 13 suites, 204 tests |
| `npm run test:coverage:mobile` | exit 0, 256 suites, 3131 tests; `src/navigation` 100/100/100/100; `SurveyJournalRoute.tsx` and `SurveyJournalScreen.tsx` 100% on all four |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run format:check` | one warning only, `.claude/settings.local.json` (git-ignored local file, not part of this plan); all files of this plan are clean |
| Acceptance greps (hideHeader, `<EventsTab`, journal strings, `SurveyJournalScreenProps`, `surveyJournal: undefined`, `SurveyJournalRouteProps`, `name="surveyJournal"`, nav catalogue title, `SurveyJournalScreen` in render-counts) | all satisfied; `grep -c surveyJournal navigation.test.tsx` = 3, `grep -c SurveyJournalRoute routes.test.tsx` = 6, `PublicMapStackParamList` block has 0 matches, screen file 75 lines |

### Not run

- API e2e and any device or simulator check: this plan is mobile-only and nothing opens the page yet, so the screen was never seen on a device. `api/.env.test` does not exist locally in any case; the server-side refusal of another member's events (T-24-06) was verified in planning by reading `findOwnedOrThrow`, not re-run here.
- `npm run test:unit` for the API and `ibp-domain` workspaces was not re-run (no change there).
- The render-counts suite prints `console.debug` lines from `useCommunitySurvey` ("Cannot read properties of undefined (reading 'filter')"); the suite passes and this plan did not touch that hook's call site, but I did not check whether the noise existed before this plan.

## Deviations from Plan

**[Rule 3 - Blocking] `headers.surveyJournal` added in task 1 instead of task 2.** The screen and its test read `fr.navigation.headers.surveyJournal`, which would not type-check without it, so `i18n/fr/navigation.ts` was committed with task 1 (`6e2776eb`). Task 2 then needed no catalogue edit. No behaviour change.

## Known Stubs

None.

## Threat Flags

None. T-24-06 is mitigated as planned: `surveyJournal` appears only in `SurveysStackParamList` (0 matches in the `PublicMapStackParamList` block), the route reads the surveys context, and the API events endpoint already refuses surveys the caller does not own.

## Self-Check: PASSED

Commits `6e2776eb`, `94aac06c` and `01482cf2` exist; the three created files exist and all files in `files_modified` were changed (`tab-bar.ts` correctly untouched).
