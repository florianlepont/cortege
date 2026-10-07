# Batch 4 — Collapsible headers and LayoutAnimation migrated to Reanimated (DS-07, DS-08)

## What shipped

- **Survey-form wizard header** (`useWizardScroll.ts` / `FormHeader.tsx` / `SurveyFormScreen.tsx`):
  the legacy `Animated.Value` + `Animated.event({ useNativeDriver: false })` scroll tracking is gone.
  `useWizardScroll` now owns a plain `useSharedValue(0)` (`scrollY`) and a
  `useAnimatedScrollHandler`; it no longer precomputes an `animation` object of
  `Animated.AnimatedInterpolation`s (that pattern doesn't translate to Reanimated — `interpolate()`
  has to run inside a worklet, e.g. `useAnimatedStyle`, to be reactive on the UI thread). Instead
  `FormHeader`/`StepRail` receive the raw `scrollY` shared value plus the numeric thresholds
  (`collapseDistance`, `expandedHeroHeight`) and build their own `useAnimatedStyle`s, replicating the
  exact same input/output ranges the legacy code used — a faithful port, not a redesign, since this
  session has no simulator to validate a visual change against.
- **Survey-list hero** (`SurveyListScreen.tsx` / `ListHero.tsx`): same treatment — `scrollY` moves to
  a shared value driven by `useAnimatedScrollHandler`, `Animated.FlatList` now comes from
  `react-native-reanimated`, and `ListHero`'s five `scrollY.interpolate(...)` calls (plus one
  `Animated.add`) become `useAnimatedStyle` + `interpolate(..., Extrapolation.CLAMP)`.
- **`LayoutAnimation` removed** from `AppCollapsibleSection.tsx` and `AccountSettingsRows.tsx`
  (DS-08's `LayoutAnimation` ignores "Reduce Motion" — the audit's own complaint). Replaced with:
  - `AppCollapsibleSection`: `Animated.View` with `layout={LinearTransition.reduceMotion(ReduceMotion.System)}`
    on the root, `entering`/`exiting` (`FadeIn`/`FadeOut`) on the collapsible body, and the chevron
    now rotates 180° via `useAnimatedStyle`/`withTiming` instead of swapping between two Ionicons
    names — matching the audit's own interaction table ("Section repliable: LinearTransition et
    rotation de 180° du chevron"), a small, deliberate behavior improvement over the icon-swap it
    replaces.
  - `AccountSettingsRows`: the email-editor/settings-row swap gets `entering`/`exiting` on each
    branch instead of a global `LayoutAnimation.configureNext`.
  - All of these use `.reduceMotion(ReduceMotion.System)`, which is Reanimated's own opt-in to
    respect the OS "Reduce Motion" setting automatically — not a manual `useReducedMotion()` check
    (both patterns exist in this codebase now: `AppPressable`'s spring checks `useReducedMotion()`
    directly since it isn't a layout/entering animation).
- **`TypewriterSplash.tsx`, `HeroSection.tsx`, `AuthGateScreen.tsx`'s `Animated` usage**: left as-is,
  per the scope decision in `13-CONTEXT.md` — these are splash/entrance effects, not the "legacy
  collapsible headers" DS-07 names.

## A real bug this caught: type-only vs. value imports

`FormHeader.tsx` originally imported `WizardAnimation` from `useWizardScroll.ts` with `import type`
— erased at compile time, so `useWizardScroll.ts`'s module body (and its `@react-navigation/elements`
import, which ships an ESM build this project's bare `ts-jest` setup can't parse) was never actually
executed by `FactorsList.test.tsx`, which imports `buildHeroCopy` from `FormHeader.tsx`. Replacing
that with a real (value) import of a constant briefly broke that test with a `SyntaxError: Cannot use
import statement outside a module` — fixed by passing the constant down as a prop
(`collapsedHeroHeight`) instead of importing it, avoiding the new runtime edge entirely.

## Jest mock updates

`mobile/test/react-native-reanimated.mock.ts` (added in batch 3) needed three additions once real
usage exercised more of the API:
- `useAnimatedScrollHandler`: unwraps the RN synthetic event's `nativeEvent` before calling the
  worklet, matching what real Reanimated hands a scroll worklet.
- `Animated.FlatList` / `Animated.ScrollView`: re-exported from `require("react-native")` rather than
  built from scratch — exactly like the official upstream mock does — so a test that replaces
  `react-native`'s `FlatList` with its own windowing mock (`survey-list-500.test.tsx`) transparently
  gets that same mock through `Animated.FlatList` too.
- `FadeIn`/`FadeOut`/`LinearTransition`/`SlideInDown`/`SlideOutDown`/`ReduceMotion`: a generic
  `Proxy`-based chainable-builder stub (`.duration(...).reduceMotion(...)` etc. all return the same
  stub) — cheap to extend for whatever the `Skeleton` batch needs next, and closes a latent crash: an
  animation builder called at module load time (`AccountSettingsRows.tsx`'s
  `const entering = FadeIn.duration(...)`) would throw on `undefined` the moment any test imported it,
  even though no test currently does.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(104 suites / 1339 tests).
