---
phase: 18-onboarding-explorer-polish
status: complete
completed: 2026-09-27
---

# Phase 9 — Onboarding & Explorer Polish: Validation

All 4 ROADMAP success criteria met, plus the task's criterion 5 remediation sweep, across 7
batches (see `18-CONTEXT.md` and `09-0N-SUMMARY.md`).

1. **A three-screen carousel (ten factors · offline · member map) runs before login on first
   launch, followed by a permissions-priming screen for location and camera with a link to
   Settings on refusal; "already seen" is persisted.** `OnboardingFlow` composes
   `OnboardingCarouselScreen` → `PermissionsPrimingScreen`; the "seen" flag lives in `local_meta`
   via `onboarding-preference.ts`, mirroring the existing `map-preference.ts` pattern (batch 2).
2. **The Expo splash and adaptive icon are configured natively, so no default Expo splash flashes
   before `TypewriterSplash`.** `expo-splash-screen` plugin config in `app.json` plus
   `preventAutoHideAsync`/`hideAsync` in `App.tsx` (batch 3).
3. **Explorer's floating panels become a tiered native sheet (2–3 detents) instead of
   absolutely-positioned cards; filters are immediate chips (period, region, "my surveys") instead
   of free-text fields and an "Apply" button, with an active-filter count and a reset action.**
   `ExplorerSheet` (`@gorhom/bottom-sheet`, 2 detents, batch 5) hosts the parcel-history/cluster-list/
   selected-survey content that used to be three separate cards; `ExplorerFilterBar`'s period/
   region/mine-only chips apply immediately on tap, with a count and reset link (batch 4).
4. **Map markers show the survey's score band (moss/ochre/terracotta) with a legend, instead of a
   single off-brand system pin color; the user's position uses the native `showsUserLocation` halo
   instead of a custom marker.** `SurveyMarker` colors by `bandTone(totalBand(ibpTotal))`,
   `ScoreLegend` is a collapsible legend, and `MapCanvas` uses `showsUserLocation` with the custom
   current-location marker removed (batch 6).
5. **Remediation sweep** (the task's explicit additional scope, not a numbered `ROADMAP.md`
   criterion): DS-05 (12pt floor, per-role `maxFontSizeMultiplier` caps), DS-10 (`brandSpacing`
   4-grid already existed; added the elevation and badge-radius tokens), DS-11 (`BrandHighlight` on
   new/touched surfaces), DS-13 (safe-area-driven JS tab bar), DET-03/DET-04 (native "…" survey
   detail menu replacing tap-to-rename and equal-weight action buttons), HOME-06 (tappable profile
   avatar on Home), LIST-07 (failed-sync error code threaded into Home's alert; the "+N autres"
   link half is moot per Phase 7's card removal), and ACC-02 (Phase 1.2's logout confirmation
   re-verified, not rebuilt) — see `18-07-SUMMARY.md`.

Sign-in-with-Apple (ONB-04) was explicitly out of scope for this phase (deferred to Phase 2,
criterion 7, per `ROADMAP.md`).

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` green at every
batch. `npm run test:coverage:mobile` (the actual `unit-mobile` CI gate, stricter than the plain
unit-test run: its per-directory coverage thresholds caught several newly-added, never-invoked
branches/functions across the phase) also green at phase close — 144 suites, 1623 tests.

## Known gap

No iOS/Android simulator or display in this cloud session. Visual confidence for the carousel,
splash, tiered sheet, chip row and score markers comes from following the audit's own
recommendation text closely (component shapes, copy, iOS conventions), the Pillow-verified
adaptive-icon safe area, and lint/typecheck/tests as correctness (not appearance) gates, per
`CLAUDE.md`'s UI-testing guidance — stated rather than claimed as verified-in-app. A first
on-device look at this phase's result is still owed before it's considered field-ready (see also
Phase 8's and Phase 7's same known gap, and Phase 13's on-device verification pass).

## Deliberate scope decisions (see `18-CONTEXT.md` for full detail)

- "Visibilité" is absent from the DET-03/04 survey-detail menu — Phase 2 removed the private/public
  control from the app entirely, and Phase 10 re-verified that removal; this phase does not bring
  it back.
- DS-05's `maxFontSizeMultiplier` work is a capped default plus explicit per-role overrides, not a
  full retrofit of every existing text call site.
- DS-11 (`BrandHighlight`/`BrandBump`/`BrandFern`) lands only on the surfaces this phase touches,
  not as a sweep across the whole app.
- The Explorer tiered sheet uses `@gorhom/bottom-sheet`, not React Navigation's `formSheet` API.
- Filters stay a separate chip row above the map rather than folding into the Explorer sheet.
- The region filter is a 3-way chip (ACA / M / all), matching the domain's `REGION_VERSIONS`.
- The native splash is not pixel-identical to `TypewriterSplash`'s exact logo position — it only
  needs to avoid the default-Expo-splash flash the criterion names.
- LIST-07's "+N autres" link half is moot (Phase 7 removed the card it lived on); only the
  error-code-threading half was live work.
