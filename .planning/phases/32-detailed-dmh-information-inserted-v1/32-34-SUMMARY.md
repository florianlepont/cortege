---
phase: 32
plan: 34
subsystem: mobile
tags: [wording, survey-detail, route-step, i18n]
key-files:
  modified:
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/survey-detail.ts
    - mobile/src/i18n/fr/survey-export.ts
    - mobile/src/screens/factor-detail/DoubtNoteStrip.tsx
    - mobile/src/screens/survey-detail/summary-state.ts
    - mobile/src/screens/survey-detail/FinishBar.tsx
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/screens/SurveyDetailScreen.tsx
    - mobile/src/navigation/routes/SurveyDetailRoute.tsx
decisions:
  - "Incertitude (noun) replaces Douteux everywhere; stored keys doubt and annotations unchanged"
  - "Route first applies to the Commencer button only (no factor filled); Continuer la notation is unchanged"
status: complete
---

# Phase 32 Plan 34: Incertitude wording and route-first start button Summary

"Douteux" becomes "Incertitude" across the app and docs, and a draft with no route now shows "Définir le parcours" instead of "Commencer la notation" on its summary. Neither change is checked on a device (not visible from here); both are covered by unit tests only.

## Task 1: wording (commit 19c251a0, formatting fix fac0add3)

Replaced strings:
- Factor page pill (`fr.factorDetail.strip.doubt`): label "Incertitude"; new `a11yLabel` "Incertitude sur ce facteur" (the pill's accessibility label); hint "Signale une incertitude sur ce facteur. Le score ne change pas."; note placeholder "Ce que vous avez vu, pourquoi cette incertitude…".
- Survey summary / "Facteurs IBP" row badge (`fr.surveyDetail` `doubtBadge`): "Incertitude".
- Spoken row flags (`factorFlags`, used by `openFactor` and `factorReadOnly`): ", incertitude signalée".
- PDF factor badge (`fr.surveyExport` `doubt`): "Incertitude" (the survey-pdf code reads the catalogue; no HTML string of its own held the word).
- Code comments (DoubtNoteStrip, factor-section.ts, score.styles.ts, visual-tokens.test.ts), tests (catalogue-additions-27, DoubtNoteStrip, FactorsList, factor-section, a11y label now asserted).
- Docs: CLAUDE.md, epic-c (US-C12 text; "Sûr" default wording dropped), ibp-form-spec, user-stories, api-contract, device-checks.
- Left on purpose: `docs/project/presentation-association.md` "relevés douteux" (moderation of suspect surveys, another meaning). Journal and filters held no such word.

## Task 2: route-first start button (commit 23a65f65)

Logic:
- `resolveFinishCta` (`mobile/src/screens/survey-detail/summary-state.ts`) gets a sixth parameter `routeMissing` and a new `FinishCta` kind `route` with label `fr.surveyDetail.cta.defineRoute` ("Définir le parcours"). It applies only when no factor is filled (the "Commencer la notation" case).
- `SurveyDetailScreen` passes `routePending` (`useSurveyRoute` loaded, route null, survey editable), so there is no flash while the route is read, and a submitted survey never gets it.
- `FinishBar` calls the new `onDefineRoute`; `SurveyDetailRoute` navigates to `surveyRouteGuide { surveyId, mode: "edit", surfaceHa: null }`. After the route is saved, `useSurveyRoute` re-reads on `updated_at` and the button returns to "Commencer la notation".
- `fr.surveyForm...steps.startScoring` (survey-form.ts:72) is not used by any code; the summary button is the only place "start scoring" can be pressed. The string was left as is.

## Verification
- Jest: survey-detail, SurveyDetailScreen, navigation, i18n, `__checks__` (catalogue-dash, abbreviations), survey-pdf pass; new tests cover both states (summary-state, FinishBar, screen wiring, route).
- `npm --workspace mobile run lint`: clean. Prettier clean on touched TS files.
- `npm run typecheck` and the full mobile coverage run fail only in files of the parallel executor (PercentTrackRow/PercentRow/StrataCoverFields tests, `structure.test.ts` on `ui/choice-list/ChoiceRow.tsx` line 53, a user-facing literal). None is in my files.
- `src/navigation` stays at 100 percent statements, functions, lines.

## Deviations
- Another process reverted my uncommitted task 2 edits once (working tree clean right after my first commit attempt); I redid them and committed at once.

## Risks
- A draft with factors already filled and no route still shows "Continuer la notation" (not in the request's wording); it is a one-line change in `resolveFinishCta` if the owner wants it.
- The guide in edit mode for a route-less draft was read from code and tested through the route mock, not run on a device.
