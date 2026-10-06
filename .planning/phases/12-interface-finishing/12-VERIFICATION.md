---
phase: 12-interface-finishing
verified: 2026-10-06T00:00:00Z
status: human_needed
score: 2/3 must-haves verified as written; 1 satisfied differently (formSheet half of criterion 2 superseded by Phase 12.1)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Accept or amend ROADMAP success criterion 2 of Phase 12: 'parcel selection uses a formSheet with detents instead of a full-screen modal'"
    expected: "Either record an override in this file (suggested block below) or reword the criterion to 'parcel selection is one full-screen glass map with a transparent header and a bottom panel'"
    why_human: "The code no longer matches the literal criterion. The owner replaced the formSheet with a full-screen map in Phase 12.1 (OA-91, OA-97, owner-confirmed on the phone 2026-10-06). Only the owner can accept that deviation; the verifier cannot invent an acceptance."
---

# Phase 12: Interface Finishing Verification Report

**Phase Goal:** The remaining audit findings that don't block a field test (dark mode, fuller use of Liquid Glass, a real history view) are closed before the app is judged in the field.
**Verified:** 2026-10-06
**Status:** human_needed (no code gap; one criterion superseded and awaiting the owner's formal acceptance)
**Re-verification:** No, initial verification (the phase closed on 2026-09-28 with a VALIDATION.md only)

Phase 12.1 redesigned much of what Phase 12 built, so each criterion below was checked against the code as it is on this branch, not as the 12-0N summaries describe it.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `light`/`dark` themes exist on the same semantic tokens through `useBrandTheme()`, defaulting to `automatic`, persisted and picked in Settings | VERIFIED | `mobile/src/app/theme.ts` (478 lines) defines `lightNeutrals` and `darkNeutrals` over the same `BrandDynamicNeutrals` shape, `BrandThemeMode = "light" \| "dark" \| "automatic"`, `BrandThemeProvider` (resolves `automatic` against `useColorScheme()`, loads the saved mode in an effect, saves on `setMode`) and `useBrandTheme()`. `mobile/src/storage/theme-preference.ts` stores key `theme_mode` in `local_meta` and defaults to `automatic` on a missing value, an invalid value or a storage failure. `mobile/App.tsx:157` mounts `BrandThemeProvider` around the tree. `mobile/app.json:5` has `"userInterfaceStyle": "automatic"`. `SettingsScreen.tsx:93-115` renders the "Apparence" section (`fr.settings.appearance.title`) with one chip per mode calling `theme.setMode(mode)`. `useBrandTheme` is called from 108 files under `mobile/src`. The dark palette is no longer the forest-based one the phase shipped: Phase 12.1 (OA-80) replaced it with the "Graphite" near-black palette (canvas `#08090A`, panel `#111214`, green kept as accent), so the criterion holds on the same token mechanism with a different palette. Tests run here and passing: `theme.test.ts`, `theme-preference.sqlite.test.ts` (5 suites, 29 tests in all with the ones below). Owner validation on the phone, light and dark: OA-34, OA-80 to OA-83 closed "Owner validated on the phone (clean install) 2026-09-29" in `docs/user-tests/owner-acceptance.md`. |
| 2 | Floating map and card controls use `expo-blur` or `expo-glass-effect` instead of a flat `rgba` fill; parcel selection uses a `formSheet` with detents instead of a full-screen modal | Glass half VERIFIED; formSheet half SUPERSEDED (see below) | Glass: `mobile/src/ui/GlassSurface.tsx` uses `GlassView` from `expo-glass-effect` when `isLiquidGlassAvailable()` (iOS 26 and later) and otherwise `BlurView` from `expo-blur` plus a 0.38 alpha tint; both packages are in `mobile/package.json` (`expo-blur ~57.0.3`, `expo-glass-effect ~57.0.4`). It follows the theme scheme through `useBrandTheme()` and offers `tone="dark"`. It is used by `public-map/MapChips.tsx`, `MapControls.tsx`, `ScoreLegend.tsx`, `AppCard` (`glass` prop), `OfflineMapPrompt`, `home/NearbyMapCard.tsx`, `survey-form/FactorLetterStrip.tsx`, the account cards and navigation header items. `GlassSurface.liquid.test.tsx` passes here. formSheet: `grep -rn "formSheet\|sheetAllowedDetents" mobile/src` finds no non-test use. In `navigation/stacks/SurveysStack.tsx` the `surveyParcels` route is `presentation: "card"` with a transparent header on iOS and the screen draws its own glass controls. That is the Phase 12.1 redesign: OA-91 ("same glass controls as the Explorer, header transparent over a full-size map") and OA-97 (edit parcels is the same full-screen map), both closed with "Owner confirmed on the phone 2026-10-06 (phone pass 2, main at 4419590)". So the underlying intent (no flat, dated parcel-selection modal; the new glass treatment) is met, and by a design the owner chose and validated, but not by a `formSheet` with detents. |
| 3 | Survey-detail history renders as an icon timeline with pull-to-refresh and a loading skeleton, instead of plain text | VERIFIED (relocated) | `mobile/src/screens/survey-detail/EventsTab.tsx` renders one dot per event on a connected rail (`timelineRail`, `timelineDot`, `timelineConnector`), the dot background and `Ionicons` glyph coming from `event-icons.ts` (`eventVisual`, a tone per known event type, a generic fallback for unknown types, never a raw lookup). It shows `SkeletonRow` x3 while `isLoading && events.length === 0` and an empty-state text otherwise. Since Phase 12.1 (OA-46) the timeline lives on its own sub-page, `SurveyHistoryScreen.tsx`, which wraps `EventsTab` in a `ScrollView` with `RefreshControl` (`onRefresh` reloads `onLoadSurveyEvents`, `refreshing` bound to the loading state) and then `HistorySection` for earlier surveys of the parcel. It is the only consumer of `EventsTab`. The criterion text still names "Survey-detail history", which is now the `surveyHistory` page reached from the detail; behavior is as required. `EventsTab.test.tsx` and `event-icons.test.ts` pass here. |

**Score:** 2/3 truths verified as written; criterion 2 is met in intent and differs in mechanism (formSheet replaced by a full-screen glass map, owner-confirmed).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `mobile/src/app/theme.ts` | Light and dark tokens, provider, hook | VERIFIED | Provider mounted in `App.tsx`; `defaultTheme` fallback outside a provider is a documented choice for tests |
| `mobile/src/storage/theme-preference.ts` | Persistence in `local_meta` | VERIFIED | Best-effort, defaults to `automatic` |
| `mobile/src/screens/SettingsScreen.tsx` ("Apparence") | Mode picker | VERIFIED | Wired to `theme.setMode`; text from the French catalogue |
| `mobile/src/ui/GlassSurface.tsx`, `AppCard` `glass` prop | Blur or Liquid Glass surface | VERIFIED | Used across map, home, account and navigation |
| `mobile/src/screens/survey-detail/EventsTab.tsx`, `event-icons.ts` | Icon timeline with skeleton | VERIFIED | Consumed by `SurveyHistoryScreen` |
| `mobile/src/screens/SurveyHistoryScreen.tsx` | Pull-to-refresh host | VERIFIED | `RefreshControl` present |
| `SurveysStack.tsx` `surveyParcels` as `formSheet` | Detents sheet | SUPERSEDED | Now `presentation: "card"`, see truth 2 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `App.tsx` | `BrandThemeProvider` | wraps the app, outside `AppStateProvider` | WIRED | Line 157 |
| `BrandThemeProvider` | `local_meta.theme_mode` | `loadThemeModePreference` / `saveThemeModePreference` | WIRED | Effect on mount, save in `setMode` |
| `SettingsScreen` | theme | `theme.setMode(mode)` on chip press | WIRED | Line 111 |
| `GlassSurface` | theme scheme | `useBrandTheme().scheme` | WIRED | Chooses dark or light glass and tint |
| `SurveyHistoryScreen` | `EventsTab` | `events={surveyEvents[selectedSurvey.id] ?? []}`, `isLoading` | WIRED | Data comes from `onLoadSurveyEvents`, called on mount and on pull |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `EventsTab` | `events` | `surveyEvents` from the surveys context, filled by `onLoadSurveyEvents` (the survey events endpoint) | Yes, per survey id, reloaded on pull | FLOWING |
| `SettingsScreen` appearance row | `theme.mode` | `BrandThemeProvider` state, loaded from SQLite `local_meta` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Theme, theme persistence, glass surface, timeline and event icons | `npx jest --config jest.unit.config.js` on `theme.test.ts`, `theme-preference.sqlite.test.ts`, `GlassSurface.liquid.test.tsx`, `EventsTab.test.tsx`, `event-icons.test.ts` (in `mobile/`) | 5 suites passed, 29 tests passed | PASS |
| No `formSheet` left in app code | `grep -rn "formSheet\|sheetAllowedDetents" mobile/src` | only tests, none in routes | confirms the superseded status |
| Full lint, typecheck and mobile suite | not re-run here; `12-VALIDATION.md` records 149 suites, 1656 tests green at phase close, and Phase 12.1 has changed the tree since | n/a | SKIP |

### Probe Execution

No probes declared. Step 7c: SKIPPED.

### Requirements Coverage

ROADMAP lists no requirement IDs for Phase 12 ("none yet in `REQUIREMENTS.md`", owner decision 2026-09-27), and none of the 12-0N summaries claims one. Nothing to cross-reference; no orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/src/screens/survey-detail/event-icons.ts` | 17 | Visual entry for the `expired` event type | Info | `expired` events no longer exist since Phase 12.1 OA-41 (migration 019, deadline removed). Harmless: it is a lookup entry for a type that old rows might still carry, and the generic fallback exists anyway |
| `mobile/src/app/theme.ts` | 438 to 446 | `useBrandTheme()` never throws outside a provider | Info | A deliberate, documented choice (keeps the large test suite working); the cost is that a missing provider cannot be detected. `App.tsx` mounts it, so no runtime effect |
| `12-VALIDATION.md`, `12-CONTEXT.md` | n/a | Describe the forest dark palette and the `formSheet` as built | Info | Historical; both were replaced in Phase 12.1 (OA-80, OA-91). The ROADMAP criterion 2 wording is the only place where the stale mechanism is still a stated requirement |

No `TBD`, `FIXME`, `XXX`, `TODO` or `HACK` in `theme.ts`, `GlassSurface.tsx`, `EventsTab.tsx` or `event-icons.ts`.

### Human Verification Required

#### 1. Formal acceptance of the formSheet deviation (criterion 2)

**Test:** Decide whether the full-screen glass parcel map replaces the `formSheet` requirement for good.
**Expected:** If yes, add this to the frontmatter of this file (or reword the ROADMAP criterion):

```yaml
overrides:
  - must_have: "parcel selection uses a formSheet with detents instead of a full-screen modal"
    reason: "Replaced in Phase 12.1 (OA-91, OA-97) by a full-screen map with a transparent header and glass controls, owner-confirmed on the phone 2026-10-06 (phone pass 2)"
    accepted_by: "{owner}"
    accepted_at: "{ISO timestamp}"
```

**Why human:** An override needs the owner's name and decision. Everything else in the phase is already owner-validated on a device (OA-34, OA-68, OA-80 to OA-83, OA-91, OA-97), so no further on-device pass is owed for dark mode or glass. The `12-VALIDATION.md` "known gap" (no simulator in the build session, first on-device look owed) was closed by the Phase 12.1 phone passes.

### Gaps Summary

There are no code gaps. Dark mode (criterion 1) and the history timeline (criterion 3) work as required, on a palette and a screen that Phase 12.1 reworked. The glass half of criterion 2 is in place and widely used. The `formSheet` half no longer exists in the code: the owner's own redesign replaced it with a full-screen glass map, and confirmed that on the phone. That is a deliberate supersession, not a defect, but the ROADMAP text was never updated, so I mark the phase `human_needed` until the owner either records the override above or rewords the criterion.

---

_Verified: 2026-10-06_
_Verifier: Claude (gsd-verifier)_
