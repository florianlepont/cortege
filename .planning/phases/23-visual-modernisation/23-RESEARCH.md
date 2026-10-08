# Phase 12.2: Visual Modernisation - Research

**Researched:** 2026-10-07
**Domain:** React Native 0.86.3 / Expo 57 visual layer (gradients, glass, SVG data-viz, Reanimated 4 motion, theming), two tab trees, light and Graphite dark
**Confidence:** HIGH on stack and repo facts (read from installed sources), MEDIUM on rendering behaviour that only a device can confirm (flagged per item)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Direction validation**
- **D-01:** The direction is validated with throwaway HTML sketches (`/gsd-sketch`, as for the dark palette in `.planning/sketches/001-dark-palette`) before any screen is touched. The owner chooses; the choice is then written into `docs/design/` and approved.
- **D-02:** The sketches compare **three personalities** on 2 to 3 key screens (Accueil, a survey detail score card, a list): (a) Linear-like sober with brand accents, (b) more expressive and organic (larger brand colour fields, charter typographic offset and black rectangle more visible), (c) a mix: sober working screens, expressive thresholds (Accueil, score, onboarding, auth). The owner could not choose without seeing them.
- **D-02b (resolved 2026-10-07):** after rounds D (C + compact hero), E to H (charter, contours, rosette, notebook) and I, the owner chose **variant I**: contour lines as signature, luminous forest cards, glass, thin large score numeral, factor bars, score rings, glass tab bar. Written up in `docs/design/direction-visuelle-12-2.md`, awaiting the owner's approval of the text. Animals (variant J) kept out of 12.2 and noted as a seed.
- **D-03:** Prior decisions carry forward: Linear is the owner's reference, Komoot the anti-reference, Graphite is the dark palette (sketch 001 winner).

**Surfaces and density**
- **D-04:** Surfaces are flat with thin rules and surface tints; Liquid Glass (`GlassSurface`, Phase 12) stays limited to floating controls (tab bar, sheets, map buttons). No generalised blur, no heavy shadows.
- **D-05:** Density stays as today for field screens (survey form A to J, parcel selection): no touch target shrinks. The owner wants **more compact Accueil, Compte and Paramètres** mainly; other screens only get refined radii, spacing between blocks and typographic hierarchy.

**Typography and icons**
- **D-06:** Keep Sora (titles, body) and Jost (meta) as the loaded stand-ins for Mazzard H and Futura. Play on weights, sizes and the charter's typographic offset; the token swap to Mazzard H stays a later, reversible change.
- **D-07:** Keep `@expo/vector-icons`; harmonise to one outline style and one stroke weight across screens. The charter's fern appears as an occasional brand motif.

**Motion**
- **D-08:** Native behaviour wherever possible (iOS native transitions, sheets, tab bar), Reanimated `brandMotion` for the rest, always `ReduceMotion.System`. Four areas are in scope: score and gauges (cards, /50 gauge and progress rings filling, number counting), list and card entrances (stagger on Accueil, Mes Relevés, Explorer, animated empty states), screen transitions (list to detail, tab change, sheets), action feedback (submit and sync success, status icons, buttons and chips with spring and haptics through `ui/feedback.ts`).

**Sequence**
- **D-09:** Foundations first (tokens, primitives: cards, chips, headers, motion helpers), then screens in batches with an owner check on the phone between batches: Accueil + Compte + Paramètres, then Mes Relevés + survey detail, then survey form, then Explorer.
- **D-10:** Open 12.1 findings are out of scope; only those on a screen being rebuilt are absorbed in passing.

### Claude's Discretion
- Exact token values, radii scale, spacing scale and animation timings, within the constraints above.
- Which 2 to 3 screens the sketches use.

### Deferred Ideas (OUT OF SCOPE)
- Animals illustrations and a "Qui vit ici ?" species/factor strip (sketch 008 variant J): owner kept variant I without animals; species-factor links unvalidated against the IBP method.
- Replacing icon library (Lucide/Phosphor) or SF Symbols: rejected for now, revisit only if the sketches show the current set cannot reach the direction.
- Swapping in Mazzard H once licensed: separate token-file change.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-QA-visual-modernisation | The interface is visibly more pleasant, modern and dynamic: a written visual direction approved by the owner, applied to the main screens in light and dark mode, with consistent Reanimated motion that respects reduced-motion, and no regression on field ergonomics or accessibility. | Q1 to Q7 give the rendering recipes (native CSS gradients and box shadows, SVG contours/rings/numeral, glass rules, tab-bar mapping, motion spec, token plan); Q8 gives the contrast table and the verification split; Q9 gives the plan decomposition and the owner-check gates. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- All user-facing text comes from the typed French catalogue `mobile/src/i18n/fr/`; `react/jsx-no-literals` is an error in `src/screens`, `src/components`, `src/ui`, `src/navigation` (so a new primitive cannot hardcode "/50", "—" or an a11y label). `mobile/src/__checks__/structure.test.ts` also fails on a user-facing literal outside `src/i18n`.
- No "—" in any user-facing French string (owner rule, memory `no-dash-in-ui-text`).
- Colours only through tokens: hex and `rgba(` literals live in `app/brand-tokens.ts` and `app/theme.ts` only (see Pitfall 1: this rule is not actually enforced in `src/ui` and `src/screens` `.tsx` files today).
- 400-line gate on `src/screens/**` and `src/navigation/**` (`structure.test.ts`), plus an "unused style key" gate: a style key that is no longer read fails the test, so restyling must delete dead keys.
- Prettier: double quotes, no semicolons, trailing commas, 100 columns. ESLint: unused vars are errors, `no-explicit-any` warns, no `require` imports.
- Fonts only through `brandTypography` roles (file name equals PostScript name, checked by `src/__checks__/fonts.test.ts`); `AppText` is the global default text face.
- Reanimated 4 with `ReduceMotion.System`; no `LayoutAnimation`. Haptics only through `ui/feedback.ts`.
- `ios/` and `android/` are generated by `expo prebuild`; native changes go in `app.json` or a plugin. A font added to `app.json` or `mobile/assets/**` triggers the CI `native-android` and `native-ios` jobs.
- Single `useSurveySync` assembler; screens read context hooks (do not add data fetching in visual primitives).
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run format:check`.
- Tab bar stays visible on every screen (owner rule OA-28); bottom controls clear it via `useTabBarClearance`. `shouldHideTabBar` in `navigation/tab-bar.ts` must keep working for both trees.
- Owner memory: PRs are merged fast, open the PR only when the batch is complete; verify UI on the iOS simulator before presenting; build for the phone from the main checkout, never from a worktree.

## Summary

The phase needs **zero new runtime dependencies**. React Native 0.86.3 (New Architecture, which Reanimated 4 already requires) ships native CSS-style `experimental_backgroundImage` (linear and radial gradients, several layers), `boxShadow` (coloured, spread, inset) and `borderCurve`, implemented natively on iOS and Android. The exact gradient and shadow strings of sketch variant I were run through RN 0.86.3's own parsers and parse to the expected layers. That covers the forest card (gradient plus off-corner halo plus diffuse coloured shadow plus hairline), the glow bar, the moss pill with halo and the screen backdrop halos, without `expo-linear-gradient` (not installed, would force a native rebuild) or Skia (heavy, not installed). `react-native-svg` 15.15.4 and Reanimated 4.5.1, both installed, cover the rest: contour lines (two `Path` elements per card, the wrapping view translated and scaled on the UI thread), progress rings (`strokeDashoffset` through `useAnimatedProps`) and the gradient-filled Sora Light numeral (`<Text fill="url(#grad)">`, with a solid-colour fallback if the device spike fails). The only asset to add is `Sora-Light.ttf`: `@expo-google-fonts/sora` 0.4.2 ships `Sora_300Light.ttf` whose PostScript name is `Sora-Light`; the repo's existing Sora files are byte-identical renames of the same package, so vendoring is a copy and rename plus one `app.json` line.

Glass is a floating-control treatment (CONTEXT D-04): real blur only on the tab bar, sheets and map buttons; cards get the "glass look" with a translucent fill, hairline and inner highlight and **no blur**, which is visually identical over the near-uniform backdrop and avoids blur cost in lists. On Android, expo-blur 57's default `blurMethod` is `none` (a semi-transparent fill) and real blur needs a `BlurTargetView` wrapping the blurred subtree, so the rule is: flat translucent fill on Android, `BlurView` or Liquid Glass on iOS. The iOS native tab bar (`react-native-bottom-tabs` 1.4.0) is the system bar (Liquid Glass and already floating on iOS 26): only tints, label font and background colour are stylable, so the "glow dot" and custom shape are JS-tree only. The JS bar is restyled in-flow (not floating) to avoid a screen-by-screen bottom padding refactor.

The two real risks are not technical features but verification and regression: (1) the Android story cannot be checked locally (no emulator) and the owner tests on an iPhone, so every Android-affecting effect needs a documented graceful fallback; (2) the existing lint rule that is supposed to forbid colour literals is silently disabled in `src/ui/**/*.tsx` and `src/screens/**` (later override replaces the earlier one), so the "semantic tokens only" guarantee must be repaired first or this phase will add literals. Also, sketch I contains three accessibility failures that must not be copied: `--text3` (#8A9482) fails AA on light surfaces (2.92:1), moss ring/bar colour is 2.63:1 on the light surface, and ten vertical bars are about 22 pt wide (below the 44 pt target) so they must be non-interactive.

**Primary recommendation:** Build foundations from RN-native gradients/box-shadows plus SVG (no new packages), vendor `Sora-Light`, repair the ESLint colour rule first, then apply variant I in the four D-09 batches with an owner phone check between each; treat gradient text, drift animation and coloured shadows as spike-and-fallback primitives with a built-in solid/static fallback.

### Answers to the nine research questions (index)

| Q | Short answer | Section |
|---|--------------|---------|
| 1 | RN-native `experimental_backgroundImage` + `boxShadow` for gradients/halos; SVG only where geometry is needed. No new dep. `ForestCard` = outer shadow shell + inner clipped gradient view. | Standard Stack, Pattern 1 |
| 2 | Two `Path` elements per card (sage group, moss group), static generator, drift on wrapping `Animated.View` via `withRepeat`, gated by focus; max 2 animated instances per visible screen. | Pattern 2 |
| 3 | SVG `<Text fill="url(#id)">` with `Sora-Light`, spike first, solid-colour fallback prop; MaskedView rejected (new native dep and still needs a gradient source). | Pattern 4, Pitfall 5 |
| 4 | Android: flat translucent fill (expo-blur default `none`); iOS: BlurView or Liquid Glass on floating controls only; native iOS tab bar only takes tints/label font/background, JS bar restyled in-flow with a dot. | Pattern 6, Tab bar table |
| 5 | Rings: SVG `Circle` + `useAnimatedProps`; bars: Views with native gradient + `boxShadow`, `scaleY` from bottom; animate only first mount and first 8 rows. | Pattern 3, Pattern 5 |
| 6 | Native stack transitions untouched; no shared element (Reanimated's is experimental, Expo's zoom needs Expo Router); concrete motion spec table. | Motion spec |
| 7 | New files `visual-tokens.ts` + `theme-visual.ts`, `BrandTheme.visual`; primitive change list and file sizes. | Token plan, Batch sizing |
| 8 | Contrast table with measured ratios; committed contrast unit test; verification split. | Contrast table, Validation Architecture |
| 9 | 10 plans in 7 waves, owner checks between batches. | Plan decomposition |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Visual tokens (radii, gradient stops, glow, glass alpha, ring/bar colours) | Mobile `app/` token modules | `theme.ts` (per-scheme resolution) | Colours are resolved through `useBrandTheme()`; static dimensions stay importable (existing static/dynamic split of Phase 12). |
| Gradient / halo / shadow surfaces | Mobile `ui/` primitives (native view style) | SVG child for contour geometry | Native style props run in the platform's drawing code, no extra view; SVG only for shapes. |
| Contour drift, ring fill, bar fill, entrances | Reanimated UI thread | JS only to start/guard | Transform/opacity/props animate off the JS thread; JS decides whether to start (reduced motion, focus). |
| Score band to colour mapping | `@cortege/ibp-domain` `bandTone(totalBand(n))` for /50 | `mobile/src/app/ibp-display.ts` for 0-5 factor tone (display only) | Never re-implement bands in mobile (CLAUDE.md); per-factor tone is a presentation convention, not a rule (A2). |
| Tab bar look | iOS: system native bar (tints only) | Android/Expo Go: `@react-navigation/bottom-tabs` options | Native bar cannot be freely restyled; JS bar can. |
| Screen transitions, sheets | react-native-screens / native-stack (system) | Reanimated for in-screen motion | D-08: native behaviour wherever possible. |
| Reduced motion | Reanimated `ReduceMotion.System` + `useReducedMotion()` | `AppPressable` (already skips scale) | One API, startup snapshot for whole-component decisions. |
| Font | `expo-font` config plugin (embedded) | `brandTypography` role | Embedded static files, name equals PostScript name. |

## Standard Stack

### Core (all already installed, versions verified in `mobile/node_modules` and root `node_modules`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native | 0.86.3 | `experimental_backgroundImage` (linear/radial gradients), `boxShadow` (outset, inset, coloured), `borderCurve`, `transformOrigin` | Native implementations on both platforms (iOS `RCTRadialGradient.mm`, Android `RadialGradient.kt`, `OutsetBoxShadowDrawable`, `InsetBoxShadowDrawable`); types in `StyleSheetTypes.d.ts`. [VERIFIED: node_modules source] |
| react-native-svg | 15.15.4 | Contour paths, progress rings, gradient-filled numeral | Already used (`FactorProgressRing`, `BrandFern`). Text is rendered as paths so gradient fills apply. [VERIFIED: node_modules source] |
| react-native-reanimated | 4.5.1 | UI-thread loops/fills/entrances, `useAnimatedProps` on SVG, `ReduceMotion.System` | Installed, Babel plugin configured (`react-native-worklets/plugin`). [VERIFIED: package.json, babel.config.js] |
| react-native-worklets | 0.10.4 | Reanimated 4 runtime | Installed. |
| expo-blur | 57.0.3 | iOS blur (and Android `none`/dimezis) | Already behind `GlassSurface`. [VERIFIED: node_modules source, docs.expo.dev] |
| expo-glass-effect | 57.0.4 | iOS 26 Liquid Glass (`GlassView`) | Already behind `GlassSurface`. |
| @react-navigation/bottom-tabs | 7.19.2 | JS tab bar options (`tabBarBackground`, `tabBarItemStyle`, `animation`) | Installed. [VERIFIED: types.d.ts] |
| react-native-bottom-tabs + @bottom-tabs/react-navigation | 1.4.0 | Native iOS tab bar (tints, `tabBarStyle.backgroundColor`, `translucent`, `scrollEdgeAppearance`, `minimizeBehavior`) | Installed. [VERIFIED: TabView.tsx] |
| expo-haptics | 57.0.3 | Through `ui/feedback.ts` only | Installed. |

### Supporting asset (vendoring source only, never installed)
| Asset | Version | Purpose | When to Use |
|-------|---------|---------|-------------|
| `Sora_300Light.ttf` from `@expo-google-fonts/sora` | 0.4.2 | Source of `mobile/assets/fonts/Sora-Light.ttf` (PostScript name `Sora-Light`, 57 964 bytes) | Once, in the tokens/font plan. Fetch with `npm pack @expo-google-fonts/sora@0.4.2` in a temp dir, copy the file renamed, do not add the package as a dependency. The OFL text `OFL-Sora.txt` is already vendored. [VERIFIED: npm pack and PostScript-name read in this session] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RN-native `experimental_backgroundImage` | `expo-linear-gradient` | Stable API but not installed; adding it changes `mobile/package.json` and forces prebuild and both native CI jobs; radial gradient is not covered anyway. Use only if the device spike shows the native style misrenders. |
| RN-native gradients | `react-native-svg` `LinearGradient`/`RadialGradient` | Works today, but costs an extra native view per surface and Android ignores the radial focal point (README known issue). Keep as the documented fallback for a single surface if needed. |
| Either | `@shopify/react-native-skia` | Heavy native dependency, not installed; unnecessary for static gradients and a handful of paths. Rejected. |
| SVG `<Text fill="url(#g)">` | `@react-native-masked-view/masked-view` | Not installed (only appears as an optional peer in the lockfile), new native module, and still needs a gradient child. Rejected. |
| `withRepeat` drift | Reanimated 4 CSS animations (`animationName` keyframes) | Declarative and UI-thread, but its docs do not mention reduced motion; `withRepeat` with `ReduceMotion.System` is documented to not start. Use `withRepeat`. |
| In-flow JS tab bar | Floating (`position: "absolute"`) JS bar | Matches the sketch but every scrolling screen must pad by bar height plus offset and `useTabBarClearance` changes; high regression risk for a bar that only Android and Expo Go users see. Rejected for 12.2. |

**Installation:** none. Font vendoring only:
```bash
mkdir -p /tmp/sora && cd /tmp/sora && npm pack @expo-google-fonts/sora@0.4.2 && tar xzf expo-google-fonts-sora-0.4.2.tgz
cp package/300Light/Sora_300Light.ttf <repo>/mobile/assets/fonts/Sora-Light.ttf
# then add "./assets/fonts/Sora-Light.ttf" to the expo-font plugin list in mobile/app.json
```

**Version verification:** `react-native` 0.86.3, `react-native-svg` 15.15.4, `react-native-reanimated` 4.5.1, `expo-blur` 57.0.3, `@react-navigation/bottom-tabs` 7.19.2, `@react-navigation/native-stack` 7.19.2, `react-native-screens` 4.26.2, `react-native-bottom-tabs` 1.4.0 read from the installed packages' `package.json`. `@expo-google-fonts/sora` 0.4.2 is the registry latest (published 2025-09-09).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @expo-google-fonts/sora (vendoring source only, not installed) | npm | published 2025-09-09 (0.4.2) | ~66k/wk | github.com/expo/google-fonts | [OK] | Approved as a one-time download source; the `.ttf` is copied, the package is not a dependency. |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
No other package is recommended; the phase adds no runtime or dev dependency. `npm view` `scripts.postinstall` is null for the audited package. [VERIFIED: gsd-tools package-legitimacy check]

## Architecture Patterns

### System Architecture Diagram

```
 Theme layer (useBrandTheme)                         Platform layer
 ┌───────────────────────────┐
 │ brand-tokens.ts (dims,    │      ┌────────────────────────────────────────────┐
 │  brandColors, motion)     │      │ iOS: native tab bar (system, tints only)   │
 │ visual-tokens.ts (radii,  │      │ Android/Expo Go: JS bottom-tabs (restyled) │
 │  gradient stops, glow)    │      └────────────────────────────────────────────┘
 │ theme.ts + theme-visual.ts│                         ▲ tint/options
 │  light | Graphite dark    │                         │
 └─────────────┬─────────────┘                         │
               │ theme.visual.*                        │
               ▼                                       │
 ┌───────────────────────────────────────────────────────────────────────┐
 │ ui/ primitives (memoised styles per theme)                             │
 │  ForestCard ─ shell(boxShadow) ─ clip(gradient string, hairline)       │
 │      ├─ ContourLines ─ Animated.View(drift) ─ Svg ─ 2 Path             │
 │      ├─ GradientNumeral ─ Svg ─ Text fill=url(#id) (fallback: RN Text) │
 │      ├─ GlowBar (View + gradient + boxShadow)                          │
 │      └─ FactorBarsChart (10 Views, scaleY from bottom)                 │
 │  ScoreRing ─ Svg ─ track Circle + AnimatedCircle(strokeDashoffset)     │
 │  AppCard(glass look, no blur) / AppChoiceChip / AppStatusChip /        │
 │  AppButton(glow variant) / GlassSurface (blur: floating controls only) │
 │  useEntrance(index) ─ FadeInDown+delay (first mount, index < 8)        │
 └───────────────────────┬───────────────────────────────────────────────┘
                         │ props (scores, bands, completion) from existing context hooks
                         ▼
 Screens (route components read contexts): Accueil, Compte, Paramètres
   → Mes Relevés, Détail (+ Score/Contexte/Historique) → Formulaire → Explorer
                         │
                         ▼ motion decisions
   ReduceMotion.System (default) + useReducedMotion() snapshot + useIsFocused()
   → loops do not start / values render at final state
```

### Recommended Project Structure (additions only)
```
mobile/src/app/
├── visual-tokens.ts        # static dims + hex gradient/glow stops (add to ESLint hex exclusion list)
├── theme-visual.ts         # makeVisualColors(scheme) -> theme.visual (resolved per scheme)
├── ibp-display.ts          # factorTone(points 0-5), ring/bar tone helpers (display only)
├── contour-paths.ts        # pure deterministic generator (port of sketch topo())
└── *.test.ts               # co-located
mobile/src/ui/
├── ForestCard.tsx          # shell + clip + gradient + hairline + children
├── ContourLines.tsx        # SVG paths + drift wrapper
├── GradientNumeral.tsx     # SVG text with gradient, solid fallback
├── ScoreRing.tsx           # list ring (band tone, dashed when none)
├── GlowBar.tsx             # thin glowing gauge
├── FactorBarsChart.tsx     # ten non-interactive bars
├── useEntrance.ts          # entering animation builder, first-mount guard
└── AnimatedNumber.tsx      # TextInput animatedProps counter (optional)
mobile/assets/fonts/Sora-Light.ttf   # + app.json fonts list
mobile/test/react-native-reanimated.mock.ts   # extended (see Wave 0)
```
New code goes under `src/ui/` or `src/app/` (coverage floors 59/35/42/59 and 91/80/97/95). A new top-level folder would fall under the **global 100% statements/lines** threshold.

### Pattern 1: ForestCard (Q1)
**What:** An outer shell carries the diffuse coloured shadow and the radius (no `overflow: hidden`); an inner clip view carries the gradient layers, the hairline and clips the contour SVG and children. Always set `backgroundColor` to the mid forest stop as a fallback: an invalid gradient string yields zero layers silently, which would leave white text on the canvas.
**When to use:** Accueil "Reprendre" card, survey score card, and any later forest hero.
**Example:**
```tsx
// Source: strings verified against RN 0.86.3 processBackgroundImage / processBoxShadow
// visual-tokens.ts (hex allowed here only)
export const forestStops = { a: "#1D3418", b: "#334E2B", c: "#0E2210", haloCore: "#6F9A3C" } as const
export const forestImage = (s: typeof forestStops, halo = "radial-gradient(120% 150% at 88% -10%,") =>
  `${halo} ${s.haloCore} 0%, rgba(111, 154, 60, 0) 58%), ` +
  `linear-gradient(140deg, ${s.a} 0%, ${s.b} 55%, ${s.c} 100%)`
export const forestShadow = "0 16px 36px -12px rgba(30, 60, 25, 0.55)"

// ui/ForestCard.tsx
<View style={[styles.shell, { borderRadius: r, boxShadow: forestShadow }]}>
  <View
    style={[
      styles.clip, // overflow: "hidden", borderWidth: 1, borderColor: theme.visual.forest.hairline
      { borderRadius: r, backgroundColor: theme.visual.forest.fallback,
        experimental_backgroundImage: theme.visual.forest.image, borderCurve: "continuous" },
    ]}
  >
    <ContourLines />
    {children}
  </View>
</View>
```
Android: outset `boxShadow` needs Android 9+, inset needs Android 10+ (RN docs); below that the card simply has no glow. Do not add `elevation` (grey, ignores colour on old APIs, and smears under translucent cards).

### Pattern 2: ContourLines with drift (Q2)
**What:** Port `topo()` to a pure function returning two path strings: a sage group (3 of 4 rings, `strokeWidth` 1, opacity 0.55) and a moss group (every 4th ring, 1.4, opacity 1). Two `<Path>` nodes per card instead of eleven. The SVG (`viewBox="0 0 320 180"`, `preserveAspectRatio="xMidYMid slice"`) sits in an `Animated.View` inset by -12 so the 26 s translate/scale never exposes an edge; the card's inner clip view clips it to the radius. Generation is deterministic (no `Math.random`), computed once at module load (11 rings × 25 points), so it is unit-testable and needs no JSON asset.
**Budget:** at most two animated instances per visible screen (Accueil: Reprendre; Détail: score card, plus a still context placeholder). Gate the loop with `useIsFocused()` (stack screens beneath stay mounted and would otherwise keep animating) and let `ReduceMotion.System` stop the loop (documented: infinite or reversed `withRepeat` does not start). Initial shared value is the "from" frame so reduced-motion renders a static card.
```tsx
// Source: Reanimated 4 docs (accessibility guide, withRepeat), repo AppPressable/Skeleton patterns
const t = useSharedValue(0)
const focused = useIsFocused()
useEffect(() => {
  if (!focused) { cancelAnimation(t); return }
  t.value = withRepeat(
    withTiming(1, { duration: 26000, easing: Easing.inOut(Easing.ease),
                    reduceMotion: ReduceMotion.System }), -1, true, undefined, ReduceMotion.System)
  return () => cancelAnimation(t)
}, [focused, t])
const style = useAnimatedStyle(() => ({
  transform: [
    { translateX: interpolate(t.value, [0, 1], [-6, 8]) },
    { translateY: interpolate(t.value, [0, 1], [2, -4]) },
    { scale: interpolate(t.value, [0, 1], [1.04, 1.1]) },
  ],
}))
```
Do not overlay contours on a live MapLibre map (`ParcelMapCard` is a real `ParcelMap`); use them as the placeholder/loading/offline background of map cards (A6).

### Pattern 3: Progress rings and bars (Q5)
**Ring:** `Svg` + track `Circle` + `Animated.createAnimatedComponent(Circle)` with `useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }))`, `rotation="-90"`, round caps. Keep geometry in a pure function (`ringGeometry(size, stroke, progress)`) so it is unit-tested without Reanimated. Tone: `bandTone(totalBand(score))` from `@cortege/ibp-domain` (the sketch's 25/35 split is a mock; the package bands are 10/20/30/40 and tones low < 20, mid 20 to 29, high >= 30). Dashed track (`strokeDasharray="3 4"`) when there is no score. Keep current row semantics (draft shows completion ring, submitted without score a neutral full ring).
**Animate-on-appear rules:** start from 0 only on the first mount of the screen and only for `index < brandMotion.staggerMax` (8); later rows, recycled rows and rows scrolled in render at the final value. Record animated keys (`surveyId:score`) in a module-level Set so `removeClippedSubviews` remounts do not replay. Per Reanimated's performance guide keep simultaneous animations well under 100 on low-end Android (we cap at ~8 rings + ~10 bars).
**Bars (ten factors):** Views, not SVG: `experimental_backgroundImage: linear-gradient(180deg, lighter, tone)`, `boxShadow: 0 0 12px toneAlpha`, animate `transform: [{ scaleY }]` with `transformOrigin: "bottom"` (UI thread, no layout pass), stagger `brandMotion.staggerMs`. They are **not interactive** (22 pt wide): wrap in one `accessible` container with a catalogue label ("Facteurs A 4, B 3, ...") and hide each bar from accessibility; navigation to a factor stays on the existing 44 pt rows of `FactorsList` (Score page).

### Pattern 4: GradientNumeral (Q3)
```tsx
// Source: react-native-svg native text rendering (TSpan draws path with brush), expo-font naming rule
const id = useId()
<Svg width={w} height={h} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
  <Defs>
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0" stopColor={v.numeralTop} /><Stop offset="1" stopColor={v.numeralBottom} />
    </LinearGradient>
  </Defs>
  <SvgText x={0} y={baseline} fontFamily="Sora-Light" fontSize={68} letterSpacing={-3.4}
           fill={`url(#${id})`}>{value}</SvgText>
</Svg>
```
iOS resolves `fontFamily` by PostScript name, Android loads `assets/fonts/<fontFamily>.ttf` (the repo's file-name-equals-PS-name rule already satisfies both). SVG text does not scale with Dynamic Type; at 68 pt this is acceptable, the parent keeps the existing `accessibilityLabel` of `ScoreCard`. "/50" can be a `TSpan` (Jost-Regular, solid sage) so the baseline aligns without measuring. Provide a `solid` fallback (`RN Text` in `Sora-Light`, colour token `numeralFallback`) behind a single constant so a failed spike is a one-line switch. Counting animation is incompatible with SVG text children; count only plain-text tiles (A9).

### Pattern 5: List entrance and press feedback (Q6)
`entering={FadeInDown.delay(Math.min(index, brandMotion.staggerMax) * brandMotion.staggerMs).duration(brandMotion.durations.base).reduceMotion(ReduceMotion.System)}` applied only while `firstMount && index < 8` (a ref cleared after the first layout). Existing precedent: `FadeIn.duration(...).reduceMotion(ReduceMotion.System)` in `AccountSettingsRows`. Layout animations replay when virtualised rows remount, hence the guard.

### Pattern 6: Glass rules (Q4)
| Surface | iOS < 26 | iOS 26+ | Android |
|---------|----------|---------|---------|
| Tab bar (JS tree) | translucent fill + hairline (no blur, in-flow) | native bar is used in Release | translucent fill + hairline, no blur |
| Tab bar (native tree) | system bar | system Liquid Glass | n/a (JS tree) |
| Sheets, map buttons, map chips (floating) | `BlurView` via `GlassSurface` | `GlassView` | `GlassSurface` falls back to the flat translucent fill (`blurMethod` stays `none`) |
| Cards, chips, segments, list rows | translucent fill + hairline + inner highlight, **no blur** | same | same, higher alpha for legibility |
Real Android blur requires a `BlurTargetView` around the blurred subtree and `blurMethod="dimezisBlurViewSdk31Plus"`; RenderNode blur is efficient only on Android 12+ [CITED: docs.expo.dev/versions/latest/sdk/blur-view]. Not worth restructuring the navigator for it in 12.2. Token the fill alphas in `theme.visual.glass` (replace the two hard-coded `rgba(...)` in `GlassSurface.tsx`).

### Tab bar: what can and cannot be styled (Q4)
| Tree | Can style | Cannot style | Plan |
|------|-----------|--------------|------|
| Native iOS (`react-native-bottom-tabs` 1.4.0, Release) | `tabBarActiveTintColor`, `tabBarInactiveTintColor` (no effect on iOS 26), `tabBarStyle.backgroundColor`, `translucent`, `scrollEdgeAppearance`, `minimizeBehavior`, `tabLabelStyle.fontFamily/fontWeight/fontSize`, badge colours, `hapticFeedbackEnabled`, `labeled`, SF Symbol icons | Shape, floating inset, blur material, the glow dot, per-item decoration. On iOS 26 the bar is already floating Liquid Glass. | Keep the bar; set only tints from `theme.visual.tab.*` and the label font (Jost/Sora role). Accept that the dot is JS-tree only. Keep `tabBarHidden` plumbing (`shouldHideTabBar` via `AppNavigation`). |
| JS (`@react-navigation/bottom-tabs` 7.19.2: Android, Expo Go) | `tabBarStyle` (radius, fill, border), `tabBarBackground`, `tabBarItemStyle`, `tabBarLabelStyle`, `tabBarIcon` (render the glow dot when `focused`), `animation: "fade"` | Real blur without a `BlurTargetView` | Restyle in `buildJsTabBarStyle`/`jsTabScreenOptions` (`tab-config.tsx`); keep it in-flow so `useAppBottomTabBarHeight`/`useTabBarClearance` stay correct; keep the `display: "none"` swap for `shouldHideTabBar` in `JsRootTabs`. The glow dot lives in `tabBarIcon`. |
Update `tab-config`, `tabs`, `tab-bar` tests (the `src/navigation/` coverage floor is 100/98/100/100).

### Motion spec (Q6)
| Area | Element | Spec |
|------|---------|------|
| Score and gauges | Glow bar, `/35` `/15` tiles | `withTiming` 0 to value, `brandMotion.durations.emphasis` (500 ms), `easings.decelerate`, delay 120 ms; plays once per detail mount (ref guard), not when returning from a sub-page |
| | Big numeral | opacity 0 to 1 and translateY 8 to 0, `springs.snappy`; no counting (gradient SVG text) |
| | Sub-score tiles | optional `AnimatedNumber` (TextInput `animatedProps`, UI thread), 500 ms |
| | List rings | 360 ms (`slow`) decelerate, stagger 40 ms, rows 0 to 7 on first screen mount only |
| | Ten bars | `scaleY` spring `gentle`, stagger 40 ms |
| List and card entrance | Accueil sections, Mes Relevés/Explorer rows | `FadeInDown`, `durations.base`, stagger 40 ms capped at 8, first mount only; animated empty state = one-shot fade and spring scale of the icon, no loop |
| Screen transitions | List to detail, sub-pages | native-stack default (iOS push, Android default); no shared element: Reanimated shared transitions are experimental and "not recommended for production" [CITED: docs.swmansion.com], Expo's iOS zoom transition needs Expo Router (`Link.AppleZoom`), this app uses React Navigation |
| | Tab change | JS tabs `animation: "fade"` (`"none"` when `useReducedMotion()`); native bar unchanged |
| | Sheets | keep RN `Modal` `pageSheet` (`GenusTargetSheet`, `NearbyParcelsSheet`) and `@gorhom/bottom-sheet` (Explorer); no `formSheet` is in use today (the Phase 12 formSheet was replaced by a card in OA-91) |
| Action feedback | Press | existing `AppPressable` spring (0.97) |
| | Chips and segments | `feedback.selection()` on change |
| | Primary pill | `feedback.impact.light()` |
| | Submit and sync success | `feedback.notify.success()` plus a halo pulse: a ghost layer with the pill's static `boxShadow` whose opacity animates 0 to 1 to 0 over 500 ms (Reanimated animates opacity reliably; do not animate `boxShadow` itself); failure `notify.error()`/`warning()` |
| | Status icons | check or sync icon `springs.snappy` scale-in |
| Ambient | Contours | 26 s alternate loop, focus-gated, reduced motion off |
**Reduced-motion API to use:** `.reduceMotion(ReduceMotion.System)` on entering/exiting/layout builders (repo convention, also the default), `reduceMotion: ReduceMotion.System` in `withTiming/withSpring/withRepeat` configs (default), and `useReducedMotion()` for whole-component decisions; it is a startup snapshot (does not re-render on change), so initialise shared values to the final value when it is true to avoid a flash from 0. Under System: `withTiming` returns `toValue` immediately; infinite/even-reversed `withRepeat` does not start; entering/layout animations jump to the end; exiting and shared transitions are omitted [CITED: docs.swmansion.com/react-native-reanimated/docs/guides/accessibility]. Three older screens (`WelcomeScreen`, `AuthGateScreen`, `TypewriterSplash`) use `AccessibilityInfo`; leave them.

### Token plan (Q7)
Add, do not rename (103 non-test files call `useBrandTheme`; no test asserts a radius value):
- `brandRadius`: `card` 24 to **22**; add `forestCard: 26`, `forestHero: 28`. (`hero 34` and `panel 30` stay for non-forest users.)
- `visual-tokens.ts` (static, hex allowed): forest stops, halo core, hairline alphas, glow shadow strings, ring/bar geometry (ring size 38, stroke 4; bar radius 6; bar max height), contour parameters (rings 11, step 15 degrees, centre/offsets), drift range (translate -6/8, 2/-4; scale 1.04/1.1; 26 000 ms).
- `theme-visual.ts` + `BrandTheme.visual` (resolved per scheme, `defaultTheme` keeps working): `backdrop` (two-halo gradient string: light moss/sage, dark moss/forest from the sketch), `forest` {image, fallback, hairline, onForestText, onForestMuted, numeralTop, numeralBottom, numeralFallback}, `glass` {cardFill, cardBorder, cardHighlight, controlFill, androidFill}, `tab` {activeTint, inactiveTint, dot, background, border}, `score` {low, mid, high, track} (light high = darker moss `#728A2D`, 3.60:1 on the light surface; dark = moss), `factorBar` {low, mid, high}, `glow` {pill, bar}, `chip` {activeBg, activeText} (inverted neutral: light `textPrimary` on `canvas`, dark `#F2F3F1` on `#08090A`).
- New hex files must be added to `excludedFiles` in `mobile/.eslintrc.json` first override (alongside `src/app/brand-tokens.ts` and `src/app/theme.ts`).
- Typography: add `brandTypography.numeral` ({ fontFamily: "Sora-Light", fontSize: 68, lineHeight: 72, letterSpacing -3.4 }) and a `screenTitle` role (Sora-SemiBold 24 to 26, `letterSpacing` -0.6 px: RN `letterSpacing` is in points, not em). `fonts.test.ts` will then check `Sora-Light` is embedded and listed in `app.json`.

### Primitives to change (Q7)
| File | Change |
|------|--------|
| `ui/AppCard.tsx` | new `variant: "glass"` (translucent fill, hairline, highlight, radius 22, **no `elevation`, no blur**); keep existing `glass` prop (blur) for floating cards |
| `ui/GlassSurface.tsx` | tokenise the two `rgba` fills; Android uses `theme.visual.glass.androidFill` |
| `ui/AppChoiceChip.tsx`, `ui/AppStatusChip.tsx` | glass pill; active = inverted neutral (not forest/rainbow); `feedback.selection()` |
| `ui/AppButton.tsx` | add `variant: "glow"` (moss pill, forest-dark label `#14210F`, `boxShadow` halo) for use on forest cards only (37 call sites, others untouched) |
| `ui/AppSectionHeader.tsx`, `ui/PageTitle.tsx` | Sora SemiBold with tightened tracking |
| `ui/AppGroupedList.tsx` (207) | glass card rows for Compte/Paramètres |
| `ui/IbpScoreBadge.tsx` | superseded in lists by `ScoreRing`; keep for places still showing a tile |
| `ui/IbpTotalGauge.tsx`, `ui/FactorProgressRing.tsx` | form batch: tokens and glow only, no size change |
| `navigation/stacks/stack-options.ts`, `navigation/tab-config.tsx`, `tabs/*` | halo backdrop decision, tab restyle |

### Batch sizing and 400-line flags (Q7)
| Batch | Files (non-test) | Lines | Flags |
|-------|------------------|-------|-------|
| 1a Accueil | `HomeScreen.tsx` 371, `home/` 5 files 673 (`ToolsSection` 200, `styles` 181, `NearbyMapCard` 135, `GenusTargetSheet` 105, `ProfileHeaderButton` 45); 4 tests | ~1 050 | `HomeScreen.tsx` is 29 lines under the gate: extract a `home/ResumeCard.tsx` (the compact "Reprendre" two-line card) in the same task |
| 1b Compte + Paramètres | `AccountScreen.tsx` 192, `account/` 4 files 638 (`styles` 176, `IdentityCard` 163, `ProfileRows` 161, `AccountSettingsRows` 138), `SettingsScreen.tsx` 242, `ui/AppGroupedList.tsx` 207 | ~1 280 | none |
| 2a Mes Relevés (+ search page rows) | `SurveyListScreen.tsx` 169, `survey-list/` 6 files 707 (`SurveyRow` 288, `list-chrome` 147, `row-styles` 131), `survey-search/` (`CommunityRow`, `SurveySearchScreen`, `search.styles`) | ~1 100 | none |
| 2b Survey detail | `SurveyDetailScreen.tsx` 255, `survey-detail/` 27 files 2 777 (`ScoringContextEditor` 231, `summary-screen.styles` 206, `summary.styles` 202), `SurveyScoreScreen` 43, `SurveyContextScreen` 107, `SurveyHistoryScreen` 67 | ~3 450 | split plan by summary vs sub-pages if needed |
| 3 Survey form | `survey-form/` 7 files 893 (`FactorPager` 245, `FactorLetterStrip` 225), `survey-wizard/` 3 files 439 (`SurveyWizardScreen` 266), `ui/Factor*Input` 5 files 668 + `FactorInputShell` 91, `IbpTotalGauge` 78, `FactorProgressRing` 67, `SurveyProgressCard` 177 | ~2 500 | refinement only (D-05); contains two colour literals to tokenise |
| 4 Explorer | `PublicMapScreen.tsx` 328, `public-map/` 15 files 1 862 (`ScoreLegend` 204, `useMapViewport` 208, `styles` 194, `ExplorerSheet` 180) | ~2 200 | markers/map untouched; `SurveyParcelSelectionScreen.tsx` (390) is not in scope, do not grow it |
| Foundations | `brand-tokens.ts` 405, `theme.ts` 478 (outside the gate, which covers `screens/` and `navigation/` only), new files | n/a | put additions in new sibling files, not in these two |

### Anti-Patterns to Avoid
- **Real blur on cards or list rows:** violates D-04, costs on mid-range Android, and is invisible over the near-uniform backdrop.
- **`position: "absolute"` floating JS tab bar:** forces bottom padding changes on every scrolling screen.
- **Animating `boxShadow`, `experimental_backgroundImage` or layout props in lists:** animate transform/opacity/SVG props only.
- **Interactive 22 pt bars:** keep navigation on the 44 pt `FactorsList` rows.
- **Copying sketch colours:** `text3 #8A9482`, moss text/rings on light surfaces, `--ok #4C7A2A` chip text all fail; use tokens from the contrast table.
- **Hard-coding 25/35 score splits:** use `bandTone(totalBand(n))`.
- **Counting animation on SVG text.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gradients and halos | SVG gradient per card or a gradient image asset | RN `experimental_backgroundImage` strings built from tokens | Native, layered, no extra view, theme-aware |
| Coloured diffuse shadow, inset highlight | Stacked translucent views | RN `boxShadow` (outset + inset) | Native on both platforms (Android 9+/10+) |
| Reduced-motion handling | Own `AccessibilityInfo` listeners | `ReduceMotion.System`, `useReducedMotion()` | One consistent, documented behaviour |
| Score colour bands | New thresholds in mobile | `bandTone(totalBand(n))` from `@cortege/ibp-domain` | CLAUDE.md: rules live once in the package |
| Font embedding | Runtime `useFonts` | `expo-font` config plugin + `fonts.test.ts` | Existing, tested pipeline |
| Contour randomness | Runtime random paths | Deterministic generator + unit test | Stable visuals, testable |
| Contrast verification | Ad hoc script that rots | Committed jest test over token pairs | Runs in `test:unit`, protects both schemes |
| Screen transitions | Custom JS transitions | native-stack defaults | D-08, system reduced motion applies |

**Key insight:** every effect in variant I is a combination of native style props, one SVG per signature element and UI-thread transforms; the cost is in discipline (budgets, fallbacks, tokens), not in new libraries.

## Common Pitfalls

### Pitfall 1: The colour-literal ESLint rule is not enforced in `ui/` and `screens/` `.tsx`
**What goes wrong:** `mobile/.eslintrc.json` has a first override (all `src/**`) with the hex/`rgba(` selectors and later overrides for `src/screens/**/*.tsx, src/components, src/ui, src/navigation` that redefine `no-restricted-syntax`; ESLint replaces (does not merge) the rule options, so the hex selectors vanish there. Verified: a `"#ABCDEF"` literal in `src/ui/x.ts` errors, in `src/ui/x.tsx` it does not. Existing leaks: `ui/GlassSurface.tsx:73`, `ui/AppActionSheet.tsx:88`, `ui/GenusCameraView.tsx:107`, `screens/survey-form/FactorLetterStrip.tsx:208`, `screens/public-map/ParcelHistoryCard.tsx:100`, `screens/survey-wizard/SurveyWizardScreen.tsx:197`.
**How to avoid:** Wave 0 repairs the config (repeat the two colour selectors in the later overrides, add the new token files to `excludedFiles`) and tokenises the six sites (all are in files this phase touches). Then `npm run lint` is a real gate.
**Warning signs:** new literals appear in `.tsx` without a lint error.

### Pitfall 2: Invalid gradient string silently draws nothing
**What goes wrong:** RN returns an empty layer list for a malformed `experimental_backgroundImage`/`boxShadow` (verified: `"linear-gradient(140deg, #1D3418 0% #334E2B 55%)"` gives 0 layers). White text on the pale canvas.
**How to avoid:** always set `backgroundColor` to a forest fallback; build strings only through the token builders; unit-test the builders against a regex; require `rgba(r, g, b, 0.55)` with a leading zero. Use same-hue `rgba(..., 0)` end stops (not `transparent`) to avoid grey fringing.

### Pitfall 3: Halo versus opaque page-colour header on iOS
**What goes wrong:** Compte, Paramètres and pushed pages use `pageColourHeader` (opaque canvas header, OA-94/OA-125). A stack-wide halo in `contentStyle` starts below that header and shows a seam; making the header transparent re-introduces the "text scrolls under the title" problem OA-94 fixed.
**How to avoid:** apply the halo only on screens with a transparent/blurred or no header (Accueil, Explorer chrome) or as a decorative layer that fades to canvas at its top; decide on the simulator in the Accueil plan; dropping the halo to a flat canvas on opaque-header pages is acceptable under principle 9.

### Pitfall 4: Sage and light text on the halo
**What goes wrong:** measured: sage `#B0C78E` on the halo core `#6F9A3C` is 1.79:1, on a 60% halo blend 2.63:1; white drops to 3.30:1 at the core. **How to avoid:** the halo is top right and fades to 0 by 58% of its radius (sketch); keep muted/sage text on the base forest only (>= 5.03:1 on `#334E2B`) and never place text under the halo core; the pill has its own fill.

### Pitfall 5: Gradient SVG text
**What goes wrong:** `fill="url(#id)"` on `Text` depends on native text-path rendering; font lookup by PostScript name (iOS) / asset file name (Android) must match `Sora-Light`; SVG text ignores Dynamic Type; duplicated gradient ids. **How to avoid:** `useId()` per instance, `fontFamily="Sora-Light"`, spike on the iOS simulator in the first card task, built-in solid fallback, a11y label on the parent (SVG hidden from accessibility).

### Pitfall 6: Entering animations replay in virtualised lists
**What goes wrong:** `FadeInDown` re-fires when `FlatList` remounts rows (`removeClippedSubviews`, `windowSize 7` in `SurveyListScreen`). **How to avoid:** first-mount guard and `index < 8`; module-level Set for ring keys.

### Pitfall 7: Drift keeps running on unfocused screens
**What goes wrong:** native-stack keeps the previous screen mounted; its UI-thread loop continues. **How to avoid:** `useIsFocused()` gate (the repo uses it nowhere yet, it is available in `@react-navigation/native` 7.4.1); cancel on blur; cap two instances.

### Pitfall 8: Reanimated test mock is too small
**What goes wrong:** `mobile/test/react-native-reanimated.mock.ts` has no `useAnimatedProps`, `useDerivedValue`, `withDelay`, `withSequence`, `useAnimatedReaction`, `interpolateColor`, `FadeInDown`, `runOnJS`, and `useReducedMotion` is a constant `false`. **How to avoid:** extend the mock in Wave 0 (`useAnimatedProps(factory) => factory()`, builders via `createChainableBuilder`), and expose a toggle (module-level `setReducedMotion(true)`) so reduced-motion branches are testable.

### Pitfall 9: Coverage ratchet and structure gates
**What goes wrong:** `jest.unit.config.js` thresholds: `src/ui` 59/35/42/59, `src/screens` 56/45/49/55, `src/navigation` 100/98/100/100, `src/app` 91/80/97/95, global 100% for any other path. Untested primitives lower the floor; `structure.test.ts` fails on unused style keys, files > 400 lines under `screens/` and `navigation/`, and literals outside i18n. **How to avoid:** every new primitive ships with a co-located test; delete style keys that lose their reader; new text in `src/i18n/fr/`.

### Pitfall 10: Tab bar assumptions
**What goes wrong:** the native bar is `tabBarHidden`-only (no per-screen hide); the iOS 26 bar ignores `tabBarInactiveTintColor`; making the JS bar absolute breaks `useTabBarClearance`. **How to avoid:** follow the tab table; keep `shouldHideTabBar` plumbing and its tests.

### Pitfall 11: Android cannot be verified locally
Only `adb` platform-tools exist, no emulator; the owner tests on an iPhone. Every Android-relevant effect needs a graceful fallback (no shadow below API 28, flat glass, static contours if frames drop) and is listed for Phase 13 or an Android device pass.

### Pitfall 12: Elevation under translucent cards
`brandShadow.card` includes `elevation: 3`; on Android a translucent card shows a grey shadow smear underneath. Glass cards use a hairline and (optional) `boxShadow`, never `elevation`.

## Code Examples

### Contour generator (port of `topo()`, deterministic, two path groups)
```ts
// Source: .planning/sketches/008-visual-direction/index.html topo(), reshaped for two <Path> nodes
export function buildContourPaths(rings = 11, step = 15, cx = 300, cy = 150) {
  const sage: string[] = []
  const moss: string[] = []
  for (let k = 1; k <= rings; k += 1) {
    const base = 14 * k
    const pts: string[] = []
    for (let a = 0; a <= 360; a += step) {
      const r = base + 7 * Math.sin((a * Math.PI) / 60 + k) + 5 * Math.cos((a * Math.PI) / 37 + k * 2)
      const x = cx + r * 1.5 * Math.cos((a * Math.PI) / 180)
      const y = cy + r * Math.sin((a * Math.PI) / 180)
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
    }
    ;(k % 4 === 0 ? moss : sage).push(`M${pts.join("L")}Z`)
  }
  return { sage: sage.join(" "), moss: moss.join(" ") }
}
```

### Score ring
```tsx
// Source: react-native-svg + Reanimated 4 "Animating SVG" guide
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const p = useSharedValue(reduced || !animateIn ? ratio : 0)
useEffect(() => {
  if (animateIn) p.value = withDelay(delay, withTiming(ratio, { duration: brandMotion.durations.slow,
    easing: Easing.bezier(...brandMotion.easings.decelerate), reduceMotion: ReduceMotion.System }))
}, [animateIn, delay, p, ratio])
const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - p.value) }))
```

### JS tab restyle (in-flow, glow dot)
```tsx
// Source: @react-navigation/bottom-tabs 7.19.2 types (tabBarBackground, tabBarItemStyle, tabBarIcon focused)
tabBarStyle: { backgroundColor: v.tab.background, borderTopColor: v.tab.border, height: ..., paddingBottom: ... },
tabBarIcon: ({ color, size, focused }) => (
  <View style={styles.tabIcon}>
    <Ionicons name={JS_TAB_ICONS[route.name]} size={size} color={color} />
    <View style={[styles.dot, { backgroundColor: focused ? v.tab.dot : "transparent" }]} />
  </View>
),
```

### Contrast unit test skeleton
```ts
// mobile/src/app/visual-tokens.test.ts: relative luminance in-file, no dependency
const pairs = [
  ["onForest text", v.forest.onForest, "#334E2B", 4.5],
  ["pill label", "#14210F", "#89A33A", 4.5],
  // ... one row per measured pair, both schemes through buildTheme("light"|"dark")
] as const
test.each(pairs)("%s meets %s:1", (_n, fg, bg, min) => expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min))
```

## Contrast table (Q8, measured with WCAG 2.1 relative luminance, this session)

| Pair | Ratio | Needs | Result and action |
|------|-------|-------|-------------------|
| White on forest stops `#1D3418` / `#334E2B` / `#0E2210` | 13.49 / 9.27 / 16.73 | 4.5 | pass |
| Title accent `#C8DDA0` on the three stops | 9.19 / 6.32 / 11.40 | 4.5 | pass |
| Meta `#D7E3C0` on the three stops | 10.05 / 6.90 / 12.46 | 4.5 | pass |
| Sage `#B0C78E` on the three stops | 7.33 / 5.03 / 9.09 | 4.5 | pass (tightest: mid stop) |
| White / sage on halo core `#6F9A3C` | 3.30 / 1.79 | 4.5 | **fail**: no text under the halo core (Pitfall 4) |
| White on 60% halo blend `#577C35` | 4.84 | 4.5 | pass; sage there 2.63 fails |
| Tag `#EAF1D8` on 14% white over forest stops | 7.52 / 5.35 / 9.38 | 4.5 | pass |
| Numeral end `#C8DDA0` on `#334E2B` (large text) | 6.32 | 3 | pass; `/50` sage 5.03 pass |
| Pill label `#14210F` on `#B9D76B` / `#89A33A` | 10.36 / 5.87 | 4.5 | pass |
| Glow bar end `#D5EC8F` on 14% white track over forest | 4.80 | 3 | pass |
| Moss `#89A33A` on light surface `#F7F6F0` | 2.63 | 3 (graphic), 4.5 (text) | **fail**: ring/bar high tone on light = `#728A2D` (3.60:1 on surface, 3.41 on canvas); never moss text on light |
| Ochre / terracotta on light surface | 3.28 / 3.85 | 3 | pass |
| Moss / ochre / terracotta on dark surface `#111214` | 6.57 / 5.27 / 4.50 | 3 | pass |
| Terracotta on dark glass (`#18191C` at 72% over `#08090A`) | 4.38 | 3 | pass |
| Sketch `text3` `#8A9482` on light surface; `#62666D` on dark surface | 2.92; 3.25 | 4.5 | **fail**: use `textSecondary` (6.21 light, 7.04 dark) |
| Tab label forest on light glass / dark `accent #9BC26A` on dark glass | 8.47 / 8.98 | 4.5 | pass |
| Tab dot moss on light glass | 2.60 | 3 | decorative, the label carries state (add bold or forest label) |
| `--ok #4C7A2A` chip text on moss 22% over light | 3.90 | 4.5 | **fail**: use `brandColors.forest` (8.56 on surface) |
| Active segment: `#F7F6F0` on `#24311F`; `#08090A` on `#F2F3F1` | 12.64; 17.90 | 4.5 | pass |
Commit a jest test over the final token pairs for both schemes (replaces the earlier "script, not committed" practice of Phase 12). The gradient numeral over a gradient needs only the large-text 3:1 floor; measure at the lightest and darkest point of the actual gradient.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-linear-gradient` / SVG gradients for cards | RN `backgroundImage` CSS gradients (`experimental_backgroundImage` in 0.86.3; docs now name it `backgroundImage`) | RN 0.76+ (New Architecture) | zero deps; wrap behind one helper so a later rename is a one-line change (A4) |
| `shadow*` + `elevation` | `boxShadow` (coloured, spread, inset) | RN 0.76+, Android 9+/10+ | matches the sketch's CSS shadow |
| `Animated` + `useNativeDriver` | Reanimated 4 worklets, CSS animations/transitions, SVG animation (experimental from 4.4) | 2025-2026 | UI-thread loops and SVG props |
| JS bottom bar glass imitation | iOS 26 native Liquid Glass bar (`react-native-bottom-tabs`, `expo-glass-effect`) | iOS 26 | do not re-skin the native bar |
| Android blur always on | expo-blur 57: `blurMethod` default `none`, real blur needs `BlurTargetView` | expo-blur 57 | flat translucent fill is the default and the rule |
| Shared element transitions in Reanimated | still experimental, flag-gated, native-stack only | Reanimated 4 | not used |

**Deprecated/outdated:** `experimentalBlurMethod` in expo-blur (use `blurMethod`); `LayoutAnimation` (already removed from the app).

## Runtime State Inventory

Not a rename/refactor/migration phase: omitted. One persisted item matters for correctness: the theme mode (`local_meta`, `theme-preference.ts`) is unchanged by this phase, so no migration; SQLite `user_version` stays 4.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No outset box-shadow below Android 9 and no inset below Android 10 is acceptable (cards just lose the glow) | Pattern 1 | Android users on old APIs see flatter cards; low |
| A2 | Per-factor tone (0 to 2 terracotta, 3 ochre, 4 to 5 moss) is a display convention from the sketch, kept in `mobile/src/app/ibp-display.ts`, not an IBP rule and not in the shared package | Architectural map, Pattern 3 | Owner or method review may want other cut points; needs owner confirmation |
| A3 | SVG `Text` with gradient fill and the embedded `Sora-Light` renders correctly on iOS and Android (source inspection of `RNSVGTSpan`/`TSpanView` only) | Pattern 4 | Falls back to the solid numeral; spike in the first card task |
| A4 | `experimental_backgroundImage` keeps this name through 0.86.x and behaves identically on Android | Standard Stack | One helper change; Android look unverified locally |
| A5 | A darker moss (`#728A2D`) for light-mode rings/bars is acceptable to the owner | Token plan | Owner may prefer brand moss with a different track/outline |
| A6 | Contours are decoration for forest cards and map placeholders, never over a live MapLibre map (sketch's "carte de contexte" is a placeholder; the app has a real map) | Pattern 2 | Owner may expect lines on the real map card |
| A7 | Forest cards use the same gradient in dark mode as the sketch shows, despite OA-80 ("far too much green" for the old dark palette) | Token plan | Owner may want dimmer or panel-based cards in dark; keep a per-scheme token to switch cheaply |
| A8 | JS tab bar stays in-flow (not floating) and the glow dot exists only in the JS tree; the native iOS bar is untouched beyond tints | Tab table | Owner may expect the sketch's floating bar on iOS (the iOS 26 bar is already floating glass) |
| A9 | The big gradient numeral does not count up (SVG text children cannot be animated); counting applies to tiles/stat text (D-08 "number counting") | Motion spec | Owner may want counting on the numeral; would force the solid-colour fallback |
| A10 | Android mid-range handles two focused drift loops plus static shadows (no device measurement possible) | Pattern 2 | Needs a knob (`drift` off on Android) after a device check |
| A11 | Simulator screenshots (`xcrun simctl io booted screenshot`, `simctl ui booted appearance dark`) are an acceptable executor-side check before the owner's phone, as the owner's workflow memory states | Validation | Process, not product risk |
| A12 | Existing draft rows keep showing a completion ring (neutral tone) instead of the sketch's dashed empty ring | Pattern 3 | Owner may prefer the sketch literally; one-line change |

## Open Questions

1. **Halo behind opaque page-colour headers (iOS).**
   - Known: Compte/Paramètres/pushed pages use an opaque canvas header; Accueil/Explorer differ.
   - Unclear: whether a seam is visible at the header edge in light and dark.
   - Recommendation: decide on the simulator during the Accueil plan; fallback is flat canvas on opaque-header pages.
2. **Owner ruling on D-04 versus the direction text.** CONTEXT D-04 says no generalised blur and no heavy shadows; direction principle 1 says "verre léger (`GlassSurface`)" and the sketch uses `backdrop-filter` on every card. Recommendation: cards get the glass look without blur (visually the same over the backdrop), blur stays on floating controls; the only coloured shadow is on forest hero cards.
3. **Contours on the survey context map card** (A6) and **dark forest cards** (A7): confirm with the owner at the first phone check.
4. **Ten bars versus the factor rows.** Bars are non-interactive; confirm the owner is happy that the Score page keeps its 44 pt factor rows for navigation (recommended) rather than turning the bars into the navigation.
5. **Android visual verification.** No emulator here; decide whether an Android device pass happens in 12.2 or is rolled into Phase 13.
6. **Per-factor colour cut points** (A2) for the owner or the method reviewer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build, jest, eslint | yes | 22.22.3 | none needed |
| npm | workspaces, `npm pack` for the font | yes | 10.9.8 | none needed |
| Xcode + iOS simulators (iPhone 17 family) | executor-side visual check, dark mode toggle | yes | Xcode 27.0 | owner's phone |
| iOS device build (owner iPhone, main checkout recipe in memory) | success criterion 4 | yes (recipe) | Release build with native tab bar | none (required) |
| Android emulator / device | Android visual check | no (only `adb` platform-tools) | n/a | graceful fallbacks, CI `native-android` compile check, Phase 13 device |
| `@expo-google-fonts/sora` tarball (registry) | one-time font copy | yes | 0.4.2 | Google Fonts download of Sora Light (OFL) |
| gsd-tools | planning tooling | yes | n/a | n/a |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Android emulator (see Pitfall 11).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + ts-jest 29.4.6; `@testing-library/react-native` 14 and `react-test-renderer` 19; no jsdom; no snapshot tests exist in the repo (assert on props, tree and pure functions) |
| Config file | `mobile/jest.unit.config.js` (mocks in `mobile/test/`, coverage ratchet per directory) |
| Quick run command | `cd mobile && npx jest --runInBand --config jest.unit.config.js <path>` |
| Full suite command | `npm run test:unit` (root: ibp-domain + api + mobile) |

### Phase Requirements to Test Map
| Req / Criterion | Behaviour | Test Type | Automated Command | File Exists? |
|-----------------|-----------|-----------|-------------------|-------------|
| SC1 direction written and approved | `docs/design/direction-visuelle-12-2.md` status flips from "en attente" to approved with date; charter gets a new section | manual checkpoint + grep | owner approval; `grep -n "approuvée" docs/design/direction-visuelle-12-2.md` | doc exists; approval is manual |
| SC2 tokens complete, light and dark, AA | every new pair meets its ratio in both schemes | unit | `npx jest ... src/app/visual-tokens.test.ts` | Wave 0 |
| SC2 gradient/shadow builders emit valid strings with a fallback colour | regex on builder output, `ForestCard` sets `backgroundColor` | unit | `npx jest ... src/ui/ForestCard.test.tsx src/app/visual-tokens.test.ts` | Wave 0 |
| SC2 contours deterministic, two groups | same output on every call, 11 closed subpaths | unit | `npx jest ... src/app/contour-paths.test.ts` | Wave 0 |
| SC2 score tone from domain bands | ring/bar tones equal `bandTone(totalBand(n))`, dashed when null | unit | `npx jest ... src/ui/ScoreRing.test.tsx src/app/ibp-display.test.ts` | Wave 0 |
| SC2 touch targets and field ergonomics unchanged | interactive primitives keep `minHeight >= 44`; form components' size tokens untouched; bars carry no handlers | unit | `npx jest ... src/ui` (existing Factor*Input tests stay green) plus new assertions | partly exists |
| SC2 structure and literals | no unused style key, no file > 400 lines under screens/navigation, no literal outside i18n | gate | `npx jest ... src/__checks__/structure.test.ts` | exists |
| SC2 colour rule enforced | no hex/rgba literal outside token files | lint | `npm run lint` | repaired in Wave 0 |
| SC2 font | `Sora-Light.ttf` PostScript name and `app.json` entry match | unit | `npx jest ... src/__checks__/fonts.test.ts` | exists, auto-covers the new file |
| SC3 reduced motion | with `useReducedMotion() === true`: rings/bars render at final value, drift loop and entering not started | unit | `npx jest ... src/ui/ContourLines.test.tsx src/ui/ScoreRing.test.tsx src/ui/useEntrance.test.ts` | Wave 0 (mock toggle) |
| SC3 consistent API | no `LayoutAnimation`, no `useNativeDriver: false`, every `entering/exiting/layout` carries `.reduceMotion(...)` | gate test (grep over `src`) | `npx jest ... src/__checks__/motion.test.ts` | Wave 0 (new) |
| SC3 tab trees | `shouldHideTabBar` and tab options for both trees unchanged in behaviour | unit | `npx jest ... src/navigation` | exists, update |
| SC4 owner confirms on phone | per batch and final | manual | iOS device Release build (memory recipe), light and dark, Settings > Accessibility > Motion > Reduce Motion on and off | manual |
| Build integrity | bundle and native compile with the new font | CI | `npm run lint && npm run typecheck && npm run format:check`; CI `mobile-build` (expo export), `native-ios`, `native-android` | CI |

### Sampling Rate
- **Per task commit:** `cd mobile && npx jest --runInBand --config jest.unit.config.js src/ui src/app` (plus touched screen dir) and `npm run lint`
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit && npm run format:check`
- **Phase gate:** full suite green and CI green (including both native jobs, triggered by the font and `mobile/assets/**`) before `/gsd-verify-work`; simulator screenshots light and dark for each batch attached to the PR; owner phone confirmation per batch

### Wave 0 Gaps
- [ ] `mobile/test/react-native-reanimated.mock.ts`: add `useAnimatedProps`, `useDerivedValue`, `withDelay`, `withSequence`, `useAnimatedReaction`, `interpolateColor`, `runOnJS`, `FadeInDown`, and a reduced-motion toggle
- [ ] `mobile/.eslintrc.json`: restore the colour selectors in the later overrides, exclude the new token files; tokenise the six existing literals
- [ ] `mobile/src/app/visual-tokens.ts`, `theme-visual.ts`, `ibp-display.ts`, `contour-paths.ts` with tests (`visual-tokens.test.ts` incl. contrast, `contour-paths.test.ts`, `ibp-display.test.ts`)
- [ ] `mobile/assets/fonts/Sora-Light.ttf` + `app.json` entry + `brandTypography.numeral` role
- [ ] `mobile/src/__checks__/motion.test.ts` (consistency gate)
- [ ] Tests for each new `ui/` primitive (see map)
- [ ] Framework install: none

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json` (key absent, treated as enabled). This phase is presentation only.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | untouched (auth screens are out of the D-09 batches) |
| V3 Session Management | no | untouched |
| V4 Access Control | no | untouched |
| V5 Input Validation | no | no new inputs; the visual primitives take typed props |
| V6 Cryptography | no | none |
| V14 Configuration / supply chain | yes | no new dependency; font is OFL (existing `OFL-Sora.txt`), vendored from a legitimacy-checked source; no network call added |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply-chain package added for a visual effect | Tampering | none added; rely on RN core, SVG, Reanimated already in the lockfile |
| Information shown in decorative SVG or accessibility tree (score leak is not a concern, data is the user's own) | Information disclosure | hide decorative SVG from accessibility, one catalogue label per widget |
| Reduced-motion or vestibular trigger from continuous motion | n/a (accessibility, not security) | `ReduceMotion.System`, focus gating, no loops other than contours |

## Plan decomposition and sequencing (Q9)

Waves are by dependency; D-09 owner checks gate the next batch even if the code could run in parallel.

| Wave | Plan | Content | Depends on |
|------|------|---------|-----------|
| 0 (gate) | 12.2-00 | Owner approval of `direction-visuelle-12-2.md` text (checkpoint:human-verify; ROADMAP criterion 1) | none |
| 1 | 12.2-01 Foundations: tokens and tooling | ESLint repair + six literals, `visual-tokens.ts`/`theme-visual.ts`/`BrandTheme.visual`, `ibp-display.ts`, `contour-paths.ts`, `Sora-Light` + `brandTypography.numeral`, Reanimated mock extension, contrast and motion gate tests | 00 |
| 2 (parallel, disjoint files) | 12.2-02 Surfaces | `ForestCard`, `ContourLines`, `AppCard` glass variant, chips, `AppButton` glow variant, `GlassSurface` token fix, headings, backdrop decision | 01 |
| 2 | 12.2-03 Data-viz and motion helpers | `ScoreRing`, `GlowBar`, `FactorBarsChart`, `GradientNumeral`, `useEntrance`, `AnimatedNumber`, halo pulse helper | 01 |
| 2 | 12.2-04 Tab bars | JS bar restyle + dot, native tints, `tab-bar` tests, `animation: "fade"` | 01 |
| 3 (parallel) | 12.2-05 Accueil | `ResumeCard` extraction (HomeScreen under 400), compact layout, nearby/recent rows with rings, stagger | 02, 03, 04 |
| 3 | 12.2-06 Compte + Paramètres | `AppGroupedList`, `IdentityCard`, rows, theme chips, compact density | 02 |
| owner check 1 | phone, light and dark | | |
| 4 (parallel) | 12.2-07 Mes Relevés (+ search rows) | `SurveyRow` with `ScoreRing`, list chrome, stagger, animated empty state | 03, owner check 1 |
| 4 | 12.2-08 Survey detail | summary forest score card with numeral, glow, tiles, bars, contour placeholders, Score/Contexte/Historique pages | 02, 03, owner check 1 |
| owner check 2 | | | |
| 5 | 12.2-09 Survey form and wizard | radii, gauge glow, progress ring tokens, letter strip, wizard styles; no size or layout change | owner check 2 |
| owner check 3 | | | |
| 6 | 12.2-10 Explorer | chips (inverted active), legend, selected card ring, sheets, cluster list; map untouched | owner check 3 |
| owner check 4 | | | |
| 7 | 12.2-11 Closing | motion consistency audit, dark pass, charter section 13, CLAUDE.md note, icon outline harmonisation sweep (D-07), final owner confirmation (criterion 4) | 10 |

Waves 2 and 3 can run as parallel executions (disjoint files); 4 (07 and 08) likewise. Suggested but optional: run 09 and 10 in parallel if the owner agrees to one combined check.

**What could break the success criteria:** (SC1) building before the approval; (SC2) Android-only regressions unverified, AA failures from copied sketch colours, a bar or chip shrinking a 44 pt target, light-mode ring contrast; (SC3) loops not gated, replaying entrances, mock hiding a missing reduced-motion path; (SC4) owner finds the dark forest cards too green (A7) or the numeral fallback in use (A3). Mitigation: per-scheme tokens, built-in fallbacks, owner checks per batch.

## Sources

### Primary (HIGH confidence)
- Installed packages, read directly: `node_modules/react-native` 0.86.3 (`StyleSheetTypes.d.ts`, `processBackgroundImage.js`, `processBoxShadow.js`, Android `style/*Gradient*.kt`, `drawable/*BoxShadow*.kt`, iOS `RCTRadialGradient.mm`), `react-native-svg` 15.15.4 (`RNSVGTSpan.mm`, `TSpanView.java`, README known issues), `react-native-reanimated` 4.5.1 (`ReducedMotion`, `useReducedMotion`, `repeat.ts`), `expo-blur` 57.0.3 (`BlurView.tsx`, types), `react-native-bottom-tabs` 1.4.0 (`TabView.tsx`), `@react-navigation/bottom-tabs` 7.19.2 and `native-stack` 7.19.2 types.
- Repo files: `mobile/src/app/brand-tokens.ts`, `theme.ts`, `ui/*`, `navigation/*`, `.eslintrc.json`, `jest.unit.config.js`, `test/*.mock.ts`, `src/__checks__/*`, CONTEXT, direction doc, sketch 008 (CSS/JS ranges only).
- Executed in this session: RN 0.86.3 gradient and box-shadow parsers on the sketch's strings; WCAG contrast script; font PostScript-name read and byte comparison; `gsd-tools package-legitimacy check`.
- docs.swmansion.com Reanimated: accessibility guide (ReduceMotion rules), animating SVG, shared element transitions status, performance guide.
- reactnative.dev/docs/view-style-props (boxShadow, backgroundImage, filter platform support).
- docs.expo.dev/versions/latest/sdk/blur-view (Android blur methods, `BlurTargetView`).

### Secondary (MEDIUM confidence)
- docs.swmansion.com Reanimated CSS animations page (no reduced-motion statement, hence not used); expo zoom-transition docs (Expo Router only).

### Tertiary (LOW confidence)
- WebSearch on gradient text in react-native-svg (no authoritative statement; behaviour inferred from native source and marked A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, every version and API read from installed sources and the parsers were run.
- Architecture: HIGH for tokens, primitives, tabs (read from code); MEDIUM for on-device rendering of coloured shadows, SVG gradient text and drift cost.
- Pitfalls: HIGH for the ESLint gap, mock gaps and gates (reproduced); MEDIUM for halo/header seam and Android behaviour.

**Research date:** 2026-10-07
**Valid until:** 2026-11-06 (30 days; RN `backgroundImage` naming may change with the next RN upgrade, re-check if RN is bumped)
