---
phase: 30-route-choice-assistant-inserted-v1
plan: 17
subsystem: mobile
tags: [route-guide, questionnaire, progressive-disclosure, pure-model, d-05, o-04]
requires: [30-05, 30-11, 30-13]
provides:
  - "route-guide-model.ts (with route-guide-state.ts and route-guide-view.ts): RouteGuideModel, initialGuideModel, guideReducer, selectGuideView, buildRouteRecord"
  - "useRouteGuideState: reducer-backed hook with stable actions, the memoised view and the canonical record"
  - "QuestionStack (with QuestionCard, AnswerRow, RefineSection): one open card, answered rows, folded 'Pour affiner' with a footer slot"
affects: [30-18, 30-20]
key-files:
  created:
    - mobile/src/screens/route-guide/route-guide-model.ts
    - mobile/src/screens/route-guide/route-guide-state.ts
    - mobile/src/screens/route-guide/route-guide-view.ts
    - mobile/src/screens/route-guide/route-guide-model.test.ts
    - mobile/src/screens/route-guide/useRouteGuideState.ts
    - mobile/src/screens/route-guide/useRouteGuideState.test.ts
    - mobile/src/screens/route-guide/QuestionStack.tsx
    - mobile/src/screens/route-guide/QuestionCard.tsx
    - mobile/src/screens/route-guide/AnswerRow.tsx
    - mobile/src/screens/route-guide/RefineSection.tsx
    - mobile/src/screens/route-guide/question-text.ts
    - mobile/src/screens/route-guide/QuestionStack.test.tsx
  modified:
    - mobile/src/ui/AppField.tsx
    - mobile/src/i18n/fr/route-guide.ts
    - mobile/src/i18n/fr/route-guide.test.ts
decisions:
  - "Which questions are needed, the suggestion, the zone checks and the advice come only from routeQuestionsFor, recommendRoute, routeZoneIssues and routeAdviceFor; the model compares no surface with a number (grep gate returns 0)"
  - "The surface is confirmed, not read live: the package sees no surface until Suivant, so a cadastral estimate must be confirmed (research Pitfall 10)"
  - "chosen_by is 'guide' only when method, counting and factors equal the suggestion (spec section 8); editing the zone or the complement does not change it"
  - "Subdividing clears the surface and the homogeneity, difficulty and width answers (a piece is a new stand) and the observer's pick; choosing partial clears subdivided"
  - "A changed stand surface clears the typed zone and complement overrides and the large-stand choice; a changed homogeneity clears the large-stand choice (the bound depends on it)"
  - "Answers recorded: surface_ha when confirmed, then only the needed and answered keys, experience and valid hours, subdivided when true; no answers key at all on the quick path without a surface"
metrics:
  completed: 2026-10-14
status: complete
---

# Phase 30 Plan 17: Question stack of the route step Summary

The questionnaire of the mandatory route step is a pure model, a hook and an accordion: one open question card at a time, answered questions collapsed to editable rows, unneeded questions never drawn, and a canonical record built only on acceptance.

## What was built

- **Model** (`route-guide-model.ts` re-exports `route-guide-state.ts`, `route-guide-view.ts` and holds `buildRouteRecord`; split only to stay under the 400-line cap of `src/screens`). State holds the confirmed surface, the typed text, the estimate from the parcels, the answers, the large-stand choice, the refine answers, the observer's pick and the typed zone and complement. `selectGuideView` returns the answered rows in order, the open card, the package's recommendation, the current selection, `chosenBy`, the zone issues, the advice, the field texts and `canUse`.
- **Hook**: `useRouteGuideState({ surfaceHaPrefill })` with stable action callbacks; a late estimate (cached parcel geometry) reaches the card only while it is untouched.
- **Components**: `QuestionCard` (title as header, the one-sentence why, radio cards with captions and examples, or the surface field with its explanation, aid and linear-stand sentence, and "Suivant"), `AnswerRow` (56 pt button, "question. réponse. Modifier", hint "Rouvre la question"), `RefineSection` (folded, experience chips, hours field, footer slot, badge when filled), `QuestionStack` (layout transition with `ReduceMotion.System`, focus moves to the title of a card that opens after the page is shown), `question-text.ts` (code to catalogue mapping).
- testIDs as specified: `route-question-{id}`, `route-choice-{id}-{value}`, `route-surface-field`, `route-next-surface`, `route-answer-{id}`, plus `route-question-stack`, `route-refine`, `route-experience-{value}`, `route-hours-field`.

## Measured routine paths (actions to a usable route, then the final "Utiliser ce parcours" tap)

| Path | Actions to `canUse` | Taps with the button |
|------|---------------------|----------------------|
| 0.8 ha (Suivant confirms the estimate) | 1 | 2 |
| 2.4 ha, varied, easy (Suivant, homogeneity, difficulty) | 3 | 4 |
| 4 ha, homogeneous, easy, wide (Suivant, homogeneity, difficulty, width) | 4 | 5 |

These replace the UI-SPEC counts, which included the removed objective question. They are asserted in `route-guide-model.test.ts` ("routine paths").

## Tests

- `route-guide-model.test.ts`: 111 tests, including a replay of every `recommend` example of `ROUTE_RULE_CASES` through the model (status, method, zone, `chosen_by`, record validated by `validateSurveyRoute`), the questions equal to `routeQuestionsFor` at 0.5, 1, 5, 10 and 20 ha, R-21#no-effect through the model, subdivide and partial, picks, zone and complement checks.
- `useRouteGuideState.test.ts`, `QuestionStack.test.tsx` (16 tests, Reduce Motion included).
- Coverage of `src/screens/route-guide` non-test files: statements 100 % (model files), branches 96.9 % to 100 % per file.
- Full mobile unit suite: 425 suites, 6393 tests pass. `npm run lint` and `npm run typecheck` exit 0. `prettier --check mobile/src packages` clean (the repo-wide `format:check` flags only `.claude/settings.local.json`, not part of this plan). `git diff a6c5dd72 -- mobile/src/hooks/useSurveySync.ts` is empty. The API `check-env-parity.spec.ts` was not run (known bash 3.2 failure on this Mac).
- TDD gates: `test(30-17)` 0b1dae5b (RED, module missing), `feat(30-17)` e98bfcb8 (GREEN), `feat(30-17)` 87a57f8d (components).

## Deviations from Plan

**1. [Rule 3 - Blocking] Model split into three files.** The 400-line gate of `src/__checks__/structure.test.ts` flagged the 638-line model. It is now `route-guide-state.ts`, `route-guide-view.ts` and `route-guide-model.ts`, which re-exports everything so the plan's export list and the 30-18 and 30-20 imports are unchanged. The model coverage command of the plan targets `route-guide-model.ts` alone; coverage was measured over the three files instead.

**2. [Rule 2 - Correctness] Catalogue and primitive additions beyond the plan's file list.** `fr.routeGuide.largeStand.short` (row caption), `questions.refine.hoursInvalid` (hours outside 0 to 24), `a11y.optionLabelTagged` (a tagged card's spoken label; the structure gate forbids a template literal in a component); `AppField` gets an optional `suffix` prop ("ha", "heures" inside the field per UI-SPEC), unchanged when absent. The catalogue test has a sample for the new function.

**3. Interpretations (no rule changed).**
- "Pour affiner is never in the answered rows unless filled" is rendered as a badge on the folded section header (experience short label and hours), not as an answered row.
- The large-stand choice is a pseudo-question card `largeStand` with its own answered row once "partial" is chosen; its why is the package reason sentence `reasons.largeStand`.
- Suivant is disabled after an invalid commit or blur, and re-enabled as soon as the text changes, so the error can be produced by tapping it.
- Extra files: `RefineSection.tsx`, `question-text.ts`, `route-guide-state.ts`, `route-guide-view.ts`; the hook test is `.ts` as planned.

## Known Stubs

None. The suggestion card, details card and the screen are 30-18 and 30-20; `QuestionStack` is not mounted anywhere yet.

## Threat model

T-30-37 mitigated: the model delegates to the package and the acceptance grep for numeric surface comparisons prints 0. T-30-38 mitigated: `buildRouteRecord` returns `canonicalSurveyRoute` output and the replay test validates every record with `validateSurveyRoute`.

## Self-Check: PASSED

- Files present: all twelve created files and the three modified ones listed above.
- Commits present: 0b1dae5b, e98bfcb8, 87a57f8d.
