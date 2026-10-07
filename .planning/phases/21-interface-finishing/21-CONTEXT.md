---
phase: 21-interface-finishing
status: executing
created: 2026-09-28
---

# Phase 12 — Interface Finishing: Context

Source: `docs/design/ux-ui-audit-2026-09.md` §3.4 (DS-12, DS-15), §3.2 (DET-05) and §7 Lot 5 (minus
the gamification item). ROADMAP success criteria: `.planning/ROADMAP.md` "### Phase 12: Interface
Finishing". Depends on Phase 7 (Information Architecture) and Phase 9 (Onboarding & Explorer
Polish), both merged — this is the last phase touching these screens before Phase 13 (Field
Validation), so the dark-mode pass and the Liquid Glass pass are both built as the final, permanent
version rather than something provisional.

**Carve-out**: the audit's "Ma saison" gamification module (HOME-07, points/badges/next-reward
teaser) is Epic F, deferred to the next milestone per the ROADMAP's own scope decision, and stays
out even though the rest of this Lot is in MVP scope. No gamification code was added in this phase.

## Cross-phase coordination

No other MVP phase ran in parallel (per the task brief). `origin/main` is pulled and merged before
opening the PR.

## Scope decisions (resolving ambiguity the audit/ROADMAP text leaves open)

- **DS-12's static/dynamic color split.** `brand-tokens.ts`'s color exports split into two groups:
  theme-invariant brand hues (`terracotta`, `moss`, `forest`, `sage`, `mauve`, `ochre`, `salmon`,
  `white`, `black`, plus the already-dark-pinned `forestNight`/`disabledMuted`/`disabledNeutral`),
  which stay a plain `brandColors` export; and the neutrals that actually invert between light and
  dark (`canvas`, `panel`, `surfaceSoft`, `panelMuted`, `warningSoft`, `inputFill`, `inputBorder`,
  `divider`, `textPrimary`, `textSecondary`, `successSoft`, `errorSoft`), which moved to
  `mobile/src/app/theme.ts` and are resolved through `useBrandTheme().colors`. Every color group
  derived from these neutrals (`brandSemanticColors`, `brandFieldState`, `ibpScoreTokens`, and the
  color fields of `brandComponentTokens` — `statusChip`/`choiceChip`/`surveyList`/`notice` in full,
  plus the color fields of `button`/`card`/`field`) moved the same way; the dimension fields of
  `brandComponentTokens` (`minHeight`, paddings, `iconOnlySize*`, `gap`) stayed static, since they
  never change with the theme. `white` itself stays static rather than moving: most of its ~70 call
  sites are icon/text color on an already-colored or already-dark control (an active filled chip, a
  map control on a dark scrim), not a card surface — the few that meant "elevated card background"
  now read `theme.semanticColors.surfaceElevated` instead. The "hero-on-dark" family
  (`heroBodyOnDark`, `heroTextMutedOnDark`, `heroSurfaceOnDark`, …, `haloOnDark`) also stayed static,
  renamed to `brandOnDarkColors`: it is a fixed glass-over-a-permanently-dark-forest-hero treatment
  (the survey-detail header, the auth screen), not a function of the app's own theme. `brandMapTokens`
  (parcel polygon colors), `brandOnDarkStatus` and `brandTranslucentPanel` stayed static for the same
  reason. This mechanical rule — the exact old-export-to-new-access-path mapping — is what let the
  ~90-file sweep run as several independent, disjoint batches without cross-talk.
- **The dark palette is forest-based**, per the audit's own note that the forest hue and the existing
  `heroTextMutedOnDark` (`#D7E3C0`) already give the app a plausible dark base: canvas reuses
  `brandColors.forestNight` (`#0E2210`), text reuses that same warm off-white/sage family the hero
  panels already use. Every light/dark pair was checked against WCAG 2.1 (a small script, not
  committed): text pairs are all ≥ 7:1 (AA needs 4.5:1); the dark `inputBorder`/`inputFill` pair is
  3.56:1 (DS-14's own ≥ 3:1 non-text floor, matching the light theme's own 3.60:1 within rounding).
- **`useBrandTheme()` never throws outside a provider** — it returns a light/"automatic" default
  theme instead, unlike `useStatus()`/`useSession()`'s "must be used inside AppStateProvider"
  pattern. Nearly every styled file in the app now calls this hook (that is the whole point of the
  phase), including hundreds of existing component tests that render a screen or a `ui/` primitive
  in isolation with no wrapping provider; a hard throw there would have broken the entire existing
  test suite. The real app always mounts `BrandThemeProvider` in `App.tsx` (outside
  `AppStateProvider`, since theme has no dependency on session/sync state and needs to be available
  before auth resolves, e.g. on the auth screen itself).
- **Theme mode persists to `local_meta`** (`mobile/src/storage/theme-preference.ts`), the same
  key/value table `map-preference.ts`/`onboarding-preference.ts` already use, read back on the next
  launch. The picker lives in `SettingsScreen.tsx` as a new "Apparence" section (three `AppChoiceChip`
  choices: Automatique / Clair / Sombre) — Settings, not the Compte grouped list, since it already
  hosts every other app-level preference (sync, dev tools).
- **`app.json`'s `userInterfaceStyle` changed from `"light"` to `"automatic"`** — required for
  `useColorScheme()` to ever report the device's own dark-mode setting; the app's own theme
  provider then does its own automatic/light/dark resolution on top of that OS value.
- **DS-15's floating-control blur is a new shared primitive, `ui/GlassSurface.tsx`**, wrapping
  `expo-blur`'s `BlurView` plus a translucent tint overlay, with a `tone` prop: `"auto"` (default)
  follows the app's own theme, for a panel floating over ordinary app chrome (Explorer's tiered
  sheet, the map's badges/filter panel/legend, the offline-areas sheet); `"dark"` stays dark glass
  regardless of the app theme, for a control floating directly over a map or a photo (the parcel
  map's floating buttons) — that backdrop doesn't invert with the theme, so its glass shouldn't
  either, matching the fixed dark treatment `brandOnDarkColors`/`brandMediaBackdrop` already use on
  those same surfaces. `AppCard` grew a matching `glass` boolean prop (ignores `variant`, delegates
  its background to `GlassSurface`) so panel-shaped floating cards (`OfflineAreasSheet`, the map's
  filters panel and empty-dock bubble, `SurveyParcelSelectionScreen`'s bottom sheet) don't duplicate
  the wrapping by hand. `expo-blur` was already installed (audit's own note); a `expo-blur.mock.ts`
  jest mock was added since no test in this codebase had exercised it yet.
- **DS-15's tiered sheet keeps `@gorhom/bottom-sheet` (Phase 9's own choice) and gets a blurred
  `backgroundComponent`** instead of being rebuilt: `ExplorerSheet.tsx`'s flat `brandColors.panel`
  fill became a custom `SheetBackground` that layers `expo-blur`'s `BlurView` under the sheet's
  existing shape (radius, handle). No architecture change, matching Phase 9's own precedent for why
  this sheet isn't a `formSheet` (its panels are persistent overlays on the same screen as the map,
  which a routed formSheet screen can't be).
- **DS-15's formSheet target is `SurveyParcelSelectionScreen`'s navigator route (`surveyParcels`),
  not `ParcelMapModal`'s inline fullscreen map.** Two "parcel map" surfaces exist: the `surveyParcels`
  stack screen (`SurveyParcelSelectionScreen`, named "parcel selection" throughout the codebase —
  the file name, its own i18n namespace `fr.parcelSelection`) used both from the wizard and from
  editing an existing survey's parcels; and `ParcelMapModal.tsx`, a plain React Native `<Modal
  presentationStyle="fullScreen">` used as the wizard's own "view larger map" zoom-in, embedded
  inside `SurveyFormScreen`. The ROADMAP text ("parcel selection uses a formSheet with detents
  instead of a full-screen modal") names the React Navigation native-stack `presentation: "formSheet"`
  + `sheetAllowedDetents` API by its own terminology, and matches the `surveyParcels` route by name
  far more closely than the modal component — that route's `SurveysStack.Screen` options now carry
  `presentation: "formSheet"`, `sheetAllowedDetents: [0.62, 0.94]`, `sheetInitialDetentIndex: 1`,
  `sheetGrabberVisible: true`. `ParcelMapModal.tsx` was not restructured into a routed screen (it
  would need its state, param-passing and completion callback moved through navigation, a much
  larger change for one wizard sub-step); its floating controls got the DS-15 glass treatment
  (`GlassSurface`) instead, as a "floating map/card control" in its own right, independent of the
  formSheet criterion.
- **DET-05's target is `EventsTab.tsx`, not `HistorySection.tsx`.** Survey-detail has two
  history-shaped surfaces: the "Historique" tab (`fr.surveyDetail.tabs.events`, rendered by
  `EventsTab.tsx`) — the survey's own audit log (created/submitted/synced/…) — and
  `HistorySection.tsx`, a "previous submitted surveys on this parcel" panel embedded in the Résumé
  tab, unrelated to the tab literally called "Historique". DET-05's finding ("Historique en texte
  brut, sans timeline") and the ROADMAP's "survey-detail history" both point at the tab actually
  named that; `HistorySection.tsx` stays untouched beyond the mechanical theme conversion every
  survey-detail file got.
- **The pull-to-refresh lives on `SurveyDetailScreen`'s own `ScrollView`**, not inside `EventsTab`
  itself (`EventsTab` isn't independently scrollable — it renders inside the screen's single outer
  `ScrollView`, `SummaryTab`/`EventsTab`/`DebugTab` swapped by tab). The `RefreshControl` is only
  attached while the Historique tab is active, calling the same `onLoadSurveyEvents` the tab's
  existing manual "Recharger" button already used; the manual button stays (an explicit affordance a
  pull gesture doesn't replace for accessibility, and existing tests rely on it).
- **The loading skeleton (`SkeletonRow`, Phase 4) covers only the first load — an empty event list
  while `isLoading`.** A pull-to-refresh of an already-populated timeline keeps showing the existing
  rows; the `RefreshControl`'s own native spinner is the loading signal for that case, matching how
  a skeleton is meant to stand in for content that doesn't exist yet, not to interrupt content
  that's already on screen.
- **`FactorDetailScreen.tsx`'s and `SurveyDetailScreen.tsx`'s prop types/styles were extracted to
  sibling files** (`factor-detail.styles.ts`, `survey-detail/screen-props.ts`) purely to clear the
  repo's own 400-line file-size structure gate after the theme-hook and pull-to-refresh additions —
  no behavior change, matching the existing co-located `*.styles.ts` convention this codebase
  already uses everywhere else.

## Known gap

No iOS/Android simulator or display in this cloud session, same known gap Phases 7, 8 and 9 recorded.
Visual confidence for the dark palette, the blur treatment and the formSheet detents comes from the
WCAG contrast check, the mechanical light-value-preserving conversion (light-theme output is
byte-for-byte the same as before the sweep, verified by the unchanged 1656-test unit suite), and
`expo-blur`/native-stack `formSheet` being used exactly per their own documented API shapes — stated
rather than claimed as verified-in-app, per `CLAUDE.md`'s UI-testing guidance. A first on-device look
at this phase's result is still owed before it's considered field-ready, same as the prior phases'
own gap, folded into Phase 13's on-device verification pass.
