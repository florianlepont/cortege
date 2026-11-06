---
phase: 32
plan: 30
subsystem: factor-pages-new-design
tags: [choice-list, grouped-list, selection-circle, genus-search]
status: complete
key-files:
  created:
    - mobile/src/ui/choice-list/ChoiceList.tsx
    - mobile/src/ui/choice-list/ChoiceRow.tsx
    - mobile/src/ui/choice-list/ChoiceSearchField.tsx
    - mobile/src/ui/choice-list/choice-list.styles.ts
    - mobile/src/screens/factor-detail/renderChoiceField.tsx
    - mobile/src/screens/factor-detail/GenusChoice.tsx
  modified:
    - mobile/src/screens/FactorDetailScreen.tsx
    - mobile/src/screens/factor-detail/renderFactorField.tsx
    - mobile/src/i18n/fr/factor-detail.ts
    - CLAUDE.md
  deleted:
    - mobile/src/ui/FactorChipsInput.tsx
    - mobile/src/ui/FactorSegmentedInput.tsx
    - mobile/src/ui/FactorGenusListInput.tsx
metrics:
  completed: 2026-10-29
---

# Phase 32 Plan 30: the choice controls of A, B, H, I and J as grouped lists, step 2 of 3

Step 2 of the redesign that gives the other factors the look of factor F. The choice controls (chips, segmented pills, genus chips, all inside the glass card) are now grouped lists of circle rows, drawn straight on the canvas. Payload, scoring, validation and the package are untouched.

## Change

**`mobile/src/ui/choice-list/` (new, generic)**
- `ChoiceList`: a grouped-list header (Sora 13 semibold, secondary ink, `header` role, optional count at the right as plain text), an optional slot above the list, one `AppGroupedContainer` of rows (hairlines start under the labels, inset 52), an error caption and a quiet note under it. Nothing is a bordered box.
- `ChoiceRow` (memoised): `SelectionCircle`, label in the `DmhGroupRow` face (heroBody 15/21), 56 pt minimum, `surfaceSoft` fill while pressed, no scale and no ripple, `feedback.selection()` on every tap. Multi: role `checkbox`, `checked`. Single: role `radio`, `checked` and `selected`. The accessibility label is the visible label; test id `choice-row-<factor>-<value>`.
- `ChoiceSearchField`: `search-outline` glyph, text, clear cross once something is typed, on `visual.control.fill`, 44 pt, radius 12, no border. Filters as you type.
- A missing required choice: caption under the list in the `fieldState.error.text` token, bold, `alert` role and polite live region, shown only when the field is touched (same gate as before).

**Factor page**
- `renderChoiceField` builds the lists: B capped and I and J (multi, options from `selectionOptionsFor` through the variant, ticking through `withSelectionToggled`, which keeps the option order of the method and keeps a code of the other method listed and ticked; the count text "N sélectionnés" is in the header; a draft with a count and no selection shows the legacy line under the list), H (the class as a single list; the chosen row is not cleared by a second tap, as before; then "Sources de la continuité" as its own multi list with its own header).
- `GenusChoice` (A): 34 genera in Latin order with the Latin-first labels, search field at the top matching Latin or French name with `foldSearchText` (case, accents, ligatures), "Aucun genre ne correspond à votre recherche." as a live-region line when nothing matches, "N sélectionnés" in the header. The list keeps its order whether genera are ticked or not; the search only narrows what is shown and never changes the stored value. Tap writes the same comma-joined string through `toggleGenusInListValue`.
- `FactorDetailScreen`: order intro, hero, pills, [photo entry for A], choice lists, glass card (only if typed fields are left: A's cover %, B counted in full), F's list. The glass card is gone from B capped, H, I and J, and for C, D, E, G it is unchanged.
- `renderFactorField` now renders only counters, slider and numeric fields; `FactorChipsInput`, `FactorSegmentedInput` and `FactorGenusListInput` (and their tests) were deleted, nothing else used them. `FactorInputShell` stays for the counter and slider (step 3).
- Catalogue: `fr.factorDetail.choice` (H header "Ancienneté", search placeholder "Chercher un genre", accessible label, clear label, empty line). Other headers are the field labels, with the old required asterisk.

## Tests

New: `ui/choice-list/ChoiceList.test.tsx` (12), `factor-detail/renderChoiceField.test.tsx` (15), `factor-detail/GenusChoice.test.tsx` (9). `FactorDetailScreen.test.tsx` adapted (rows instead of chips, a genus probe, page order per factor). The F cost and press tests are untouched.

## Verification

`npm run typecheck`, `npm --workspace mobile run lint` (no output, no error), `npm --workspace mobile run test:unit:coverage` (487 suites, 7712 tests, thresholds met, `src/navigation` at 100 percent), prettier on all touched files. The package was not touched (no domain run needed).

## Not verified

No device or simulator check: I could not see any of this render. The owner should check on a phone:
- A: the search field above 34 rows with the keyboard up (taps on rows work with it open, the pager's scroll view uses `handled`), the header count, scrolling a long list inside the page, the photo entry button now sitting bare on the canvas above the list.
- H: the single list with the chosen circle ticked, then the sources list, and that the page reads well without the card.
- B, I, J: long labels (J v3.2 "Amoncellement de blocs stables ...") wrapping in 56 pt rows with the hairline under the label.
- Dark mode: header and caption contrast, the error caption colour, the search field fill.
- VoiceOver: each row is read as "label, checkbox, ticked / not ticked" (radio for H), the header as a header, the error announced when it appears.
- The pressed fill and the check spring on a tap.

## Left for step 3

The numeric and counter fields still use the old look, in the glass card: A's cover % (`AppField`), C, D and E counters and their surface (`FactorCounterInput`, `AppField`), G's slider, and B counted in full (`StrataCoverFields`). `FactorInputShell` goes when the counter and slider are converted.

## Deviations from Plan

1. **Photo entry moved out of the card (A).** `FactorAGenusRecognitionEntry` used to be the first thing in the glass card. With the card holding only the cover % it would have been below the list, so it now sits on the canvas straight above the genus list. Still the first control of the page, as OA-31 wants.
2. **H header "Ancienneté"** (from the mockup) instead of the old label "Classe (0, 2 ou 5)", which put the scores in a title. The asterisk is kept.
3. **Count text moved to the header** for all lists (the old chips showed it under the chips); the legacy sentence stays under the list.
4. **No "complete" tick or alert glyph** next to the header (the old shell drew them): the circles tell the state; the error is the caption.
5. **A search field of its own** (`ChoiceSearchField`) rather than the global `SearchField`, which is a bordered glass field with a spinner and a return key for network groups.
6. **Commit slip:** the first commit swept in the staged deletions of the old components and was amended before anything else was built on it (`fd8f04b4`); the deletions are in the second commit, so each commit builds.

## Known Stubs

None.

## Commits

- fd8f04b4 feat(32-30): grouped choice list primitive and its search field
- e43f6999 feat(32-30): A, B, H, I and J choices as grouped lists on the factor page
- 8758f126 docs(32-30): grouped choice lists of A, B, H, I and J in CLAUDE.md

## Self-Check: PASSED
