---
phase: 13-visual-foundations-motion
status: executing
created: 2026-09-27
---

# Phase 4 — Visual Foundations & Motion: Context

Source: `docs/design/ux-ui-audit-2026-09.md` §3.4 (DS-01..DS-16), §4 (motion system), §5 (tokens),
§7 Lot 2. ROADMAP success criteria: `.planning/ROADMAP.md` "### Phase 4: Visual Foundations &
Motion (INSERTED, UX audit Lot 2)".

This session executes the phase directly (single agent, no orchestrator/executor split), following
the pattern set by Phase 3 (`.planning/phases/12-field-entry-ergonomics/`): batches, each gated by
`npm run lint && npm run typecheck && npm run test:unit && npm run format:check`, closed with a
`04-0N-SUMMARY.md`.

Before writing any code, a sketchboard (interactive HTML mock, not shipped) was published to an
Artifact and iterated on with the product owner, since this phase is almost entirely visual. Three
decisions came out of that session on 2026-09-27 and are binding for the rest of this phase:

## Decisions from the sketchboard session (owner-approved, 2026-09-27)

1. **Font stand-in: Sora + Jost, not Plus Jakarta Sans.** Neither Mazzard H (no licence yet) nor
   Avenir Next (Apple-proprietary, not redistributable, absent on Android) can legally be embedded
   via `expo-font`. Two OFL-licensed candidates were sketched; the owner picked **Sora** (stand-in
   for the Mazzard H "title"/"body" families) and **Jost** (stand-in for the Futura "meta" family,
   already explicitly modeled on the same geometric-sans tradition as Futura). This is a temporary
   brand substitution, reversible the day Mazzard H is licensed — both `brandFontFamilies` and the
   charter spec record the real target names alongside the stand-in actually loaded.
2. **IBP badge contrast: forest text on sage background, not white on moss.** Fixes DS-01 (2.85:1 →
   5.03:1). The saturated moss stays in use elsewhere (progress ring, filled pill) — this only
   changes where body text sits directly on a saturated fill.
3. **Press spring: keep the audit's numbers unchanged.** `press` = damping 18 / stiffness 420 /
   mass 0.6, as specified in `ux-ui-audit-2026-09.md` §4. No adjustment requested after trying it
   live in the sketch.

## Font sourcing and file mapping

Real Sora/Jost `.ttf` files (OFL-licensed) were extracted from the `@expo-google-fonts/sora` and
`@expo-google-fonts/jost` npm packages (used only as a source of the actual binaries, then
uninstalled — the app embeds the files directly via the `expo-font` config plugin, not the
`useFonts()` async hook, so there is no flash of the system font before the app's first paint).
Files live in `mobile/assets/fonts/`, alongside each family's `OFL-*.txt` licence text.

`brandTypography` role → embedded file (weights chosen from what Sora/Jost actually ship — Sora has
no 900 cut, so roles asking for 900 use its heaviest, 800 ExtraBold):

| Role | Family (charter target) | File used |
|------|--------------------------|-----------|
| `heroTitle`, `sectionTitle` | title (Mazzard H) | `Sora_800ExtraBold` |
| `heroBody`, `sectionBody` | body (Mazzard H) | `Sora_500Medium` |
| `label`, `button` | body (Mazzard H) | `Sora_800ExtraBold` / `Sora_700Bold` (button) |
| `input` | body (Mazzard H) | `Sora_600SemiBold` |
| `heroEyebrow`, `meta` | meta (Futura) | `Jost_600SemiBold` |
| accent (HeadTurn Smooth, rarely used) | falls back to title stand-in | `Sora_800ExtraBold` |

A global default (`Text.defaultProps.style`, applied once in `App.tsx`) covers any `<Text>` that
does not spread a `brandTypography` role, so no screen is left rendering in the OS default face —
this is the only place in the codebase that touches `Text.defaultProps`; it is a known, narrow
pattern for a global font default in React Native, not a general precedent for defaultProps use.

## Other scope decisions

- **Hex/rgba migration scope**: the audit's "125 colors" count is from before Phase 3 landed;
  re-measured on this branch it is 119 occurrences across 21 files outside `brand-tokens.ts` (mostly
  `*.styles.ts` files for survey-detail header/media, public-map, parcels, survey-form header). All
  119 are migrated in this phase — the ESLint rule (criterion 2) only holds if there is nothing left
  for it to legitimately flag.
- **`onDark.*` and `map.*` naming**: `brandMapTokens` already exists from Phase 3 (`parcelSelected`,
  `parcelStudied`, `parcelNeutral`, `userLocation`); this phase does not rename it to `map.*` (a
  breaking rename with no functional benefit) but does add any additional map-context colors the
  hex migration surfaces (e.g. public-map system-pin/backdrop colors) under it. New dark-surface
  colors are added as `brandOnDark` (the codebase's existing convention is flat token objects named
  `brandXxx`, not nested namespaces — `onDark.*` in the audit text is descriptive, not a literal
  path requirement).
- **Collapsible headers in scope for the Reanimated migration (DS-07)**: `useWizardScroll.ts`,
  `FormHeader.tsx`, `SurveyListScreen.tsx`'s header collapse, `ListHero.tsx`, and
  `AppCollapsibleSection.tsx` / `AccountSettingsRows.tsx`'s `LayoutAnimation` calls. `TypewriterSplash`,
  `HeroSection.tsx` and `AuthGateScreen.tsx`'s `Animated` usage are pre-existing entrance effects, not
  "legacy collapsible headers" the criterion names — left as-is unless they block the shared
  `brandMotion` token adoption for durations/easings (in which case only their duration/easing
  constants move onto `brandMotion`, not a full Reanimated rewrite).
- **UI verification**: this is a cloud session with no iOS/Android simulator or display. Visual
  verification for this phase happens through (a) the sketchboard Artifact iterated live with the
  product owner before code changes, and (b) `npm run test:unit` / `expo-doctor` / typecheck as
  correctness (not appearance) gates. This is stated plainly per `CLAUDE.md`'s UI-testing guidance
  rather than claimed as verified-in-app.

## Batches

1. Fonts: `expo-font` config plugin, embedded Sora/Jost files, `brandFontFamilies`/`brandTypography`
   wiring, global `Text` default.
2. Color tokens: extend `brand-tokens.ts` (`onWarningSurface`, `onDangerSurface`, `onSuccessSurface`,
   `brandOnDark`, map additions, badge contrast fix), migrate all 119 hex/rgba occurrences, add the
   ESLint rule.
3. Motion tokens + `ui/feedback.ts`: `react-native-reanimated` 4, `brandMotion` (durations, easings,
   springs), semantic haptics wrapper.
4. `AppPressable` primitive; migrate `DraftCard`, `ParcelNearbyCard`, `AppButton`.
5. Collapsible header migration to `useAnimatedScrollHandler` (DS-07); `LayoutAnimation` → Reanimated
   layout transitions respecting `useReducedMotion`.
6. `Skeleton` / `SkeletonRow` pulse component, replacing static loading placeholders.
7. Charter spec update, ROADMAP update, final gate, PR.
