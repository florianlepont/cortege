# Batch 3 — Motion tokens, semantic haptics, AppPressable (DS-06, DS-09)

## What shipped

- **`react-native-reanimated` 4.5.1** installed (New Architecture only, matches this app's RN
  0.86.3/Expo 57), plus its `react-native-worklets` 0.10.4 peer. `mobile/babel.config.js` is new
  (none existed before — Expo's implicit `babel-preset-expo` was enough until now) and adds
  `react-native-worklets/plugin` last, per Reanimated 4's own setup docs.
- **`brandMotion`** (`brand-tokens.ts`): durations (`instant` 100 … `emphasis` 500), easing bezier
  control points (`standard`/`decelerate`/`accelerate`), spring configs (`press`/`snappy`/`gentle`,
  the audit's exact numbers — owner confirmed no adjustment after trying `press` live in the
  sketchboard), and the list-entrance stagger (40ms, capped at 8). Kept as plain data (no Reanimated
  import in the token file) so consumers pass it straight into `withSpring`/`Easing.bezier`.
- **`ui/feedback.ts`** (DS-09): the single place the app calls `expo-haptics`, replacing the
  scattered `survey-list/haptics.ts` helper (iOS-only, an artificial restriction — `expo-haptics`
  already no-ops safely elsewhere) and raw `Haptics.*` calls in `AuthGateScreen.tsx`/`AuthPanel.tsx`.
  `selection()`, `impact.{light,medium}()`, `notify.{success,warning,error}()` — all six call sites
  migrated, `survey-list/haptics.ts` deleted.
- **`AppPressable`** (DS-06): spring-scale press (`brandMotion.springs.press`), Android
  `android_ripple`, and a *required* `accessibilityLabel` prop (not optional — TypeScript enforces
  it). Respects `useReducedMotion()` by skipping the scale entirely. Implementation note: the scale
  lives on an inner `Animated.View`, not the `Pressable` itself — `Animated.createAnimatedComponent`
  can't consume the `style={(state) => ...}` callback form several existing consumers rely on, so
  wrapping instead of replacing keeps that working.
- **Migrated**: `AppButton` (previously had *no* pressed feedback at all — confirms the audit's
  DS-06 finding), `DraftCard` and `ParcelNearbyCard` (neither had an `accessibilityLabel` before;
  both now get one from new `fr.components.{draftCard,parcelNearbyCard}.a11y` catalogue entries).
  `ParcelNearbyCard`/`ContinueDraftCard`'s consumers still work unchanged — only the two components
  that had zero pressed-opacity feedback were in this criterion's named list (`ContinueDraftCard`
  already had its own `sharedStyles.rowPressed` handling, left as-is).

## Jest infrastructure

This project's `jest.unit.config.js` is a bare `ts-jest` setup (`testEnvironment: 'node'`, no
`jest-expo`/RN preset), so importing the real `react-native-reanimated` fails immediately —
`SyntaxError: Cannot use import statement outside a module` (its `lib/module` build is ESM, and
`transformIgnorePatterns` excludes `node_modules` by default). The library's own official
`react-native-reanimated/mock` isn't a fit either: it `require()`s straight from TypeScript source
and initializes real native-module bindings at import time (`initializeReanimatedModule(...)` runs
as a side effect of importing its index), which this bare environment has nothing to back. Added
`mobile/test/react-native-reanimated.mock.ts` following the project's existing pattern (same as
`expo-sqlite.mock.ts`, `react-native-svg.mock.ts`, etc.) — a small hand-written mock covering only
what this app calls: shared values resolve synchronously, `useAnimatedStyle` runs its factory
immediately, springs land on their target value with no animation, `useReducedMotion` returns
`false`. Wired via `moduleNameMapper` in `jest.unit.config.js`.

`DraftCard.test.tsx` had its own hand-rolled `jest.mock("react-native", ...)` that didn't handle
`Pressable`'s children-as-function-of-pressed-state form (`AppPressable` renders through that form
so it can still support the `style={(state) => ...}` pattern) — updated to resolve that form, same
as real `Pressable` does.

## Gate

`npm run lint && npm run typecheck && npm run test:unit && npm run format:check` — all green
(104 suites / 1339 tests).

## Remaining Phase 4 work

- Migrate the legacy `Animated`/`LayoutAnimation` collapsible headers to
  `useAnimatedScrollHandler` (DS-07) — next batch.
- `Skeleton`/`SkeletonRow` pulse component (criterion 5).
- Charter spec + ROADMAP update (criterion 6).
