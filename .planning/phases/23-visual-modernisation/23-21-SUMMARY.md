---
phase: 23-visual-modernisation
plan: 21
subsystem: cross-cutting-gates
tags: [em-dash, catalogue, motion, reduce-motion, dark-mode, contrast, gate, explorer-sheet, parcel-picker]
requires: ["12.2-19", "12.2-20"]
provides:
  - "mobile/src/__checks__/catalogue-dash.test.ts: findEmDash over src/i18n/fr and every non-test source under src (comments skipped by the TypeScript parser), survey-export.ts out of scope"
  - "motion.test.ts: findUnguardedTimings, findLegacyAnimatedOutsideAllowlist and findUngatedLoops, real tree clean"
  - "ExplorerSheet honours Reduce Motion (useReducedMotion(): placed at once, no spring)"
  - "Skeleton and ContourLines loops gated by useScreenVisible; AppCollapsibleSection chevron carries ReduceMotion.System"
  - "Dark distinctness test over the 18 UI-SPEC per-scheme tokens (no open dark correction, no token changed)"
  - "theme.visual.mapPanel and MapTitlePill: the parcel picker's floating card, banner and title, and Accueil's nearby map overlays, read over any basemap in both schemes"
affects: [12.2-22, 12.2-23]
tech-stack:
  added: []
  patterns:
    - "Source gates read code through the TypeScript parser (leaf tokens, JSDoc nodes skipped), so a comment never counts and string, template and JSX text always do"
    - "Every endless loop runs only while useScreenVisible() is true; the sign-in overlay's two legacy loops are an allowlist with a reason each"
    - "A card or banner floating over a map passes theme.visual.mapPanel (theme text) or theme.visual.mapControl.glass (map control ink) as its GlassSurface surface"
key-files:
  created:
    - "mobile/src/__checks__/catalogue-dash.test.ts"
    - "mobile/src/ui/CasPicker.test.tsx"
  modified:
    - "mobile/src/i18n/fr/components.ts"
    - "mobile/src/__checks__/motion.test.ts"
    - "mobile/src/screens/public-map/ExplorerSheet.tsx, ExplorerSheet.test.tsx"
    - "mobile/src/ui/Skeleton.tsx, Skeleton.test.tsx, ContourLines.tsx, ContourLines.test.tsx, AppCollapsibleSection.tsx"
    - "mobile/src/app/visual-tokens.test.ts, mobile/src/app/theme-visual.ts"
    - "mobile/src/screens/public-map/MapChips.tsx, MapChips.test.tsx, mobile/src/screens/SurveyParcelSelectionScreen.tsx"
    - "mobile/src/ui/AppCard.tsx, AppCard.test.tsx, OfflineMapPrompt.tsx, OfflineMapPrompt.test.tsx, CasPicker.tsx"
    - "mobile/src/screens/home/NearbyMapCard.tsx, NearbyMapCard.test.tsx"
    - "mobile/src/screens/auth-gate/styles.ts, mobile/src/screens/AuthGateScreen.test.ts"
key-decisions:
  - "The em dash gate covers the whole app code, not only the catalogue: no string, template or JSX text under src may hold U+2014 (survey-export.ts excepted). The en dash is not gated: none exists in user-facing text today"
  - "Timing rule per call: a file that reads useReducedMotion() branches on it; anywhere else each withTiming, withSpring and withDelay carries ReduceMotion.System in its own arguments (stricter than the plan's file-level rule)"
  - "Loops: useScreenVisible() (focused and not under an app overlay) is required for every withRepeat and Animated.loop, except the sign-in overlay's hero ripples and splash cursor, which are the topmost layer"
  - "No open dark correction in the four checkpoint SUMMARYs: no theme token value changed; D-14 was never objected to"
  - "Map overlays that keep the theme's text take mapPanel (the Explorer sheet fill); overlays that read like controls take the map control glass and ink, as the Explorer's do"
requirements-completed: []
metrics:
  duration: 22min
  tasks: 3
  files: 25
  completed: 2026-10-08
status: complete
---

# Phase 12.2 Plan 21: Em dash gate, motion audit, dark pass Summary

The three cross-cutting gates of the phase are in place:

- **Em dash gate.** No em dash is left in any user-facing string of the app, and a gate keeps it that way.
- **Motion gate.** Every animation is checked for a Reduce Motion guard. Every endless loop must stop when its screen cannot be seen.
- **Dark distinctness.** Every per-scheme visual token has its own dark value.

The audit also found real problems:

- the Explorer sheet slide ignored Reduce Motion;
- two loops kept running under pushed pages and overlays;
- a chevron rotation had no guard;
- several overlays floating over a map were hard to read in dark mode, and one also in light mode over the satellite basemap.

All of them are fixed, with tests.

BASE (HEAD before Task 1): `ae3c22a`.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Em dash catalogue gate and the last placeholders | fb2ee51 |
| 2 | Motion consistency audit and the Explorer sheet guard | 9f266ff |
| 3 | Dark pass on the visual tokens (distinctness test) | 8c0a623 |
| extra | Dark pass on map overlays, the cas radio and the sign-in error (orchestrator's extra checks) | 3a75bfa |

## 1. Em dash gate

**What the gate checks.** `findEmDash(files)` parses each file with the TypeScript parser and reads its leaf tokens, skipping JSDoc nodes. As a result:

- line, block, JSX and doc comments never count;
- string literals, template literals and JSX text always count.

It reports `{ file, line }` for each em dash. The test writes the character as the `—` escape, so the test file itself is clean.

**Where it runs.** Two real-tree gates:

- `src/i18n/fr/**` except `survey-export.ts` (UI-SPEC: the PDF export is out of scope; its "unknown" cell keeps "—");
- every non-test source under `src`, with the same exception.

Fixtures cover a string, a template literal over two lines, JSX text, and the comment forms.

**Catalogue fix.** `fr.components.ibpScoreBadge.noScore` and `fr.components.ibpFactorBars.notFilled` are now "Non renseigné". No screen renders `IbpScoreBadge` or `IbpFactorBars` any more (lists use `ScoreRing` and `FactorBarsChart`). If the badge came back with a null score, it would read "Non renseigné/50" in a 50 pt badge. Note this if the badge is ever reused.

**En dash ("–") audit.** There is none in the catalogue and none in any user-facing string. The only two are in code comments of `src/recognition/calibration.ts` ("49.73%–50.00%"). The gate does not cover the en dash; this is reported, not enforced.

**Em dashes left in comments.** There are still a few: `survey-list.ts`, `genus.ts`, `survey-form.ts`, `factor-input.ts`, `BrandFern.tsx`, `AppNavigation.tsx`. They are not user-facing and the owner rule does not cover comments, so they were left as they are.

## 2. Motion audit

### The gates (`__checks__/motion.test.ts`)

- **`findUnguardedTimings`.** Comments are blanked through the TypeScript parser, so `brand-tokens.ts`'s "`withSpring(value, ...)`" comment is not reported. A file that reads `useReducedMotion()` counts as guarded. Elsewhere, each `withTiming`, `withSpring` and `withDelay` call must carry `ReduceMotion.System` in its own arguments, and the finding gives the line. This is stricter than the plan's file-level rule. The stricter rule found the `AppCollapsibleSection` chevron, which the file-level rule missed.
- **`findLegacyAnimatedOutsideAllowlist`.** React Native `Animated.timing(`, `Animated.spring(` and `Animated.loop(` are only allowed in six files, each with a reason. Each one must have a reduced-motion guard (`AccessibilityInfo`, `useReducedMotion(` or a `reducedMotion` identifier). The exception is `ConfettiBurst`. The test also checks that `WelcomeScreen` is its only user and renders it as `reducedMotion ? null : <ConfettiBurst`.
- **`findUngatedLoops`** (beyond the plan, from the orchestrator's extra checks). Every `withRepeat` or `Animated.loop` needs `useScreenVisible(`. Two loops are exempt, with reasons: the sign-in overlay's hero ripples (`HeroSection`) and the splash cursor (`TypewriterSplash`). The overlay is the topmost layer, and no other overlay shows with it.

**RED checked.** The three new real-tree tests were run against the pre-fix sources (the four HEAD files put back for the run, then restored) and failed with four findings:

- `AppCollapsibleSection.tsx:40` unguarded timing;
- `ExplorerSheet.tsx` legacy Animated with no guard;
- `ContourLines.tsx` ungated loop;
- `Skeleton.tsx` ungated loop.

### Fixes

- **`ExplorerSheet`.** `useReducedMotion()`: under Reduce Motion the panel opens and closes at once (`translateY.setValue`), with no `Animated.timing`, and unmounts straight away on close. A short swipe puts it back with `setValue(0)` instead of the spring. The drag still follows the finger and dismisses the panel. When motion is allowed, nothing changes. There are two new tests.
- **`Skeleton`.** The pulse runs only while its screen can be seen (`useScreenVisible`). It is used by the Accueil map placeholder, the photo tiles and the events list. Under the sign-in overlay or a pushed page, it used to pulse unseen. `ReduceMotion.System` is now on the loop and on its timing. The `AppState` pause is kept. There are three new tests: the loop config, Reduce Motion, and unfocused or covered.
- **`ContourLines`.** The drift is gated by `useScreenVisible` instead of `useScreenFocus`, so it also stops under an app overlay. Every current use is still (`animated={false}`). There is one new test for the covered case.
- **`AppCollapsibleSection`.** The chevron rotation carries `ReduceMotion.System`.

### Motion sites by area, and their guards

| Area | Site | Guard |
| ---- | ---- | ----- |
| Score and gauges | `ScoreRing`, `GlowBar`, `FactorBarsChart`, `AnimatedNumber`, `ScoreCard` (numeral, bar) | `useReducedMotion()` (final value at once) plus `ReduceMotion.System`; `ScoreRing` starts on `useScreenVisible` |
| Score and gauges | `DownloadStatusView` progress bar (400 ms ease to each report) | `ReduceMotion.System` (the value is shown at once under Reduce Motion) |
| Entrances | `useFocusEntrance` (sections that slide up on Accueil and others), `ListEmptyState`, `AppCollapsibleSection` and `AccountSettingsRows` entering, exiting and layout builders, the Explorer panel rows (`EntranceView`) | `ReduceMotion.System` on every builder and timing, entrances started on `useScreenVisible` |
| Screen transitions | native-stack pushes (system animation); JS tabs `animation: reducedMotion ? "none" : "fade"` (`tab-config.tsx`) | system setting; explicit flag on the JS tabs |
| Screen transitions | `ExplorerSheet` slide and snap-back (legacy Animated, native driver) | `useReducedMotion()` (this plan) |
| Action feedback | `AppPressable` press spring, `RipplePressable` green wave, `HaloPulse` (submit and sync), `SyncStatusLine` pop | `useReducedMotion()` (no scale, no wave, no pulse) plus `ReduceMotion.System` |
| Action feedback | haptics | only through `src/ui/feedback.ts` (existing gate) |
| Ambient loops | `ForestAurora` (mist discs, flowing light, fade-in) | `useScreenVisible` plus `useReducedMotion()` plus `ReduceMotion.System` on every timing and repeat; no per-frame JS (worklets read precomputed plans) |
| Ambient loops | `EdgePulse` (download glow, drawn by `DownloadEdgeGlowHost`) | the request lives only while the Explorer can be seen; `EdgePulse` also checks `useScreenVisible`; still at full under Reduce Motion; `ReduceMotion.System` |
| Ambient loops | `ContourLines` drift (unused, every use is still) | `useScreenVisible` (this plan) plus `useReducedMotion()` |
| Ambient loops | `Skeleton` pulse | `useScreenVisible` (this plan), `useReducedMotion()`, `AppState`, `ReduceMotion.System` |
| Sign-in overlay (legacy Animated) | `AuthGateScreen` entrance sequence, `HeroSection` ripples (loop), `TypewriterSplash` typing and cursor blink (loop), `WelcomeScreen` springs, `ConfettiBurst` | `AccessibilityInfo.isReduceMotionEnabled()` in each screen; ripples also paused in the background; the confetti is only rendered when motion is allowed |
| Ripples | none left: `ForestRipples` and `ForestWaves` were removed in 12.2-19 | (none) |

**Hero budget.** The gate still passes: Accueil 1, Mes Relevés 1, survey detail 1, every other route 0.

**JS-thread work.** No animation does per-frame work on the JS thread:

- no `useFrameCallback`, no `requestAnimationFrame` loop, no `runOnJS` in a worklet;
- the remaining `setInterval`s are the counter's press-and-hold repeat, the session timer and the sync poll, none of which animate.

The one exception is the Explorer sheet's drag. It follows the finger through a `PanResponder` on the JS thread (`translateY.setValue` on each move). This is the existing behaviour and it was kept as is (the plan keeps the sheet unchanged). Moving it to Gesture Handler and Reanimated is a candidate for 12.3.

## 3. Dark pass

### Task 3: tokens

- **No open dark correction.** None of the four checkpoint SUMMARYs (10, 14, 17, 19) leaves a dark correction open. The owner's only dark remark, "En dark mode les boutons de explorer sont difficiles à voir", was fixed in 12.2-19 (`mapControlGlass`). D-14 (dark forest glow level) was asked at batch 1 and never objected to. **No token value was changed.**
- **Distinctness test.** The 18 UI-SPEC per-scheme tokens differ between light and dark: backdrop, accentText, the glass card fill, border, shadow, control and Android fills, the tab tint, background and border, the active chip fill and text, the high score, track and neutral, and the forest image, hero image and shadow. A second check confirms the direction: the dark glass surfaces are darker on their canvas, and the dark accent, active tab tint and active chip are the lighter colours. Every contrast pair of plan 03 still passes.

### Extra checks: floating controls and sheets over a map

These were modelled the plan 19 way: each glass composited over the white plan, the beige plan, an orthophoto mid field, a dark canopy and black, in both schemes.

| Surface | Finding (before) | Fix | Commit |
| ------- | ---------------- | --- | ------ |
| Survey detail map card pills (`MapInfoPill`, `MapActionPill`, "Modifier les parcelles") | already on the map control glass (12.2-19), tested | none | (none) |
| Parcel picker: top capsule, locate, legend and count pill | already on the map control glass, tested | none | (none) |
| Parcel picker: bottom card (`AppCard glass`) | default 38% glass: dark over the plan gave secondary text 1.05:1 and primary 2.3:1; light over the dark canopy gave 1.4:1 and 2.9:1 | `theme.visual.mapPanel` (the Explorer sheet fill as a glass surface): every theme text token at 4.5:1 or more over every basemap, on the tint, fill and Android paths | 3a75bfa |
| Parcel picker: iOS title pill | forest on the default glass: 3.7:1 dark over the plan, 2:1 light over the canopy | new `MapTitlePill` (in `MapChips`): map control glass, ink and hairline | 3a75bfa |
| Parcel picker: offline banner (`OfflineMapPrompt` banner) | default glass with secondary text (same failure as the bottom card); forest icon on the dark muted disc at 1.9:1 | `mapPanel` surface; icons and progress fill take `accentText` (forest in light, light green in dark) | 3a75bfa |
| Accueil "Autour de vous" map (`NearbyMapCard`) | forest text on the default glass: 3.3 to 3.7:1 in dark over the plan | score badge and summary on the map control glass, text in `mapControl.text` and `textMuted` | 3a75bfa |
| `CasPicker` (wizard and context page) | white check on the dark scheme's light green radio: 2.0:1 | `onCtaPrimary` (dark ink, 9.3:1; still white in light) | 3a75bfa |
| `GenusTargetSheet` | theme tokens only (canvas, textStrong, accent) | none | (none) |
| Sign-in error banner | terracotta on the error surface: 3.0:1 light, 4.1:1 dark | `theme.onSurface.danger` (6.0:1 and 8.4:1) | 3a75bfa |
| Sign-in hero and panel | fixed forest hero with on-dark tokens; the panel on theme tokens | none | (none) |

Light-mode side effects of these fixes:

- The Accueil nearby card's text goes from forest #334E2B to the map control ink #24311F.
- The nearby card's glass and the picker's title pill go from the 38% frosted glass to the 76% one, the same as the Explorer controls.
- The sign-in error text is a deeper red.
- In light, `OfflineMapPrompt`'s icons and the `CasPicker` check do not change.

### Not changed, reported

- **Parcel picker's native back button tint.** It is `brandColors.forest` on iOS (`SurveysStack.tsx`). It sits on the system's Liquid Glass circle over the map. How that glass looks in dark over the light plan cannot be modelled. A light tint would vanish on iOS before 26, where there is no circle. This is a device-only check.
- **Android stack header tint.** It is `theme.colors.forest`, which does not follow the scheme, so dark Android headers draw a forest back arrow. This is for the Android pass (D-17, Phase 13).
- **Compte loading spinner.** `ActivityIndicator` in forest on the dark canvas (2.1:1, shown briefly while the user loads). Left for 12.3.
- **`PhotosStrip` "Ajouter" pill.** It sits over a photo on the default glass. The photo is the backdrop, not a map. Not modelled.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Loops running unseen (orchestrator's extra checks)**
- **Found during:** Task 2
- **Issue:** `Skeleton` pulsed under pushed pages, other tabs and the sign-in overlay, and its timing lacked `ReduceMotion.System`. `ContourLines` stopped when unfocused but not under an overlay.
- **Fix:** both gated by `useScreenVisible`, plus the new `findUngatedLoops` gate.
- **Files modified:** `src/ui/Skeleton.tsx`, `src/ui/ContourLines.tsx` and their tests, `src/__checks__/motion.test.ts`
- **Commit:** 9f266ff

**2. [Rule 1 - Bug] `AppCollapsibleSection` chevron ignored Reduce Motion**
- **Found during:** Task 2 (per-call timing rule)
- **Fix:** `reduceMotion: ReduceMotion.System` on the chevron timing.
- **Commit:** 9f266ff

**3. [Rule 1 - Bug] Map overlays, cas radio and sign-in error unreadable in dark (or light)**
- **Found during:** extra dark checks requested by the orchestrator
- **Issue / fix:** see the table above.
- **Why screen files were touched:** the plan says "Do not touch screen files here (other closing plans own them)". Plans 22 and 23 touch only docs, so no closing plan owns these screens. The fixes are one prop or one colour token per site. `SurveyParcelSelectionScreen.tsx` went from 398 to 381 lines, because the title pill moved to `MapChips`.
- **Files modified:** `theme-visual.ts` (new `mapPanel`), `AppCard.tsx` (`surface` prop), `MapChips.tsx` (`MapTitlePill`), `SurveyParcelSelectionScreen.tsx`, `NearbyMapCard.tsx`, `OfflineMapPrompt.tsx`, `CasPicker.tsx`, `auth-gate/styles.ts`, with tests (new `CasPicker.test.tsx`)
- **Commit:** 3a75bfa

**4. Gate scope widened (allowed by the extra checks)**
- The em dash gate also covers every non-test source under `src`, not only the catalogue.
- The timing rule is per call, not per file.

### TDD Gate Compliance

Tasks 1 to 3 are `tdd="true"`. The RED runs were local, as in the earlier plans of this phase:

- Task 1: the real-tree tests failed on `components.ts` lines 52 and 60.
- Task 2: the real-tree tests failed with the four findings above, checked against the HEAD sources.
- Task 3: the distinctness test passed at once. The tokens already differed, and no token change was needed ("no open dark correction"), so there was nothing to turn red.

Each task was committed once, in its GREEN state, because the orchestrator requires lint, typecheck and the mobile coverage suite to pass before every commit. Task 3's commit is a `test(...)` commit, since it adds tests only.

## Verification

- `cd mobile && npx jest --runInBand --config jest.unit.config.js src/__checks__ src/app src/i18n src/screens/public-map`: 44 suites, 695 tests passed.
- `npm run lint`: exit 0. `npm run typecheck`: exit 0.
- `npm run test:coverage:mobile`: 254 suites, 3040 tests passed, thresholds hold (exit 0).
- `npm --workspace @cortege/ibp-domain run test`: 9 suites, 230 tests passed.
- `npm run format:check`: only the untracked `.claude/settings.local.json` is reported (ignored as instructed).
- `npm run test:unit`: only the known, unrelated local failure in the API suite `check-env-parity.spec.ts` (34 tests in that one suite). The domain and mobile suites pass on their own (above).
- Changed `screens/**` and `navigation/**` files are all under 400 lines (largest: `SurveyParcelSelectionScreen.tsx`, 381).

## Device-only checks (for plan 23)

- **Explorer sheet, Reduce Motion on.** The download, cluster and history panels appear and disappear at once. A short drag snaps back without a bounce, and a long drag closes the panel. With Reduce Motion off, the slide is unchanged.
- **Parcel picker, dark mode, plan basemap:**
  - the bottom card ("N parcelles sélectionnées", the helper and the hint) reads clearly on a near-opaque graphite card;
  - the title pill at the top is a dark glass capsule with light text;
  - the offline banner reads the same.
  - Then the satellite basemap in light mode: the card is near-opaque paper with dark text.
  - On iOS 26 the Liquid Glass tint should look dense. If it still looks see-through, raise `explorerSheetGlass.<scheme>.fill`, which `mapPanel` shares with the Explorer sheet.
- **Parcel picker's native back button** in dark mode over the plan: is the forest chevron readable on the system glass circle?
- **Accueil "Autour de vous" map, dark mode:** the sector score badge and the summary pill are dark graphite with light text. In light mode the pills are a little more frosted and the text a darker green-black.
- **Wizard and context page cas cards, dark mode:** the selected radio shows a dark check on the light green.
- **Sign-in with a wrong password, light and dark:** the error text is a readable red on its pale (or dark) banner.
- **Accueil while loading, then a pushed page:** the map skeleton stops pulsing when covered and resumes on return. Under Reduce Motion it stays still.

## Known Stubs

None.

## Threat Flags

None. The changes are static gates, text, motion guards and colour tokens. No new network, auth, file or schema surface was added.

## Self-Check: PASSED

- FOUND: mobile/src/__checks__/catalogue-dash.test.ts, mobile/src/ui/CasPicker.test.tsx
- FOUND: fb2ee51, 9f266ff, 8c0a623, 3a75bfa
