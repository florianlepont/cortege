---
phase: 27-quick-survey-additions-inserted-v1
plan: 19
subsystem: mobile-ui
tags: [conditions, weather, survey-note, summary-card, community-survey, read-only, accessibility]
requires:
  - phase: 27-09
    provides: "weather rules (formatWeatherLine, hasWeatherValues, showsProviderAttribution)"
  - phase: 27-10
    provides: "community view-model; factor rows with doubt chip and note through FactorsList"
  - phase: 27-18
    provides: "useSurveyConditions, ConditionsReadOnly, surveyContext route param { section: 'conditions' }"
provides:
  - "ConditionsCard and SKY_GLYPHS: the summary card with weather line, source line, folded note, invitation row, search state"
  - "Summary wiring: card between the score card and the photos, opens the context page at Conditions"
  - "Conditions section on another member's survey (read-only, third-person source lines)"
affects: [27-20, 27-21, 27-22]
tech-stack:
  added: []
  patterns:
    - "one press target per card: the weather area is the RipplePressable, the note link and the note text sit outside it (no pressable inside a RipplePressable)"
    - "a card that can fold keeps 'truncated' once seen cut, so the link survives the expansion (same rule as FactorNote)"
key-files:
  created:
    - mobile/src/screens/survey-detail/conditions/ConditionsCard.tsx
    - mobile/src/screens/survey-detail/conditions/ConditionsCard.test.tsx
  modified:
    - mobile/src/screens/SurveyDetailScreen.tsx
    - mobile/src/screens/SurveyDetailScreen.test.tsx
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/navigation/routes/SurveyDetailRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/screens/community-survey/CommunitySurveyScreen.tsx
    - mobile/src/screens/community-survey/CommunitySurveyScreen.test.tsx
    - mobile/src/i18n/fr/conditions.ts
    - mobile/src/i18n/fr/conditions.test.ts
key-decisions:
  - "D-17: one card right after the score card; the weather area is the only element that navigates, the note never does"
  - "D-26: 'Source : Météo-France' under the weather line exactly when showsProviderAttribution is true (and a line is shown)"
  - "D-06: the community Conditions section is drawn only when a weather value can be shown or the note has text; the title never stands alone"
patterns-established:
  - "Summary-level facts that only the route knows (a lookup in flight) arrive as a boolean prop (conditionsLoading), the screen reads the rest from the draft with useSurveyConditions"
requirements-completed: []
duration: 55 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 19: Conditions card on the summary and on the community survey Summary

The survey summary now shows the day's conditions in one calm glass card after the score (weather line, Météo-France attribution, note folded to two lines with an in-place "Lire la suite"), and another member's submitted survey shows a read-only Conditions section between its parcels and its score.

## What was built

- **`ConditionsCard`** (`survey-detail/conditions/`): an `AppCard variant="glass"` (padding 16) around a Reanimated `LinearTransition` container (240 ms, `ReduceMotion.System`).
  - Weather area: one `RipplePressable` (min height 52, `accessibilityRole="button"`) with the 24 pt sky glyph in `visual.glass.iconTint`, the line (15 SemiBold, up to 2 lines) and a `chevron-forward-outline` 18. Label `fr.conditions.summary.openWithLine(line)`.
  - `SKY_GLYPHS: Record<WeatherSkyCode, keyof typeof Ionicons.glyphMap>` (eight outline glyphs; no sky falls back to `partly-sunny-outline`, fog is `reorder-two-outline`). The icon gate reads it.
  - Attribution line (13 Regular, `textSecondary`) under the area when `showsProviderAttribution(weather)`.
  - Note: 13 Regular, `numberOfLines` 2 unless expanded; `onTextLayout` reporting more than 2 lines reveals the link (`conditions-card-more`, 44 pt target, "Lire la suite" / "Réduire", `accessibilityState.expanded`). The `Text` always carries the full note. The link stays once the text has been seen cut.
  - States: weather and/or note; note only ("Aucune météo" in the area); lookup running with nothing yet (16 pt spinner and "Recherche de la météo…"); draft with neither (32 pt icon tile, "Conditions du relevé" / "Météo et note, facultatif", chevron); submitted with neither (renders null).
- **Summary wiring**: `SurveyDetailScreen` calls `useSurveyConditions(selectedSurvey)` and draws the card between `ScoreCard` and `PhotosStrip` (`submitted` = status "submitted", `loading` = `conditionsLoading`). New props `onOpenConditions` and `conditionsLoading` in `screen-props.ts`. `SurveyDetailRoute` navigates with `navigate("surveyContext", { section: "conditions" })` and reads `inFlightIds` from the weather prefill context. The "Contexte et parcelles" row still navigates with no param.
- **Community survey**: `CommunitySurveyScreen` draws a "Conditions" section title (existing `styles.section` / `sectionTitle`) and `ConditionsReadOnly emptyMode="hidden"` between the parcels list and the "Score IBP" section. Factor rows already carry the doubt chip and note through `FactorsList` (27-10); no extra code.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | e494cfab | feat(27-19): add the conditions summary card |
| 2 | d8a444c3 | feat(27-19): show the conditions card on the survey summary |
| 3 | 99a07e80 | feat(27-19): show the conditions on another member's survey |

## Verification

- Task commands: `ConditionsCard.test.tsx src/__checks__`; `SurveyDetailScreen.test.tsx routes.test.tsx render-counts.test.tsx src/__checks__`; `src/screens/community-survey src/__checks__`: all pass (motion, icons, dash, abbreviations, structure, layers, fonts gates included).
- `npm --workspace mobile run test:unit:coverage`: 347 suites, 4803 tests pass, coverage ratchets hold; `ConditionsCard.tsx` at 100 % statements, branches, functions and lines.
- `npm run lint`, `npm run typecheck` clean; `npm run format:check` reports only the local untracked `.claude/settings.local.json` (ignored by instruction).
- Line counts: `SurveyDetailScreen.tsx` 340 (cap 400), `CommunitySurveyScreen.tsx` 307 (cap 400).
- Acceptance greps all pass (`export function ConditionsCard`, `showsProviderAttribution`, `Ionicons.glyphMap`, `ConditionsCard` in the screen, `section: "conditions"` in the route, `ConditionsReadOnly` in the community screen).
- New tests: 21 card cases (line, glyphs, 52 pt button and label, note-only, unknown sky, attribution in four situations, fold and expand, Reduce Motion, blank note, invitation, submitted-empty, spinner variants), 3 summary cases (order, props, press), 1 route case plus the `onOpenConditions` navigation assertion, 4 community cases (section and order, note alone or weather alone, absent or unshowable data, loading state).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Catalogue key for the "Aucune météo" variant**
- **Found during:** Task 1
- **Issue:** the plan asks for the "Aucune météo" label variant when only a note exists, but `fr.conditions.summary` had only `open` and `openWithLine`; the same words must also be visible in the weather area. A literal in the component would break the rule that user-facing text lives in `src/i18n`.
- **Fix:** `fr.conditions.summary.noWeather = "Aucune météo"` (with a catalogue test). Not in the plan's file list.
- **Files modified:** `mobile/src/i18n/fr/conditions.ts`, `mobile/src/i18n/fr/conditions.test.ts`
- **Commit:** e494cfab

**2. [Rule 1 - Bug] The community section guard uses `formatWeatherLine`, not `hasWeatherValues`**
- **Found during:** Task 3
- **Issue:** the plan guards the section with `hasWeatherValues(detail.weather) || detail.survey_note`. `hasWeatherValues` is true for an unknown sky code (and `survey_note` for whitespace), but `ConditionsReadOnly` rows skip such values and, with `emptyMode="hidden"`, render nothing: the "Conditions" title would stand alone over no card, against UI-SPEC 3.3 ("the section is not drawn at all").
- **Fix:** the guard is `formatWeatherLine(detail.weather) !== null || detail.survey_note?.trim()`, which matches exactly what the read-only card can show (T-27-63). Tested with an unknown sky, a whitespace note and a request-time-only weather.
- **Commit:** 99a07e80

### Notes

- The plan says the card is "part of the existing entrance stagger"; `SurveyDetailScreen` has no entrance wrapper around its cards (`ScoreCard` and `PhotosStrip` are plain siblings), so the card is a plain sibling in the same place and nothing else on the summary changed.
- The weather area, the attribution line, the note and the link are siblings inside one glass card: the `RipplePressable` documents that its children must not be pressable, so the in-place link cannot live inside it. The attribution is read as its own text node (the area's spoken label carries the weather line only, as UI-SPEC 3.1 words it).
- Tasks were written tests first for the new component's file, with implementation and tests committed together per task (no separate RED commits).
- Device check of the fold animation and of the card on iOS 26 and Android stays with the device pass; the unit tests pin the props, states and callbacks.

## Known Stubs

None. The card and the community section read real data (`useSurveyConditions`, the community detail response).

## Threat Flags

None. T-27-63 is mitigated by `formatWeatherLine` / `isWeatherSkyCode` skipping unknown values and by plain React Native text only (tests: unknown sky, whitespace note); T-27-64 by the community route only receiving submitted surveys (27-17, server predicate), no draft path added here; T-27-65 by the attribution line following `showsProviderAttribution` (tests: provider, manual, all edited, partly edited).

## Self-Check: PASSED

- Files present: `ConditionsCard.tsx`, `ConditionsCard.test.tsx` under `mobile/src/screens/survey-detail/conditions/`; the modified screens, routes and tests listed above
- Commits present in `git log`: e494cfab, d8a444c3, 99a07e80
- Acceptance greps run and passing; lint, typecheck, unit coverage run and passing; `git diff` of STATE.md and ROADMAP.md shows only this plan's progress change (plans executed 17 to 18, checkbox, completed_plans 253 to 254, last activity)
