---
phase: 30-route-choice-assistant-inserted-v1
plan: 21
subsystem: mobile
tags: [route-guide, chooser, navigation, form-sheet, counting-presets, offline, o-14, o-01]
requires: [30-04, 30-16, 30-17, 30-18, 30-20]
provides:
  - "route-choose-model: pure chooser state, view, pick and edited record (RouteChooseModel, initialChooseModel, chooseReducer, selectChooseView, buildPick, buildEditedRecord, plus standOfRecord, hasUncappedDetailData, presetOfFactors)"
  - "CountingPicker: the two modes, five presets, one chip per factor (never H)"
  - "RouteChooseScreen: Choisir le parcours, three parcours, mode, details card, glossary, footer"
  - "RouteChooseRoute: pick mode (merged params with a fresh nonce) and edit mode (updateSurveyRoute on a draft, with or without a recorded route)"
  - "surveyRouteChoose registered in the survey stack as an iOS form sheet and an Android modal screen (routeChooseScreenOptions)"
affects: [30-22, 30-24]
key-files:
  created:
    - mobile/src/screens/route-guide/route-choose-model.ts
    - mobile/src/screens/route-guide/route-choose-model.test.ts
    - mobile/src/screens/route-guide/CountingPicker.tsx
    - mobile/src/screens/route-guide/CountingPicker.test.tsx
    - mobile/src/screens/route-guide/RouteChooseScreen.tsx
    - mobile/src/screens/route-guide/RouteChooseScreen.test.tsx
    - mobile/src/navigation/routes/RouteChooseRoute.tsx
  modified:
    - mobile/src/navigation/stacks/SurveysStack.tsx
    - mobile/src/navigation/stacks/stack-options.ts
    - mobile/src/navigation/types.ts
    - mobile/src/navigation/routes/RouteGuideRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/navigation/navigation.test.tsx
    - mobile/src/navigation/wizard-reset-flow.test.tsx
    - mobile/src/i18n/fr/route-guide.ts
decisions:
  - "A pick goes back to the route step with popTo(name, params, { merge: true }): the sheet is closed and the step keeps its own params (surveyId, mode, surfaceHa, weatherPoint); proved on the real React Navigation core"
  - "Mode default and presets come from the package only: defaultCountingFor, uncappedFactorsForPreset, isUncappedSelectionValid, routeZoneIssues, routeAdviceFor, suggestedZoneHa; the model holds no threshold or factor list"
  - "chosen_by is 'guide' only when the saved selection is the previous record's suggested parcours in plafonné; any other edit, and a draft with no previous record, is 'observer' with no suggestion"
metrics:
  tasks: 2
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 21: Choisir le parcours Summary

The observer can now choose the parcours directly ("Je connais déjà mon parcours") or change the suggestion ("Changer de parcours", "Modifier") in a form sheet that offers the three parcours of the app, the two modes in the method's words with the factors counted in full, and the shared details card. Pick mode hands the choice back to the route step ("Parcours choisi par vous"); edit mode saves a draft's route, with or without an existing one. Nothing needs the network.

## What was built

- **route-choose-model.ts** (pure, 399 lines): `initialChooseModel({ preselect, record, standHa, suggested, hasDetailData })` starts on the route step's selection, else the recorded route, else nothing chosen (`canUse` false). A parcours change sets `defaultCountingFor(method)` (always plafonné) unless the mode was touched; "Relevé déplafonné" sets the factors of the preset `all_factors`; a preset sets the chips (`uncappedFactorsForPreset`); a chip touch switches the preset to `custom`; removing the last factor sets `factorsMissing` and `canUse` false. `canUse` also needs a valid surface décrite and, for a partial parcours, a valid complement (`routeZoneIssues`, only the error-severity codes block). Back from déplafonné to plafonné sets `keptValuesNotice` when the draft holds B cover or F counts (`hasUncappedDetailData`); nothing is deleted. The view carries `routeAdviceFor` (so `uncapped_longer` shows under the mode, R-18). `buildPick` gives the `RoutePick`; `buildEditedRecord` gives the canonical record.
- **CountingPicker**: caption "Mode de relevé", the two cards `route-counting-capped` and `route-counting-uncapped` (name, explanation, `GlossaryInfo`); for déplafonné only, a 160 ms fade-in (`ReduceMotion.System`) of the lead, the five preset chips `route-preset-{id}` (caption of the active preset, and the R-17 note under "Peuplement mature" and "Scores toujours au maximum"), the nine factor chips `route-factor-{letter}` (letter and title, multi-select, H never offered) with the H sentence, the "Choisissez au moins un facteur." notice, and the information line that kept values are hidden.
- **RouteChooseScreen** (`route-choose-screen`): lead, section "Parcours" with three `RadioCard`s `route-parcours-{method}` (title with glossary glyph, explanation, "does" and "suits" sentences, the tag "Conseillé" on the suggested parcours), `CountingPicker` and `RouteAdvice`, the shared `RouteDetailsCard` (once a parcours is chosen), "Comprendre les mots", in edit mode the link `route-advise-link` "Être conseillé", and the footer `route-choose-use` "Utiliser ce parcours" (disabled with a spoken reason, busy while saving, save-error notice with "Réessayer"). It opens scrolled to the mode when `section` is "counting" (the "Modifier" link), once.
- **RouteChooseRoute**: pick mode calls `navigation.popTo("surveyRouteGuide", { picked, pickNonce: Date.now() }, { merge: true })`; edit mode loads the recorded route (and reloads when it changes, e.g. after a guided choice saved from here), saves through `updateSurveyRoute` and closes on true and on false (no longer a draft, silently), and shows the save error on a throw with "Réessayer"; a double press saves once. The header gets the title ("Choisir le parcours", or "Modifier le parcours" when the draft has a route) and an "Annuler" item; Annuler and the Android back write nothing. "Être conseillé" navigates to `surveyRouteGuide` with `{ mode: "edit", surveyId, surfaceHa }` (the given surface, else the recorded route's stand, else null).
- **Navigation**: `routeChooseScreenOptions(theme)` (iOS form sheet with 0.75 and 1 detents and a grabber, Android modal, solid header with `headerBackVisible: false`) in `stack-options.ts`; `surveyRouteChoose` registered in `SurveysStack.tsx`. This closes the gap noted by 30-20 (the three entry links navigated to an unregistered route).

## Tests

- `route-choose-model.test.ts` (41), `CountingPicker.test.tsx` (10), `RouteChooseScreen.test.tsx` (17).
- `routes.test.tsx`: 19 new cases for `RouteChooseRoute` (pick: selection and suggestion, header and Annuler, fresh nonce on each use, blank quick path, kept-values from the stored draft, no survey id and failed read; edit: recorded load and title, saved record shape, guide suggestion and answers kept, silent close on false, error and retry on a throw, double press, draft without a route, no survey id, "Être conseillé" surface) plus the guide-to-chooser `suggested` param.
- `wizard-reset-flow.test.tsx` (real React Navigation core): the chooser opens over the route step, `popTo` with `merge` returns to the step with the pick in its params and the original params intact, the same selection chosen twice carries a new nonce, Annuler leaves the step untouched.
- `navigation.test.tsx`: registration (Android modal with header and title, iOS form sheet and detents, tab bar rule unchanged).
- Verification: full mobile unit suite 435 suites, 6636 tests pass; `npm run lint` and `npm run typecheck` (ibp-domain, mobile, api build) exit 0; `prettier --check` is clean except `.claude/settings.local.json` (not part of this plan); `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty. `api/test/check-env-parity.spec.ts` was not run (known bash 3.2 failure on this Mac). Every non-test file I touched under `src/screens` and `src/navigation` is at most 399 lines.

## Deviations from Plan

**1. [Rule 3 - Blocking] `popTo` instead of `navigate({ ..., merge: true })`.** In React Navigation 7 `navigate` to a route that already sits lower in the stack does not close the sheet unless `pop` is set, and the typed overload wants the guide's full params. `popTo("surveyRouteGuide", params, { merge: true })` closes the sheet and merges into the step's existing params; the partial params needed one documented cast to the stack's param type. Verified on the real core in `wizard-reset-flow.test.tsx`. The key link pattern `pickNonce` still holds.

**2. [Rule 2 - Correctness] `suggested` param and a change in `RouteGuideRoute`.** The tag "Conseillé" on the suggested parcours needs the guide's advice, which the chooser params did not carry (`preselect` is the current selection, not the advice). Added the optional `suggested: { method, counting }` to the `surveyRouteChoose` params (`types.ts`) and `RouteGuideRoute.onOpenChooser` passes the package's recommendation when it is a route; in edit mode the chooser reads `guide.suggested` of the record. Files not in the plan's list: `types.ts`, `RouteGuideRoute.tsx`, `wizard-reset-flow.test.tsx`, `navigation.test.tsx`, `i18n/fr/route-guide.ts`; the existing chooser-params assertion in `routes.test.tsx` was updated.

**3. [Rule 2 - Correctness] Stored detail data for the kept-values line.** The model needs to know whether B cover or F counts exist on the draft (U-O10, T-30-47). The route reads the local draft once (`getLocalSurveyDraft`, re-read when the survey row changes) and `hasUncappedDetailData` checks `factors.B.strata_cover` and `factors.F.dmh_counts` through the package readers. A failed read is ignored (the line then simply does not show).

**4. Interpretations (no rule of the validated spec changed).**
- "Choisir moi-même" starts with no factor, as the package defines the `custom` preset (`UNCAPPED_PRESETS.custom = []`), so the helper "Choisissez au moins un facteur." shows until a chip is touched. Choosing "Relevé déplafonné" always restarts from "Tous les facteurs" (R-16).
- A partial parcours chosen in the chooser has no proposed surface when the homogeneity is not known (the chooser does not ask it; `suggestedZoneHa` returns null rather than invent a share), so the field opens empty with the 10 to 20 % helper. A zone typed in the session survives a change between the two partial parcours; leaving one kind (full or partial) for the other starts again from the package's proposal. R-14 applies: the rest of the stand is looked at by default for a partial parcours when the stand surface is known.
- The chooser's mode counts as "touched" when it loads in relevé déplafonné (a recorded or picked déplafonné is the observer's own choice, so a parcours change keeps it).
- The duration advice uses the recorded guide answers (difficulty, hours, experience) in edit mode; with no answers it uses the easy range.
- New catalogue strings: `routeGuide.chooser.titleEdit` ("Modifier le parcours") and `routeGuide.chooser.useDisabledA11y` (the existing disabled-button text talks about questions, which the chooser does not have).
- The routes of `routes.test.tsx` got the chooser tests inside the existing file as planned; the file-level `useSurveyRoute` mock became switchable (`mockRecordedRoute`) so a draft without a route can be tested.

## Known limits (not stubs)

- After "Être conseillé" saves a route from the guide (edit mode) and goes back, the chooser sheet is still below it; it reloads the recorded route when the survey row changes, so it shows the saved route (a typed, unsaved change in the sheet would be replaced).
- The form-sheet header, detents (0.75 and 1) and the solid header with "Annuler" are checked in code and in the registration tests only; they need a look on a device (owner review, 30-24).
- The entry from Contexte (`mode: "edit"`, draft only) and the factor pages' links belong to 30-22; this plan adds no link from the factor pages (spec section 7).

## Commits

- 1cdd5f88 feat(30-21): chooser model over the package defaults and presets, and the mode picker
- 6b5fcd25 feat(30-21): the chooser screen and route, registered as a form sheet

## Threat model

T-30-46 (editing a submitted survey's route): this plan adds no entry link; edit mode saves only through `updateSurveyRoute`, which the phone and the server refuse for a non-draft, and the sheet closes silently on a refusal (tested). T-30-47 (detail values lost): leaving the full count writes nothing and deletes nothing, the information line shows when B or F detail data exists (model, screen and route tests).

## Self-Check: PASSED

- Files exist: `route-choose-model.ts`, `CountingPicker.tsx`, `RouteChooseScreen.tsx`, `RouteChooseRoute.tsx` and the three test files.
- Commits 1cdd5f88 and 6b5fcd25 exist on the branch.
- Acceptance greps hold: `defaultCountingFor(` and `all_factors` in the model, `route-preset-` and `route-factor-` in `CountingPicker.tsx`, `"surveyRouteChoose"` in `SurveysStack.tsx`, `pickNonce` in `RouteChooseRoute.tsx`; the 400-line cap holds for the touched non-test files.
