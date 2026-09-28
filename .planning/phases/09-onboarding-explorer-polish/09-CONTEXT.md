---
phase: 09-onboarding-explorer-polish
status: executing
created: 2026-09-27
---

# Phase 9 — Onboarding & Explorer Polish: Context

Source: `docs/design/ux-ui-audit-2026-09.md` §3.3 (ONB-01..MAP-05) and §7 Lot 4, plus a 2026-09-27
remediation sweep (criterion 5) folding in leftover findings from Phase 4's area (DS-05, DS-10,
DS-11, DS-13) and Phase 7's area (DET-03, DET-04, HOME-06, LIST-07, ACC-02).
ROADMAP success criteria: `.planning/ROADMAP.md` "### Phase 9: Onboarding & Explorer Polish".
Depends on Phase 8 (Offline Map, merged): the Explorer redesign (criteria 3-4) lands on the
offline-capable, member-authenticated map Phases 2 and 8 already shipped.

This session executes the phase directly (single agent, no orchestrator/executor split), following
the pattern set by Phases 3/4/7: batches, each gated by `npm run lint && npm run typecheck &&
npm run test:unit && npm run format:check`, closed with a `09-0N-SUMMARY.md`.

Sign-in-with-Apple (ONB-04) is explicitly **not** built here (US-A4/App Store 4.8 deferred to the
next milestone, per the ROADMAP's own carve-out).

## Cross-phase coordination

No other MVP phase is running in parallel (per the task brief). `origin/main` is pulled and merged
before opening the PR, in case something else lands in the meantime.

## Scope decisions (resolving ambiguity the audit/ROADMAP text leaves open)

- **"Visibilité" is dropped from the survey-detail "…" menu (DET-04).** The audit's recommendation
  text (and the task brief quoting it) lists "Renommer, Partager, Visibilité, Supprimer", but the
  private/public visibility control was deliberately removed from the mobile UI in Phase 2
  (`02-CONTEXT.md` D-01, `02-03-SUMMARY.md`) and re-verified absent in Phase 10 criterion 5. The
  `visibility` column and its API stay dormant server-side for `REQ-C-privacy-choice`, a future
  milestone — `REQUIREMENTS.md` marks `REQ-X-visibility` "Overridden". Resurrecting a visibility
  toggle now would contradict two prior phases' product decisions with no requirement asking for it
  in this milestone. The menu ships with **Renommer, Partager, Supprimer** only.
- **ACC-02 is verified, not rebuilt.** `handleLogout` (`useSurveySync.ts`, D-03, built in Phase 1.2)
  already counts unsynced work (`countUnsyncedLocalWork`/`formatUnsyncedWorkSummary`) and blocks a
  destructive logout behind an `Alert.alert` with a cancel option and an explicit, differently-styled
  confirm ("Supprimer et se déconnecter"). This satisfies ACC-02's intent — a specific warning with
  two distinct choices before unsynced work is lost — even though the exact button copy differs from
  the audit's suggested "Synchroniser d'abord" / "Se déconnecter quand même" (the current cancel
  simply aborts the logout; the sync engine resumes on its own on reconnect, so a dedicated
  "sync first" action would just duplicate that). No code changes; recorded here and in
  `09-VALIDATION.md` per the task brief's own instruction.
- **LIST-07's "+N autres" link is moot.** The `AttentionSection.tsx` card that recommendation
  targeted no longer exists — Phase 7 removed Mes Relevés' entire "à faire" card (`07-CONTEXT.md`,
  batch 4). Only the second half of LIST-07 is live work: Home's failed-sync alert
  (`fr.home.alerts.failedMessage`) shows a generic "Vérifiez votre connexion" message regardless of
  `last_sync_error_code`, while `SurveyRow` and `DetailActions` already thread the code through
  `formatSyncErrorForUser`. Home's alert is fixed to use the same function, so a given survey never
  shows two different error texts depending on which screen renders it.
- **DS-05's per-role `maxFontSizeMultiplier` is a capped default plus an explicit override, not a
  full per-callsite retrofit.** `brandTypography` role objects are spread directly into
  `StyleSheet.create` style objects throughout the app; `maxFontSizeMultiplier` is a `Text` *prop*,
  not a style property, so adding it into those objects would inject an invalid style key everywhere
  they're spread. Instead: `AppText` (the one `Text` wrapper every screen already imports) gets a
  sane app-wide default cap, and a new `brandFontScaleCaps` token table offers tighter per-role caps
  for call sites that pass them explicitly (badges, pills, anything on a fixed-width layout). New
  call sites this phase touches use the explicit caps; retrofitting every existing screen is future
  work, following the same "additive, not a full migration" precedent as `brandSpacing4` (Phase 3).
- **DS-10's spacing migration stays additive.** `brandSpacing4` (Phase 3's 4-grid) already exists
  alongside the older `brandSpacing` aliases; this phase adds the missing pieces the audit's §5 list
  still wants (`level0`-`level3` shadow scale, a tokenised badge radius) without ripping out
  `brandSpacing` or chasing every `sm - 2`/`md - 2` call site — the token file's own comment already
  documents the migration as gradual.
- **DS-11's brand marks land on new or already-being-touched surfaces, not retrofitted everywhere.**
  `BrandHighlight` (new) is used on the onboarding carousel's eyebrow labels; `BrandBump` gets a
  second usage (it was previously used exactly once, per the audit's own count) under the
  onboarding carousel's hero panels; `BrandFern` (never imported before this phase) is used
  tone-on-tone in the survey list's filtered-empty state. Broader retrofitting across every hero/
  empty-state in the app is out of scope — these are the additions the audit's finding (DS-11 counts
  usages, it doesn't demand exhaustive coverage) is closed by.
- **The tiered Explorer sheet (MAP-01) is built with `@gorhom/bottom-sheet`, not
  `react-native-maps`' own `formSheet` presentation.** React Navigation's `formSheet` (used by
  Phase 12 for the parcel-picker *modal*) only applies to a pushed navigator screen; Explorer's
  panels are persistent overlays on the *same* screen as the map, which a modal route can't be.
  `@gorhom/bottom-sheet@5.2.14` declares `react-native-reanimated: ">=3.16.0 || >=4.0.0-"` and
  `react-native-gesture-handler: ">=2.16.1"`, both already satisfied by this repo's versions
  (reanimated 4.5.1, gesture-handler ~2.32.0, both already wired through `GestureHandlerRootView`
  in `App.tsx` and the worklets Babel plugin) — no other native dependency changes needed.
- **The Explorer sheet hosts the survey/parcel/cluster content panels only, not the offline-areas
  picker.** `SelectedSurveyCard`, `ClusterListSheet` and `ParcelHistoryCard` move into the tiered
  sheet (exactly what MAP-01 is about — "cartes flottantes en position absolue" for map content).
  `OfflineAreasSheet` is a separate, already-modal-like utility opened by an explicit icon tap, not
  a map-content panel the audit's MAP-01..05 rows target; it stays a floating card to avoid widening
  this phase into every panel on the screen.
- **Filters (MAP-02) are a dedicated chip row above the map, not folded into the tiered sheet.**
  Keeping filtering (period / region / "mes relevés") separate from content browsing (selected
  survey / cluster / parcel history) mirrors Apple/Google Maps' own split (search & filter chips
  above, a detail sheet below) and avoids one component doing two unrelated jobs.
- **Region filter is a 3-way chip (Toutes · ACA · M), not a free picker.** `REGION_VERSIONS` in
  `@cortege/ibp-domain` only ever has two values (`ACA`, `M` — v3.0 surveys only; v3.2 surveys carry
  a `cas`, not a region, and are unaffected by this filter, unchanged from today). "Mes relevés" is
  a client-side filter over the already-loaded `items` by `ownSurveyIds` — no new API parameter.
- **The native splash's logo position is not pixel-identical to `TypewriterSplash`'s.**
  `expo-splash-screen`'s config plugin centers its image; `TypewriterSplash` pins its logo near the
  top. What ONB-02 actually complains about is a *visual jump* (white Expo splash → forest
  `TypewriterSplash`), which matching background color (`brandColors.forest`) and reusing the same
  logo mark removes; centering vs. top-alignment is a platform constraint (no native mod is added
  for this pass) and is not the jump the audit measured.
- **The Android adaptive icon reuses the existing `logo-app.png` mark as-is.** Its visible content
  (badge + fern) measures ~68% of the canvas width, close enough to Android's 66% safe-zone
  guideline that no visible clipping occurs under a circular or squircle mask (verified locally by
  inspecting the asset's opaque-pixel bounding box) — no new art asset was created for this pass.

## Batches

1. **Tokens & primitives**: `brandTypeScale` (12pt floor) + `brandFontScaleCaps`, `AppText` default
   `maxFontSizeMultiplier` + AX3 test; `brandShadow.level0`-`level3`, tokenised badge radius
   (`brandRadius.badge`); bump the six `fontSize: 9/10/11` call sites to a 12pt floor; `BrandHighlight`
   component with its own test.
2. **Onboarding carousel + permissions priming (ONB-01)**: `storage/onboarding-preference.ts`
   (local_meta flag, mirrors `map-preference.ts`), `OnboardingCarouselScreen` (3 panels: ten
   factors · offline · member map) + `PermissionsPrimingScreen` (location + camera, `Linking.
   openSettings()` on refusal), new i18n catalogue, wired into `App.tsx` ahead of `AuthGateScreen`.
3. **Native splash & adaptive icon (ONB-02)**: `expo-splash-screen` plugin config in `app.json`
   (forest background, existing logo mark), `android.adaptiveIcon`, `SplashScreen.preventAutoHideAsync`/
   `hideAsync()` around the app's ready state in `App.tsx`.
4. **Explorer filters (MAP-02)**: `ExplorerFilterBar` chip row (period / region / mes relevés),
   active-filter count + reset, replacing the free-text `AppField`s + Apply button in
   `MapTopControls`.
5. **Explorer tiered sheet (MAP-01)**: `@gorhom/bottom-sheet` dependency; `ExplorerSheet` hosting
   selected-survey / cluster-list / parcel-history content at 2-3 detents, replacing their
   absolutely-positioned `AppCard`s.
6. **Score-band markers & native location (MAP-03/MAP-04)**: pastille `SurveyMarker` colored by
   `bandTone(totalBand(...))` (moss/ochre/terracotta) with `tracksViewChanges={false}`, a collapsible
   legend; `MapView`'s `showsUserLocation` replacing the custom current-position `Marker`.
7. **Remediation sweep (criterion 5)**: DS-13 (`JS_TAB_BAR_STYLE` safe-area-driven), HOME-06
   (tappable `expo-image` avatar), LIST-07 (Home's failed-alert message threads
   `last_sync_error_code`), DET-03/04 (native "…" menu: Renommer/Partager/Supprimer), DS-11 second
   pass if not already covered by batch 1-2's new surfaces.
8. **Docs & close-out**: `09-VALIDATION.md`, `ROADMAP.md` checkbox + progress table, final full gate,
   PR.
