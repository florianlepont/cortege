# Batch 5 — Skeleton pulse, decorative loops respect Reduce Motion + background (criterion 5)

## What shipped

- **`ui/Skeleton.tsx`**: `Skeleton` (a single pulsing block) and `SkeletonRow` (a leading block plus
  two lines, shaped like the card rows it stands in for). Pulses opacity 0.5 → 1 over 900ms
  (audit §4's exact numbers) via `withRepeat(withTiming(...), -1, true)`. Renders a fixed 0.75
  opacity instead of pulsing when `useReducedMotion()` is true, and pauses (`cancelAnimation`) /
  resumes the loop on `AppState` background/foreground transitions.
- **Wired into `HomeScreen.tsx`**: the nearby-parcels loading state's two static `panelMuted` boxes
  (LIST-08's "squelette statique sur l'Accueil") are now `SkeletonRow`s. Removed the now-orphaned
  `skeletonCard` style key from `home/styles.ts` — this repo's own `structure.test.ts` fails the
  build on any unused `StyleSheet.create` key across the real source tree, which caught it
  immediately.
- **The app's one ambient decorative loop now pauses in the background**: `auth-gate/HeroSection.tsx`'s
  `Animated.loop`-driven background blobs already respected `useReducedMotion` (checked before
  starting) but never stopped when the app backgrounded. Added an `AppState` listener that gates the
  loop-starting effect on `isForegrounded`, so backgrounding the app now stops it via the effect's
  existing cleanup, and foregrounding restarts it. Left on the legacy `Animated` API rather than
  ported to Reanimated — it already uses `useNativeDriver: true` (UI thread), so it isn't one of the
  `useNativeDriver: false` cases DS-07 names, and porting it carries rewrite risk for no criterion
  this phase asks for.
- **`TypewriterSplash.tsx`'s cursor-blink loop**: deliberately left alone. It's a few-second,
  once-per-cold-start sequence, not a persistent loop a user would have running while backgrounding
  the app — the risk of touching its delicate visual sequencing outweighs the benefit here.

## Jest infrastructure

- `mobile/test/react-native-reanimated.mock.ts`: added `withRepeat`, `cancelAnimation`, and a small
  `Easing` stub (`inOut`, `in`, `out`, `ease`, `linear`, `bezier`, `cubic`, `quad` — all identity
  functions; nothing in this mock ever actually animates, so the real curve shape is irrelevant).
- `AuthGateScreen.test.ts`'s hand-rolled `react-native` mock didn't include `AppState` — adding the
  listener to `HeroSection.tsx` broke it immediately (`Cannot read properties of undefined (reading
  'currentState')`); fixed by adding a minimal `AppState` mock alongside its existing `Animated`/
  `AccessibilityInfo` mocks.
- New `mobile/src/ui/Skeleton.test.tsx`: renders `Skeleton`/`SkeletonRow`, and drives its own
  `AppState` mock through a background→foreground cycle to prove the effect's cancel/restart path
  doesn't throw.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(105 suites / 1342 tests).

## Remaining Phase 4 work

Criteria 1-5 are now code-complete. What's left is criterion 6: updating
`docs/design/charte-graphique-etats-sauvages-spec.md` with the typefaces actually loaded, the full
semantic token list, `brandMotion`, and `AppPressable`'s interaction spec — plus the ROADMAP checkbox
and progress-table row, and a final full-repo gate before opening the PR for review.
