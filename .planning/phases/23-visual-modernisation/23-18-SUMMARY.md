---
phase: 23-visual-modernisation
plan: 18
subsystem: explorer-overlays
tags: [explorer, map-overlays, glass, score-ring, entrances, glass-button, dark-mode, hit-areas]
requires: ["12.2-17"]
provides:
  - "Explorer batch 4 (D-09): floating pills, legend and map buttons in theme-aware tokens; selected survey summary with a 2 pt accent outline and a trailing ScoreRing; cluster list and parcel history rows as the shared survey row with trailing rings and the first-mount stagger; GlassButton on every full-width panel action"
  - "SheetCloseButton: one neutral close with a 44 pt target for the four Explorer panels"
  - "PanelRowEntrance: rows 0 to 7 of an Explorer panel list slide in, later rows render as they are"
affects: [12.2-19, 12.2-23]
tech-stack:
  added: []
  patterns:
    - "Explorer panel rows reuse SurveyRowFrame (glass card, ring column on the trailing side, RipplePressable wave), so they match Mes Relevés and search rows by construction"
    - "40 pt map controls reach 44 pt through MAP_CONTROL_HIT_SLOP (2 pt) without changing their drawn size"
    - "Panel list entrances through EntranceView (useFocusEntrance), capped at brandMotion.staggerMax rows"
key-files:
  created:
    - "mobile/src/screens/public-map/SheetCloseButton.tsx"
    - "mobile/src/screens/public-map/PanelRowEntrance.tsx"
    - "mobile/src/screens/public-map/SelectedSurveyCard.test.tsx"
    - "mobile/src/screens/public-map/ClusterListSheet.test.tsx"
  modified:
    - "mobile/src/screens/public-map/MapChips.tsx, MapControls.tsx, ScoreLegend.tsx"
    - "mobile/src/screens/public-map/SelectedSurveyCard.tsx, ClusterListSheet.tsx, ParcelHistoryCard.tsx, OfflineAreasSheet.tsx, ExplorerSheet.tsx, styles.ts"
    - "mobile/src/screens/public-map/MapChips.test.tsx, ScoreLegend.test.tsx, ExplorerSheet.test.tsx, PublicMapScreen.test.tsx, markers.test.tsx"
key-decisions:
  - "Explorer rows reuse SurveyRowFrame (ring trailing, D-27a) instead of the plan's ring-first glass rows; no photo in any row (owner)"
  - "The selected survey keeps the panel header (title and close) and draws its place, date and method in an outlined glass row with the ring trailing: the close button and the ring do not compete for the trailing edge"
  - "Panel entrances use EntranceView (useFocusEntrance); the plan's useEntrance/entering builder no longer exists since 12.2-11, and useListEntrance's grace window would never let a sheet opened later animate"
  - "No backdrop halo on the Explorer or its sheets (owner decision 4 overrides the 12.2-14 opt-in recipe item 3); the sheet keeps its real blur"
requirements-completed: []
metrics:
  duration: 16min
  tasks: 2
  files: 20
  completed: 2026-10-07
status: complete
---

# Phase 12.2 Plan 18: Explorer, batch 4 Summary

Explorer overlays now follow variant I. Pills, legend and map buttons use theme-aware tokens, so they read in dark mode. The selected survey has an outlined glass summary with its ring on the right. Cluster list and parcel history rows are the shared survey row, with trailing rings, the green wave and a staggered entrance. Every full-width panel action is the glass call to action. The map, markers and clustering are untouched.

BASE (HEAD before Task 1): `b090de8386216f82b9ed030c253a622801f838fe`. `git diff --quiet b090de8 HEAD -- mobile/src/screens/PublicMapScreen.tsx mobile/src/screens/public-map/SurveyMarker.tsx mobile/src/screens/public-map/ClusterMarker.tsx mobile/src/screens/public-map/MapCanvas.tsx mobile/src/screens/public-map/useMapClusters.ts mobile/src/map` exits 0.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Map pills, legend, selected card and shared styles | 118faba |
| 2 | Sheets, cluster list and parcel history card | b879f83 |

## What changed

**Floating controls (real blur kept, D-04).**
- `MapActionPill`, the legend's (i) toggle and spinner, and the basemap, download and locate buttons of `MapControls` now draw their icons in `theme.visual.accentText` (`#334E2B` light, `#9BC26A` dark). The fixed forest was dark on the dark glass.
- The legend swatches are still exactly `brandMapTokens.scoreMarker.high/mid/low` and the white dashed draft swatch, the same values the markers use.
- Legend title: `brandTypography.sectionHeader`. Row labels: `brandTypeScale.footnote` in `textSecondary`. Panel padding 16 and gaps 8 (4 grid).
- Sizes unchanged. The 40 pt pill and the 40 pt toggle get a 2 pt hit slop (`MAP_CONTROL_HIT_SLOP`), so their targets reach 44 pt.

**Selected survey (`SelectedSurveyCard`).**
- The header keeps the title "Relevé · IBP n/50" (or the draft title) and the close button.
- Under it, a glass row (`glass.cardFill`) with a 2 pt `accentText` outline (`SELECTED_OUTLINE_WIDTH`), radius 22 and circular corners. Place and date sit on the left, the method version under them. The `ScoreRing` (score `ibp_total`, index 0, key `survey_id:ibp_total`) is in the 40 pt trailing column, centred.
- No gradient, so the border is allowed (12.2-17 rule).
- "Voir le relevé" / "Ouvrir le relevé" is a `GlassButton` of the same `sm` size. The native host keeps 44 pt.

**Panel rows.**
- `ClusterListSheet` rows and `ParcelHistoryCard` rows render `SurveyRowFrame`. That gives the glass card, a 44 pt minimum, the `RipplePressable` wave and the trailing ring column.
- Cluster row: the title is "IBP n/50 · date", the status line is the cas or region, and the ring takes the total, the row index and the key `survey_id:ibp_total`.
- History row: the title is the entry ("2026 · v2 · Dernier relevé"), the status line has the total and the change, and the ring shows the total.
- Accessibility labels, roles, testIDs and press callbacks are unchanged.
- Rows 0 to 7 are wrapped in `PanelRowEntrance` (`EntranceView`: 40 ms stagger, Reduce Motion shows them at once). Later rows render plainly (T-12.2-36).

**Sheets.**
- `ExplorerSheet` keeps its BlurView background, handle, pan responder and animation. The handle indicator is `divider` with radius `pill`. Content padding is 16, gap 12, and bottom padding 24 plus the inset.
- Panel titles are Sora SemiBold 17 (`sectionHeader` with the `headline` size) in `textStrong`.
- `SheetCloseButton` replaces the four close buttons. It draws an 18 pt glyph in `textSecondary` (readable in both schemes) with a 13 pt hit slop, so the target is 44 pt.
- `OfflineAreasSheet` "Télécharger cette zone" and the history card's missing-parcel download are `GlassButton` of the same `md` size. The notice and the button now have a 12 pt gap.

**styles.ts.**
- The panel styles are on the 4 grid.
- `clusterRow` and `clusterRowText` were deleted (no reader left). The offline areas list keys `list`, `row`, `rowInfo` and `deleteButton` were deleted too: the list moved to Paramètres in OA-123.
- `createOfflineAreasStyles(theme)` became the static `offlineAreasStyles`, since it is theme-invariant.

## Deviations from Plan

### Owner decisions applied (they override the plan text)

1. **[D-27a] Rings on the trailing side.** The plan put the cluster ring at the start of the row and the selected card ring beside the title. All rings are now in the trailing column, vertically centred, through `SurveyRowFrame`. The selected summary uses the same 40 pt column.
2. **[D-28] GlassButton on panel actions.** The plan kept the `AppButton`s. The selected card open action, the offline download and the missing-parcel download are now `GlassButton`, at the same sizes.
3. **[Decision 4] No halo.** No `ScreenBackdrop` on the Explorer or its sheets. This overrides the 12.2-14 opt-in recipe, item 3.
4. **No photo in the rows** (owner).

### Auto-fixed issues

**1. [Rule 3 - Blocking] `useEntrance` does not exist**
- **Found during:** Task 2
- **Issue:** the plan's `useEntrance()` / `entering={entrance(index)}` API was replaced in 12.2-11 by `useFocusEntrance`, `EntranceView` and `ListEntranceRow`. `useListEntrance` only animates rows that mount within 1 s of the screen becoming visible, so a sheet opened later would never animate.
- **Fix:** new `PanelRowEntrance` (`EntranceView`, rows below `brandMotion.staggerMax`). The acceptance grep `entrance(index)` does not match. The behaviour is asserted in `ClusterListSheet.test.tsx` and in the history test of `PublicMapScreen.test.tsx`.
- **Commit:** b879f83

**2. [Rule 2 - Accessibility] Hit areas under 44 pt on Explorer controls**
- **Found during:** Tasks 1 and 2
- **Issue:** the close glyphs had no hit slop (18 pt target). The 40 pt action pill and the legend toggle had 40 pt targets.
- **Fix:** `SheetCloseButton` (13 pt slop) and `MAP_CONTROL_HIT_SLOP` (2 pt). Drawn sizes are unchanged.
- **Commits:** 118faba, b879f83

**3. [Rule 1 - Bug] Dark-on-dark icons on the map buttons**
- **Found during:** Task 1
- **Issue:** `MapControls.tsx` (not in the plan's file list) drew the basemap, download and locate icons and the spinner in the fixed forest, the same dark-mode fault as `MapChips`.
- **Fix:** `theme.visual.accentText`.
- **Commit:** 118faba

**4. [Test hygiene] Tests updated for the new primitives**
- `PublicMapScreen.test.tsx` and `markers.test.tsx` now mock `GlassButton`, `ScoreRing` and `EntranceView`, which pull in react-navigation through `useScreenVisible`.
- Their button queries moved from `AppButton` to `GlassButton`. The history row query now targets the pressable, which carries the role.
- `MapChips.test.tsx` got the act-environment flag and the deprecated-renderer console filter (it printed warnings before).

### Sketch 009 differences (for the batch 4 checkpoint)

- The floating filter chips (Tout, Étudiées, À étudier, Hors ligne) and the search field above the map: new features, out of scope. OA-67 removed the Explorer filters at the owner's request.
- The sheet card's leading icon tile and its "Démarrer un relevé" / "Détails" pair: the card keeps a single open action. No tile is shown (no photos or thumbnails in rows).
- The glow pill outside a forest card: not adopted (UI-SPEC accent list). The panel action is the forest glass button.

## Verification

- `npx jest src/screens/public-map src/__checks__`: 13 suites and 138 tests pass. `layers.test.ts` (no bordered gradient, no `borderCurve`), `motion.test.ts` and `structure.test.ts` are green.
- `npm run lint` 0, `npm run typecheck` 0.
- `npm run test:coverage:mobile`: 240 suites, 2783 tests, thresholds hold (global 100 % statements and lines, `src/navigation` floor untouched).
- `ibp-domain` suite: 230 tests pass.
- `npm run format:check` flags only the untracked `.claude/settings.local.json`.
- Grep gates: `brandMapTokens.scoreMarker.high` in ScoreLegend, `<ScoreRing` in SelectedSurveyCard and ClusterListSheet, `visual.accentText` in MapChips.
- No dependency change (`package.json` and the lockfile diff is empty). Map, markers and clustering diff is empty against BASE.

## Known Stubs

None.

## Residual risks and device-only checks

- On the phone, light and dark: whether the outlined selected summary inside the blurred sheet reads as "the selected survey", and whether the 2 pt outline in `#9BC26A` is too loud in dark mode.
- Glass rows (`glass.cardFill`, no blur) on the blurred sheet over the map: contrast of the row text over a busy orthophoto behind the sheet.
- The `sm` native glass button inside the sheet (iOS 26+). The panel's other buttons are `md`.
- The cluster row title "IBP n/50 · date" repeats the score the ring shows. A shorter title (date only) would need a catalogue change and an owner opinion.
- Entrance replay: rows rewind when the Explorer is covered by a pushed page (community survey) and slide in again on return, as accepted for other screens.
- The 2 pt hit slop on the 40 pt pills, and the 13 pt slop on the close glyphs next to the sheet's top edge, against the handle's drag area.
- Android (D-17): flat glass fallbacks, the wave, and the button fallback.

## Self-Check: PASSED

- FOUND: mobile/src/screens/public-map/SheetCloseButton.tsx, PanelRowEntrance.tsx, SelectedSurveyCard.test.tsx, ClusterListSheet.test.tsx
- FOUND: 118faba, b879f83 in git log
