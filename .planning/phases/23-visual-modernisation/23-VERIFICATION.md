---
phase: 23-visual-modernisation
verified: 2026-10-08T13:06:08Z
re_verified: 2026-10-08 (criteria 4 to 8, on HEAD 785811b3 = origin/main after PR #250)
status: passed
score: 9/9 roadmap success criteria met (2026-10-09), Android pass and open design points carried to Phases 35 and 37
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: "4/4 (written against the first four criteria, now numbered 1, 2, 3 and 9)"
  gaps_closed:
    - "CI never ran on this branch: PR #248 merged 2026-10-08T14:14Z with every check green (native Android, native iOS, mobile build, e2e, e2e MinIO, audit, image check, CI OK)"
    - "Vincennes parcel colour check: owner confirmed on 2026-10-08/09 (reported by the orchestrator, no repo document records it)"
    - "Reduce Motion and field ergonomics: owner confirmed on 2026-10-08/09 (reported by the orchestrator, no repo document records it)"
  gaps_remaining:
    - "Criterion 4: map colourisation not started"
    - "Criterion 5: offline packs with a new background not started"
    - "Criterion 6: design spec not fully in step with the code"
    - "Criterion 7: component inventory and homogenisation not done"
    - "Criterion 8: native-first audit not done, no stated reasons for custom replacements"
  regressions: []
gaps:
  - truth: "4. The maps are colourised: comparison board, owner pick, integration in light and dark, cadastre and parcel colours legible on every background"
    status: failed
    reason: "Nothing built. No comparison board exists in the repo (the word 'planche' appears only in SEED-001 and unrelated docs). basemaps.ts still has only the keys map and satellite; maplibre/styles.ts still uses the grey IGN style (gris.json) in both schemes and its comment says the dark recolouring comes later. On 2026-10-08 the owner declined to plan dark basemap colouring ('non laisse', 23-23-SUMMARY), which contradicts the 'light and dark' wording of the criterion added the same day"
    artifacts:
      - path: "mobile/src/map/basemaps.ts"
        issue: "two basemaps only (map, satellite)"
      - path: "mobile/src/map/maplibre/styles.ts"
        issue: "PLAN_IGN_STYLE_URL = .../PLAN.IGN/gris.json for both schemes"
    missing:
      - "Comparison board (same places, same parcels, each candidate background) and the owner's pick"
      - "Integration of the chosen background, with cadastre and parcel colours checked on it"
      - "Owner decision: amend criterion 4 to light only (matches 'non laisse'), or plan dark colouring"
  - truth: "5. Offline map packs stay reasonable with the new background (zone size, tile count at zooms 13 to 17, a style with its sprites)"
    status: failed
    reason: "Depends on criterion 4, so no new background exists to measure. offline-packs.ts keeps the 13 to 17 range and one pack per basemap; the missing @2x sprite of the grey IGN style is only tolerated (non-fatal errors, offline-packs.ts:43-46), not replaced by a style that has its sprites. No size or tile-count measurement for a new background is recorded. The pre-existing estimate (tile-math.ts estimateAreaDownload) covers the two current backgrounds only"
    artifacts:
      - path: "mobile/src/map/offline-packs.ts"
        issue: "sprite 404 tolerated, not fixed"
      - path: "mobile/src/map/offline-styles.ts"
        issue: "still fetches the grey PLAN.IGN style and appends the cadastre"
    missing:
      - "Measure tiles and bytes of a zone with the chosen background at zooms 13 to 17"
      - "A style whose sprites exist (or are bundled) so the download does not rely on tolerating a 404"
  - truth: "6. docs/design/charte-graphique-etats-sauvages-spec.md describes the direction, tokens, components and motion as they are after this phase"
    status: partial
    reason: "Section 13 (tokens, surfaces, typography, primitives, motion, gates) matches the code. Remaining drift: map backgrounds are not described (criterion 4 not done); 13.8 says the native bar sets the active tint through visual.tab.activeTint while NativeRootTabs.tsx:61 uses DynamicColorIOS over tabActiveTint; 12.4 calls AppPressable 'the single pressable primitive' but 65 raw <Pressable> remain in screens, ui and navigation; 11.5 documents IbpTotalGauge, which no file imports; section 13 and its subsections say 'Phase 12.2' although the phase is now 23; shared components in mobile/src/ui absent from the spec: AppActionSheet, AppField, AppGroupedList, AppNotice, AppSectionHeader, AppStatusChip, PageTitle, SyncStatusLine, HeaderLeftTitle, OfflineMapPrompt, BrandHighlight, ConfettiBurst, FactorGenusListInput, GenusCameraView, GenusRecognitionModal; 13.10 'Still open' lists the parcel-colour server fix although PR #248 merged and the owner confirmed it"
    artifacts:
      - path: "docs/design/charte-graphique-etats-sauvages-spec.md"
        issue: "stale or missing around lines 183-189, 315-330, 342-349, 528-530, 557-562"
    missing:
      - "Rewrite those passages and add the missing components; add a map backgrounds section once criterion 4 is built"
  - truth: "7. Existing components reused and homogenised: inventory, duplicates merged, no one-off style or duplicate component left"
    status: partial
    reason: "The colour lint rule passes (cd mobile && npx eslint src --ext .ts,.tsx: no output, exit 0) and no hex or rgb literal exists in screens, ui, navigation or hooks outside comments. But no inventory was produced (ROADMAP coverage note: plans 01 to 23 did not cover criterion 7) and duplicates remain: ui/IbpFactorBars.tsx (superseded by FactorBarsChart), ui/IbpScoreBadge.tsx (superseded by ScoreRing and GradientNumeral), ui/IbpTotalGauge.tsx, ui/SurveyProgressCard.tsx and ui/BrandFern.tsx have no production importer. 65 raw <Pressable> in 30 files against 49 uses of AppPressable, RipplePressable, AppButton and GlassButton, with pressed opacities of 0.6, 0.7, 0.76, 0.88 and 0.9 written locally (ui/AppChoiceChip.tsx:97, ui/AppNotice.tsx:130, ui/AppCollapsibleSection.tsx:96, ui/AppButton.tsx:211, screens/survey-list/row-styles.ts:63, screens/auth-gate/styles.ts:205, screens/account/styles.ts:156). 60 literal fontSize and 49 literal borderRadius values bypass brandTypography and brandRadius (for example screens/survey-form/factors.styles.ts:24, screens/public-map/styles.ts). Deliberate near-duplicate kept on record: RecentSurveyRow versus SurveyRowFrame (D-23)"
    artifacts:
      - path: "mobile/src/ui/IbpFactorBars.tsx"
        issue: "duplicate of FactorBarsChart, no importer"
      - path: "mobile/src/ui/IbpScoreBadge.tsx"
        issue: "no importer"
      - path: "mobile/src/ui/IbpTotalGauge.tsx"
        issue: "no importer"
      - path: "mobile/src/ui/SurveyProgressCard.tsx"
        issue: "no importer"
      - path: "mobile/src/ui/BrandFern.tsx"
        issue: "no importer"
    missing:
      - "Written inventory of mobile/src/ui and the screen folders with a keep, merge or delete decision per component"
      - "Delete the five unused components and their tests, or wire them"
      - "Move raw Pressable usages to AppPressable or RipplePressable, and pressed values to brandInteraction"
      - "Replace literal fontSize and borderRadius by brandTypography and brandRadius roles"
  - truth: "8. Native libraries and platform components used as much as possible; each remaining custom component has a stated reason"
    status: partial
    reason: "Native parts are in place: iOS native tab bar, native header items and a native header menu (useSurveyDetailHeader.tsx:81), Liquid Glass via expo-glass-effect, the SwiftUI glass button through @expo/ui, pageSheet modals (NearbyParcelsSheet, GenusTargetSheet), ActionSheetIOS in IdentityCard, native Switch, MapLibre, Reanimated. Custom replacements without a written reason or with a weak one: AppActionSheet (RN Modal, used only for the delete confirmation in SurveyDetailScreen.tsx:302 although IdentityCard uses ActionSheetIOS and the header already has a native menu; its comment says 'no extra native dependency'), FactorHelpSheet (slide Modal, not pageSheet), GenusRecognitionModal, FactorSliderInput (hand-drawn track, no reason beyond gloves in spec 11.2), FactorSegmentedInput and AppChoiceChip (custom pills instead of a native segmented control), ExplorerSheet (JS-thread PanResponder, carried to Phase 37). Documented reasons exist for the JS tab bar (Android, D-08) and the flat glass fallbacks (spec 13.9). @gorhom/bottom-sheet is still in mobile/package.json and no file in mobile/src imports it. The spec has no list of custom components with reasons"
    artifacts:
      - path: "mobile/src/ui/AppActionSheet.tsx"
        issue: "custom sheet where a native action sheet or menu exists"
      - path: "mobile/package.json"
        issue: "@gorhom/bottom-sheet unused"
    missing:
      - "Table in the spec: each custom component, the native equivalent, and why it stays (or replace it)"
      - "Remove @gorhom/bottom-sheet, or record why it stays"
deferred:
  - truth: "Android look of the visual refresh (gradients, coloured shadows, flat glass fills, edge glow, forest card SVG mask, aurora cost, dark header tint)"
    addressed_in: "Phase 13"
    evidence: "ROADMAP.md:826 'Carried over from Phase 23 (old 12.2, D-17): an Android device pass of the visual refresh ...'; charter 13.9 (Phase 35, numbered 13 before the flat renumbering)"
  - truth: "Explorer sheet drag on the JS thread (PanResponder); Compte loading spinner 2.1:1 in dark (pre-existing, AccountScreen.tsx:116); unanswered owner questions (fixed pager title, sketch 009 elements, GenusTargetSheet and CasPicker glass, wizard edge swipe, clip line under transparent headers)"
    addressed_in: "Phase 12.3 (named only in charter 13.10 and 23-23-SUMMARY, not in the ROADMAP 12.3 section or STATE.md); the charter now says Phase 37"
    evidence: "docs/design/charte-graphique-etats-sauvages-spec.md:565-571"
  - truth: "Animals illustrations, 'Qui vit ici ?' (sketch 008 variant J)"
    addressed_in: "Unplanned (dormant seed SEED-005)"
    evidence: ".planning/seeds/SEED-005-animaux-qui-vit-ici.md"
  - truth: "Dark basemap colouring"
    addressed_in: "Unplanned, no seed (owner: 'non laisse', 2026-10-08)"
    evidence: "charter 13.10, 23-23-SUMMARY caveat 1. Conflicts with criterion 4 (see gap 4): the owner must settle which of the two stands"
human_verification:
  - test: "Decide the scope of criterion 4: light basemap only (matches 'non laisse') or light and dark"
    expected: "ROADMAP criterion 4 reworded, or a plan for dark colouring"
    why_human: "Owner decision. The criterion was added the same day the owner declined a dark basemap seed; the code cannot arbitrate"
  - test: "When the comparison board exists, pick the background on the owner's phone"
    expected: "One colourised background chosen, parcel and cadastre colours legible on it"
    why_human: "Visual choice by the owner (criterion 4)"
---

# Phase 23: Visual Modernisation Verification Report

(The first pass of this report was written under the old number 12.2; the plans and summaries keep the id `12.2-NN`.)

**Phase Goal:** The app is more pleasant to look at, more modern and more dynamic, in light and dark mode, before the association sees it.
**Verified:** 2026-10-08T13:06:08Z, on HEAD 200dbef7 (branch `claude/phase-12-2-da5975`) for criteria 1, 2, 3, 9. Criteria 4 to 8 re-verified 2026-10-08 on HEAD 785811b3 (= origin/main after PR #250)
**Status:** gaps_found (criteria 4 and 5 not started; 6, 7 and 8 partial)
**Re-verification:** Yes, criteria 4 to 8 added after the ROADMAP gained them (merge of main, 2026-10-08). The ROADMAP coverage note already says plans 01 to 23 do not cover them

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

The first pass listed four truths under the old numbering (1, 2, 3 and "owner confirms"). The ROADMAP now has nine criteria: the old truth 4 is criterion 9. Rows below follow the ROADMAP numbers.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A short visual direction is written down and the owner approves it before the screens are touched | VERIFIED | `docs/design/direction-visuelle-12-2.md:3` "Statut : approuvée par le propriétaire le 2026-10-08 ..." (0 em dash); charter `docs/design/charte-graphique-etats-sauvages-spec.md:342` section 13, `:554` "Status: approved by the owner on 2026-10-08". Sequence holds in git: `bd0c3574 docs(12.2-01): complete direction gate plan` (owner "Go", 23-01-SUMMARY) is commit 25 of the phase, before the first token commit `774d32c1` (26) and the first screen commit `2a07f257` (50); only the test tooling of 12.2-02 came earlier |
| 2 | Main screens (Accueil, Mes Relevés, survey form and detail, Explorer, Compte) follow the direction, in light and dark, with no regression on field ergonomics or accessibility | VERIFIED (iOS; Android deferred to Phase 13) | Primitives wired on every main screen: `ScreenFrame` on 12 routes plus `ScreenBackdrop` in `HomeScreen.tsx:179` (D-19 halo); one `ForestCard` each on Accueil (`home/ResumeCard.tsx`), Mes Relevés (`survey-list/ListSummaryCard.tsx`), detail (`survey-detail/ScoreCard.tsx`, with `GradientNumeral`, `GlowBar`, `HaloPulse`, `AnimatedNumber`); `ScoreRing` in row indicators, `RipplePressable` on list rows, `FactorBarsChart` only on `SurveyScoreScreen.tsx` (D-24); `GlassButton` CTAs in pager, wizard, finish bar, Explorer panels; Explorer sheet native glass (`ExplorerSheet.tsx:135,172`). Contrast: `visual-tokens.test.ts` (`describe.each(schemes)` pairs, both schemes), `forest-aurora-tokens.test.ts`, `glass-density.test.ts`, `tab-tint.test.ts`, `glass-ink.test.ts` all pass. Ergonomics: no hit-target or field-size token reduced in `brand-tokens.ts` since the merge-base; literal 44s replaced by `brandInteraction.hitTarget.min`; 21 suites assert 44 pt targets. Field ergonomics now also confirmed explicitly by the owner (2026-10-08/09, see Human Verification) |
| 3 | Transitions and feedback use the Reanimated motion system consistently and respect the system reduced-motion setting | VERIFIED | `src/__checks__/motion.test.ts`: no legacy layout animation, no `useNativeDriver: false`, every builder and timing carries `ReduceMotion.System` or branches on `useReducedMotion()` (`findUnguardedTimings`, line 123), RN `Animated` limited to a 6-file guarded allowlist (line 139), every endless loop gated by `useScreenVisible()` (line 214), haptics only in `ui/feedback.ts`, hero budget of two per route (lines 230, 685-699: Home, list and detail at 1). 20 suites exercise the reduced-motion path through `setReducedMotion(true)`. All pass. Reduce Motion now also confirmed explicitly by the owner (2026-10-08/09) |
| 4 | The maps are colourised: comparison board, owner pick, chosen background integrated in light and dark, cadastre and parcel colours legible | FAILED (not started) | No comparison board in the repo (`grep -i "planche\|comparison board"` finds only SEED-001, ROADMAP and unrelated docs). `mobile/src/map/basemaps.ts` still `BasemapKey = "map" \| "satellite"`; `mobile/src/map/maplibre/styles.ts` `PLAN_IGN_STYLE_URL` is still `.../PLAN.IGN/gris.json` with the comment "The grey variant is used in both themes for now ... the dark recolouring comes later". SEED-001 (updated 2026-10-08) still dormant. The owner declined to plan dark basemap colouring on 2026-10-08 (`23-23-SUMMARY.md:82-88` "non laisse"; charter 13.10 line 561), while criterion 4, added the same day, asks for light and dark. Not a regression: no 12.2 plan covered it |
| 5 | Offline packs stay reasonable with the new background (size, tiles at zooms 13 to 17, a style with its sprites) | FAILED (not started; depends on 4) | `offline-packs.ts:7-8` zooms 13 to 17 unchanged, one pack per basemap; `offline-styles.ts` fetches the grey IGN style and adds the cadastre layer; the missing @2x sprite is handled by treating resource errors as non-fatal (`offline-packs.ts:43-46`, commit `7861c15f`), not by a style that has its sprites. `tile-math.ts:110` `estimateAreaDownload` is the earlier size estimate for the two existing backgrounds. No measurement for a new background |
| 6 | Design spec updated to the post-phase state | PARTIAL (gap) | Section 13 matches the code (tokens, surfaces, typography, primitives, motion, gates, fallbacks); the five token files, `ForestCard`, `GlassButton`, `useScreenVisible` etc. exist. Stale or missing: no map backgrounds section; 13.8 `visual.tab.activeTint` on the native bar (code: `NativeRootTabs.tsx:61` `DynamicColorIOS` over `tabActiveTint`); 12.4 "single pressable primitive" against 65 raw `<Pressable>`; 11.5 documents `IbpTotalGauge`, which has no importer; "Phase 12.2" naming in section 13 though the phase is 23; 15 shared `ui` components undocumented (list in the gap); 13.10 still lists the parcel colour server fix as open |
| 7 | Components reused and homogenised, inventory first, colour lint green | PARTIAL (gap) | Lint green: `cd mobile && npx eslint src --ext .ts,.tsx` printed nothing, exit 0; no hex or rgb literal in screens, ui, navigation, hooks outside comments. Not done: no inventory; five unused `ui` components (`IbpFactorBars`, `IbpScoreBadge`, `IbpTotalGauge`, `SurveyProgressCard`, `BrandFern`); 65 raw `<Pressable>` in 30 files with locally written pressed opacities; 60 literal `fontSize` and 49 literal `borderRadius` outside the token roles. `RecentSurveyRow` against `SurveyRowFrame` is a documented choice (D-23) |
| 8 | Native libraries and components first, each custom component has a stated reason | PARTIAL (gap) | Native in use: native tab bar, native header items and menu, Liquid Glass (`expo-glass-effect`), `@expo/ui` glass button, `pageSheet` modals, `ActionSheetIOS`, native `Switch`, MapLibre, Reanimated. Custom without a written reason: `AppActionSheet`, `FactorHelpSheet`, `GenusRecognitionModal`, `FactorSliderInput`, `FactorSegmentedInput`/`AppChoiceChip`; `ExplorerSheet` drag on `PanResponder` is only a carried item. `@gorhom/bottom-sheet` listed in `mobile/package.json`, imported nowhere in `mobile/src`. No table of custom components and reasons in the spec |
| 9 | The owner confirms the result on their own phone | VERIFIED (recorded human verdict; applies to the first-round scope) | 23-23-SUMMARY quotes the owner's "go" on Release build 39b4f005 (2026-10-08), after three fix rounds (23-23-FIXES.md). `git diff --stat 39b4f005..HEAD` touches only planning files and the two design docs, so HEAD's code was the approved build's code at that time. Earlier batch checks recorded in 12.2-10, -14, -17, -19 SUMMARYs. This confirmation predates criteria 4 to 8 and does not cover them |

**Score:** 4/9 truths verified (0 present, behavior-unverified): criteria 1, 2, 3, 9 verified; 4 and 5 failed; 6, 7, 8 partial and counted as not verified

### Owner decisions, checked in code

| Decision | Status | Evidence |
|----------|--------|----------|
| No in-app theme setting, system theme only | VERIFIED | `mobile/src/app/theme.ts:444-448` builds the theme from `useColorScheme()` only; no `theme_mode`, `setMode`, `setColorScheme` or `theme-preference` in `mobile/src` (comments only); `storage/theme-preference.ts` deleted in `cfa11e76`; `app.json:5` `userInterfaceStyle: "automatic"`; `SettingsScreen.tsx:37`, `i18n/fr/settings.ts:3` |
| Explorer sheets native glass (iOS 26, both schemes) | VERIFIED | `ExplorerSheet.tsx:135` `LIQUID_GLASS_AVAILABLE ? theme.visual.sheet.glass`, `:172` `<GlassSurface surface={glass}>`; BlurView fallback kept; `ExplorerSheet.test.tsx` passes |
| No tag pills | VERIFIED | Resume card tag pill removed (`cd34e2f`, 23-10-FIXES); "Recommandée" is a plain accent word (`survey-wizard/wizard.styles.ts:142-147`); remaining `tagFill`/`tagBorder` uses are a progress-segment track (`ResumeCard.tsx:159`) and a divider rule (`ListSummaryCard.tsx:81`), not pills. Not gated by a test (judgment) |
| No `borderCurve` | VERIFIED | `layers.test.ts:181` gate passes; the only occurrences are comments in `ui/ForestCard.tsx:41-42`; fixture tests prove the finder bites (lines 147-161) |
| Outline icons only | VERIFIED | `icons.test.ts:310` scans >200 files, passes; fixture tests prove it reports filled names (lines 204-300); no other icon family imported |
| At most two animated hero layers per screen | VERIFIED | `motion.test.ts:230` `HERO_BUDGET = 2`, route walk passes |
| Colour literals only in the five token files | VERIFIED | ESLint probe via stdin: `"#FF0000"` and `rgba(...)` rejected under `src/screens`, `src/ui`, `src/navigation`, `src/hooks`, `src/app/ibp-display.ts`; accepted in `src/app/visual-tokens.ts`. Re-run 2026-10-08 on the whole of `mobile/src`: clean |
| Em dash gate | VERIFIED | `catalogue-dash.test.ts` passes with fixture tests (lines 90-130); em dashes found in `mobile/src/ui/*` are in comments only |
| `@expo/ui` the only added dependency, Android excluded | VERIFIED | Manifest diff since merge-base 4f2d6cca: only `mobile/package.json` `"@expo/ui": "~57.0.19"` and `expo.autolinking.android.exclude: ["@expo/ui"]` (`mobile/package.json:84-90`). Lockfile adds only `@expo/ui` 57.0.22 and its transitive tree (`vaul`, `@radix-ui/*`, peer `react-dom`, etc.). `expo-modules-autolinking resolve`: android 24 modules without `@expo/ui`, ios 26 with it. Runtime imports only in `NativeGlassButton.ios.tsx:3,16`; `NativeGlassButton.types.ts:2` has a type-only import (erased). `npm run audit:check`: no unaccepted high or critical advisory. CI on PR #248 now confirms the first Android native build with `@expo/ui` in the tree (Native build Android: SUCCESS) |
| SQLite migration 5 and `countFilledFactors` | VERIFIED | `storage/db.ts:27` `SCHEMA_VERSION = 5`, `:217-235` migration 5 adds and backfills `payload_factors_filled`; `app/ibp-scoring.ts:75` `countFilledFactors` over the domain readiness; written at four sites (`storage/surveys.ts:49,445`, `storage/sync.ts:294,331`); read by `home/ResumeCard.tsx:47` and `home/ToolsSection.tsx:85`; `db.migration.sqlite.test.ts` passes |
| API migration 020 and IGN id parser fix | VERIFIED in code; in `main` since PR #248; owner confirmed the parcel colour | `api/migrations/020_parcel_idu_fields.sql` (guarded, idempotent UPDATE); `api/src/surveys/surveys-normalize.utils.ts:410-442` `IDU_PATTERN` and `parseParcelIdentifier`; unit spec passes. Commit `e7537b5` is now an ancestor of HEAD (`git merge-base --is-ancestor`); the e2e job of PR #248 (including the migration 020 spec) passed |

### Required Artifacts (plan must-haves)

`gsd-tools verify.artifacts` and `verify.key-links` were run on all 23 plans. Plans 01, 20, 22, 23 pass clean; 10, 14, 17, 19 are checkpoint plans without artifacts. Every other reported failure was triaged by hand:

| Kind | Items | Resolution |
|------|-------|------------|
| Tool false negatives (escaped regex reported "invalid" or "not found") | 02, 03, 04 (ForestCard), 05, 06 (tones, `factorBars.label`), 07 (`feedback.selection()`), 08 (AppButton), 09 (AppGroupedList), 12 (`useSubmitSuccessPulse`), 13, 15, 16, 18 (`brandMapTokens.scoreMarker`), 21 (`useReducedMotion()`) | Each pattern found by grep: e.g. `ibp-display.ts:26`, `theme.ts:416`, `ForestCard.tsx:86`, `AppButton.tsx:188`, `AppCard.tsx:87`, `ScoreRing.tsx:95`, `FactorBarsChart.tsx:52,114`, `AppChoiceChip.tsx:35`, `AppGroupedList.tsx:189`, `ScoreBreakdown.tsx:80`, `SurveyScoreScreen.tsx:34`, `FactorPager.tsx:263`, `wizard.styles.ts:37`, `ScoreLegend.tsx:28`, `ExplorerSheet.tsx:73` |
| Renamed during the phase | `useEntrance.ts` (06, 08, 11, 18), `useScreenFocus` (04), `SurveyRow <ScoreRing` (11) | Replaced by `useFocusEntrance`/`EntranceView`, `useListEntrance`/`ListEntranceRow`, `PanelRowEntrance` (`fb9da46d`), `useScreenVisible` (`ContourLines.tsx:38`), `survey-list/row-indicator.tsx:36` |
| Removed by later owner decision | `SelectedSurveyCard.tsx` (18), Settings `AppChoiceChip` (09), `visual.tab.activeTint` on the native bar (07), `FactorBarsChart` on the summary (12) | `4ad61111` (marker opens the survey directly), `cfa11e76` (Apparence removed), `e4927f7` (`DynamicColorIOS` from `tabActiveTint`, `NativeRootTabs.tsx:61-64`), D-24 |

No artifact is missing without a recorded decision for criteria 1, 2, 3, 9. No stub found. No plan exists for criteria 4 to 8, so they have no must-have artifacts.

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `AppStateProvider` and storage | `payload_factors_filled` | `computePayloadFactorsFilled` at the four write sites | WIRED |
| `GlassButton.tsx:19` | `NativeGlassButton.ios.tsx` | platform split, `NATIVE_GLASS_BUTTON_AVAILABLE` | WIRED |
| `NativeRootTabs.tsx:61` | `visual-tokens.ts` `tabActiveTint` | `DynamicColorIOS` | WIRED |
| `ExplorerSheet.tsx` | `GlassSurface` | `theme.visual.sheet.glass` | WIRED |
| `BrandThemeProvider` | system scheme | `useColorScheme()` | WIRED |
| `parcels` registration | `parseParcelIdentifier` IDU branch | `surveys-normalize.utils.ts` | WIRED (API), in main |
| `offline-packs.ts` | `offline-styles.ts` `writeOfflineStyle` | one pack per basemap, grey IGN style + cadastre | WIRED (current two backgrounds only) |

### Behavioral Spot-Checks and gate runs

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Lint | `npm run lint` | exit 0, 0 warnings (first pass) | PASS |
| Colour rule, whole mobile source | `cd mobile && npx eslint src --ext .ts,.tsx` (2026-10-08, HEAD 785811b3) | no output, exit 0 | PASS |
| Types | `npm run typecheck` | exit 0 | PASS |
| Mobile tests and coverage thresholds | `npm run test:coverage:mobile` | 256 suites, 3080 tests, thresholds hold, exit 0 | PASS |
| Domain package | `npm --workspace @cortege/ibp-domain run test` | 9 suites, 230 tests | PASS |
| Format | `npm run format:check` | only untracked `.claude/settings.local.json` flagged (ignored as instructed) | PASS |
| API unit | `npm --workspace api run test:unit` | 34 suites pass; `test/check-env-parity.spec.ts` fails 34 cases (shell exit 2 vs API 1/0). Known local failure, files last touched in 01.9-10, unrelated to this phase | KNOWN UNRELATED |
| Colour rule bites | `eslint --stdin --stdin-filename src/screens/AccountScreen.tsx` with a hex and an rgba literal | 2 errors (`no-restricted-syntax`) | PASS |
| Android autolinking | `npx expo-modules-autolinking resolve --platform android/ios` | android without `@expo/ui`, ios with it | PASS |
| Dependency audit | `npm run audit:check` | no unaccepted high or critical | PASS |
| CI on PR #248 | `gh pr view 248 --json statusCheckRollup` | all checks SUCCESS (Android and iOS native builds, e2e, e2e MinIO, mobile build, audit, image check, CI OK); "Build & push" skipped | PASS |
| Unused `ui` components | `grep -rlw <name> mobile/src` excluding the file and its test | no importer for `IbpFactorBars`, `IbpScoreBadge`, `IbpTotalGauge`, `SurveyProgressCard`, `BrandFern` | FAIL (criterion 7) |
| Raw Pressable count | `grep -rn "<Pressable" screens ui navigation` | 65 in 30 files | FAIL (criteria 6, 7) |
| `@gorhom/bottom-sheet` imports | `grep -rn gorhom mobile/src` | none, yet listed in `mobile/package.json` | FAIL (criterion 8) |

### Probe Execution

Step 7c: no probe scripts declared or present for this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REQ-QA-visual-modernisation | all 23 plans | Visual direction approved, applied to the main screens in light and dark, consistent Reanimated motion respecting reduced motion, no regression on ergonomics or accessibility | PARTIAL | Truths 1, 2, 3, 9 satisfy the original wording (iOS; Android pass in Phase 35). Criteria 4 to 8 were added to the phase afterwards and are open. Still `[ ]` in `REQUIREMENTS.md:97`, to be ticked when the phase closes |

No orphaned requirement: REQUIREMENTS.md maps only this ID to this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| 371 phase-modified files | - | TBD / FIXME / XXX | none found | - |
| `api/test/migration-020-parcel-idu-fields.e2e-spec.ts` | 59 | `PLACEHOLDER` | Info | a test constant, not a stub |
| `mobile/src/ui/IbpTotalGauge.tsx`, `SurveyProgressCard.tsx`, `IbpFactorBars.tsx`, `IbpScoreBadge.tsx`, `BrandFern.tsx` | - | no production importer | Warning (criterion 7) | dead code and near-duplicates of `FactorBarsChart` and `ScoreRing`; the first two predate the phase, the others were superseded during it |
| `mobile/src/screens/AccountScreen.tsx` | 116 | forest `ActivityIndicator` on the dark canvas, 2.1:1 | Warning | pre-existing (same line at merge-base), not a regression; carried to Phase 37 |
| `.planning/phases/23-visual-modernisation/23-VALIDATION.md` | 4-5 | `status: draft`, `nyquist_compliant: false`, Wave 0 boxes unticked | Warning | the validation contract was never closed out, although every Wave 0 file it lists now exists and passes |
| `mobile/package.json` | - | `@gorhom/bottom-sheet` with no import | Warning (criterion 8) | unused dependency |

### Human Verification

#### Resolved since the first pass

1. **Full CI on the PR.** Resolved: PR #248 merged 2026-10-08 with every check green, including the first Android native build with `@expo/ui` and the e2e jobs.
2. **Parcel colour by score, owner's Vincennes survey.** Owner confirmed on 2026-10-08/09. Source: relayed by the orchestrator for this re-verification; no repo document (STATE.md line 188 still lists it as pending) records it yet. STATE.md should be updated.
3. **Reduce Motion, then field ergonomics (factor pager, inputs, wizard).** Owner confirmed on 2026-10-08/09. Same source and same caveat. This closes the two questions the first pass said the owner never answered one by one.

#### Still open

1. **Scope of criterion 4.** Owner decision: light basemap only (consistent with "non laisse", 2026-10-08) or light and dark. The ROADMAP wording and the owner's answer disagree.
2. **Owner pick from the comparison board.** Needs the board first (criterion 4).
3. **Owner phone check of the new background**, with parcel colours and cadastre on it (criteria 4 and 5), once built.

### Deferred and carried items

| Item | Destination | Recorded in |
|------|-------------|-------------|
| Android device pass (D-17) | Phase 35 | `ROADMAP.md:826`, charter 13.9 |
| Explorer sheet drag on the JS thread | Phase 37 (charter wording; first pass said 12.3) | charter 13.10, 23-23-SUMMARY |
| Compte spinner contrast in dark | Phase 37 | same |
| Unanswered questions: fixed pager title, sketch 009 elements, GenusTargetSheet and CasPicker glass, wizard edge swipe, clip line under transparent headers | Phase 37 or later | charter 13.10 |
| Split of `brand-tokens.ts` (over 400 lines, outside the structure gate) | audit candidate | 23-19-SUMMARY:208 |
| Animals (variant J) | Unplanned, dormant seed | `.planning/seeds/SEED-005-animaux-qui-vit-ici.md` |
| Relief, BD Forêt layers and other basemaps | Dormant (SEED-001, updated 2026-10-08) | `.planning/seeds/SEED-001-couches-de-carte.md` |
| Dark basemap colouring | Unplanned, no seed (owner's choice), but inside criterion 4 as worded | charter 13.10, 23-23-SUMMARY |
| Corsican parcel ids (2A, 2B) unmatched | Unplanned, out of scope | charter 13.10 |

The dead `IbpTotalGauge` and `SurveyProgressCard` were an audit candidate in the first pass; criterion 7 now makes their removal (with the other three unused components) part of this phase, so they moved from deferred to gaps.

### Gaps Summary

The first four criteria (now 1, 2, 3 and 9) hold in the code on iOS, CI ran green on PR #248, and the owner confirmed the Vincennes parcel colour, Reduce Motion and field ergonomics. Criteria 4 to 8 were added to the phase after the 23 plans were written and have not been delivered:

- **4 and 5 (map colourisation, offline packs): not started.** No board, no pick, no new style; the map code still uses the grey IGN plan and the satellite photo. The criterion asks for light and dark while the owner declined dark basemap colouring on 2026-10-08: settle that first.
- **6 (spec): partial.** Section 13 is accurate; the spec lacks a map section, 15 shared components, and carries five stale statements (listed in the gap).
- **7 (homogenise): partial.** Colour lint is green and no colour literal remains, but there is no inventory, five unused components, 65 raw `Pressable`, and 109 literal font sizes and radii.
- **8 (native first): partial.** Native iOS pieces are widely used; custom replacements (`AppActionSheet`, `FactorHelpSheet`, `FactorSliderInput` and others) have no stated reason, and `@gorhom/bottom-sheet` is unused.

Bookkeeping: `23-VALIDATION.md` is still marked draft; STATE.md line 188 still lists the Vincennes check as pending.

---

_Verified: 2026-10-08T13:06:08Z (criteria 1, 2, 3, 9); re-verified 2026-10-08 (criteria 4 to 8)_
_Verifier: Claude (gsd-verifier)_

## Closure (2026-10-09)

Criteria 4 to 8 were built after the re-verification above and confirmed by the owner on an iPhone 15 Pro (Release build of PR #252, 2026-10-09): standard colour Plan IGN and its dark recolouring (PR #251, charter 13.11), design spec updated, 8 refactor batches (dead code and `@gorhom/bottom-sheet` removed, typography, spacing and radius tokens, `AppPressable` everywhere with a lint rule, chips, progress bars, rows and glass icon button merged, native action sheet, form sheet and gear item on iOS, native slider and picker evaluated and deferred, "why custom" register, see `docs/design/component-inventory-phase-23.md`). Two display bugs found on the phone were fixed before the merge: the factor help title overlapping the scrolled text in the form sheet, and the profile photo off-centre in its header glass.

Carried over, not blockers: Android pass of the visual refresh and of the custom sheets and tab bar (Phase 35); native slider and segmented picker device spike, Explorer sheet drag off the JS thread, `AppGroupedList` and `AppCollapsibleSection` against `@expo/ui`, Compte spinner contrast in dark (Phase 37); 339 literals reduced, the 26 font weights, 2 `Jost-Medium` and the circular radii left because no token matches (Phase 37); the owner left the dark basemap beyond this recolouring and BD Forêt/relief out (SEED-001).
