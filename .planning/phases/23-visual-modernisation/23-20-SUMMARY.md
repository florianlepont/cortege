---
phase: 23-visual-modernisation
plan: 20
subsystem: icon-harmonisation
tags: [icons, ionicons, outline, gate, d-07, glass-button, sf-symbols]
requires: ["12.2-19"]
provides:
  - "D-07: every Ionicons glyph named in mobile/src is an outline variant (-outline); @expo/vector-icons stays the only icon library"
  - "mobile/src/__checks__/icons.test.ts: findNonOutlineIcons gate over every non-test file under mobile/src"
  - "GlassButton NATIVE_SYMBOLS keyed by outline glyphs, mapped to unfilled SF Symbols"
affects: [12.2-21, 12.2-22, 12.2-23]
tech-stack:
  added: []
  patterns:
    - "Icon gate reads source text (comments stripped): Ionicons name, icon/leadingIcon/trailingIcon attributes, icon: properties, and Record/variable literals typed as the Ionicons glyph map key (or an alias of it)"
    - "Inside an icon expression, a comparison operand (kind === \"x\") is a condition, not a glyph"
key-files:
  created:
    - "mobile/src/__checks__/icons.test.ts"
  modified:
    - "mobile/src/ui/AppCollapsibleSection.tsx, AppGroupedList.tsx, CasPicker.tsx, FactorCounterInput.tsx, FactorInputShell.tsx, FactorProgressRing.tsx, FactorSliderInput.tsx, GenusCameraView.tsx, GenusRecognitionModal.tsx, GlassButton.tsx"
    - "mobile/src/screens/AuthGateScreen.tsx, FactorHelpSheet.tsx, onboarding/PermissionsPrimingScreen.tsx"
    - "mobile/src/screens/HomeScreen.tsx, home/NewSurveyCard.tsx, home/ToolsSection.tsx, SurveyParcelSelectionScreen.tsx"
    - "mobile/src/screens/public-map/DownloadStatusView.tsx, MapControls.tsx, ScoreLegend.tsx, SheetCloseButton.tsx"
    - "mobile/src/screens/survey-detail/FactorsList.tsx, PhotosStrip.tsx, useSurveyDetailHeader.tsx"
    - "mobile/src/screens/survey-form/FactorPager.tsx, survey-list/SurveyRowFrame.tsx, survey-list/list-chrome.tsx, survey-search/SurveySearchScreen.tsx, survey-wizard/SurveyWizardScreen.tsx"
    - "Tests pinning a glyph name: AppButton, GlassButton, GlassButton.liquid, FactorProgressRing, PermissionsPrimingScreen, AccountScreen, NewSurveyCard, PhotosStrip, SheetCloseButton, FactorPager"
key-decisions:
  - "The gate also reads the keys of a Record keyed by the glyph type, so GlassButton's native SF Symbol map is held to outline names; its symbols became the unfilled forms (checkmark.circle, play, camera, flag) to match"
  - "Only the survey search field's inline glyph changed size (18 to 20, UI-SPEC inline size, field height and width unchanged); every icon in a fixed or content-sized control keeps its size"
  - "Native iOS tab SF Symbols, the survey detail header's SF Symbol menu items and the Android PNG tab icons are not Ionicons and are untouched"
requirements-completed: []
metrics:
  duration: 9min
  tasks: 2
  files: 40
  completed: 2026-10-08
status: complete
---

# Phase 12.2 Plan 20: Outline icon harmonisation and icon gate Summary

Every Ionicons glyph the app names is now an outline variant, so the whole app draws one stroke style (D-07). A new gate, `mobile/src/__checks__/icons.test.ts`, scans every non-test file under `mobile/src` and fails on any glyph that does not end with `-outline`. The icon library is unchanged, no control changed size, and the fern stays where it was.

BASE (HEAD before Task 1): `392f2ef`.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Icon gate test and the ui, navigation and non-batch screen sweep | 2934b94 |
| 2 | Outline sweep of the restyled screens and full-tree gate | 19a9e49 |

## What changed

**The gate.** `findNonOutlineIcons(files)` strips comments and collects glyph names from four places:
1. the `name` of every `<Ionicons>` element, both `name="x"` and the literals inside `name={...}`;
2. the `icon`, `leadingIcon` and `trailingIcon` JSX attributes, in the same two forms;
3. object properties `icon: "x"`;
4. in files naming `Ionicons.glyphMap`: the values of a `Record<_, glyph>`, the keys of a `Record<glyph, _>`, and a variable typed as a glyph. Type aliases of the glyph key type count too.

Only glyph-shaped strings are kept, so a colour token such as `icon: "#D2E8A8"` is ignored. A comparison operand inside an icon expression is skipped: in `kind === "unavailable" ? ...`, the `"unavailable"` is a condition, not a glyph. Six fixture tests cover the plan's behaviour block (filled and outline names, ternaries, icon props and properties, other elements, comments, glyph maps). They are followed by the real-tree scan, which also checks that it reads more than 200 files.

**Renames (one token each, sizes unchanged).**
- `ui`: chevrons in `AppCollapsibleSection` and `AppGroupedList`; the radio check in `CasPicker`; the minus and plus of `FactorCounterInput` and `FactorSliderInput`; the state icons of `FactorInputShell` and `FactorProgressRing`; the close of `GenusCameraView` and `GenusRecognitionModal`.
- Non-batch screens: the auth gate close, the factor help sheet close, and the permission state icons.
- Restyled screens:
  - Accueil: avatar placeholder, new survey card chevron, tools chevron.
  - Mes Relevés: search, add, and the selected row check.
  - Search page: field glyph and clear.
  - Survey detail: factor rows chevron, photo "Ajouter" pill, header menu (Android and JS header).
  - Factor pager: the close / check / next ternary.
  - Wizard: the close / back ternary and the method radio check.
  - Explorer: locate, legend close, sheet close, and the download failed and done icons.
  - Parcel selection: the done button.
- `GlassButton.NATIVE_SYMBOLS`: keyed by the outline glyphs (`checkmark-outline`, `checkmark-circle-outline`, `checkmark-done-outline`, `arrow-forward-outline`, `chevron-forward-outline`, `add-outline`, `play-outline`, `camera-outline`, `flag-outline`). The filled SF Symbols (`checkmark.circle.fill`, `play.fill`, `camera.fill`, `flag.fill`) became their unfilled forms. No `GlassButton` call site passes `leadingIcon` today, so nothing changes on screen.

`npm run typecheck` passing shows that every new name exists in the glyph map.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Files outside the plan's list were still reported**
- **Found during:** Task 2 (full-tree scan)
- **Issue:** the plan's list predates plan 19. Several files outside it named filled glyphs:
  - `home/NewSurveyCard.tsx`, `home/ToolsSection.tsx`, `SurveyParcelSelectionScreen.tsx`
  - `public-map/DownloadStatusView.tsx`, `public-map/ScoreLegend.tsx`, `public-map/SheetCloseButton.tsx`
  - `survey-list/SurveyRowFrame.tsx`, `ui/GlassButton.tsx`

  Plan 19 removed `SelectedSurveyCard.tsx`, and `ClusterListSheet.tsx`, `OfflineAreasSheet.tsx` and `ParcelHistoryCard.tsx` already named outline glyphs only, so those four needed no change.
- **Fix:** renamed as the plan instructs ("If a file outside this list is still reported, rename its glyph too"). `GlassButton` was renamed in Task 1, since it sits under `src/ui`.
- **Commits:** 2934b94, 19a9e49

**2. [Rule 2 - Missing critical] The native SF Symbol map would have stopped matching**
- **Found during:** Task 1
- **Issue:** `NATIVE_SYMBOLS` was keyed by filled glyph names. Once call sites name only outline glyphs, no key would ever match, and the iOS 26 glass button would silently drop its icon.
- **Fix:** keyed by the outline names, with unfilled symbols to match. The gate reads the keys of a glyph-keyed Record. `GlassButton.liquid.test.tsx` now uses `NATIVE_SYMBOLS["checkmark-outline"]` and the unmapped `leaf-outline`.
- **Commit:** 2934b94

**3. [Rule 1 - Bug] False positives on comparison operands**
- **Found during:** Task 2
- **Issue:** the gate first reported `success` (ToolsSection), `satellite` (MapControls) and `unavailable` (AttachmentPhotoPreview). These are the left-hand sides of `===` tests inside icon expressions, not glyphs.
- **Fix:** operands of `===`, `!==`, `==` and `!=` are skipped, with a fixture that pins it.
- **Commit:** 19a9e49

**4. [Rule 3 - Blocking] `SurveyParcelSelectionScreen.tsx` would pass 400 lines**
- **Found during:** Task 2
- **Issue:** with the outline names, the done button's `leadingIcon` ternary is longer than 100 characters. Prettier split it over 7 lines, so the file reached 402 lines and the structure gate failed.
- **Fix:** two module constants, `NEXT_ICON = "arrow-forward-outline"` and `DONE_ICON = "checkmark-outline"`. The prop stays on one line and the file has 398 lines. These two literals sit outside the gate's patterns. They are outline names, and `AppButton`'s type still checks that they exist.
- **Commit:** 19a9e49

**5. Size alignment (allowed by the plan)**
- `survey-search/SurveySearchScreen.tsx`: the field's leading search glyph went from 18 to 20 (the UI-SPEC inline size). The field keeps `minHeight` 44 and its flex width, so its size does not change.
- The other 18 pt icons sit in content-sized controls or are trailing chevrons, and keep their size. These are the "Ajouter" pill (fixed height, content width), the clear button, and the row chevrons.

### TDD Gate Compliance

Task 1 is `tdd="true"`. The RED run was local: the fixtures passed and the real-tree test failed with 25 findings across 14 files. It was not committed as a separate `test(...)` commit, because the orchestrator requires lint, typecheck and the mobile suite to pass before each commit. The gate and the renames went in together in `feat(12.2-20)` 2934b94, which is the GREEN state. Earlier plans of this phase did the same.

## Verification

- `cd mobile && npx jest --runInBand --config jest.unit.config.js src/__checks__ src/ui src/screens src/navigation`: 147 suites, 1419 tests passed.
- `npm run lint`: exit 0. `npm run typecheck`: exit 0.
- `npm run test:coverage:mobile`: 252 suites, 2975 tests passed, thresholds hold (exit 0).
- `npm --workspace @cortege/ibp-domain run test`: 9 suites, 230 tests passed.
- `npm run format:check`: only the untracked `.claude/settings.local.json` is reported (ignored as instructed).
- `npm run test:unit`: only the known, unrelated local failure in the API suite `check-env-parity.spec.ts`. The domain and mobile suites pass on their own (above).
- Every changed file under `screens/**` is at most 398 lines.

## Known Stubs

None.

## Residual risks and device-only checks

- Outline glyphs at small sizes in filled controls: the white `checkmark-outline` at 14 pt in the `CasPicker` and wizard method radios, the 22 pt minus and plus of the counter, and the 26 pt close / check / next of the factor pager's round button. Their stroke is thinner than the filled glyphs. Check them on the phone, in light and dark, during plan 23.
- State icons: the factor done and error states, the permission granted and denied rows, the download done and failed titles, and the selected survey row now draw outline circles. State is still carried by glyph, colour and text (T-12.2-39). The owner's eye on plan 23 decides whether it reads well enough.
- `GlassButton` native symbols are unfilled now. No call site uses `leadingIcon`, so nothing changes on screen today.
- Native iOS tab bar (SF Symbols), the survey detail header's SF Symbol items and the Android PNG tab icons are unchanged by design.

## Self-Check: PASSED

- FOUND: mobile/src/__checks__/icons.test.ts
- FOUND: 2934b94, 19a9e49
