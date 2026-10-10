---
phase: 13-visual-foundations-motion
verified: 2026-10-06T21:45:00Z
status: passed
score: 6/6 must-haves verified (re-verified 2026-10-10; was gaps_found, 5/6, on 2026-10-06)
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "The 125 hard-coded hex/rgba colors outside brand-tokens.ts are gone, replaced by semantic tokens; an ESLint rule rejects a new hex literal or rgba( outside the tokens file."
    status: failed
    reason: "The rule is declared but silently switched off for every .tsx file under src/screens, src/components, src/ui and src/navigation, because the later overrides in mobile/.eslintrc.json define their own no-restricted-syntax list, which replaces (does not merge with) the one carrying the hex and rgba selectors. This has been so since the batch 2 commit 0d1bbce. Six literals have since slipped into those directories without any lint error."
    artifacts:
      - path: "mobile/.eslintrc.json"
        issue: "Override 1 (src/**/*.ts, *.tsx) holds the hex and rgba selectors; overrides 2 and 3 (src/screens, components, ui, navigation .tsx, and the survey-detail/form group) re-declare no-restricted-syntax with only the i18n selectors, so the hex rule does not run on those files. I confirmed it with throwaway probe files: a hex and an rgba literal in src/hooks/ and src/app/ produce 2 errors (exit 1); the same two in src/ui/ and src/screens/ produce 0 errors (exit 0)."
      - path: "mobile/src/ui/GlassSurface.tsx"
        issue: "line 73: rgba(8, 13, 19, 0.38) and rgba(247, 246, 240, 0.38)"
      - path: "mobile/src/ui/AppActionSheet.tsx"
        issue: "line 88: rgba(15, 22, 12, 0.4)"
      - path: "mobile/src/ui/GenusCameraView.tsx"
        issue: "line 107: #000000"
      - path: "mobile/src/screens/survey-form/FactorLetterStrip.tsx"
        issue: "line 208: rgba(14, 34, 16, 0.92)"
      - path: "mobile/src/screens/public-map/ParcelHistoryCard.tsx"
        issue: "line 100: color=\"#40654f\" on an Ionicons"
      - path: "mobile/src/screens/survey-wizard/SurveyWizardScreen.tsx"
        issue: "line 197: color=\"#FFFFFF\" on an Ionicons"
    missing:
      - "Repeat the two hex and rgba selectors (or factor them into one shared list) in the two later no-restricted-syntax overrides of mobile/.eslintrc.json, so the rule runs on src/screens, components, ui and navigation .tsx files"
      - "Move the six literals above onto tokens (brand-tokens.ts or theme.ts), then run npm run lint to prove the rule now bites"
human_verification:
  - test: "Open a Release build on a phone and walk Accueil, Mes Relevés, the survey form, the Explorer map and the Compte screen, in light and dark mode."
    expected: "Sora and Jost render everywhere (no screen in the system face); no white-on-fill or ochre-on-soft text is hard to read; buttons spring on press and the Android ripple shows; the skeleton pulses while the nearby-parcels and event lists load; with Reduce Motion on, nothing scales or pulses."
    why_human: "The phase was built in a cloud session with no simulator (13-CONTEXT.md and 13-VALIDATION.md say so). Lint, types and unit tests prove the wiring, not how it looks or feels. Part of this was seen by the owner during the Phase 12.1 phone passes (docs/user-tests/owner-acceptance.md), but no record covers the font, contrast, press-spring and Reduce Motion behaviour as such, and none covers Android."
---

# Phase 4: Visual Foundations & Motion Verification Report

**Phase Goal:** The app looks like Etats Sauvages, not a generic SF Pro/Roboto build, and its motion runs on the UI thread instead of ad hoc JS timers.
**Verified:** 2026-10-06T21:45:00Z
**Status:** gaps_found (one criterion, the lint guard, is not met as written; the rest holds, some of it in a form that changed after Phases 7, 12 and 12.1)
**Re-verification:** No, initial verification

The code has moved a lot since 2026-09-27: the collapsible headers the phase migrated no longer exist, `DraftCard` and `ParcelNearbyCard` were deleted, and the colour tokens now come through `theme.ts` for dark mode. Each criterion below is judged against the code on the current branch (`0fb6d2f`), and says when it is satisfied differently.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The charter's typefaces (Mazzard H, or an explicit stand-in) load through an `expo-font` config plugin and are wired into `brandTypography`; no screen renders in the OS default face. | ✓ VERIFIED | `mobile/app.json` lists the `expo-font` plugin with 7 files, all present in `mobile/assets/fonts/` (`Sora-Medium/SemiBold/Bold/ExtraBold`, `Jost-Regular/Medium/SemiBold`) plus both `OFL-*.txt` licences. `brandFontFamilies` keeps `preferred` (Mazzard H, Futura) next to `standIn` (Sora, Jost). Every `brandTypography` role names a concrete file (`Sora-ExtraBold`, `Jost-SemiBold`, and so on). OA-05 later renamed the files to their PostScript names so iOS finds them; `src/__checks__/fonts.test.ts` reads the name inside each file and checks it against the tokens and `app.json` (passes here). The default face comes from `ui/AppText.tsx` (`fontFamily: brandDefaultFontFamily`, `Jost-Regular`), not from `Text.defaultProps`: React Native's `Text` has none, which is why the batch 1 SUMMARY says `AppText`. about 84 files reference `AppText` (tests included). Two files still import `Text` from `react-native` (`survey-detail/HistorySection.tsx`, `public-map/ParcelHistoryCard.tsx`); I checked that their styles spread `brandTypography` roles, so they render in Sora/Jost anyway. They miss only the `maxFontSizeMultiplier` cap that `AppText` adds. Visual proof is human (see below). |
| 2 | The 125 hard-coded hex/`rgba` colors outside `brand-tokens.ts` are gone, replaced by semantic tokens; an ESLint rule rejects a new hex literal or `rgba(` outside the tokens file. | ✗ FAILED | The migration held for most of the app: a grep for `#hex` and `rgba(` in `mobile/src` (tests, `brand-tokens.ts` and `theme.ts` excluded) finds 11 literals in 7 files. 5 are CSS inside the PDF export HTML string (`survey-pdf-export.ts`), which the lint selectors (exact string literals) do not target and which is not a React Native colour. The other 6 are real colour literals (listed in `gaps`). The enforcement half is the failure: `mobile/.eslintrc.json` override 1 carries the hex and rgba selectors, but overrides 2 and 3 (`src/screens`, `src/components`, `src/ui`, `src/navigation` `.tsx`, and the survey-detail/form group) re-declare `no-restricted-syntax`, which replaces the earlier list in ESLint. I proved it with throwaway files, removed afterwards: a hex and an rgba string in `src/hooks/` and `src/app/` give 2 errors and exit 1; the same in `src/ui/` and `src/screens/` give no error and exit 0. The git history shows the same structure at the batch 2 commit `0d1bbce`, so the rule never covered those directories. It does cover `.ts` files in them (for example `*.styles.ts`), which is where most of the original 119 sat, so the migration itself was checked. The token names also changed after the phase: `brandOnWarningSurface`, `brandOnDangerSurface`, `brandTintOnLight` and `brandStatTileTint` are gone or only a comment; the on-surface and IBP band colours now come from `theme.ts` (`BrandOnSurfaceColors`, `makeIbpScoreColors`), which the rule also exempts. The IBP badge fix is still in force: `high` is `colors.forest` text on `colors.sage` (theme.ts:386). |
| 3 | `react-native-reanimated` 4 and `expo-haptics` back a `brandMotion` token set and a semantic `ui/feedback.ts`; the legacy `Animated`/`LayoutAnimation` calls in the collapsible headers are migrated to `useAnimatedScrollHandler` on `translateY`/`opacity`. | ✓ VERIFIED (collapsible headers satisfied differently) | `package.json` pins `react-native-reanimated` 4.5.1, `react-native-worklets` 0.10.4 and `expo-haptics`; `babel.config.js` adds `react-native-worklets/plugin` last. `brandMotion` (durations 100-500, bezier easings, `press`/`snappy`/`gentle` springs, stagger 40 ms capped at 8) is plain data in `brand-tokens.ts`. `ui/feedback.ts` is the only file importing `expo-haptics` outside tests (grep). Legacy code: `LayoutAnimation` appears only in a test mock (`render-counts.test.tsx`), and `useNativeDriver: false` appears nowhere. The headers the criterion names no longer exist: `useWizardScroll.ts`, `FormHeader.tsx`, `ListHero.tsx` and the survey-list hero were removed by the Phase 7 and 12.1 redesigns (one question per screen wizard, native headers with `headerLargeTitle: false`, a two-section list). Consequently `useAnimatedScrollHandler` has no remaining caller (grep: none); it was removed with the headers it served. The intent, no JS-thread-driven collapsible header and no `LayoutAnimation`, holds. `AppCollapsibleSection` and `AccountSettingsRows` use `LinearTransition`/`FadeIn`/`FadeOut` with `.reduceMotion(ReduceMotion.System)`. The legacy `Animated` API remains in `ConfettiBurst`, `ExplorerSheet`, `HeroSection`, `TypewriterSplash`, none with `useNativeDriver: false` and none a collapsible header (the batch 4 SUMMARY records the same scope choice). |
| 4 | `AppPressable` is the single pressable primitive (spring scale, Android ripple, mandatory accessibility label) and replaces the inconsistent pressed-opacity values across `DraftCard`, `ParcelNearbyCard` and `AppButton`. | ✓ VERIFIED (scoped; see Anti-Patterns warning) | `ui/AppPressable.tsx` exists: `withSpring(brandInteraction.pressedScale, brandMotion.springs.press)`, `android_ripple`, `accessibilityLabel: string` required in the type, scale skipped under `useReducedMotion()` or `disableScale`. `AppButton` renders `AppPressable`. `DraftCard.tsx` and `ParcelNearbyCard.tsx` were deleted (Phase 7 batches and the 12.1 Accueil redesign, OA-14 to OA-19), so that part of the criterion is moot; the pressed-opacity ladder of 0.7/0.4/0.76 is gone from the app (grep for pressed-opacity styles finds only plain `rowPressed` row styles in `AppGroupedList` and `survey-detail`). `AppPressable` is also used by `SurveyProgressCard`, `SyncStatusLine` and `survey-list/list-chrome.tsx`. It is not the only primitive in practice: 45 non-test `.tsx` files (one of them `AppPressable` itself) still render a raw `<Pressable` against 4 using `<AppPressable`. The phase only migrated the three named components, so I count the criterion as met as scoped, and record the rest as a warning. |
| 5 | A `Skeleton`/`SkeletonRow` pulse replaces static loading placeholders; every animation and decorative loop respects "Reduce Motion" and pauses in the background. | ✓ VERIFIED | `ui/Skeleton.tsx`: opacity 0.5 to 1 over 900 ms with `withRepeat`, fixed 0.75 under `useReducedMotion()`, `cancelAnimation` and restart on `AppState` change, cleanup on unmount. Used in `HomeScreen.tsx` (the map card loading state, `Skeleton`) and `survey-detail/EventsTab.tsx` (`SkeletonRow`); the original Accueil nearby-parcels boxes were redesigned into a mini-map in 12.1, and the skeleton moved with them. `auth-gate/HeroSection.tsx` gates its blob loop on an `AppState` foreground flag. `TypewriterSplash`, `WelcomeScreen` and `AuthGateScreen` check `AccessibilityInfo.isReduceMotionEnabled()`. The one loop without a background pause is `TypewriterSplash`'s cursor blink, a few seconds at cold start, a decision recorded in 13-CONTEXT.md. `src/ui/Skeleton.test.tsx` passes here (drives a background-foreground cycle). Whether it feels right is human. |
| 6 | `docs/design/charte-graphique-etats-sauvages-spec.md` is updated with the typefaces actually loaded, the full semantic token list, `brandMotion` and `AppPressable`'s interaction spec. | ✓ VERIFIED (with drift, see Anti-Patterns) | Section 12 exists (12.1 typefaces, 12.2 semantic tokens, 12.3 `brandMotion` and the reanimated migration, 12.4 `AppPressable`, 12.5 skeleton). The font table matches the code (OA-05 updated the file names to `Sora-ExtraBold` and so on). The `brandMotion` numbers (durations, easings, springs, stagger) match `brand-tokens.ts` exactly. Drift after Phase 12: 12.2 names tokens that no longer exist or moved (`brandOnWarningSurface`, `brandOnDangerSurface` are now `theme.onSurface.*`; `brandTintOnLight` and `brandStatTileTint` are gone) and says the lint rule rejects a literal "anywhere under `mobile/src` except the tokens file", which is not true (truth 2 and `theme.ts`). `brand-tokens.ts:114` still says the default font is applied via `Text.defaultProps` in `App.tsx`, which is wrong; it is `AppText`. |

**Score:** 5/6 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/assets/fonts/*.ttf` + `OFL-*.txt` | 7 embedded files and the licences | ✓ VERIFIED | Present; names match the PostScript names (fonts.test.ts) |
| `mobile/app.json` `expo-font` plugin | Lists the 7 files | ✓ VERIFIED | Lines 46-58 |
| `mobile/src/ui/AppText.tsx` | Default-face wrapper | ✓ VERIFIED | Wired in 84 files; `AppText.test.tsx` passes |
| `mobile/src/app/brand-tokens.ts` (`brandFontFamilies`, `brandTypography`, `brandMotion`) | Font and motion tokens | ✓ VERIFIED | Matches charter section 12 |
| `mobile/src/app/theme.ts` | Where the semantic colour tokens now live | ✓ VERIFIED | Added by Phase 12 (dark mode); exempt from the lint rule |
| `mobile/.eslintrc.json` hex/rgba rule | Rejects new literals outside tokens | ✗ STUB (partial) | Active on `.ts` and on `.tsx` outside four directories only (truth 2) |
| `mobile/babel.config.js`, reanimated 4 and worklets | Motion engine | ✓ VERIFIED | Plugin last |
| `mobile/src/ui/feedback.ts` | Single haptics entry | ✓ VERIFIED | Only importer of `expo-haptics` besides tests |
| `mobile/src/ui/AppPressable.tsx` | Pressable primitive | ⚠️ ORPHANED (partly) | Used by 4 files; 45 raw `Pressable` files remain |
| `mobile/src/ui/Skeleton.tsx` | Pulse placeholder | ✓ VERIFIED | Used in `HomeScreen` and `EventsTab` |
| `mobile/test/react-native-reanimated.mock.ts` | Jest mock | ✓ VERIFIED | Wired through `moduleNameMapper`; the suites that use it pass |
| `docs/design/charte-graphique-etats-sauvages-spec.md` section 12 | Updated charter | ✓ VERIFIED | Drift noted |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app.json` `expo-font` | embedded `.ttf` files | plugin fonts array | WIRED | File names equal the PostScript names |
| `brandTypography` roles | embedded font names | `fontFamily` strings | WIRED | `fonts.test.ts` |
| every screen `Text` | `AppText` default face | import alias | WIRED | 84 files; two raw `Text` files still use brand roles |
| `AppButton` | `AppPressable` | direct render | WIRED | `AppButton.tsx:63` |
| `AppPressable` | `brandMotion.springs.press` | `withSpring` | WIRED | Skipped under Reduce Motion |
| `HomeScreen`, `EventsTab` | `Skeleton`/`SkeletonRow` | import and loading branch | WIRED | |
| `.eslintrc.json` override 1 | hex/rgba selectors on all of `src` | `no-restricted-syntax` | PARTIAL | Replaced by overrides 2 and 3 for four directories (truth 2) |

### Data-Flow Trace (Level 4)

Not applicable. The phase ships tokens, primitives and styling; no artifact renders data fetched from a source.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Font names match tokens and `app.json`; structure guard; `AppText`; skeleton | `npx jest -c jest.unit.config.js src/__checks__ src/ui/AppText.test.tsx src/ui/Skeleton.test.tsx` (from `mobile/`) | 4 suites, 29 tests passed | ✓ PASS |
| Lint rule on a `.ts` file | probe file in `src/hooks/` and `src/app/` with a hex and an rgba string | 2 errors, exit 1 each | ✓ PASS |
| Lint rule on a `.tsx` file in `src/ui/` or `src/screens/` | same probe | 0 errors, exit 0 | ✗ FAIL (this is the gap) |
| No `LayoutAnimation` or `useNativeDriver: false` left | `grep -rn` over `mobile/src` | test mock only; none | ✓ PASS |

The probe files were created and deleted by me; `git status` shows no change under `mobile/`.

### Probe Execution

No probes are declared for this phase and `scripts/*/tests/probe-*.sh` does not exist. SKIPPED.

### Requirements Coverage

ROADMAP says "none yet in REQUIREMENTS.md". The phase is tracked by the audit finding IDs (DS-01 to DS-16), which I mapped to the criteria above. No orphaned requirement.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/.eslintrc.json` | 49-114 | `no-restricted-syntax` re-declared in later overrides, so it replaces the hex rule | 🛑 Blocker (criterion 2) | New hex literals pass lint in screens, components, ui, navigation; six already did |
| `mobile/src/ui/AppPressable.tsx` usage | n/a | 45 raw `<Pressable` files against 4 `AppPressable` | ⚠️ Warning | "Single pressable primitive" is true of the named components only; pressed feedback is inconsistent elsewhere, and a mandatory `accessibilityLabel` is not enforced on the raw ones (the 01.9 lint rule asks only for `accessibilityRole`) |
| `docs/design/charte-graphique-etats-sauvages-spec.md` 12.2 | 249-290 | Token names and the lint claim no longer match the code | ⚠️ Warning | The charter misleads the next person adding a colour |
| `mobile/src/app/brand-tokens.ts` | 114 | Comment says `Text.defaultProps` in `App.tsx` | ℹ️ Info | It is `AppText`; stale since batch 1 |
| `mobile/src/app/brand-tokens.ts` | 266 | `brandOnDarkStatus` is defined and never used elsewhere | ℹ️ Info | Dead token left by the redesigns |
| `mobile/src/app/survey-pdf-export.ts` | 79-87 | CSS colours inside the PDF HTML string | ℹ️ Info | Not a React Native colour; the lint selectors do not match template text |

A grep for `TBD|FIXME|XXX` over the files named in the SUMMARYs finds nothing in the phase's own work.

### Human Verification Required

#### 1. On-device look of the visual foundations

**Test:** Open a Release build on an iPhone and an Android phone. Walk Accueil, Mes Relevés, the survey form, the Explorer map and Compte, in light and dark mode, then switch on Reduce Motion and repeat.
**Expected:** Sora and Jost show everywhere with no system-face screen; the IBP badge and warning and error notices are readable; buttons spring on press, with the ripple on Android; skeletons pulse while lists load; with Reduce Motion nothing scales or pulses; backgrounding the app stops the auth-screen blobs.
**Why human:** Built without a simulator; tests prove wiring, not appearance. The owner's Phase 12.1 phone passes touched many of these screens on iOS, but nothing records font, contrast, press-spring or Reduce Motion as such, and nothing covers Android (Phase 13 is the natural place).

### Gaps Summary

One gap, and it is small to close. Criteria 1, 3, 4, 5 and 6 hold in the current code. Criterion 3 holds in a changed form: the collapsible headers it named were deleted by later redesigns, so there is nothing left to migrate and nothing legacy remains. Criterion 4 holds for the components it names, though `AppPressable` is far from the only pressable in the app.

Criterion 2 does not hold as written. The 119-literal migration was real and has mostly survived, but the guard that was meant to keep it that way has never worked on `.tsx` files in `src/ui`, `src/screens`, `src/components` and `src/navigation`, because a later ESLint override replaces its selector list. Six colour literals have entered those directories since. The fix is to add the two selectors to the later overrides and move the six literals to tokens; `npm run lint` will then show whether anything else is hiding.

Root cause, for the planner: ESLint `overrides` replace, not merge, a rule's options when several override blocks match one file.

---

_Verified: 2026-10-06T21:45:00Z_
_Verifier: Claude (gsd-verifier)_


## Re-verification 2026-10-10

The gap (the hex and rgba lint rule switched off on the screen, component, UI and navigation files, because the later ESLint overrides replaced the `no-restricted-syntax` list instead of merging it) is closed: `mobile/.eslintrc.json` now repeats the colour selectors in each of its three override blocks, and `npm run lint` passes on the whole repository (exit 0). The colour literals the first report listed were moved onto tokens by Phase 23, whose verification is `passed`.
