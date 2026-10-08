# Phase 12.2: Visual Modernisation - Pattern Map

**Mapped:** 2026-10-07
**Files analyzed:** 22 new or modified foundation files (screen batches are modify-in-place, see last section)
**Analogs found:** 22 / 22 (two partial)

All paths below are relative to `mobile/`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/app/visual-tokens.ts` | config (static tokens) | transform | `src/app/brand-tokens.ts` | exact |
| `src/app/theme-visual.ts` | config (per-scheme resolver) | transform | `src/app/theme.ts` (`makeComponentColors`, `buildTheme`) | exact |
| `src/app/theme.ts` (modify: `BrandTheme.visual`) | config | transform | itself, lines 393-425 | exact |
| `src/app/brand-tokens.ts` (modify: radius, `numeral`, `screenTitle`) | config | transform | itself | exact |
| `src/app/ibp-display.ts` | utility | transform | `src/app/ibp-scoring.ts` (adapter style) | role-match |
| `src/app/contour-paths.ts` | utility (pure) | transform | `src/app/base64.ts` + `base64.test.ts` | role-match |
| `src/ui/ForestCard.tsx` | component | request-response | `src/ui/AppCard.tsx` | exact |
| `src/ui/ContourLines.tsx` | component | transform | `src/ui/FactorProgressRing.tsx` (react-native-svg) | role-match |
| `src/ui/GradientNumeral.tsx` | component | transform | `src/ui/FactorProgressRing.tsx` | partial |
| `src/ui/ScoreRing.tsx` | component | transform | `src/ui/FactorProgressRing.tsx` | exact |
| `src/ui/GlowBar.tsx`, `FactorBarsChart.tsx` | component | transform | `src/ui/IbpFactorBars.tsx` | role-match |
| `src/ui/useEntrance.ts`, `AnimatedNumber.tsx` | hook / component | event-driven | `src/ui/AppPressable.tsx` (Reanimated + reduced motion) | role-match |
| `src/ui/AppCard.tsx` (add `variant: "glass"`) | component | request-response | itself | exact |
| `src/ui/AppChoiceChip.tsx`, `AppStatusChip.tsx` | component | request-response | themselves | exact |
| `src/ui/GlassSurface.tsx` (tokenise fills) | component | request-response | itself, lines 74-80 | exact |
| `src/ui/AppButton.tsx` (`glow` variant) | component | request-response | itself | exact |
| `test/react-native-reanimated.mock.ts` (extend) | test infra | n/a | itself | exact |
| `src/ui/*.test.tsx` for each new primitive | test | n/a | `FactorProgressRing.test.tsx`, `Skeleton.test.tsx` | exact |
| `src/navigation/tab-config.tsx`, `tabs/JsRootTabs.tsx`, `tabs/NativeRootTabs.tsx`, `stacks/stack-options.ts` | config | request-response | `jsTabScreenOptions` in `tab-config.tsx` | exact |
| `.eslintrc.json` (excludedFiles) | config | n/a | first override, lines 22-30 | exact |
| `assets/fonts/Sora-Light.ttf` + `app.json` fonts list | asset/config | n/a | existing Sora files, `src/__checks__/fonts.test.ts` | exact |
| `src/screens/home/ResumeCard.tsx` | component | request-response | sibling `src/screens/home/NearbyMapCard.tsx` | role-match |

## Pattern Assignments

### New primitives in `src/ui/` (ForestCard, GlowBar, chips, AppCard glass variant)

**Analog:** `src/ui/AppCard.tsx` (whole file is the template: theme hook + `useMemo(createStyles)` + `StyleSheet.create`).

**Imports and shell** (AppCard.tsx lines 1-6, 28-31):
```typescript
import { ReactNode, useMemo } from "react"
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { brandComponentTokens, brandRadius, brandShadow } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
// ...
const theme = useBrandTheme()
const styles = useMemo(() => createStyles(theme), [theme])
```

**Variant union + style map** (lines 8, 46): add `"glass"` to `AppCardVariant`; the existing `glass?: boolean` prop (blur) is a different thing, keep it. Variants are keys of `createStyles(theme)` indexed as `styles[variant]`. New variant reads `theme.visual.glass.cardFill/cardBorder`, radius 22, no `brandShadow` (Android elevation under translucency, pitfall 12):
```typescript
function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: { borderRadius: brandRadius.card },
    soft: { backgroundColor: theme.componentColors.card.softSurface, borderWidth: 1,
            borderColor: theme.componentColors.card.surfaceBorder },
```
Note `structure.test`/`structure-report` flags unused `StyleSheet` keys, but `styles[tone]` indexing by a variable marks all keys used.

**Chips** (`AppChoiceChip.tsx` 56-107, `AppStatusChip.tsx` 17-70): same `createStyles(theme)` with per-tone keys, `brandRadius.pill`, `brandTypography.meta`, colours from `theme.componentColors.choiceChip.*` / `statusChip.*`. Active state is the `active` + `labelActive` keys (lines 91-94, 103-105); change those to `theme.visual.chip.activeBg/activeText`. `AppChoiceChip` uses raw RN `Pressable` with `accessibilityState={{ disabled, selected: active }}` (lines 33-36); keep that state and add `feedback.selection()` from `./feedback` in `onPress`. Keep `minHeight: brandComponentTokens.choiceChip.minHeight` (44 pt rule, D-05).

### `src/ui/GlassSurface.tsx` (tokenise literals)

Replace the two literals (lines 74-80) with theme values; the Android/older-iOS branch is the one that carries them:
```typescript
<View style={[StyleSheet.absoluteFill,
  { backgroundColor: isDark ? "rgba(8, 13, 19, 0.38)" : "rgba(247, 246, 240, 0.38)" }]} />
```
`useBrandTheme()` already gives `scheme`; use `theme.visual.glass.controlFill` and `androidFill`. Liquid Glass branch (`withoutOutline(style)`) stays untouched. Existing test: `src/ui/GlassSurface.liquid.test.tsx`.

### `src/ui/AppPressable.tsx` and motion helpers (`useEntrance.ts`, `AnimatedNumber.tsx`, drift in `ContourLines`)

**Analog:** `src/ui/AppPressable.tsx` lines 12-18, 44-57. Reduced motion is checked by the hook, never by a prop; springs and durations come from `brandMotion`.
```typescript
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated"
import { brandInteraction, brandMotion } from "../app/brand-tokens"
const reducedMotion = useReducedMotion()
const scale = useSharedValue(1)
const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
if (!disableScale && !reducedMotion) { scale.value = withSpring(brandInteraction.pressedScale, brandMotion.springs.press) }
```
Entering builders: use `FadeIn.duration(brandMotion.durations.base).reduceMotion(ReduceMotion.System)` (the mock already stubs `FadeIn`/`ReduceMotion`). Stagger: `brandMotion.staggerMs` (40) capped at `brandMotion.staggerMax` (8), `brandMotion.durations.*`, `brandMotion.easings.*` are bezier arrays for `Easing.bezier(...)`. Never `LayoutAnimation`. Gate loops (drift) on focus and reduced motion (pitfalls 6, 7).

### Reanimated test mock `test/react-native-reanimated.mock.ts` (extend, Wave 0)

Current surface (all pass-through): `useSharedValue` returns `{ value }`, `useAnimatedStyle` runs the factory, `useReducedMotion` returns `false`, `withSpring/withTiming/withRepeat` return the target, `Easing.{bezier,...}`, `FadeIn/FadeOut/LinearTransition/SlideInDown/SlideOutDown` as a Proxy chainable builder, `interpolate`, `Animated.{View,Text,ScrollView,FlatList,createAnimatedComponent}`.
```typescript
export function useReducedMotion(): boolean { return false }
export function withTiming<T>(toValue: T): T { return toValue }
export const FadeIn = createChainableBuilder()
const Animated = { View: RNView, Text: RNText, ScrollView, FlatList,
  createAnimatedComponent: <C>(component: C): C => component }
```
Missing for the new work (add in the same style, one export each): `useAnimatedProps`, `withDelay`, `withSequence`, `useDerivedValue`, `runOnJS`, `FadeInDown`, `Layout`/more builders, `Animated.createAnimatedComponent` for `Circle`/`TextInput`. To test the reduced-motion path, make `useReducedMotion` reading a mutable export (e.g. `export const __motion = { reduced: false }`) so a test can flip it; the mock is a module, so the flag must live in it (pitfall 8).

### Tests for ui primitives (every new `src/ui/*.test.tsx`)

**Analog:** `src/ui/FactorProgressRing.test.tsx` (SVG, same shape as ScoreRing) and `Skeleton.test.tsx` (AppState). Pattern: `react-test-renderer`, no jsdom, mocked `react-native`, silence the deprecation warning, find host nodes by string type.
```typescript
import renderer, { act } from "react-test-renderer"
beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0] ?? "").includes("react-test-renderer is deprecated")) return
    originalConsoleError(...(args as Parameters<typeof console.error>))
  })
})
jest.mock("react-native", () => { /* mockComponent("View"), StyleSheet.create identity */ })
const circles = tree.root.findAll((n) => (n.type as unknown) === "Circle")
```
`react-native` is mocked per test with only the names the component imports (add `Pressable`, `StyleSheet`, `AppState` as needed). `react-native-svg`, `expo-blur`, `expo-glass-effect`, `@expo/vector-icons`, `expo-haptics` are globally mapped to `test/*.mock.ts` by `jest.unit.config.js` `moduleNameMapper`; the svg mock renders host nodes named `Svg`, `Circle`, so extend `test/react-native-svg.mock.ts` for `Path`, `Defs`, `LinearGradient`, `Stop`, `Text`, `G` if missing. Theme works without a provider (`defaultTheme` fallback, theme.ts lines 427-440). Coverage: new code under `src/ui/` and `src/app/` falls under the ratchet floors, so write a test per file; anything outside falls under global 100%.

### `src/app/visual-tokens.ts`, `theme-visual.ts`, `BrandTheme.visual`

**Analog:** `src/app/brand-tokens.ts` (static `as const` objects: `brandRadius` line 153, `brandMotion` 381) and `src/app/theme.ts`.

Radius (brand-tokens.ts 153-162): change `card: 24` to 22 and add `forestCard: 26`, `forestHero: 28`; add, never rename (103 callers).

Theme composition (theme.ts 393-425): the `BrandTheme` type lists `colors`, `onSurface`, `semanticColors`, `componentColors`, `fieldState`, `ibpScoreColors`; each is built by a `makeX(colors, ...)` helper in `buildTheme`. Add `visual: BrandVisual` to the type and `visual: makeVisualColors(scheme, colors)` in the returned object, with `makeVisualColors` living in `theme-visual.ts` (imports `type BrandColors` from `./theme`, no cycle at runtime: pass resolved values in).
```typescript
export type BrandTheme = { mode: BrandThemeMode; scheme: BrandColorScheme; setMode: ...
  colors: BrandColors; semanticColors: BrandSemanticColors; componentColors: BrandComponentColors
  fieldState: BrandFieldState; ibpScoreColors: BrandIbpScoreColors }
export const defaultTheme = buildTheme(DEFAULT_THEME_MODE, "light", () => {})
```
Some tests build a `BrandTheme` by hand or call `jsTabScreenOptions(defaultTheme, ...)`; a new required field must exist on `defaultTheme` (it does, via `buildTheme`), but grep tests for object literals typed `BrandTheme` before adding it.

Typography: `brandTypography` (brand-tokens.ts line 63) entries are `{ fontSize, lineHeight, fontFamily, letterSpacing? }`; add `numeral` and `screenTitle` as siblings. `letterSpacing` is points, not em.

**ESLint (first override, `.eslintrc.json` 22-30):** add the new hex files to `excludedFiles` or the colour-literal rule fails:
```json
"excludedFiles": ["src/i18n/**", "src/app/brand-tokens.ts", "src/app/theme.ts",
  "src/**/*.test.ts", "src/**/*.test.tsx"]
```
(RESEARCH pitfall 1: the literal rule is not enforced in `ui/`/`screens/` `.tsx`; the plan "ESLint repair" must fix that, then the six literals.) The second override (lines 50-70) applies `react/jsx-no-literals` and the label-literal ban to `ui/`, `screens/`, `navigation/` `.tsx`: new components take all text from the `fr` catalogue (`src/i18n/fr/`), no French literals and no em dash (owner rule).

### `src/app/ibp-display.ts`, `contour-paths.ts` (pure utilities)

**Analog:** `src/app/ibp-scoring.ts` (thin adapter over `@cortege/ibp-domain`; use `bandTone(totalBand(n))` for totals per D-15, never re-implement bands) and `src/app/base64.ts` + `base64.test.ts` (pure function with co-located test). Co-locate `ibp-display.test.ts`, `contour-paths.test.ts` (determinism: same input twice gives same path strings).

### Fonts: `Sora-Light.ttf` + `brandTypography.numeral`

**Gate:** `src/__checks__/fonts.test.ts` (lines 1-40): each font file under `assets/fonts` must be named after its PostScript name (name ID 6), and every `fontFamily` used in source must be embedded and listed in `app.json` expo-font plugin. So: file `assets/fonts/Sora-Light.ttf` with PostScript name `Sora-Light`, add `"./assets/fonts/Sora-Light.ttf"` to the expo-font plugin list in `app.json`, then `fontFamily: "Sora-Light"` in `brandTypography.numeral`.

### Structure gate `src/__checks__/structure.test.ts`

Runs `scripts/structure-report` over `src/`: `findUnusedStyleKeys` (a `StyleSheet.create` key never read via `styles.x`, `styles["x"]` or `styles[var]` fails), `findLongFiles` (max 400 lines, `screens/` and `navigation/` only per RESEARCH; extract `*.styles.ts` siblings, see `home/styles`), `findUserFacingLiterals`, `findStatusIdLeaks`. Rule for plans: when adding a style key, use it in the same task; when `HomeScreen.tsx` (371) grows, extract `home/ResumeCard.tsx` first. Sibling extraction pattern: `src/screens/home/` (`NearbyMapCard`, `ToolsSection`, `styles`).

### Tab bars (12.2-04)

**JS tree analog:** `src/navigation/tab-config.tsx` lines 91-110, `jsTabScreenOptions(theme, { route }, insets)`; style comes from `buildJsTabBarStyle(theme, insets)` (same file, above line 91). JS tabs wired in `tabs/JsRootTabs.tsx` line 36 `screenOptions={(props) => jsTabScreenOptions(theme, props, insets)}` with per-screen `tabBarStyle: shouldHideTabBar(getFocusedRouteNameFromRoute(route))`.
```typescript
tabBarActiveTintColor: theme.scheme === "dark" ? theme.semanticColors.accent : theme.colors.forest,
tabBarInactiveTintColor: theme.colors.textSecondary,
tabBarStyle: buildJsTabBarStyle(theme, insets),
tabBarIcon: ({ color, size }) => <Ionicons name={JS_TAB_ICONS[route.name]} size={size} color={color} />,
```
Change tints to `theme.visual.tab.*`, add the glow dot inside `tabBarIcon`.
**Native tree:** `tabs/NativeRootTabs.tsx` takes `nativeTabScreenOptions` from `tab-config` and lazy-requires `@bottom-tabs/react-navigation`; only tint colours can be styled natively (RESEARCH Q4, pitfall 10), so do not add JS-only props there.
**Gates:** `src/navigation/` has coverage floors `{statements 100, branches 98, functions 100, lines 100}` (jest.unit.config.js line 57), so every new branch in `tab-config.tsx` needs a test in `tab-config.test.ts` (calls helpers directly with `defaultTheme`), `tab-bar.test.ts` (`shouldHideTabBar`: the bar stays on every screen, OA-28) and `tabs.test.tsx`. Both trees must receive the refresh and `shouldHideTabBar` remains the single hide rule.

## Shared Patterns

### Theme access (apply to every new `ui/` and screen file)
`const theme = useBrandTheme()` then `useMemo(() => createStyles(theme), [theme])`. Colours only from `theme.*` tokens, fonts only from `brandTypography` roles, text only through `AppText` (`import { AppText as Text } from "./AppText"`). Static hex stops go in `visual-tokens.ts`, nowhere else.

### Reduced motion and haptics
`useReducedMotion()` guard plus `brandMotion` constants (see AppPressable). Haptics through `src/ui/feedback.ts` (`feedback.selection()` etc.), mocked by `test/expo-haptics.mock.ts`.

### Accessibility and targets
Interactive elements use `AppPressable` (mandatory `accessibilityLabel`, DS-06) or `Pressable` with `accessibilityRole` and `accessibilityState`; 44 pt minimum on field screens (D-05, D-15); non-interactive bars/rings stay out of the accessibility tree or get one summary label.

### i18n
All new strings in `src/i18n/fr/<area>.ts`, typed, no "—". Status text only through catalogue functions.

### Prettier and lint
Double quotes, no semicolons, trailing commas, 100 columns; unused vars error unless `_` prefixed; no `require` except the existing `eslint-disable` pattern in `NativeRootTabs.tsx`.

## No Analog Found

| File | Role | Reason |
|---|---|---|
| Gradient-filled SVG text (`GradientNumeral.tsx`) | component | No existing `LinearGradient`/SVG `Text` use; follow RESEARCH Pattern 4 and pitfall 5 (solid fallback token `numeralFallback`) |
| Contour drift loop (`ContourLines.tsx` animation) | component | No looping animation exists; compose `useSharedValue` + `withRepeat(withTiming)` per RESEARCH Pattern 2 and gate on focus (pitfall 7) |
| Animated counter (`AnimatedNumber.tsx`) | component | No `useAnimatedProps` use today; optional, needs the mock extension |
| Contrast unit test | test | No existing contrast test; use RESEARCH "Contrast test skeleton" |

## Screen batches (modify in place, patterns come from the primitives above)

Per RESEARCH batch table: Accueil `src/screens/HomeScreen.tsx` + `home/`; Compte `AccountScreen.tsx` + `account/`; `SettingsScreen.tsx`; `ui/AppGroupedList.tsx` (analog test `AppGroupedList.test.tsx`); Mes Relevés `SurveyListScreen.tsx` + `survey-list/` (`SurveyRow`, `row-styles`); `survey-search/`; survey detail `survey-detail/` + `Survey{Detail,Score,Context,History}Screen`; form `survey-form/`, `survey-wizard/`, `ui/Factor*Input` (existing `IbpFactorBars.tsx` is the in-repo analog for `FactorBarsChart`); Explorer `PublicMapScreen.tsx` + `public-map/` (map and markers untouched). Each screen change keeps its co-located test green and respects the 400-line gate (`HomeScreen.tsx` 371, `SurveyParcelSelectionScreen.tsx` 390 do not grow).

## Metadata

**Analog search scope:** `src/ui`, `src/app`, `src/navigation`, `src/__checks__`, `test/`, `.eslintrc.json`, `jest.unit.config.js`
**Files read:** AppCard, AppChoiceChip, AppStatusChip, AppPressable, GlassSurface, FactorProgressRing (+test), Skeleton.test, reanimated mock, structure/fonts tests, tab-config, theme.ts and brand-tokens.ts excerpts
**Pattern extraction date:** 2026-10-07
