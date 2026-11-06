---
phase: 32
plan: 31
subsystem: factor-pages-new-design
tags: [grouped-rows, value-stepper, surface, percent, slider, strata-cover]
status: complete
key-files:
  created:
    - mobile/src/ui/ValueStepper.tsx
    - mobile/src/ui/value-rows/ValueSection.tsx
    - mobile/src/ui/value-rows/NumberRow.tsx
    - mobile/src/ui/value-rows/PercentTrackRow.tsx
    - mobile/src/ui/value-rows/value-rows.styles.ts
    - mobile/src/app/decimal-text.ts
    - mobile/src/screens/factor-detail/renderValueFields.tsx
  modified:
    - mobile/src/ui/DmhCounterStepper.tsx
    - mobile/src/ui/useHoldRepeat.ts
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/StrataCoverFields.tsx
    - mobile/src/screens/factor-detail/DmhCountFields.tsx
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/screens/factor-detail.styles.ts
    - mobile/src/i18n/fr/factor-detail.ts
    - mobile/src/i18n/fr/factor-input.ts
    - CLAUDE.md
  deleted:
    - mobile/src/ui/FactorCounterInput.tsx
    - mobile/src/ui/FactorSliderInput.tsx
    - mobile/src/ui/FactorInputShell.tsx
metrics:
  completed: 2026-10-29
---

# Phase 32 Plan 31: numeric controls of the other factors as grouped rows, step 3 of 3

Last step of the redesign that gives the other factors the look of factor F. Every numeric control is now a row of a grouped list drawn on the canvas (label on the left, value and a -/+ capsule on the right). The glass input card and the three old components are gone. Payload, scoring and the package are untouched.

## Change

**Generic stepper.** `DmhCounterStepper` was moved to `ui/ValueStepper.tsx` and generalised: `min`, `max`, `step`, `format`, `keyboardType`, the spoken texts and an optional `inputTestID` are props. `DmhCounterStepper` is now a thin wrapper that passes F's tree texts (`DMH_STEPPER_SIZE` still exported), so F's rows are unchanged. `useHoldRepeat` gained `nudgeValue` (clamp plus removal of float drift, 0.1 + 0.2 reads 0.3); the timing constants of 32-26 are untouched.

**Rows (`ui/value-rows/`).** `ValueSection` (grouped-list header, optional count at the right, one `AppGroupedContainer`, error captions as alerts, quiet note), `NumberRow` (label, `ValueStepper`; a step writes the number as the form's text with a decimal comma and touches the field; a typed value is stored as typed, held by `clampText`), `PercentTrackRow` (G's draggable track). `app/decimal-text.ts` holds `toFieldText`, `formatDecimalComma`, `formatHectares`, `clampPercentText` (moved from `StrataCoverFields`) and `withoutPercentUnit`.

**Page (`renderValueSections`).**
- C, D, E: one "Comptage" section with the two counters (full existing labels, "(BMg)" etc. written out, so the abbreviation gate holds as before), then a "Surface" section with the surface row and "D'après le parcours" under it while it equals the route zone. The prefill hook is unchanged.
- A: "Couvert" section, row "Couvert des essences autochtones" (the trailing "(%)" is dropped, the value carries the sign).
- G: "Part de la surface" section holding the track (with "0 %" and "100 %" ends) over the value row.
- B counted in full (`StrataCoverFields`): one section "Couvert de chaque strate", count "N strates comptées" in its header (testID `strata-cover-count` kept; shown only once a cover is entered), five stratum rows, the 20 % rule as the note.
- F counted in full (`DmhCountFields`): "Surface" section, one row.
- F with no counting entry (tests only; the route always passes one): trees per hectare stays a typed row, "Arbres par hectare" section.
- `FactorDetailScreen` order: intro, hero, pills, [A photo entry], choice lists, value sections, counted-in-full blocks (B strata, F surface), F's list. No `AppCard` any more.

## Bounds, steps, haptic

| Control | Bounds | Step | Typed value |
|---|---|---|---|
| C, D, E counters | 0 to 999 on the buttons (as the old counter) | 1 | stored as typed; the form still accepts any whole number >= 0 |
| Surfaces (C, D, E, F full) | 0 to 100000 | 0.1 ha | stored as typed (decimal keyboard); 0 still gets the form's "above zero" error |
| A cover, G, B strata | 0 to 100 | 1 | held to 100 by `clampPercentText` |
| G track | 0 to 100 | whole percents (1 and 3 possible) | |

Stepping is exact arithmetic on the current value then drift-cleaned, not snapped to a 0.1 grid: a zone of 0,25 ha steps to 0,35, not 0,3. Values are drawn with up to two decimals ("2,0" for a surface, "70 %" for a percent). Hold-repeat is the shared engine (600 ms delay, 5 steps per second, 10 after 2 more seconds).

**Slider haptic (my choice):** one selection tick when a drag or tap moves the value across a multiple of 5, none for the other percents and none on release. The -/+ capsule keeps its rule (tick on a tap and on the first step of a hold, none on repeats). The track is adjustable for a screen reader in steps of 5; the value row under it is adjustable in steps of 1.

## Deleted

`FactorCounterInput`, `FactorSliderInput`, `FactorInputShell` and their tests; `renderFactorField` (kept only the variant table, `humanizeFieldLabel` and F's group list); the style keys `panel`, `fieldsList`, `fieldBlock`, `fieldLabel`, `input` of the factor page; catalogue entries `fr.factorInput.counter`, `fr.factorInput.slider`, `numericPlaceholder`, `strataCoverUnit`, `strataCoverPlaceholder`, `strataFieldA11y`. The `colors.forest` glyph of the old counters (dark mode contrast) is gone with them; the stepper uses `semanticColors.ctaPrimary`.

## Tests

New: `ValueStepper` (6), `NumberRow` (5), `PercentTrackRow` (6), `ValueSection` (3), `renderValueFields` (10), `decimal-text` (6), `nudgeValue`. Rewritten: `StrataCoverFields`, `DmhCountFields`. `FactorDetailScreen.test.tsx` adapted (adjustable elements instead of `AppField`, value sections in the page order). The F cost and press tests (`dmh-entry-cost`) are untouched and green: the surface is set through `setFSurface` there, so the new surface row changes none of the S1/S2 press counts.

## Verification

`npm run typecheck`, `npm --workspace mobile run lint` (exit 0, no output), `npm --workspace mobile run test:unit:coverage` (491 suites, 7736 tests, thresholds met, `src/navigation` at 100 percent, the `__checks__` gates green: em dash, abbreviations, motion, icons, 400-line cap), `npm --workspace @cortege/ibp-domain run test` (491 tests, package untouched), prettier on every touched `.ts` and `.tsx`.

## Not verified

No device or simulator check: I could not see any of this render. The owner should check on a phone:
- C, D, E: the long counter labels ("Nombre de bois morts de grosse dimension (BMg)") wrap to three lines in the left column next to the 112 pt capsule on a narrow phone; if it reads badly, the label could move above the stepper.
- Typing: tap the value, numeric keyboard, leave the field commits; the scroll-into-view with the keyboard on the lower rows of C, D, E; strata rows no longer jump to the next field on "next" (each value is edited on its own).
- G: dragging the track (the page scroll must not steal the gesture), the tick every 5 percent and not on each percent, the value row staying in step with the thumb, hold on - and +.
- Surfaces: hold on + for 0.1 ha steps, the comma display ("2,0"), "D'après le parcours" under the surface, F full-mode surface above the list.
- Errors: the caption under a section after leaving an empty required row (A cover, counters, surface) in light and dark.
- VoiceOver: one adjustable element per row (label and value, increment and decrement, double tap to type), the track adjustable by 5.
- Dark mode: the capsule glyphs and the track thumb.

## Deviations from Plan

1. **Surface in its own section, not in the counters' container.** The brief allowed either; "Surface" is a separate section so "D'après le parcours" is a section note.
2. **Row labels keep the "(%)" / "(ha)" the form hands over, except percent rows** which drop "(%)" (the value shows the sign). Labels such as "Surface (ha)" stay as they are in the catalogue.
3. **No "next field" chain between strata rows** (a consequence of one typed field at a time).
4. **Hold-repeat engine gets `nudgeValue`** (not in the brief) so 0.1 steps do not drift; whole-number behaviour and constants are unchanged.
5. **F's typed trees-per-hectare fallback kept** as a "density" row for a page given no counting entry; the app never hits it.
6. The first plan item asked for `AbbreviationInfo` "where the old label used it": the old labels wrote the abbreviation out ("(BMg)" next to its long form) and no info control, so none was added.

## Known Stubs

None.

## Commits

- 8c79a908 feat(32-31): generic value stepper with a decimal step, F's stepper kept as a wrapper
- ea232bbf feat(32-31): grouped numeric rows: section, number row and percent track
- c93f55ec feat(32-31): counters, surfaces, percents and strata cover as grouped rows, the glass input card removed
- 8764deb0 docs(32-31): grouped numeric rows of the other factors in CLAUDE.md

## Self-Check: PASSED
