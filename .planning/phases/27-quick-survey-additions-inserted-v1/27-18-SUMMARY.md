---
phase: 27-quick-survey-additions-inserted-v1
plan: 18
subsystem: mobile-ui
tags: [conditions, weather, survey-note, context-page, read-only, route-param, keyboard, accessibility]
requires:
  - phase: 27-03
    provides: "fr.conditions catalogue, NoteField, the ochre contrast pair"
  - phase: 27-09
    provides: "weather rules (weatherViewState, editWeatherValue, parse and format helpers, showsProviderAttribution)"
  - phase: 27-13
    provides: "updateSurveyNote and updateSurveyWeather silent writes, useWeatherPrefillState (retry, refill)"
provides:
  - "ConditionsSection: weather card (seven states, sky chips, four typed fields, source line) and survey note card, or their plain-text twin"
  - "ConditionsReadOnly: reusable plain-text weather and note cards (emptyMode line or hidden), for the community survey in 27-19"
  - "useSurveyConditions: note, weather and parcel ids of a survey from its local payload, for 27-19's summary card"
  - "surveyContext route param { section?: 'conditions' } with a single scroll to the section"
affects: [27-19, 27-21]
tech-stack:
  added: []
  patterns:
    - "offset chain for focus scrolling: each level adds its onLayout y, the page adds the section y and scrolls once"
    - "scroll-to-section waits for two facts (section measured, content sized after the draft was read), whichever comes last"
    - "text held locally with a 400 ms debounce, flushed on blur and unmount, adopted from storage only while not focused"
key-files:
  created:
    - mobile/src/screens/survey-detail/conditions/useSurveyConditions.ts
    - mobile/src/screens/survey-detail/conditions/useSurveyConditions.test.ts
    - mobile/src/screens/survey-detail/conditions/SkyChips.tsx
    - mobile/src/screens/survey-detail/conditions/WeatherFields.tsx
    - mobile/src/screens/survey-detail/conditions/WeatherFields.test.tsx
    - mobile/src/screens/survey-detail/conditions/WeatherBlock.tsx
    - mobile/src/screens/survey-detail/conditions/ConditionsReadOnly.tsx
    - mobile/src/screens/survey-detail/conditions/ConditionsSection.tsx
    - mobile/src/screens/survey-detail/conditions/ConditionsSection.test.tsx
  modified:
    - mobile/src/screens/SurveyContextScreen.tsx
    - mobile/src/screens/SurveyContextScreen.test.tsx
    - mobile/src/screens/survey-detail/screen-props.ts
    - mobile/src/navigation/routes/SurveyContextRoute.tsx
    - mobile/src/navigation/routes/routes.test.tsx
    - mobile/src/navigation/types.ts
    - mobile/src/ui/NoteField.tsx
    - mobile/src/ui/NoteField.test.tsx
    - mobile/src/i18n/fr/conditions.ts
    - mobile/src/i18n/fr/conditions.test.ts
key-decisions:
  - "D-09, D-10: a field is an edit only when its parsed value differs from the stored one, so visiting a prefilled field never marks it edited by hand"
  - "D-05: the note card keeps the typed text locally, writes after 400 ms, on blur and on unmount; an emptied note is sent as an empty string"
  - "UI-SPEC 1.6: scrolling to the section waits for the draft to be read and the page resized, so it never lands on a header with the cards still to come"
  - "The view state is computed in the screen (it needs the weather read there by useSurveyConditions); the route passes the raw weatherRequest facts"
patterns-established:
  - "Conditions callbacks take the survey id at the screen level (onChangeNote(surveyId, text)), like the other context page actions, so a late flush never reaches another survey"
requirements-completed: []
duration: 2 h 10 min
completed: 2026-10-11
status: complete
---

# Phase 27 Plan 18: Conditions section of the context page Summary

"Contexte et parcelles" now ends with a "Conditions" section: a weather card with its seven calm states, eight sky chips and four typed values, then a 1000-character survey note card, both written to the draft as the observer types, and shown as plain text once the survey cannot be edited.

## What was built

- **`useSurveyConditions`** reads the note, the weather and the parcel ids from the local payload (`getLocalSurveyDraft`), keyed on `survey.id` and `survey.updated_at`, drops overtaken reads, and reports `loaded` (also after a failed read, with empty values).
- **`SkyChips`**: eight `AppChoiceChip`s in the package order (`WEATHER_SKY_CODES`), testIDs `conditions-sky-{code}` on a wrapper (the chip has no testID prop), group named "Ciel du jour"; pressing the chosen chip clears the sky.
- **`WeatherFields`**: four `AppField`s in a wrapping row (basis 128, grow, gap 12) with the unit as a hidden trailing suffix, label in the 13 SemiBold role, iOS and Android keyboards as the UI-SPEC table, Android `next` then `done`. Text is parsed on blur: a valid value goes to `onEdit`, an empty text clears, an out-of-range or unreadable text shows its range message (13 Regular, `onSurface.danger`, border in the field error colour) and is never written. Time accepts 1430, 14:30, 14h30 and keeps the survey's date (`requested_at`).
- **`WeatherBlock`**: glass card with the "Météo" title, one status line for the seven view states (glyph or 16 pt spinner, sentence, polite live region, iOS `announceForAccessibility` once per change while the screen is visible), "Réessayer" in Unavailable, "Remplir à nouveau" in Edited behind a native `Alert` ("Annuler" / destructive "Remplacer"), sky chips, fields and the "Source : Météo-France" line exactly when `showsProviderAttribution`. Provider values fade in over 160 ms through Reanimated (`ReduceMotion.System`).
- **`ConditionsReadOnly`**: label and value rows through `AppGroupedList` (only values that exist), third-person source line as the list footer, the note as selectable 15 Regular text, "Météo non renseignée." for a note without weather, "Aucune condition renseignée." (`emptyMode="line"`) or nothing (`"hidden"`).
- **`ConditionsSection`**: `AppSectionHeader`, then either the two editable cards or `ConditionsReadOnly`; nothing under the header until the draft was read. The note card holds the text locally, writes it 400 ms after typing stops, on blur and on unmount, and adopts the stored note again only while not focused and not waiting for its debounce.
- **Context page and route**: `SurveyContextScreen` draws the section last (24 pt gap from the page gap), editable when `canEditSurvey`. The scroll view gets `keyboardShouldPersistTaps="handled"`, `keyboardDismissMode="on-drag"`, `automaticallyAdjustKeyboardInsets`. With `section: "conditions"` it scrolls once (animated unless Reduce Motion); a focused field scrolls itself into view with its label. `SurveyContextRoute` reads `route.params?.section`, the weather prefill context and `useIsOffline`, and wires `updateSurveyNote`, `updateSurveyWeather`, `retry` and `refill`. `surveyContext` is typed `{ section?: "conditions" } | undefined`.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 6a52df07 | feat(27-18): add the survey conditions hook, sky chips and weather fields |
| 2 | f79aa21d | feat(27-18): add the weather card, the note card and the read-only conditions |
| 3 | 0912242f | feat(27-18): end the context page with the Conditions section |

## Verification

- Task commands: `src/screens/survey-detail/conditions`, `src/screens/survey-detail/conditions src/__checks__`, `SurveyContextScreen.test.tsx src/navigation src/__checks__`: all pass (motion, icons, dash, abbreviations, structure, layers, fonts gates included).
- `npm --workspace mobile run test:unit:coverage`: 346 suites, 4774 tests pass, ratchets hold (`ConditionsSection`, `ConditionsReadOnly`, `SkyChips`, `WeatherFields`, `useSurveyConditions` at 100 %, `WeatherBlock` at 96 % statements).
- `npm run lint`, `npm run typecheck` clean; `npm run format:check` reports only the local untracked `.claude/settings.local.json` (ignored by instruction).
- Acceptance greps all pass; `SurveyContextScreen.tsx` is 216 lines, every new component under 310 lines.
- New tests: 6 hook cases, 20 field and chip cases (keyboards per platform, range and time messages, unchanged text is no edit, late provider answer, refill), 26 section cases (seven states, links, announcements, source line, debounce, flush on blur and unmount, adoption rules, read-only variants), 8 screen cases (editable or plain, view state, wiring, keyboard props, scroll once in either order, Reduce Motion, wait for the draft, focus scroll), 4 route cases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan is inconsistent about where the view state is computed**
- **Found during:** Task 3
- **Issue:** the plan has the route compute `weatherViewState({ ..., weather })` and pass `conditionsViewState`, but also says `useSurveyConditions(selectedSurvey)` is called in the screen, which is the only place that has the weather. The route cannot compute it without a second read.
- **Fix:** the route passes `weatherRequest: { online, inFlight, unavailable }` (the facts only it knows: network and weather context) and the screen computes `weatherViewState` with its parcel ids and the weather it read. The other props are as planned. A route test pins the three facts.
- **Files modified:** `screen-props.ts` (new `WeatherRequestState`), `SurveyContextScreen.tsx`, `SurveyContextRoute.tsx`
- **Commit:** 0912242f

**2. [Rule 3 - Blocking] Screen callbacks take the survey id**
- **Issue:** the plan wrote `actions.updateSurveyNote(id, text)` in the route. A note flushed on unmount could reach another survey if the selection changed first, so the screen props follow the page's other actions (`onChangeNote(surveyId, text)`), bound to the survey of the render that owns the field; the section is keyed by survey id.
- **Commit:** 0912242f

**3. [Rule 2 - Missing functionality] `NoteField` reports focus**
- **Issue:** the note card must scroll into view like the weather fields, and `NoteField` had no focus callback.
- **Fix:** optional `onFocus` prop (one line in `NoteField.tsx`, one test). Not in the plan's file list.
- **Commit:** f79aa21d

**4. [Rule 2 - Missing functionality] Value-with-unit strings in the catalogue**
- **Issue:** the read-only rows need "12 km/h" and "2 mm" without the "vent" and "pluie" words of the one-line parts. A literal no-break space in the component would break the rule that user-facing text lives in `src/i18n`.
- **Fix:** `fr.conditions.weather.values` (temperature, wind, rain) with a test. Not in the plan's file list.
- **Commit:** f79aa21d

### Notes

- `TitledScrollView` already forwards a ref and passes every `ScrollView` prop, so it was not changed (it is in the plan's file list).
- The scroll to the section is triggered by the section's `onLayout` and the scroll view's `onContentSizeChange`, whichever comes last, and only counts a size seen after the draft was read. The plan said "after the first layout"; scrolling at the first layout would clamp against a page that still lacks the cards.
- Tasks 1 to 3 were written implementation first, tests right after, in the same task commit (no separate RED commit); every behaviour in the plan has a test.
- `Remplacer` and `Annuler` come from `fr.conditions.weather.refillConfirm` (the `cancel` key was added in 27-03).
- Device check of the keyboard behaviour on a 320 pt screen and on Android (focused field and note counter above the keyboard) stays with the Android pass, as UI-SPEC 1.6 says; the unit tests pin the props and the scroll calls.

## Known Stubs

None. The summary card (27-19) will call `useSurveyConditions` and navigate with `section: "conditions"`; the community survey will reuse `ConditionsReadOnly` with `emptyMode="hidden"`.

## Threat Flags

None. T-27-60 is mitigated by parsing every typed value with the package ranges on blur and never writing an invalid text (tests: out-of-range, not a number, unreadable time); T-27-61 by the read-only variant when `canEditSurvey` is false (no input, chip or link is rendered, tested) on top of the refusal in the write actions (27-13); T-27-62 by the source line following `showsProviderAttribution` (tested for provider, all-edited and manual weather).

## Self-Check: PASSED

- Files present: the nine new files under `mobile/src/screens/survey-detail/conditions/` (hook, test, `SkyChips`, `WeatherFields`, test, `WeatherBlock`, `ConditionsReadOnly`, `ConditionsSection`, test)
- Commits present in `git log`: 6a52df07, f79aa21d, 0912242f
- Acceptance greps: `export function useSurveyConditions`, `conditions-sky-`, `conditions-field-`, `WEATHER_SKY_CODES`, `export function ConditionsSection`, `export function ConditionsReadOnly`, `showsProviderAttribution`, `WeatherViewState`, `accessibilityLiveRegion`, `section?: "conditions"`, `ConditionsSection` in the screen, `updateSurveyWeather` in the route
