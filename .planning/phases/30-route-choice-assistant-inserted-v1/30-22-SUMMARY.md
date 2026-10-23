---
phase: 30-route-choice-assistant-inserted-v1
plan: 22
subsystem: mobile
tags: [route-display, survey-detail, contexte, community, p-3, o-15, u-o9, o-07, o-19]
requires: [30-09, 30-21]
provides:
  - "RouteSection: the Parcours utilisé card (Contexte page and another member's survey), testIDs route-section, route-edit, route-choose-link, route-legacy, route-row-{id}"
  - "routeDisplayRows(route, 'community'): the route rows without Choix and Vos réponses"
  - "fr.surveyDetail.rows.contextValueWithRoute: 'v3.2 · cas 2 · Parcours en plein'"
  - "buildSummaryRowSections routeLabel: the short route label on the summary's Contexte row"
  - "onEditRoute prop of SurveyContextScreen, wired by SurveyContextRoute to the chooser in edit mode"
affects: [30-24]
key-files:
  created:
    - mobile/src/screens/survey-detail/route/RouteSection.tsx
    - mobile/src/screens/survey-detail/route/RouteSection.test.tsx
    - mobile/src/screens/survey-detail/summary-rows.test.ts
  modified:
    - mobile/src/app/route-display.ts
    - mobile/src/app/route-display.test.ts
    - mobile/src/screens/SurveyContextScreen.tsx
    - mobile/src/screens/SurveyContextScreen.test.tsx
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/navigation/routes/SurveyContextRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/screens/survey-detail/summary-rows.ts
    - mobile/src/screens/SurveyDetailScreen.tsx
    - mobile/src/screens/SurveyDetailScreen.test.tsx
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/screens/community-survey/CommunitySurveyScreen.tsx
    - mobile/src/screens/community-survey/CommunitySurveyScreen.test.tsx
decisions:
  - "The community card is placed after the weather and the survey note (the whole 'Conditions du relevé' group) and before the Facteurs IBP heading; the plan said 'after the conditions block' without naming the note card"
  - "RouteSection decides what to draw from route, status and editable: a route draws the rows (link only for an editable draft); no route and an editable draft draws Parcours à choisir; no route and a submitted survey draws the discreet legacy line (detail variant only); everything else draws nothing"
  - "The legacy case (P-3) is plain text without a card, two lines (Parcours : non renseigné, then the sentence), as the spec asks for a discreet line"
metrics:
  tasks: 2
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 22: Parcours utilisé in the survey detail Summary

The recorded route now reads as text wherever a survey is shown: a "Parcours utilisé" card on the Contexte page (with the link to change it, or to choose it when a draft has none), the short route label on the summary's Contexte row, and a read-only card on another member's survey.

## What was built

- **RouteSection** (`survey-detail/route/`): glass `AppCard` with the title inside, one caption (12 SemiBold, secondary) over one value (15 Regular) per row of `routeDisplayRows`, 12 between rows, like the Contexte card family. Cases: a route on an editable draft shows the rows and the accent link "Modifier le parcours" (`route-edit`); a route read-only shows the rows and no link; no route on the observer's draft shows "Parcours à choisir", "Choisissez le parcours pour pouvoir terminer ce relevé." and the link "Choisir le parcours" (`route-choose-link`); no route on a submitted survey shows "Parcours : non renseigné" and "Ce relevé a été fait avant l'assistant de choix du parcours." (P-3); not loaded, or community without a route, draws nothing. No map component is imported (Phase 31).
- **routeDisplayRows "community"** variant: the detail rows (Parcours, Mode de relevé, Facteurs comptés en entier, Surface décrite, Reste du peuplement) and stops before Choix and Vos réponses (O-15, T-30-50).
- **Contexte page**: `SurveyContextScreen` reads `useSurveyRoute(selectedSurvey)` and draws the card after `ScoringContextEditor`; the weather section stays first and its scroll anchor is unchanged. New prop `onEditRoute(surveyId)`; `SurveyContextRoute` navigates to `surveyRouteChoose` with `{ surveyId, mode: "edit", surfaceHa: null }` (the chooser reads the recorded answers itself). Editable means `canEditSurvey` (status not submitted), so a submitted survey never gets a link (T-30-48; storage and server also refuse non-drafts).
- **Summary row (U-O9)**: `fr.surveyDetail.rows.contextValueWithRoute` (middle dot U+00B7, no em dash, "v3.2 · cas 2 · Parcours en plein", or "v3.0 · Parcours en plein" with no cas). `buildSummaryRowSections` takes an optional `routeLabel` in its data argument; `SurveyDetailScreen` reads the route and passes `routeShortLabel(route)` (only the read and one argument added, file at 374 lines). The row value stays one line (`numberOfLines` 1 in the grouped list).
- **Community survey (O-15)**: `CommunitySurveyScreen` renders `RouteSection variant="community"` read-only from `readSurveyRoute(detail.survey_route)`, so a damaged remote route counts as absent and draws nothing (T-30-49).

## Tests

- `RouteSection.test.tsx` (9), `summary-rows.test.ts` (6, new), 3 new `routeDisplayRows` community cases, 5 new `SurveyContextScreen` cases (route read for the selected survey, draft/readonly, link, not loaded; order updated to four children), 1 new `routes.test.tsx` case (chooser in edit mode), 2 new `SurveyDetailScreen` cases (label with and without route), 4 new `CommunitySurveyScreen` cases (read-only community card and its position, no route, damaged route, older server).
- Verification: full mobile unit suite 437 suites, 6666 tests pass; `npm run lint` and `npm run typecheck` exit 0; `npm run format:check` is clean except `.claude/settings.local.json` (not part of this plan); `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty. `api/test/check-env-parity.spec.ts` was not run (bash 3.2 on this Mac). Files under `src/screens` and `src/navigation` stay under 400 lines (SurveyDetailScreen 374, CommunitySurveyScreen 320).
- The "act" console warnings printed by `SeeOnMapAction.test.tsx` are pre-existing and not related to this plan.

## Deviations from Plan

None to a rule of the spec. Notes:

- The tdd flow was done per task rather than with separate RED commits: tests and implementation of each task were committed together (two task commits).
- The plan's "Task 1" file list includes `routes.test.tsx`; I added a case there for `onEditRoute`. The plan's Task 2 list was respected exactly (no other file touched).
- The community card position (after the note card) is my reading of "after the conditions block"; a one-line move if the owner prefers it right after the weather.

## Known Stubs

None.

## Threat Flags

None. T-30-48 (link for the owner's draft only), T-30-49 (tolerant reader) and T-30-50 (no observer-addressed rows on the community card) are mitigated and tested.

## Commits

- cb5c3c14: feat(30-22): the Parcours utilisé card on the Contexte page
- b2fb08c5: feat(30-22): route label on the summary row and the route card on another member's survey

## Self-Check: PASSED

- RouteSection.tsx, RouteSection.test.tsx, summary-rows.test.ts exist; both commits are on the branch; STATE.md, ROADMAP.md and REQUIREMENTS.md untouched.
