---
phase: 30-route-choice-assistant-inserted-v1
plan: 11
subsystem: mobile
tags: [i18n, catalogue, french, route-guide, glossary, survey-route]
requires:
  - phase: 30-03
    provides: "package rules with the reason, warning, advice, surface error, zone issue, question, preset and large-stand code unions"
  - phase: 30-05
    provides: "SurveyRoute record types (method, counting, uncapped_factors, zone_surface_ha, complement, guide)"
provides:
  - "fr.routeGuide: the whole French text of the route step and the chooser, in the method's own words, with the ten-term glossary"
  - "fr.surveyDetail.route, fr.surveyDetail.cta.routeRequired, fr.surveyExport.route, fr.factorDetail.countingMode, fr.validation.route, fr.syncErrors.byCode.route_required, reworded F hint"
  - "app/route-text.ts: Record<Code, ...> maps over the package unions, hectare and duration formatters"
  - "app/route-display.ts: routeDisplayRows (detail and pdf), routeShortLabel, routeAnswersSentence"
affects: [30-13, 30-14, 30-15, 30-17, 30-18, 30-19, 30-20, 30-21, 30-22, 30-24]
tech-stack:
  added: []
  patterns:
    - "Glossary sentences written once (TERM constant in route-guide.ts) and reused for the sentence under each name and the info sheet"
    - "Code to text maps typed Record<Union, ...> plus a test that walks the package code lists"
key-files:
  created:
    - mobile/src/i18n/fr/route-guide.ts
    - mobile/src/i18n/fr/route-guide.test.ts
    - mobile/src/app/route-text.ts
    - mobile/src/app/route-text.test.ts
    - mobile/src/app/route-display.ts
    - mobile/src/app/route-display.test.ts
  modified:
    - mobile/src/i18n/fr/index.ts
    - mobile/src/i18n/catalogue.test.ts
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/validation.ts
    - mobile/src/i18n/fr/labels.ts
    - mobile/src/i18n/fr/sync-errors.ts
key-decisions:
  - "Vocabulary is the method's own (O-12): Parcours en plein, Parcours partiel par bande, Parcours partiel par placette, Relevé plafonné, Relevé déplafonné, peuplement; caption Mode de relevé; each term has its spec section 3 sentence right under it; the word méthode is only used for 'méthode officielle de l'IBP' and 'Méthode IBP'"
  - "Zone and complement check sentences are written once in routeGuide.details.issues and reused by validation.route, route-text ROUTE_ZONE_ISSUE_TEXT and the proposal warning partial_over_half"
  - "Duration wording (minutes below two hours, hours to the half hour from two hours, never min or h) lives in routeGuide.advice; the numbers are computed in route-text.ts without Intl"
patterns-established:
  - "A catalogue test (route-guide.test.ts) walks every string and function leaf of the phase sections and asserts the forbidden tokens; a function leaf without a sample fails"
requirements-completed: [REQ-C-route-guide, REQ-C-route-display, REQ-C-route-record]
duration: 70min
completed: 2026-10-14
status: complete
---

# Phase 30 Plan 11: French catalogue of the route step Summary

**The whole French text of the phase now lives in the typed catalogue, in the method's own words with a plain sentence under each term, and every package code reaches the screen through a typed code-to-text map; the Contexte card and the PDF share one rows builder.**

## Accomplishments

- `fr/route-guide.ts` (`fr.routeGuide`): `screen` (title, lead, "nécessaire pour créer le relevé", quick path "Je connais déjà mon parcours", waiting and missing-surface lines, "Utiliser ce parcours", save error, "Suivant", "Modifier"), `questions` (surface with `linearHelp` per O-10 and the sub-stand question, homogeneity, difficulty, narrow, "Pour affiner" with experience and hours), `routes` (name, explanation, does, suits for the three parcours), `counting` (caption "Mode de relevé", the two modes, five presets with captions and the R-17 note, factors lead, at-least-one error, kept-values notice), `suggestion`, `largeStand` (subdivide tagged "Conseillé", partial), `reasons` (the ten codes), `warnings`, `advice` (duration, time short, beginner, uncapped longer, duration wording, the note that durations are an indication), `surfaceErrors`, `details`, `chooser`, `glossary` (ten terms of spec section 3 as `{ term, text }`) and `a11y`.
- Captions in existing modules: `fr.surveyDetail.route` (Contexte rows, draft without route "Parcours à choisir" with "Choisir le parcours", survey submitted before the phase "Parcours : non renseigné" with the sentence of P-3, `answerParts`), `fr.surveyDetail.cta.routeRequired` ("Choisissez le parcours pour terminer"), `fr.surveyExport.route` (PDF captions reusing the Contexte words, "Choix" sentences naming "l'application" and "l'observateur"; `identity.surveyMode` and `cappedMode` untouched), `fr.factorDetail.countingMode` (chip, one caption per factor A to G, I, J starting "Relevé déplafonné :", none for H, strata and dendromicrohabitat titles and helpers, F's own surface label, `fromRoute`), `fr.validation.route`, `fr.syncErrors.byCode.route_required`.
- F hint of `labels.ts` no longer speaks of a detailed protocol: "Renseignez le nombre d'arbres par hectare. Pour le score, l'app garde au plus 2 arbres par hectare et par groupe de dendromicrohabitats."
- `app/route-text.ts`: `ROUTE_REASON_TEXT`, `ROUTE_WARNING_TEXT`, `ROUTE_ZONE_ISSUE_TEXT`, `ROUTE_SURFACE_ERROR_TEXT`, `ROUTE_METHOD_TEXT`, `COUNTING_TEXT`, `UNCAPPED_PRESET_TEXT`, `ROUTE_QUESTION_TEXT`, `LARGE_STAND_OPTION_TEXT` (all `Readonly<Record<Code, ...>>`), `routeAdviceText`, `formatHectares`, `parseHectaresInput`, `formatDurationRange`, and `formatDecimalFr` (shared by the hectare, hours and duration formatters).
- `app/route-display.ts`: `routeDisplayRows(route, "detail" | "pdf")`, `routeShortLabel`, `routeAnswersSentence`, `RouteDisplayRow`.

## Task Commits

1. Task 1, `fr.routeGuide` and its catalogue test: `4d42582c`
2. Task 2, captions of Contexte, PDF, factor screens, errors, route-missing texts and the F hint: `223422ec`
3. Task 3, code to text maps, formatters and shared display rows (plus the duration wording in `fr.routeGuide.advice`): `617475e9`

Each task is one commit (test and implementation together), not a test/feat pair.

## Tests and verification

- `route-guide.test.ts` walks every string of the new sections and every function leaf (a leaf without a sample fails) and asserts: no snake_case token, no official abbreviation of the forest owners' centre, no abbreviation of dendromicrohabitat, no "Sg", no "min" or "h" as a unit, "méthode" only inside the two allowed phrases, no retired counting label, no sampling, typological, systematic or group wording, no inventory or study wording, no skip text, no "Facultatif" tag, no em dash. The glossary keys equal the ten of the spec in order; the official words and the glossary reuse are pinned.
- `route-text.test.ts` walks the package code lists (reason, warning, zone issue, surface error, method, counting, preset, question, large-stand option, advice) and requires one sentence for each, with no extra key; formatter tables for hectares, input parsing and durations.
- `route-display.test.ts`: rows for a parcours en plein, a partial parcours advised by the guide, a relevé déplafonné, the PDF variant with the answers inside the "Choix" sentence.
- Coverage: `route-text.ts` and `route-display.ts` 100 % statements, lines and functions; `src/i18n` 100 % statements, lines and functions.
- `npm run test:unit` (mobile): 415 suites, 6121 tests, all pass, including `abbreviations.test.ts`, `catalogue-dash.test.ts`, `structure.test.ts`, `motion.test.ts` and the PDF tests (a survey without route prints as before).
- `npm run lint`, `npm run typecheck`, `npx prettier --check "mobile/src/**/*.{ts,tsx}"`: pass. `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty.

## Deviations from Plan

None to a rule of the validated spec. Minimal adjustments, all documented here:

1. **`catalogue.test.ts` edited** (not in the plan's file list): its exact list of catalogue sections gained `routeGuide`. Without it the existing test fails on the new section.
2. **`fr.labels.factorTitles` instead of `FACTOR_TITLES`** in `route-display.ts`: `FACTOR_TITLES` is the same object but `app/constants.ts` imports `react-native`; the catalogue object keeps the module pure.
3. **Extra exports and leaves not in the plan list**: `formatDecimalFr` in `route-text.ts` (the three formatters share it); `fr.routeGuide.advice.durationMinutes`, `durationHours`, `durationUnderMinute` (the words of a range stay in the catalogue, not in `route-text.ts`); `suggestion.change` and `suggestion.restore` sit in `suggestion` rather than `screen` (the UI-SPEC skeleton had them in `screen`); `a11y.suggestionCard`, `hoursField`, `zoneField`, `totalField`, `glossaryInfo`; `details.zoneHelperFull`, `stripAdvice`, `plotAdvice`, `plotsAdded`; `counting.factorH`, `presetCaptions`, `presetsTitle`.
4. **Preset label "Scores toujours au maximum"** (the wording plan 30-21 uses) instead of the UI-SPEC draft "Éléments toujours au maximum".
5. **`routeAdviceText("duration", { estimated_minutes: null })`** returns the "durations are an indication" note: the package never emits `duration` without a range, so this branch is defensive.
6. **`parseHectaresInput("0")` returns 0, not null**: the package then reports `surface_invalid` (R-01) so the observer reads the surface error rather than a missing-surface prompt. A negative number is null, as the plan states.
7. **`routeAnswersSentence` for a subdivided stand** says "Morceau de 8 ha, peuplement découpé en sous-peuplements, ..." (`surface_ha` is the surface of one piece, spec section 8); the plan only listed `subdivided` as a single part.

### Places where the spec or an owner decision replaced the UI-SPEC draft wording

- Counting labels "Comptage rapide (relevé plafonné)" and "Comptage complet (relevé déplafonné)" and the caption "Comptage": now "Relevé plafonné", "Relevé déplafonné", caption "Mode de relevé", factor chip "Relevé déplafonné" (O-12, spec section 1). The explanations are the spec glossary sentences; the draft's "nécessaire pour regrouper des placettes ou pour une étude" is gone.
- The purpose question (four options), the typological and systematic parcours, the group of placettes, the group name field and hint, the group notice, the glossary terms for typologique, systématique, groupe de relevés and the "Étude" preset: removed (O-14, O-18). The preset is `all_factors`, label "Tous les facteurs".
- "Facultatif" tag and "Passer cette étape" skip link: removed, with the empty state "Parcours non choisi / ... ou le laisser vide" and the "passez cette étape" tail of the unknown-surface caption (the step is mandatory, O-19, U-O2). New: `screen.required`, `screen.missingSurface`.
- The three options above the subdivision bound: two (O-03). Title "Votre peuplement est grand. Deux façons de faire".
- Glossary: the ten terms of spec section 3 (peuplement, parcours en plein, parcours partiel, par bande, par placette, relevé plafonné, relevé déplafonné, surface décrite, reste du peuplement, dendromicrohabitat), keyed `peuplement`, `parcoursEnPlein`, `parcoursPartiel`, `parBande`, `parPlacette`, `relevePlafonne`, `releveDeplafonne`, `surfaceDecrite`, `resteDuPeuplement`, `dendromicrohabitat`. Term names for the two partial forms are "Parcours partiel par bande" and "Parcours partiel par placette".
- Routes: "Parcours partiel par bandes/placettes" (plural, UI-SPEC) became the singular forms of the method; the partial reasons speak of "bande" and "placette" accordingly. The draft's "partial_hard_to_observe: en bandes ou en placettes" is "en bande" because R-08 yields the strip.
- Contexte row labels: "Comptage" / "Éléments comptés en entier" are now "Mode de relevé" / "Facteurs comptés en entier"; "Parcours non choisi" for a draft is now "Parcours à choisir" (spec section 9); the draft's "Groupe de relevés" row is gone.
- Reasons: the two typological, systematic and the two uncapped-by-group reasons of the draft are dropped (not package codes); `large_stand` is new (R-11b); `capped_default` reads "Relevé plafonné : ...".
- Warnings: the linear-stand warning of the draft is the fixed help `questions.surface.linearHelp` under the surface question (O-10, no code).
- Advice: the draft's beginner sentence ("le parcours en plein est le plus simple, avec peu de calculs") is dropped because it implied a recommendation that no rule makes (R-21); it now only says a beginner needs more time. `durationNote` added (the durations are an indication, O-04).
- Errors: "Choisissez au moins un élément." is "Choisissez au moins un facteur."; the kept-values notice speaks of "relevé déplafonné".
- F hint: no "protocole détaillé" (UI-SPEC section 11).

## Known Stubs

None. The wording is a draft for the owner's review in plan 30-24 (U-O13, P-4); no screen consumes the catalogue yet (plans 30-13 to 30-22).

## Threat Flags

None. T-30-27 is mitigated by the `Record<Code, ...>` maps and the test that walks the package code lists; T-30-28 holds because the rows are plain strings (the PDF block escapes them in 30-14).

## Notes for next plans

- 30-13: `GlossaryTermId` is `keyof typeof fr.routeGuide.glossary.terms`; each entry is `{ term, text }`.
- 30-14: PDF captions are `fr.surveyExport.route`; `routeDisplayRows(route, "pdf")` returns plain strings to escape and has no answers row.
- 30-22: add the "community" variant to `routeDisplayRows` (type `RouteDisplayVariant` is `"detail" | "pdf"` today); `fr.surveyDetail.route` has `edit`, `none`, `noneBody`, `choose`, `legacyRow`, `legacyBody`.
- 30-17/30-18/30-20: duration text is `routeAdviceText(code, { estimated_minutes })`; the indication note is `fr.routeGuide.advice.durationNote`; hectare fields use `formatHectares` and `parseHectaresInput`.

## Self-Check: PASSED

Files verified present: the six created files above. Commits `4d42582c`, `223422ec` and `617475e9` exist on the branch. `grep -c "protocole détaillé" mobile/src/i18n/fr/labels.ts` prints 0; `routeGuide: routeGuideFr` is registered in `fr/index.ts`.
