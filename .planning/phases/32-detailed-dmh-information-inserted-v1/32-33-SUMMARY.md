---
phase: 32
plan: 33
subsystem: factor-pages-owner-feedback
tags: [factor-a, genus-list, cas, percent-rows, slider, scroll-lock]
status: complete
key-files:
  created:
    - mobile/src/ui/ScrollLockContext.ts
    - mobile/src/ui/value-rows/PercentRow.tsx
    - mobile/src/screens/FactorAGenusRecognitionEntry.test.tsx
  modified:
    - mobile/src/screens/FactorAGenusRecognitionEntry.tsx
    - mobile/src/screens/factor-detail/GenusChoice.tsx
    - mobile/src/app/factor-a-genus-list.ts
    - mobile/src/ui/value-rows/PercentTrackRow.tsx
    - mobile/src/ui/value-rows/NumberRow.tsx
    - mobile/src/ui/ValueStepper.tsx
    - mobile/src/screens/survey-form/FactorPager.tsx
    - mobile/src/screens/factor-detail/renderValueFields.tsx
    - mobile/src/screens/factor-detail/StrataCoverFields.tsx
    - mobile/src/ui/choice-list/ChoiceList.tsx
    - mobile/src/ui/choice-list/ChoiceRow.tsx
    - mobile/src/i18n/fr/factor-detail.ts
    - CLAUDE.md
metrics:
  completed: 2026-10-30
---

# Phase 32 Plan 33: owner feedback on factors A, B and G

Four points from the owner's trial of build 35b11399. Payload, scoring and the package are untouched (no package export was needed).

## 1. Photo entry hint removed from the page

`FactorAGenusRecognitionEntry` now renders the "Identifier par photo" button and the modal, nothing else. The sentence `fr.genusRecognition.captureHint` is kept: the camera view (`GenusCameraView`) shows it over the viewfinder, where the subject is framed, and its test pins it. No dead string or style. New test: the page holds the button and not the sentence; the button opens the camera and a confirmed genus merges into the list.

## 2. Genus list vs cas: it was NOT filtered, now it is

Finding: `GenusChoice` listed all 34 `CNPF_FACTOR_A_GENUS_CODES` whatever the survey. The scorer (`readFactorAGenusCount`) silently drops the five supplementary genera (Ceratonia, Cercis, Olea, Phillyrea, Pistacia) outside cas 2 and 4, so at cas 1 or 3 and under v3.0 the observer could tick genera that did not count, with the hero figure not moving and no explanation.

The package already exports the rule: `allowedFactorAGenusCodes(cas)` (main list always, plus the supplementary ones at cas 2 and 4; `null` gives the main list). No package change, no table copied into mobile.

- `genusListCas(methodVersion, ibpCas)` (`mobile/src/app/factor-a-genus-list.ts`): the survey cas under v3.2, `null` for v3.0 (no cas) and for a v3.2 survey whose cas is not set. `factor-key-figure.ts` now uses it too instead of its own inline copy.
- `GenusChoice` takes `methodVersion` and `ibpCas` (passed by `FactorDetailScreen` through `renderChoiceField`) and offers only the allowed genera. cas 2 and 4: 34 classes; cas 1 and 3: 29; v3.0: 29.
- An already ticked genus the case does not count stays visible and untickable, with a quiet line under its label (new optional `note` on `ChoiceOption`/`ChoiceRow`, spoken after the label): "Ne compte pas pour ce cas" under v3.2, "Ne compte pas pour cette version de la méthode" under v3.0 (`fr.factorDetail.choice`). The search still reaches it. The header count still counts ticked genera.
- Tests: each cas offers the expected set (equal to the package export), v3.0 ignores a cas value, v3.2 with no cas offers 29, a cas change changes the options, the kept genus with its note and untick, v3.0 note and search; `genusListCas` unit test; `FactorDetailScreen` hands the method and cas to the list.

## 3. Percent rows: draggable track and typed value, no -/+ capsule

New `PercentRow` (`ui/value-rows/`): one grouped row, the label and the big typeable value on the first line (`NumberRow` with the new `showButtons={false}`, which `ValueStepper` honours: value alone, 88 pt wide target, tap to type, decimal-pad keyboard, held to 100, adjustable for a screen reader), the draggable `PercentTrackRow` under it. Used by A's "Couvert des essences autochtones" (snap 5), each counted-in-full stratum of B (snap 5) and G "Part de la surface" (snap 1, with the "0 %" and "100 %" ends, haptic tick once per multiple of 5 as in 32-31). The track writes the form's text (`toFieldText`), a typed value is stored as typed, so stored values and validation are unchanged. A not editable row shows the value without a track. The track's screen-reader step stays 5. `PERCENT_ROW` and the capsule on percent rows are gone; counts and surfaces keep the capsule and hold-repeat. Test ids: value `percent-G`, `cover-A`, `strata-stepper-<i>`, track `<id>-slider-track`.

## 4. Slider steals the page scroll

Two levels (the page has a horizontal pager and a vertical page scroll, so both moved):
- Gesture: the track claims the responder in the capture phase (`onStartShouldSetResponderCapture`, `onMoveShouldSetResponderCapture` true) and refuses to give it back (`onResponderTerminationRequest` false).
- Scroll lock: `ScrollLockContext` (`ui/`); `FactorPager` provides the setter and sets `scrollEnabled={!locked}` on the horizontal pager `ScrollView` and on every page `ScrollView`. The track locks on grant, unlocks on release and on terminate, and on unmount (the page changed mid-drag).

`onShouldBlockNativeResponder` is a `PanResponder` config key, not a typed `View` prop, so it is not used; the scrollEnabled lock covers the native side.

Tests: capture/termination props, lock on grant/move/release, terminate, unmount, and `FactorPager` `scrollEnabled` toggling on both scroll levels.

## Verification

`npm run typecheck`, `npm --workspace mobile run lint` (exit 0, unpiped), `npm --workspace mobile run test:unit:coverage` (494 suites, 7807 tests, all green, thresholds met, `src/navigation` unchanged at 100 percent, the `__checks__` gates green: catalogue literal, em dash, abbreviations, 400-line cap, icons), prettier on every touched file. Package untouched, so its coverage run was not repeated. One mid-way structure-test failure (a template literal in `ChoiceRow`) was fixed by moving it to the catalogue (`rowWithNote`).

## Not verified

No device or simulator: I could not see any of this render or feel the gesture. The owner should check on a phone:
- G, A cover, B strata: dragging the thumb must move neither the pager sideways nor the page up and down; a tap on the track sets the value; releasing frees the scroll at once (also after a very quick drag or a drag that leaves the track).
- The track row height (44 pt target, under a 56 pt row) next to five B strata: the section is taller than before.
- The typed value as the only tap target of the first line (88 pt wide): the numeric keyboard, leaving the field commits.
- A: at cas 1 or 3 the five Mediterranean genera are gone; at cas 2 or 4 they are back; a survey that changed cas keeps a ticked one with the note.
- Layout of the two-line genus row (label and quiet note) in light and dark.
- On Android, whether `scrollEnabled` toggling is enough to keep the horizontal pager still (the capture/termination props should also help there).

## Deviations from Plan

- Added `showButtons` to `ValueStepper` and `NumberRow` and a `note` to `ChoiceOption`/`ChoiceRow` (needed by the brief, not named in it).
- Percent keyboard is `decimal-pad` (as before) rather than a plain number pad, so a typed 12,5 can still be entered; the brief said numeric keyboard.
- A 32-34 executor runs in the same tree; its files were not touched.
- `CLAUDE.md` follow-up sentence updated for the percent rows and the genus filter.

## Known Stubs

None.

## Commits

- aec54415 fix(32-33): no capture hint sentence under the photo button on factor A
- f4bf54e5 feat(32-33): factor A offers only the genera that count for the survey's cas
- 293848b3 fix(32-33): a dragged percent track holds the pager and page scroll
- 58ce2de1 feat(32-33): percent rows are a draggable track over a big typeable value, no -/+ capsule

## Self-Check: PASSED
