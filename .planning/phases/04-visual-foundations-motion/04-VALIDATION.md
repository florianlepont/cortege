---
phase: 04-visual-foundations-motion
status: complete
completed: 2026-09-27
---

# Phase 4 — Visual Foundations & Motion: Validation

All 6 ROADMAP success criteria met, across 5 batches (see `04-CONTEXT.md` and `04-0N-SUMMARY.md`).

1. **Typefaces load through `expo-font`; no OS default face.** Sora + Jost (OFL) embedded via
   `mobile/app.json`'s `expo-font` plugin, wired into `brandTypography`, with `AppText` as the
   app-wide default (batch 1).
2. **125 hex/rgba colors gone, replaced by semantic tokens; ESLint rule enforces it.** 119
   occurrences (re-measured on this branch) migrated; ESLint's `no-restricted-syntax` rejects a new
   one outside `brand-tokens.ts` (batch 2).
3. **`react-native-reanimated` 4 + `expo-haptics` back `brandMotion` and `ui/feedback.ts`; legacy
   `Animated`/`LayoutAnimation` in the collapsible headers migrated.** `brandMotion` (durations,
   easings, springs, stagger) added as plain tokens; `ui/feedback.ts` is the one place the app calls
   haptics (batch 3). The wizard header and survey-list hero moved to
   `useSharedValue`/`useAnimatedScrollHandler`/`useAnimatedStyle`; `LayoutAnimation` removed from
   `AppCollapsibleSection`/`AccountSettingsRows` in favor of `LinearTransition`/`FadeIn`/`FadeOut`
   (batch 4).
4. **`AppPressable` is the single pressable primitive.** Spring scale, Android ripple, required
   `accessibilityLabel`; migrated into `AppButton`, `DraftCard`, `ParcelNearbyCard` (batch 3).
5. **`Skeleton`/`SkeletonRow` pulse; animations/loops respect Reduce Motion and pause in the
   background.** Wired into Home's nearby-parcels loading state; the auth screen's decorative blob
   loop now pauses on `AppState` background (batch 5).
6. **Charter spec updated.** `docs/design/charte-graphique-etats-sauvages-spec.md` §12 documents the
   typefaces actually loaded, the full semantic token list, `brandMotion`, and `AppPressable`'s
   interaction spec.

## Process note

This phase is almost entirely visual, so before any code was written a sketchboard (an interactive
HTML mock, not shipped code) was published and iterated on live with the product owner. Three
decisions came out of that session and are binding throughout `04-CONTEXT.md` and every batch: Sora +
Jost over an alternative pairing, the IBP badge's forest-on-sage contrast fix (and the same fix
applied consistently to every other white/ochre/terracotta-on-soft pair the audit's contrast table
flagged), and the press spring's numbers left unchanged.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — green at every
batch and again at phase close: 105 suites, 1342 tests, zero lint/type errors, clean formatting.

## Known gap

No iOS/Android simulator or display in this cloud session. Visual confidence for this phase comes
from (a) the sketchboard, checked live with the product owner before writing the corresponding code,
and (b) lint/typecheck/tests as correctness (not appearance) gates. This is stated per `CLAUDE.md`'s
UI-testing guidance rather than claimed as verified-in-app — a first on-device look at this phase's
result is still owed before it's considered field-ready, same as any other UI phase in this
milestone.

## Deliberate scope decisions (see `04-CONTEXT.md` for full detail)

- `brandMapTokens` was not renamed to a nested `map.*` namespace (the audit's own shorthand, not a
  literal path requirement) — new map-context colors were added to the existing flat
  `brandMapTokens` object instead, consistent with this codebase's flat-token-object convention.
  Same for `onDark.*`: extended as flat `heroXOnDark` keys on the existing `brandSemanticColors`.
- The public map's pin colors were tokenized as-is, not redesigned to score-band markers — that
  redesign (MAP-03) is Phase 9's job.
- `TypewriterSplash.tsx`'s cursor-blink loop was left without a background-pause listener: it's a
  few-second, once-per-cold-start sequence, not a persistent ambient loop.
- `AuthGateScreen.tsx`/`HeroSection.tsx`/`TypewriterSplash.tsx`'s legacy `Animated` entrance effects
  were not ported to Reanimated — DS-07 names the *collapsible headers'* `useNativeDriver: false`
  usage specifically; these are splash/entrance effects already on `useNativeDriver: true` (UI
  thread), so porting them carried rewrite risk for no named criterion.
