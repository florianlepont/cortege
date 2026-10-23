---
phase: 30-route-choice-assistant-inserted-v1
plan: 20
subsystem: mobile
tags: [route-guide, navigation, wizard, mandatory-route, offline, d-45]
requires: [30-04, 30-08, 30-16, 30-17, 30-18]
provides:
  - "RouteGuideScreen: the route step, one scrolling page with a single way forward (Utiliser ce parcours), no skip control"
  - "RouteGuideRoute: create mode (route written, draft finalised, weather point kept, D-45 reset) and edit mode (recorded answers back, save, go back)"
  - "finishSurveyCreation: the reset then select order, in one place"
  - "surveyRouteGuide registered in the survey stack; surveyRouteChoose and RoutePick declared in the navigation types for 30-21"
  - "The creation counts five steps: wizard three, parcel map (4 of 5), route step (5 of 5)"
affects: [30-21, 30-22, 30-24]
key-files:
  created:
    - mobile/src/screens/route-guide/RouteGuideScreen.tsx
    - mobile/src/screens/route-guide/RouteGuideScreen.test.tsx
    - mobile/src/navigation/routes/RouteGuideRoute.tsx
    - mobile/src/navigation/routes/finish-creation.ts
    - mobile/src/navigation/routes/finish-creation.test.ts
  modified:
    - mobile/src/screens/route-guide/route-guide-state.ts
    - mobile/src/screens/route-guide/useRouteGuideState.ts
    - mobile/src/screens/route-guide/route-guide-model.test.ts
    - mobile/src/screens/route-guide/useRouteGuideState.test.ts
    - mobile/src/navigation/types.ts
    - mobile/src/navigation/stacks/SurveysStack.tsx
    - mobile/src/navigation/routes/ParcelSelectionRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/navigation/navigation.test.tsx
    - mobile/src/navigation/wizard-reset-flow.test.tsx
    - mobile/src/screens/survey-wizard/SurveyWizardScreen.tsx
    - mobile/src/screens/survey-wizard/SurveyWizardScreen.test.tsx
    - mobile/src/screens/survey-wizard/WizardNativeHeader.tsx
    - mobile/src/navigation/stacks/stack-options.ts
    - mobile/src/i18n/fr/navigation.ts
    - mobile/src/i18n/fr/route-guide.ts
decisions:
  - "P-1 applied: the wizard draft exists from its first step but is finalised (createDraft) only after updateSurveyRoute succeeded; going back from the route step is a plain pop to the parcel map, with nothing written and no listener"
  - "The rare path (the wizard had no draft id) creates the draft first and writes the route on the created id; a failed write keeps that id so the retry cannot create a second draft"
  - "A pick from the chooser is applied once per pickNonce (T-30-45)"
  - "The large-stand choice is drawn once, by LargeStandOptions in the result zone; the stack's own copy of that card is hidden, and the footer button becomes Indiquer la surface d'un morceau while the choice is open"
metrics:
  tasks: 3
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 20: The route step, mandatory from creation Summary

A new survey now always passes through "Choix du parcours" after the parcel map, as step 5 of 5. The draft is finalised only when the route is accepted ("Utiliser ce parcours"); back from the step returns to the parcel map with nothing written.

## What was built

- **RouteGuideScreen** (`route-guide-screen`): page title (native large title on iOS through `ScreenFrame largeTitle`, `PageTitle` elsewhere), the step label in create mode, the lead and the "necessary" sentence, the link `route-know-link`, `QuestionStack` with `RouteAdvice` as the folded "Pour affiner" footer, then either the waiting line (or the missing-surface line when no surface prefill exists), or `SuggestionCard`, `ReasonsCard`, `RouteNotices` and `RouteDetailsCard`, or the two large-stand options, then the glossary and the floating footer. The footer holds the save-error notice with "Réessayer" and the `GlassButton` `route-use` (disabled with the screen-reader text "Utiliser ce parcours. Répondez d'abord aux questions." until `canUse`). It fades with the keyboard (opacity only, `usePagerChromeStyle`). No skip control, no optional tag, no network call.
- **RouteGuideRoute**: create mode runs `updateSurveyRoute` then `createDraft()` then `rememberPoint` then `finishSurveyCreation` (reset, then `openSurvey`). A write that resolves false or throws shows the error and stays; a `createDraft` that returns null stays (its status message is the existing one). Double press is ignored while saving. Edit mode reads the recorded route through `useSurveyRoute`, loads its answers into the step, saves and goes back, no reset. The chooser is opened with `navigation.navigate("surveyRouteChoose", ...)` carrying the stand surface, the current choice as `preselect` and the optional `section`.
- **finishSurveyCreation** (`routes/finish-creation.ts`): the D-45 order, with its comment moved from the parcel route.
- **Navigation**: `surveyRouteGuide` and `surveyRouteChoose` params and `RoutePick` in `types.ts`; `surveyRouteGuide` registered in `SurveysStack` with the title `fr.routeGuide.screen.title` and `pageTitleOptions` (back and swipe untouched). `shouldHideTabBar` and `tab-bar.ts` are unchanged.
- **ParcelSelectionRoute**: in wizard mode `onSave(weatherPoint, surfaceHa)` navigates to `surveyRouteGuide` with `{ surveyId: editingSurveyId, mode: "create", surfaceHa, weatherPoint }`; the edit branch is as before.
- **Five steps**: `TOTAL_STEPS = 5`, `headers.parcelsWizard` is "Étape 4 sur 5", the route step shows "Étape 5 sur 5" (from `fr.surveyForm.wizard.stepLabel`).
- **Edit mode support in the model**: a `loadRecord` action (and `actions.loadRecord`) brings a recorded route's answers, observer pick, zone and complement back into the step; a record built from it equals the saved one (tested for guide records, quick-path picks, uncapped picks, a partial route above the subdivision bound and a piece of a cut stand).

## Tests

- `RouteGuideScreen.test.tsx` (21): order and content, no skip or optional tag, disabled button text, unknown surface line, offline route from a typed surface, title and step label, scroll padding and footer padding, suggestion, reasons only for the guide's own suggestion, over-half warning left to the details card, advice folded and information only, chooser calls, restore, large stand (options once, footer asks for a piece, partial goes on), save error with Réessayer, keyboard fade, busy button.
- `routes.test.tsx`: 17 new cases for `RouteGuideRoute` (accept order, weather point, retry on the same draft, throwing write, finalisation failure, rare path and its retry, no usable route, double press, chooser params, pick once per nonce, edit mode save/failure/no id), plus the route step in the two frame suites, and the three parcel route cases rewritten.
- `wizard-reset-flow.test.tsx` (real React Navigation core): the three original D-45 cases now end through the route step and stay green; new cases for the route step opening without writes, the accept order (route then draft then summary on the new draft), and back from the route step (parcel map, older summary and selection untouched, nothing written, then one finalisation on a second try).
- `navigation.test.tsx`: registration of `surveyRouteGuide` (iOS large title, Android title, back and swipe on, tab bar rule unchanged).
- Full mobile unit suite: 432 suites, 6545 tests pass. `npm run lint` and `npm run typecheck` exit 0. `prettier --check mobile/src packages` clean (the repo-wide `format:check` flags only `.claude/settings.local.json`, not part of this plan). `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty. `api/test/check-env-parity.spec.ts` was not run (known bash 3.2 failure on this Mac). Every non-test file under `src/screens` and `src/navigation` is at most 316 lines.

## Deviations from Plan

**1. [Rule 3 - Blocking] `loadRecord` in the guide model.** Edit mode must "load the recorded answers" and the model only had a surface prefill. Added the pure `loadRecord` action in `route-guide-state.ts` and `useRouteGuideState` (files not in the plan's list), with tests in the existing model and hook test files.

**2. [Rule 2 - Correctness] Catalogue string `screen.useDisabledA11y`.** `GlassButton` has no hint prop and the structure gate forbids a template literal in a component, so the disabled button's spoken text is a catalogue string.

**3. Interpretations (no rule of the validated spec changed).**
- The step label "Étape 5 sur 5" is drawn as a small line under the title in the page, not in the header: on iOS the native large title owns the header, and the stack option only carries the title.
- The two large-stand options are drawn by `LargeStandOptions` in the result zone (it carries the subdivide notice); the stack's own card for the same question is hidden to avoid showing it twice, and the footer button reads "Indiquer la surface d'un morceau" while that choice is open (UI-SPEC 4.4). With an observer pick over a large stand, the pick stands and the options are not drawn.
- Reasons and the package warnings show only for the guide's own suggestion, not for an observer's own pick (they would justify another parcours); `partial_over_half` is left to the details card, which raises it live, to avoid a second identical notice.
- The weather point is remembered on the id returned by `createDraft` (same as the wizard's draft id on the normal path, and also set on the rare path, which formerly got none).
- `navigation.test.tsx` was also edited (a mock for the new route and three registration tests), a file the plan did not list.

**4. Chooser not registered yet.** `surveyRouteChoose` is declared in the types as the plan asks, but its screen is registered by 30-21. Until then "Je connais déjà mon parcours", "Changer de parcours" and "Modifier" call `navigate` on a route the stack does not know, which React Navigation reports in development and otherwise ignores. 30-21 closes this.

**5. TDD commit shape.** Tests were written before the implementation and seen failing (model `loadRecord` tests by a type error, screen tests by the missing module), but the RED state was not committed separately: each task is one `feat` commit holding its tests.

## Known limits (not stubs)

- In edit mode a refused write (the survey is no longer a draft) cannot be told from a storage error because `updateSurveyRoute` resolves false for both: the step shows the save error with "Réessayer".
- A `createDraft` failure shows no notice on the route step itself, only the existing status message, as the plan states.

## Commits

- 2e02e65d feat(30-20): the route step screen, mandatory and without a skip control
- 8f97eb9b feat(30-20): route of the route step, end-of-creation helper and stack registration
- 4ae2a82b feat(30-20): a new survey goes through the route step, counted as step 5 of 5

## Threat model

T-30-43 (creation blocked offline or by a save failure): no network call, a missing surface is typed, a failed write keeps the screen with "Réessayer"; tested. T-30-44 (duplicate drafts on back): the draft is finalised only at acceptance, back is a plain pop; tested on the real router. T-30-45 (stale `picked`): applied once per `pickNonce`; tested.

## Self-Check: PASSED

- Files exist: `RouteGuideScreen.tsx`, `RouteGuideScreen.test.tsx`, `RouteGuideRoute.tsx`, `finish-creation.ts`, `finish-creation.test.ts`.
- Commits 2e02e65d, 8f97eb9b, 4ae2a82b exist on the branch.
- Acceptance greps hold: `testID="route-use"`, `testID="route-know-link"`, `surveyRouteChoose` in `types.ts`, `"surveyRouteGuide"` in `SurveysStack.tsx`, `export function finishSurveyCreation`, `updateSurveyRoute` in `RouteGuideRoute.tsx`, `surveyRouteGuide` in `ParcelSelectionRoute.tsx`, `TOTAL_STEPS = 5`.
