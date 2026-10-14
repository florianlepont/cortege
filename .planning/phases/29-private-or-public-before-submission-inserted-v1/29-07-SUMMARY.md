---
phase: 29-private-or-public-before-submission-inserted-v1
plan: 07
subsystem: mobile
tags: [visibility, privacy, navigation, form-sheet, finish-flow]
status: complete
requires:
  - phase: 29-03
    provides: "fr.surveyFinish, VisibilityPicker, visibility-display"
  - phase: 29-05
    provides: "actions.setDraftVisibility, submitSurvey FinishOutcome"
provides:
  - "Route surveyFinish { surveyId } registered in the survey stack (native form sheet iOS, modal Android)"
  - "useFinishSheet: flush, store the changed choice, submit; phases idle, submitting, saveError, notFinished, frozen"
  - "nextStepAfterFinish(outcome, offline)"
  - "FinishSheet screen, FinishOutcomeNotice, createFinishSheetStyles, FinishSheetRoute, finishSheetScreenOptions"
affects: [29-08 entry points, 29-10 device gate]
tech-stack:
  added: []
  patterns:
    - "Hook owns the sequence and phase, screen only draws, route wires contexts and navigation protections"
    - "Status message read once at mount by a notice mounted only after an unfinished finish"
key-files:
  created:
    - mobile/src/screens/finish-sheet/finish-outcome.ts
    - mobile/src/screens/finish-sheet/finish-outcome.test.ts
    - mobile/src/screens/finish-sheet/useFinishSheet.ts
    - mobile/src/screens/finish-sheet/useFinishSheet.test.ts
    - mobile/src/screens/finish-sheet/FinishOutcomeNotice.tsx
    - mobile/src/screens/finish-sheet/finish-sheet.styles.ts
    - mobile/src/screens/FinishSheet.tsx
    - mobile/src/screens/FinishSheet.test.tsx
    - mobile/src/navigation/routes/FinishSheetRoute.tsx
    - mobile/src/navigation/routes/FinishSheetRoute.test.tsx
  modified:
    - mobile/src/navigation/stacks/stack-options.ts
    - mobile/src/navigation/stacks/SurveysStack.tsx
    - mobile/src/navigation/types.ts
    - mobile/src/navigation/navigation.test.tsx
key-decisions:
  - "D-04: the sheet opens on the stored choice (shared for a new draft, private for a draft stored private); choice and frozen state are taken once at mount"
  - "D-05: confirm order is flush, store (only when changed), submit; nothing is stored before the confirm; submit never runs after a failed write (T-29-23)"
  - "D-07: a submitted survey, or a frozen answer from the storage write, shows the locked cards, the info notice and a single Fermer button"
  - "Online unfinished finish keeps the sheet open with the status message of that moment (owner-facing deviation 1)"
  - "Back press swallowed with BackHandler, swipe down switched off with gestureEnabled, not usePreventRemove (owner-facing deviation 2)"
metrics:
  tasks: 3
  completed: 2026-10-13
requirements-completed: [REQ-C-privacy-choice]
---

# Phase 29 Plan 07: Finish sheet Summary

**A registered native sheet `surveyFinish` lets the observer choose shared or private, stores the choice on the draft before the finish runs, and reports every ending honestly; the two "Terminer le relevé" entries are still to be pointed at it by plan 29-08.**

## Accomplishments

- `nextStepAfterFinish`: submitted closes; not submitted closes offline and stays open online; busy returns to idle.
- `useFinishSheet`: confirm guarded by a running ref and by the phase, announces `submittingA11y` once, captures `offline` at the tap, runs flush, then `setDraftVisibility` only when the choice differs from the stored one, then `submitSurvey`. A failed flush or a rejected store gives `saveError` plus one error haptic and never submits; a `"frozen"` storage answer gives `frozen`. A deleted survey closes the sheet. Tested with a shared call log.
- `FinishSheet`: one ScrollView (title, `VisibilityPicker`, footnote, one polite live-region notice slot with priority frozen, saveError, notFinished, offline, then the buttons). Offline relabels the confirm "Enregistrer le choix" with its own accessibility label; submitting locks the cards without dimming, shows the confirm spinner and disables "Annuler"; frozen replaces the footnote with the info notice and keeps only "Fermer".
- `FinishOutcomeNotice`: reads the status once at mount (keyed by `outcomeKey`), warning notice, nothing for an empty message.
- `FinishSheetRoute`: finds the survey by `surveyId`, feeds the hook from the surveys and form contexts and `useIsOffline`; `gestureEnabled: false` and a swallowing `hardwareBackPress` listener while submitting only; `onClose` goes back only when the screen is focused.
- `finishSheetScreenOptions(theme)`: iOS `formSheet`, Android `modal`, detents `[0.65, 1]`, grabber, canvas background. `surveyFinish` registered after `surveyFactorHelp`; `navigation/types.ts` gets the param and `FinishSheetRouteProps`.

## Task Commits

1. Task 1, outcome mapper and hook: `6210c8d8`
2. Task 2, FinishSheet and outcome notice: `746eb688`
3. Task 3, route, options, registration: `8392c015`

## Owner-facing deviations from the UI-SPEC defaults

Both use the UI-SPEC's own contingency clauses.

1. **Finish returned without submitting, online:** the sheet stays open and shows the status message of that moment in a warning notice, instead of closing. The summary never displays status messages (only Parameters reads the status line), so closing would make a failed finish silent. Offline the sheet closes, because the notice shown before the tap already says the choice is stored and the survey can be finished once back online.
2. **Android back while submitting:** blocked with `BackHandler`, not `usePreventRemove`, which would also block the pager's programmatic return to the summary when the submit succeeds. The iOS swipe down is switched off through `navigation.setOptions({ gestureEnabled })`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered mock of the new route in `navigation.test.tsx`**
- **Found during:** full navigation suite
- **Issue:** the navigation tree test renders every stack route; the real `FinishSheetRoute` read the surveys context that the test only partly mocks.
- **Fix:** `jest.mock("./routes/FinishSheetRoute")` like the other routes, plus a test that `surveyFinish` is registered and its options (modal on Android, form sheet with detents 0.65 and 1 on iOS).
- **Files:** `mobile/src/navigation/navigation.test.tsx`
- **Commit:** `8392c015`

**2. Small implementation choices (not deviations of intent)**
- `FinishOutcomeNotice` takes an optional `style` so the 12 pt gap above a notice belongs to the notice, not to the live-region slot (an empty slot adds no space).
- A finish promise that rejects unexpectedly is shown as `notFinished` (logged through `logStatusDetail`), instead of leaving the sheet locked.
- After a closing outcome the phase stays `submitting` on purpose so the controls stay locked while the sheet leaves.
- The plan listed `actions.setDraftVisibility` and `actions.submitSurvey` under `useSurveyFormState`; they live in `useSurveys().actions` (as 29-05 delivered), only `flushDraft` comes from the form context.
- TDD: tests were written in the same pass as the implementation for each task, not as separate RED commits.

## Known Stubs

None. The sheet is reachable only once 29-08 points the two entries at `surveyFinish`.

## Threat Flags

None. T-29-23 (fixed order, tested with a call log), T-29-24 (gesture and back blocked while submitting, running ref guard), T-29-25 (frozen from status or storage answer, no write), T-29-26 (online unfinished keeps the sheet open with the status message) mitigated as planned.

## Verification Run

- `npm run lint`, `npm run typecheck`: pass.
- `npm --workspace mobile run test:unit`: 410 suites, 5970 tests pass (includes `src/__checks__`, `src/navigation`, the four new test files).
- `npx prettier --check` on every changed file: pass.
- `grep -c Animated` on `FinishSheet.tsx` and `FinishOutcomeNotice.tsx`: 0.

## Notes for Later Plans

- 29-08 must navigate to `surveyFinish` with `{ surveyId }` from the summary `FinishBar` and from `usePagerFinish` (the flush moves into the sheet, `onFinished` stays keyed on status `submitted`).
- 29-10: verify the 0.65 detent on the owner iPhone (number only), the title not drawn under scrolled content, bottom inset, Android top inset, light and dark.

## Self-Check: PASSED

- Files: all ten created files and four modified files present.
- Commits found: `6210c8d8`, `746eb688`, `8392c015`.
- STATE.md and ROADMAP.md untouched.
