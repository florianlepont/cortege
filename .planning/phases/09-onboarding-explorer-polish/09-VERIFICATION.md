---
phase: 09-onboarding-explorer-polish
verified: 2026-10-06T21:35:47Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "Explorer's floating panels become a tiered native sheet (2-3 detents) instead of absolutely-positioned cards; filters are immediate chips (period, region, my surveys) instead of free-text fields and an Apply button, with an active-filter count and a reset action."
    reason: "Both halves were reversed after the phase by recorded owner decisions. All Explorer filters were removed (OA-67, closed in PR #207, 'the owner's call', confirmed on the phone 2026-10-06). The sheet is one Animated panel at 55 percent height because @gorhom/bottom-sheet opened as a sliver on iOS 27 (OA-66, validated on the iOS 27 simulator 2026-10-06). The intent of the criterion (no floating absolute cards, immediate filtering UX) is superseded, not missed."
    accepted_by: "owner, as recorded in docs/user-tests/owner-acceptance.md (OA-66, OA-67); transcribed by the verifier, not a fresh sign-off"
    accepted_at: "2026-10-06T00:00:00Z"
human_verification:
  - test: "On a fresh install (Release build), launch the app and watch the first second before the carousel."
    expected: "The forest green native splash with the logo shows, then the app. No default white Expo splash. Note whether the login screen flashes for a moment before the carousel appears (see Anti-Patterns, first row)."
    why_human: "A splash flash is visual and timing-dependent. app.json and App.tsx can only prove the configuration. The 2026-09-28 phone pass covered the carousel and sign-in but records nothing about the splash."
  - test: "Refuse location and camera on the permissions-priming screen, then tap 'Ouvrir les réglages'."
    expected: "The iOS Settings page of the app opens, and a later grant is reflected after returning."
    why_human: "Linking.openSettings and the OS permission prompts cannot be exercised by Jest. The unit tests only check that the link is rendered after a refusal."
  - test: "Android: install a build and look at the launcher icon under a circular mask."
    expected: "The logo mark is not clipped (it covers about 68 percent of the canvas)."
    why_human: "Adaptive-icon masking is device specific. The 68 percent figure comes from the SUMMARY (Pillow measurement), which I did not re-measure. The owner phone passes were all iPhone."
---

# Phase 9: Onboarding & Explorer Polish Verification Report

**Phase Goal:** A first launch explains the app and asks for permissions with context, and the now member-only Explorer map behaves like a real map instead of a prototype.
**Verified:** 2026-10-06T21:35:47Z
**Status:** human_needed (no code gaps; three device-only checks, and criterion 3 passes by a recorded owner override)
**Re-verification:** No, initial verification

**Context that matters for reading this report.** Phase 9 shipped on 2026-09-27. Phase 12 and the 12.1 owner acceptance loop then rebuilt the Explorer (MapLibre instead of react-native-maps, Liquid Glass controls, filters removed, panel redrawn with `Animated`). The 09-VALIDATION.md and ROADMAP wording describe the Phase 9 delivery, not today's code. I verified each success criterion against the code on branch `claude/roadmap-seeds-16a6af` (HEAD `0fb6d2f`) and say below where the criterion now holds differently.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A three-screen carousel (ten factors, offline, member map) runs before login on first launch, followed by a permissions-priming screen for location and camera with a link to Settings on refusal; "already seen" is persisted. | ✓ VERIFIED | `i18n/fr/onboarding.ts` holds exactly three slides (`10 FACTEURS`, `HORS LIGNE`, `CARTE MEMBRES`). `OnboardingFlow.tsx` runs `OnboardingCarouselScreen` then `PermissionsPrimingScreen` and calls `markOnboardingSeen()` on either exit ("Passer" or "Continuer"). `PermissionsPrimingScreen.tsx` requests `Location.requestForegroundPermissionsAsync()` and `ImagePicker.requestCameraPermissionsAsync()`, and on a refusal renders a `Linking.openSettings()` link ("Ouvrir les réglages"). `storage/onboarding-preference.ts` persists `onboarding_seen = "1"` in `local_meta` (best-effort, errors swallowed). `App.tsx` reads it in a `useEffect` and renders `OnboardingFlow` as the last overlay (`zIndex: 100`), above `AuthGateScreen`, which is also suppressed when `showOnboarding` is true. I ran `src/screens/onboarding`, `src/storage/onboarding-preference` and the public-map folder: 11 suites, 86 tests, all pass (includes "a refused location permission shows a settings link", the same for camera, and the SQLite round trip). The owner saw the carousel on a real phone on 2026-09-28 (owner-acceptance.md test run, then OA-01 to OA-04 closed on content, not on behaviour). |
| 2 | The Expo splash and adaptive icon are configured natively, so no default Expo splash flashes before `TypewriterSplash`. | ✓ VERIFIED (configuration); flash itself is a human check | `app.json` registers `expo-splash-screen` with `backgroundColor #334E2B`, `image ./assets/logo-app.png`, `imageWidth 160`, `resizeMode contain`, and sets `android.adaptiveIcon.foregroundImage ./assets/logo-app.png` with a white background. `package.json` pins `expo-splash-screen ~57.0.9`. `App.tsx` calls `SplashScreen.preventAutoHideAsync()` at module scope and `SplashScreen.hideAsync()` in the root `App()` effect. `TypewriterSplash` still exists (`components/TypewriterSplash.tsx`, rendered by `AuthGateScreen` while the session restores), so the hand-over the criterion talks about is real. Not provable here: that nothing white shows on a device (human check 1) and the adaptive-icon clipping (human check 3). |
| 3 | Explorer's floating panels become a tiered native sheet (2-3 detents) instead of absolutely-positioned cards; filters are immediate chips (period, region, "my surveys") instead of free-text fields and an "Apply" button, with an active-filter count and a reset action. | ✓ PASSED (override) | **Not true as written today, and not by accident.** What exists now: `ExplorerSheet.tsx` is one `Animated` panel at `HEIGHT_RATIO = 0.55` with a swipe-down dismiss, a blur background and a `bottomInset`; it has no detents and does not use `@gorhom/bottom-sheet` (its own header comment says the library "opened it as a sliver on iOS 27"). `PublicMapScreen.tsx` renders one `sheetContent` (offline areas, parcel history, cluster list, or selected survey) inside it, so the "no absolutely-positioned cards" half holds. There is no filter row at all: `ExplorerFilterBar.tsx`, `period-filter.ts` and the `period`/`mineOnly` state were deleted in `263bf9c` ("The Explorer drops its filters (period, region, mine, parcel layer)"); `grep ExplorerFilterBar\|period-filter\|mineOnly mobile/src` finds nothing. Both reversals are logged in `docs/user-tests/owner-acceptance.md`: OA-66 (panel drawn with plain Animated, validated 2026-10-06) and OA-67 ("All filters removed ... the owner's call", confirmed on the phone 2026-10-06). The search page (Phase 12.1, OA-52, OA-54) now holds the only filters of the app (status, with photos) and they apply to "Mes relevés", not to the map. I record this as an override transcribed from the owner log. The ROADMAP wording for this criterion is stale and should be edited (see Gaps Summary). |
| 4 | Map markers show the survey's score band (moss/ochre/terracotta) with a legend, instead of a single off-brand system pin color; the user's position uses the native `showsUserLocation` halo instead of a custom marker. | ✓ VERIFIED (implemented on MapLibre) | `SurveyMarker.tsx` colours a `ViewAnnotation` pastille by `bandTone(totalBand(ibpTotal))` using `markerStyles.scorePastille_{low,mid,high}` and `brandMapTokens.scoreMarker` (`low terracotta`, `mid ochre`, `high moss`); the author's drafts are drawn white and dashed. `bandTone` comes from `@cortege/ibp-domain` (`bands.ts`), so the thresholds are the shared ones. `ScoreLegend.tsx` wraps `MapLegend`: a count pill with an (i) toggle that opens the three score rows plus the draft row. The user's position is `<UserLocation />` from `@maplibre/maplibre-react-native` in `MapCanvas.tsx`, with a comment "the device's own position is the native halo, not a marker kept by the app"; the custom current-location `Marker` and the `currentLocation` state are gone, and `react-native-maps` is no longer a dependency. The literal prop `showsUserLocation` does not exist any more because the map engine changed (Phase 12.1); the intent holds. `markers.test.tsx` and `ScoreLegend.test.tsx` pass. |

**Score:** 4/4 truths verified (1 by override, 0 behavior-unverified)

### Task Criterion 5 (remediation sweep, not a numbered roadmap criterion)

Spot-checked only, since it is outside the roadmap contract. DS-05: `AppText.tsx` applies `maxFontSizeMultiplier ?? brandFontScaleCaps.default`. DS-13: `buildJsTabBarStyle(theme, insets)` is used by `tabs/JsRootTabs.tsx`. HOME-06 and LIST-07: `HomeScreen.tsx` has `onNavigateToAccount` and formats the failed-sync alert with `formatSyncErrorForUser(..., last_sync_error_code)`. DET-03/DET-04 evolved: the "..." menu now holds only "Supprimer" and sharing is its own header button (OA-48 to OA-50, `useSurveyDetailHeader.tsx`), so the batch 7 menu (Renommer, Partager, Supprimer) no longer exists as written. ACC-02 was not re-read.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/src/screens/onboarding/OnboardingFlow.tsx`, `OnboardingCarouselScreen.tsx`, `PermissionsPrimingScreen.tsx` | Carousel then priming | ✓ VERIFIED | Wired from `App.tsx` |
| `mobile/src/storage/onboarding-preference.ts` | Persisted seen flag | ✓ VERIFIED | `local_meta` key `onboarding_seen`; SQLite test passes |
| `mobile/src/i18n/fr/onboarding.ts` | Catalogue copy | ✓ VERIFIED | 3 slides, priming copy, Settings label |
| `mobile/app.json`, `mobile/App.tsx` | Native splash and adaptive icon | ✓ VERIFIED | See truth 2 |
| `mobile/src/screens/public-map/ExplorerSheet.tsx` | Bottom panel for map content | ✓ VERIFIED (changed) | Plain `Animated`, one height, blur background |
| `mobile/src/screens/public-map/ExplorerFilterBar.tsx` | Filter chips | ✗ DELETED on purpose | Removed in `263bf9c` by owner decision (override above) |
| `mobile/src/screens/public-map/SurveyMarker.tsx`, `ScoreLegend.tsx` | Score-band marker and legend | ✓ VERIFIED | See truth 4 |
| `mobile/src/screens/public-map/MapCanvas.tsx` | Native user position | ✓ VERIFIED | `<UserLocation />` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.tsx` | `OnboardingFlow` | `loadOnboardingSeen()` then `setShowOnboarding(true)` | WIRED | Flag defaults to false, flips on first launch |
| `OnboardingFlow` | `markOnboardingSeen` | `finishFlow` on "Passer" and "Continuer" | WIRED | Unit-tested |
| `PermissionsPrimingScreen` | OS settings | `Linking.openSettings()` on refusal | WIRED | Link rendered after refusal (tested); the OS side is a human check |
| `PublicMapScreen` | `ExplorerSheet` | `sheetContent` for four panels | WIRED | `visible={sheetContent !== null}` |
| `MapCanvas` | `SurveyMarker` | `clusters.map`, key includes `selected` and `draft` | WIRED | Markers remount on selection change |
| `SurveyMarker` | `@cortege/ibp-domain` bands | `bandTone(totalBand(ibpTotal))` | WIRED | No local thresholds |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SurveyMarker` | `ibpTotal` | `entry.item.ibp_total` from `items` loaded by `useMapViewport` through `onLoad` (public map API) plus the author's drafts | Yes (`PublicMapItem.ibp_total`) | ✓ FLOWING |
| `ScoreLegend` | `count` | `mapItems.length` | Yes | ✓ FLOWING |
| `OnboardingFlow` | seen flag | SQLite `local_meta` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Onboarding, storage and Explorer unit tests | `npx jest -c jest.unit.config.js src/screens/onboarding src/screens/public-map src/storage/onboarding-preference` (from `mobile/`) | 11 suites, 86 tests passed | ✓ PASS |
| Mobile typecheck | `npx tsc --noEmit -p .` (from `mobile/`) | no output (clean) | ✓ PASS |

I did not run the full unit suite or lint.

### Probe Execution

No probes declared and `scripts/*/tests/probe-*.sh` does not exist. Skipped.

### Requirements Coverage

The phase has no entries in REQUIREMENTS.md (stated in ROADMAP: "none yet in REQUIREMENTS.md"). Nothing to cross-reference, nothing orphaned.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/App.tsx` | 40-48, 80-84 | `showOnboarding` starts false, so on a genuine first launch `showAuthOverlay` is true until the async `loadOnboardingSeen()` resolves. The login screen can show for a frame or more before the carousel is laid over it. | ⚠️ Warning | Cosmetic and first launch only. The roadmap says the carousel runs "before login"; it does, but a flash of login is possible. Human check 1 covers it. |
| `mobile/package.json`, `mobile/jest.unit.config.js`, `mobile/test/gorhom-bottom-sheet.mock.ts` | 25, 33 | `@gorhom/bottom-sheet` is still a dependency and still has a Jest mock, but no source file imports it (only a comment in `ExplorerSheet.tsx` mentions it). | ⚠️ Warning | Dead dependency (native weight, install time). Safe to remove together with the mock. |
| `.planning/ROADMAP.md`, `09-VALIDATION.md` | Phase 9 section | Criterion 3 and 4 wording (detents, chips, `showsUserLocation`) no longer describes the code. | ℹ️ Info | Documentation drift. Nothing else reads it. |
| `mobile/src/screens/onboarding/OnboardingFlow.tsx` | 14-17 | "Passer" on the carousel skips the permissions screen as well. | ℹ️ Info | Deliberate and documented in the component. A user who skips never sees the priming screen. |
| `mobile/src/i18n/fr/onboarding.ts` | permissions.body | "Cortege" without the accent used in the PDF footer ("Cortège"). | ℹ️ Info | Naming inconsistency in user-facing text. |

A grep for `TBD|FIXME|XXX` across the onboarding, public-map, `App.tsx` and `onboarding-preference.ts` files found nothing.

### Human Verification Required

#### 1. First-launch splash and login flash

**Test:** Fresh install of a Release build, cold start.
**Expected:** Native forest-green splash with the logo, then the carousel. No white Expo splash. Note whether the login screen is visible before the carousel.
**Why human:** Visual and timing based; code can only prove the configuration.

#### 2. Permission refusal and Settings link

**Test:** On the priming screen refuse location and camera, tap "Ouvrir les réglages".
**Expected:** iOS Settings of the app opens.
**Why human:** OS prompt and `Linking.openSettings` are not exercised by Jest.

#### 3. Android adaptive icon

**Test:** Install on Android, check the launcher icon under circle and squircle masks.
**Expected:** Logo not clipped.
**Why human:** Device specific; I did not re-measure the 68 percent claim.

### Gaps Summary

There are no code gaps against the goal: a first launch explains the app and primes permissions (truth 1), the splash is configured natively (truth 2), the Explorer shows score-band markers with a legend and the platform position indicator (truth 4), and its panels sit in one sheet (truth 3).

The one real finding is that **success criterion 3 is satisfied differently now**. The filter chips, the active-filter count and the reset action were built, tested and merged in Phase 9, then deliberately removed by the owner (OA-67); the sheet lost its detents when the bottom-sheet library failed on iOS 27 (OA-66). I carry the criterion as an override sourced from the owner acceptance log. If the owner wants filters back on the map, that is new work, not a Phase 9 gap. Suggested follow-ups, none blocking: reword criteria 3 and 4 in ROADMAP.md, remove the unused `@gorhom/bottom-sheet` dependency and its Jest mock, and consider initialising the onboarding flag so the login screen cannot flash before the carousel. The status is `human_needed` only because of the three device-only checks above.

---

_Verified: 2026-10-06T21:35:47Z_
_Verifier: Claude (gsd-verifier)_
