---
phase: 21-interface-finishing
status: complete
completed: 2026-09-28
---

# Phase 12 — Interface Finishing: Validation

All 3 ROADMAP success criteria met, across 7 batches (see `21-CONTEXT.md` and `12-0N-SUMMARY.md`).

1. **`light`/`dark` themes exist on the same semantic tokens through `useBrandTheme()`, defaulting
   to `automatic`, covering every screen in the app.** `mobile/src/app/theme.ts` resolves the app's
   theme mode (persisted in `local_meta`, picked in Settings' new "Apparence" section) against
   `useColorScheme()` for "automatic". Every file across the app that read a color depending on
   light/dark (canvas, panel, text, dividers, field state, status-soft fills, and everything derived
   from them) now calls `useBrandTheme()` instead of a static token — `ui/` primitives, every
   screen directory (`survey-form/`, `survey-detail/`, `survey-list/`, `home/`, `account/`,
   `auth-gate/`, `onboarding/`, `public-map/`), the navigation stacks and tab configuration,
   `App.tsx`/`AppNavigation.tsx` themselves (status bar style, `NavigationContainer` theme). `npm
   run typecheck` is the completeness proof here: the now-theme-owned color exports were deleted
   from `brand-tokens.ts` outright, so any missed call site would still be a compile error — the
   whole monorepo typechecks clean. `app.json`'s `userInterfaceStyle` is `"automatic"`.
2. **Floating map and card controls use `expo-blur` instead of a flat `rgba` fill; parcel selection
   uses a `formSheet` with detents instead of a full-screen modal.** New `ui/GlassSurface.tsx` (blur
   + tint, theme-aware or fixed-dark per its `tone` prop) and a matching `AppCard` `glass` prop
   replace the `brandTranslucentPanel`/`heroScrimOnDark` flat fills on: Explorer's tiered sheet
   background, the map's badges/icon buttons/filters panel/legend/empty-dock bubble, the offline
   areas sheet, the basemap toggle, and the parcel map's floating buttons/top bar/bottom sheet
   (inline and fullscreen). The `surveyParcels` navigator route (`SurveyParcelSelectionScreen`) now
   presents as `presentation: "formSheet"` with two detents (`0.62`, `0.94`) instead of a full-width
   stack push.
3. **Survey-detail history renders as an icon timeline with pull-to-refresh and a loading skeleton.**
   `EventsTab.tsx` (the "Historique" tab) renders one colored, iconed dot per event on a connected
   rail instead of plain text rows; `SkeletonRow` (Phase 4) covers the first load; a `RefreshControl`
   on the screen's own scroll view, active only on this tab, reloads the same way the existing
   manual "Recharger" button does.

**Explicit carve-out**: the audit's "Ma saison" gamification module (HOME-07) was not built — see
`21-CONTEXT.md` and the ROADMAP's own scope decision.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green at every
batch. `npm run test:coverage:mobile` (the actual `unit-mobile` CI gate, stricter than the plain
unit-test run — its per-directory coverage floors caught two under-covered branches this phase's own
new code introduced, in `AppNavigation.tsx` and `theme.ts`, both closed with dedicated tests) green
at phase close — 149 suites, 1656 tests. `npm run test:unit` (ibp-domain + api + mobile) and `npm run
format:check` at the repo root both green.

## Known gap

No iOS/Android simulator or display in this cloud session — see `21-CONTEXT.md` for how visual
confidence was built without one (WCAG contrast check, light-theme-output-preserving conversion
verified by the unchanged unit suite, `expo-blur`/native-stack `formSheet` used per their documented
API shapes). A first on-device look at this phase's result — and at the whole dark-mode pass — is
still owed before it's considered field-ready, folded into Phase 13's on-device verification pass,
same as the equivalent gap Phases 7, 8 and 9 each recorded for their own UI work.

## Deliberate scope decisions

See `21-CONTEXT.md` for the full list: the static/dynamic color split and its WCAG-checked dark
palette, `useBrandTheme()`'s non-throwing default, the formSheet target (`SurveyParcelSelectionScreen`,
not `ParcelMapModal`), the DET-05 target (`EventsTab.tsx`, not `HistorySection.tsx`), and the
pull-to-refresh/skeleton placement.
