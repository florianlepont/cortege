# Graphic Charter Specification - Etats Sauvages

Version: `v1.0`  
Date: `2026-03-11`  
Source: Etats Sauvages graphic charter, `ETATS_SAUVAGES_CHARTE_EB_V2` (2025-09-16) — internal document, not redistributed in this repository.

## 1) Objective
Define clear, implementation-ready UI rules to ensure the app consistently follows the **Etats Sauvages** visual identity on mobile (and web when relevant).

## 2) Core Brand Principles
The charter defines 4 key visual markers that must be preserved:
- `Typography offset`: side-step mindset, momentum, energy.
- `Black rectangle`: impact and differentiation.
- `Fern`: forest, wild, living nature.
- `Bump`: impulse, strength, signature motion cue.

Product implication: the interface must stay organic, natural, high-contrast, and strongly branded (avoid generic UI patterns).

## 3) Official Color Palette
Extracted from the charter palette page:

| Token | Hex | CMYK | Recommended UI usage |
|---|---|---|---|
| `brand.terracotta` | `#CD5833` | C00 M77 Y86 K00 | Strong accent, secondary CTA, brand alerts |
| `brand.moss` | `#89A33A` | C56 M16 Y100 K02 | Primary accent, success, active states |
| `brand.forest` | `#334E2B` | C88 M42 Y100 K46 | Main brand color (titles, strong text, deep surfaces) |
| `brand.sage` | `#B0C78E` | C42 M5 Y55 K0 | Soft backgrounds, secondary surfaces |
| `brand.mauve` | `#9494B0` | C48 M40 Y18 K00 | Secondary/info accent |
| `brand.ochre` | `#CC701F` | C5 M65 Y100 K00 | Signal/warm emphasis |
| `brand.salmon` | `#DA8D77` | C00 M55 Y50 K00 | Editorial accents/backgrounds |

Support colors (from logo rules):
- `brand.black`: `#000000`
- `brand.white`: `#FFFFFF`

## 4) Official Typography
According to the charter:
- `Mazzard H` (Light/Regular/Bold/Black): titles and primary text.
- `HeadTurn Smooth`: highlighted word(s) / very short emphasis text.
- `Futura` (Medium/Bold): secondary text.

UI usage rules:
- Screen title: `Mazzard H Bold/Black`.
- Body, labels, inputs: `Mazzard H Regular`.
- Secondary metadata/microcopy: `Futura Medium`.
- Short editorial badge (1-3 words): `HeadTurn Smooth` (limited use).

Fallbacks when custom fonts are unavailable:
- `Mazzard H` -> `Avenir Next` / `system-ui`
- `Futura` -> `Avenir Next` / `system-ui`
- `HeadTurn Smooth` -> `Mazzard H Bold`

## 5) Logo Rules (Mandatory)
### 5.1 Clear Space
- Keep a protective area of `1/6 of X` around the logo (charter rule).

### 5.2 Minimum Size
- Never go below `25 mm` in print.
- For digital UI, use a practical minimum equivalent: `>= 95 px` width.

### 5.3 Forbidden Uses (DON'T)
- Do not change logo opacity.
- Do not change logo colors.
- Do not distort logo proportions.
- Do not change logo typography.
- Do not shift the bump element inside the logo.

## 6) Visual Language Elements
### 6.1 Highlights
- Always in `UPPERCASE`.
- Respect the intended highlight shape proportions.
- Padding around highlighted word: `0.5x` (x = lowercase x height).

### 6.2 Icons and Arrows
- Can use charter colors.
- Purpose: rhythm, signaling, key information emphasis.

### 6.3 Fern
- Brand ornamental/background element.
- On photography: natural tones only.
- Prefer tone-on-tone and non-intrusive placement.

### 6.4 Bump
- Always placed at the bottom of a visual/container.
- Never centered.
- Minimum width: `40%` of the visual width (vertical, square, horizontal formats).

### 6.5 Diagrams
- `< 6` segments: monochromatic scale or multiple colors are acceptable.
- `> 6` segments: use distinct colors for readability.
- Use simplified round logo badge in center with shadow.

## 7) Product UI Translation (Mobile)
### 7.1 Centralized Tokens
Create/maintain a single token file (`mobile/src/app/brand-tokens.ts`) containing:
- Official colors.
- Typography styles and scale.
- Radius, shadow, spacing primitives.

### 7.2 Visual Hierarchy
- Main app background: light natural tones (`sage`/neutrals).
- Premium surfaces (hero/strong cards): `forest` with overlays.
- Primary CTA: `moss` or `forest` depending on contrast.
- Secondary CTA: `forest` outline or `terracotta/ochre` fill.

### 7.3 Key Components
- `Buttons`: rounded corners, strong typographic weight, avoid oversized labels.
- `Tabs/Segmented controls`: clean pill style, deep-tone active state.
- `Cards`: soft borders, light surfaces, text contrast >= AA.
- `Chips/Badges`: limited and intentional usage, avoid rainbow combinations.
- `Map overlays`: subtle brand cues only (fern/bump only if readability is preserved).

### 7.4 Authentication Screen
- Keep only essential decorative elements (no visual overload).
- Ensure clear branding: logo + "Etats Sauvages".
- Keep balanced proportion between CTAs and form fields.

## 8) Minimum Accessibility Requirements
- Standard text contrast: target `WCAG AA`.
- Do not encode status by color alone (add icon/text).
- Minimum touch target size: `44x44 pt`.

## 9) Design QA Checklist (UI Definition of Done)
- Only charter color tokens are used.
- Typography is compliant (or fallback is explicitly documented).
- Logo usage is compliant (clear space, size, no forbidden transforms).
- No decorative overload.
- Component styling remains consistent across screens.
- Contrast is validated on critical screens (auth, list, detail, map).

## 10) Governance
- Any non-charter color must be explicitly approved (PR + rationale).
- Any new component variant must reference existing design tokens.
- This spec is authoritative for UI decisions until a newer charter version is published.

## 11) Field-Entry Patterns (Phase 3, 2026-09-27)

Phase 3 ("Field-Entry Ergonomics", UX audit Lot 1) shipped its own minimal token slice and a set of
new field-entry components. Documented here so this spec matches what the app actually does; Phase 4
("Visual Foundations & Motion") builds the rest of the design system on top of this slice rather than
redoing it.

### 11.1 Token slice (`mobile/src/app/brand-tokens.ts`)
- `brandSpacing4`: a strict 4-grid (`xxs 2, xs 4, sm 8, smd 12, md 16, lg 24, xl 32, xxl 48`),
  additive to the existing `brandSpacing` aliases (which stay in place during the migration).
- `brandFieldState`: the three states any field-entry control renders — `empty` (neutral),
  `error` (terracotta, only shown once a field is touched or submission is attempted), `complete`
  (moss). Never encodes state by color alone: each state also has a distinct icon
  (`checkmark-circle` / `alert-circle`) and text.
- `brandInteraction`: `pressedScale 0.97`, `pressedOpacity 0.9`, `disabledOpacity 0.4`,
  `hitTarget.min 44`.
- `brandMapTokens`: parcel map polygon colors — `parcelSelected` (terracotta, 3px stroke),
  `parcelStudied` (moss), `parcelNeutral` (sage, 2px stroke), plus their fill variants and
  `userLocation`. Selected outranks studied outranks neutral.

### 11.2 `FactorInput` (`mobile/src/ui/Factor{Counter,Segmented,Chips,Slider}Input.tsx`)
Four variants, all sharing `FactorInputShell`'s tri-state border/icon/error rendering
(`resolveFactorInputState(hasValue, showError)`, where `showError` is always the caller's own
`touched && Boolean(error)` — no variant ever shows an error before the field has been left or
submission attempted):
- **Counter** (`FactorCounterInput`): 56pt −/+ targets with long-press acceleration; tapping the
  number opens a comma-accepting text fallback for values a tap count would be tedious for.
- **Segmented control** (`FactorSegmentedInput`): a single-select row of pills, generic
  `options: {value,label}[]`.
- **Chips** (`FactorChipsInput`): checkable chips (built on `AppChoiceChip`) with a count derived
  from the selection, generic enough to be reused for a future genus-list input.
- **Slider** (`FactorSliderInput`): a draggable/tappable track in configurable steps (5% for the
  IBP factors that use it), plus explicit ±step buttons so the control works without fine gesture
  control (gloves, direct sunlight).

### 11.3 Factor pager (`mobile/src/screens/survey-form/FactorPager.tsx`)
A horizontal pager (A→J) with a fixed footer control: prev/next chevrons, a position indicator,
per-factor tone dots (tap to jump), and a "next incomplete factor" shortcut
(`factor-pager.ts`'s `findNextIncompleteFactorIndex`). Replaces the previous per-factor stack
screen, which required returning to the factor grid between every pair of factors.

### 11.4 Fixed action bar (`mobile/src/screens/survey-form/FixedActionBar.tsx`)
A bottom bar fixed outside the scrolling content (not a CTA at the end of a long scroll) carrying
the step's primary CTA and, on the factors step, the visible autosave line ("Enregistré · 14:32",
"Enregistrement…", or "Échec de l'enregistrement" in terracotta) — replacing a "Save draft" label
that implied a manual step where autosave already runs.

### 11.5 Progress ring and total gauge
- `FactorProgressRing` (`mobile/src/ui/FactorProgressRing.tsx`): an SVG ring (`react-native-svg`)
  that fills as a factor's fields are completed and morphs into a check mark once done. Used in the
  2×5 factor summary grid.
- `IbpTotalGauge` (`mobile/src/ui/IbpTotalGauge.tsx`): a 10-segment gauge (one bar per factor,
  colored by that factor's state) plus the running score total, rendered on every wizard step (not
  only the factors step), so the total is visible from the first screen.

### 11.6 "Parcels near you" sheet
`NearbyParcelsSheet` (`mobile/src/screens/survey-form/NearbyParcelsSheet.tsx`): a native `Modal`
(`presentationStyle="pageSheet"` on iOS) offered as an alternative to tapping a polygon on the map,
with 56pt checkable rows. Reuses the existing `useNearbyParcelsState()` context rather than a
separate fetch.

## 12) Visual Foundations & Motion (Phase 4, 2026-09-27)

Phase 4 ("Visual Foundations & Motion", UX audit Lot 2) closes the gap between this spec and the
shipped app: real typefaces, the full semantic color token set (with an ESLint rule enforcing it),
`react-native-reanimated` 4 as the motion engine, a single pressable primitive, and a loading
skeleton. Before any of this was written, a sketchboard (an interactive HTML mock, not shipped code)
was iterated on live with the product owner — the typeface and the IBP badge's colors below are its
direct output, not an implementer's unilateral call. Full rationale and the batch-by-batch build
record: `.planning/phases/13-visual-foundations-motion/`.

### 12.1 Typefaces actually loaded

Neither of the charter's named faces can be embedded today: Mazzard H has no licence yet, and Avenir
Next is Apple-proprietary — not redistributable, and absent on Android. **Sora** (title/body stand-in
for Mazzard H) and **Jost** (meta stand-in for Futura, itself explicitly modeled on the same
geometric-sans tradition) are OFL-licensed and load instead, embedded via an `expo-font` config
plugin in `mobile/app.json` (`mobile/assets/fonts/*.ttf`, sourced from the `@expo-google-fonts`
packages and then vendored directly — no runtime dependency on those packages). This is a temporary,
reversible substitution: `brandFontFamilies` in `mobile/src/app/brand-tokens.ts` keeps the charter's
real `preferred` name next to the `standIn` actually rendered, so swapping in Mazzard H later is a
token-file change, not a design decision.

`brandTypography` roles name a concrete embedded font file (its file name is its PostScript name: iOS finds a font by that internal name, Android by the file name, so the two must match, `mobile/src/__checks__/fonts.test.ts`, OA-05) rather than a family + numeric
`fontWeight` (static per-weight files risk Android re-synthesizing a different weight on top of the
one already baked into the file):

| Role | Embedded file |
|------|---------------|
| `heroTitle`, `sectionTitle` | `Sora-ExtraBold` (Sora ships no 900 cut) |
| `heroBody`, `sectionBody` | `Sora-Medium` |
| `label` | `Sora-ExtraBold` |
| `input` | `Sora-SemiBold` |
| `button` | `Sora-Bold` |
| `heroEyebrow`, `meta` | `Jost-SemiBold` |

`brandDefaultFontFamily` (`Jost-Regular`) is the fallback for any `<Text>` that doesn't spread a
`brandTypography` role. Since React Native's `Text` has no `defaultProps` to patch in this RN version
(a plain function component, not a class), `mobile/src/ui/AppText.tsx` is the mechanism instead: it
wraps RN's `Text` with the default font first in the style array (an explicit `fontFamily` from a
`brandTypography` role still overrides it), and every other `Text` import from `"react-native"` across
`mobile/src` is aliased to it (`import { AppText as Text } from ".../ui/AppText"`) — this is the one
place in the codebase that concerns itself with a global `Text` default; it is not a precedent for
wrapping other RN primitives the same way.

### 12.2 Semantic color tokens

125 hard-coded hex/`rgba` literals outside `brand-tokens.ts` (measured at 119 on this branch, after
Phase 3) are gone. An ESLint rule (`mobile/.eslintrc.json`, `no-restricted-syntax` on `#hex` and
`rgba(`/`rgb(` literals) rejects a new one anywhere under `mobile/src` except the token files. Since
Phase 12.2 there are five of them; see section 13.1 for the list and the rule's exact scope.

**Contrast fixes (DS-01/DS-02)** — white text directly on a saturated fill, and the raw
ochre/terracotta hue directly on their own soft backgrounds, both measured below WCAG's 4.5:1:
- `brandOnWarningSurface` (`#7A4A0A`) and `brandOnDangerSurface` (`#8A2F14`): darkened text tokens
  for `warningSoft`/`errorSoft` backgrounds (~5:1+). `brandOnSuccessSurface` is `brandColors.forest`
  (already AAA on `successSoft`/`sage`).
- `ibpScoreTokens.colors`: every band now pairs a soft background with a darkened text token instead
  of white on a saturated fill — `high` is forest-on-sage (5.03:1, was white-on-moss at 2.85:1),
  `mid` and `low` follow the same pattern. The saturated hues stay in use elsewhere (the progress
  ring, a filled pill) — this only changes where body text sits directly on the fill.
- The same fix applies everywhere else the ochre/terracotta-on-soft pair appeared:
  `brandComponentTokens.notice.{warningText,dangerText}`,
  `brandComponentTokens.surveyList.{workflowWarningText,workflowDangerText,supportDangerText,badgeDangerText}`,
  `brandFieldState.error.{text,icon}`.

**New token groups**, added to `mobile/src/app/brand-tokens.ts`:
- `brandColors` additions: `forestNight` (a near-black forest, deep backdrops), `disabledMuted`,
  `disabledNeutral` (disabled-state fills the hex migration surfaced).
- `brandSemanticColors` additions (the "glass over a dark hero" family, alongside the existing
  `heroBodyOnDark`/`heroMetaOnDark`/`heroPanelBorderOnDark`/`heroPanelBackgroundOnDark`/
  `heroOrbOnDark`): `heroTextMutedOnDark`, `heroSurfaceOnDark`, `heroSurfaceStrongOnDark`,
  `heroBorderStrongOnDark`, `heroAccentTintOnDark` (a sage tint, distinct from the existing
  moss-based `heroOrbOnDark`), `heroScrimOnDark` (near-black, for photo/map backdrops),
  `haloOnDark`. Several distinct source opacities were deliberately consolidated onto one shared
  value each rather than preserved as one-off magic numbers.
- `brandOnDarkStatus`: success/warning/danger border+background pairs for status pills and cards
  over the dark forest hero, plus a stronger `dangerScrimBackground`/`dangerScrimBorder` pair for a
  destructive action button over the near-black media backdrop.
- `brandTranslucentPanel`: floating-panel opacities over the map or a photo (`subtle`/`default`/
  `strong`/`strongest`/`muted`) — a Liquid Glass placeholder with no blur yet (real blur is Phase 12,
  DS-15).
- `brandMediaBackdrop`: the dark solid backdrop behind full-screen media/map surfaces before content
  loads.
- `brandTintOnLight`: decorative tint overlays on a light (not dark-hero) surface —
  `CreateSurveyCard`'s accent orb, border and badge.
- `brandStatTileTint`: `StatTile`'s severity-tinted chip background/border, two opacity steps.
- `brandMapTokens` additions: `publicMarkerSurvey`/`publicMarkerCurrentPosition`, the public map's
  pin colors, tokenized as-is — their actual redesign to score-band markers with a legend is Phase
  9's job (MAP-03), not this phase's.

### 12.3 Motion (`brandMotion`, `react-native-reanimated` 4)

`react-native-reanimated` 4 (New Architecture only) replaces the legacy `Animated` API's
`useNativeDriver: false` pattern (JS-thread only, and the reason the collapsible headers couldn't
animate `height` on the UI thread before). `brandMotion` in `brand-tokens.ts` stays plain data (no
Reanimated import in the tokens file):

- **Durations** (ms): `instant 100`, `fast 160`, `base 240`, `slow 360`, `emphasis 500`.
- **Easings** (bezier control points, for `Easing.bezier(...)`): `standard [0.2, 0, 0, 1]`,
  `decelerate [0, 0, 0, 1]`, `accelerate [0.3, 0, 1, 1]`.
- **Springs** (for `withSpring(value, brandMotion.springs.x)`): `press { damping 18, stiffness 420,
  mass 0.6 }`, `snappy { damping 20, stiffness 260 }`, `gentle { damping 22, stiffness 140 }` — the
  audit's exact numbers, tried live in the sketchboard and kept unchanged.
- **List stagger**: `staggerMs 40`, `staggerMax 8`.

Migrated to Reanimated: the survey-form wizard header (`useWizardScroll.ts`/`FormHeader.tsx`) and the
survey-list hero (`SurveyListScreen.tsx`/`ListHero.tsx`) — both now drive a `useSharedValue` scroll
position through `useAnimatedScrollHandler`, with each `Animated.View`'s `useAnimatedStyle` computing
its own `interpolate(scrollY.value, ..., Extrapolation.CLAMP)` rather than consuming a precomputed
interpolation object (Reanimated's `interpolate` only reacts inside a worklet). `LayoutAnimation`
(ignores "Reduce Motion") is gone from `AppCollapsibleSection` and `AccountSettingsRows`, replaced by
`LinearTransition`/`FadeIn`/`FadeOut` with `.reduceMotion(ReduceMotion.System)`.

`ui/feedback.ts` is the single place the app calls `expo-haptics`: `selection()`,
`impact.{light,medium}()`, `notify.{success,warning,error}()`. None of these gate on
`Platform.OS === "ios"` — `expo-haptics` already no-ops safely elsewhere, so the previous iOS-only
helper (`survey-list/haptics.ts`, now deleted) was needlessly withholding feedback from Android.

### 12.4 `AppPressable` — the single pressable primitive (DS-06)

`mobile/src/ui/AppPressable.tsx` replaces the inconsistent pressed-opacity values (0.7, 0.4, 0.76…)
spread across individual components:
- **Spring scale** to `brandInteraction.pressedScale` (0.97) via `brandMotion.springs.press`, applied
  to an inner `Animated.View` rather than the `Pressable` itself (Reanimated's
  `createAnimatedComponent` can't consume the `style={(state) => ...}` callback form several existing
  consumers rely on — wrapping instead of replacing keeps it working). Skipped entirely under
  `useReducedMotion()`.
- **Android ripple** (`android_ripple`), defaulting to `brandInteraction.rippleColor`
  (`rgba(0, 0, 0, 0.08)`).
- **A required `accessibilityLabel`** — not optional; TypeScript enforces it at every call site.

Migrated: `AppButton` (previously had no pressed feedback at all), `DraftCard` and `ParcelNearbyCard`
(neither had an accessibility label before this phase).

### 12.5 Loading skeleton

`ui/Skeleton.tsx` exports `Skeleton` (a single pulsing block) and `SkeletonRow` (a leading block plus
two text lines, shaped like the card rows it stands in for). Pulses opacity 0.5 → 1 over 900ms;
renders a fixed 0.75 opacity instead of pulsing under "Reduce Motion", and pauses/resumes via
`AppState` while the app is backgrounded. Replaces the Accueil nearby-parcels loading state's static
placeholder boxes (LIST-08). The same "respects Reduce Motion, pauses in the background" treatment
was applied to the app's one other ambient decorative loop, the auth screen's background blobs
(`auth-gate/HeroSection.tsx`) — left on the legacy `Animated` API since it already runs
`useNativeDriver: true` and isn't one of DS-07's `useNativeDriver: false` cases.

## 13) Visual Direction, variant I (Phase 12.2, 2026-10)

Phase 12.2 ("Visual Modernisation") gave the app the look the owner chose from sketch 008, variant
I: calm and modern like Linear, with luminous forest cards, glass and contour lines as the
signature. This section records what shipped after four owner phone checks (2026-10-07 and
2026-10-08), not the first plan. The French direction text, with the owner's corrections, is
`docs/design/direction-visuelle-12-2.md`. Build record: `.planning/phases/23-visual-modernisation/`
(`23-UI-SPEC.md`, decisions D-01 to D-30 in `23-CONTEXT.md`, and the `23-NN-FIXES.md` logs).

### 13.1 Tokens

- **Light or dark: the system decides.** `BrandThemeProvider` (`app/theme.ts`) builds the theme
  from `useColorScheme()` and follows every system change live. There is no in-app theme setting
  (owner decision, 2026-10-08: the Apparence choice of Paramètres was removed), so UIKit (tab bar,
  Liquid Glass, alerts, keyboard) and the JS theme always agree. `app.json` keeps
  `userInterfaceStyle: "automatic"`; a `theme_mode` row an older build left in `local_meta` is
  ignored.
- **Where colours live.** Hex and `rgb()`/`rgba()` literals are allowed in five token files only:
  `app/brand-tokens.ts`, `app/theme.ts`, `app/visual-tokens.ts`, `app/theme-visual.ts` and
  `app/forest-aurora-tokens.ts`. The ESLint rule (`mobile/.eslintrc.json`, `no-restricted-syntax`)
  applies to every `.ts` and `.tsx` under `mobile/src` except those files, `src/i18n/**` and tests.
- **`app/visual-tokens.ts`**: static stops and builders (`forestStops`, `buildLinearGradient`,
  `buildRadialGradient`, `buildForestImage`, `buildForestHeroImage`, `buildInsetRing`,
  `withAlpha`), the glass fills (`brandGlassFills`, `mapControlGlass`, `explorerSheetGlass`,
  `glassCtaFills`), the download edge glow and chart geometry (`scoreRingGeometry`,
  `factorBarGeometry`, `glowBarGeometry`, `numeralGeometry`).
- **`app/theme-visual.ts`**: `makeVisualColors(scheme, colors)` resolves the stops per scheme into
  `BrandVisual`, read by components as `useBrandTheme().visual` (`backdrop`, `forest`, `pill`,
  `glass`, `mapControl`, `mapPanel`, `sheet`, `glassCta`, `tab`, `score`, `factorBar`, `chip`,
  `pressWave`, `edgeGlow`, `downloadBar`).
- **`app/forest-aurora-tokens.ts`** (colours) with `app/forest-aurora-shape.ts` (geometry and
  timing) and `app/forest-motion.ts` (pure motion plans): the forest card backdrop (13.2).
- **Brand dims** stay in `brand-tokens.ts`: radii (13.2), typography roles (13.3), `brandMotion`,
  `button.minHeightPanel` 46 (the Explorer download button), map colours such as
  `parcelUnscored` (warm grey `#8C847A`).
- **Contrast tests.** `app/visual-tokens.test.ts` checks every text and graphic pair of the UI-SPEC
  in both schemes, the dark distinctness of the 18 per-scheme tokens, and the map glass over
  light and dark basemaps. `app/forest-aurora-tokens.test.ts` stacks every animated layer of the
  forest card at its peak behind each block of text; its margins are thin (lowest 3.03:1 for a 3:1
  graphic, 4.56:1 for text), so any retune of the mist or the shields must re-run it.

### 13.2 Surfaces

- **Cards: glass without blur** (D-12). `AppCard variant="glass"`: translucent fill, hairline,
  1 pt inner top highlight, no `elevation`. Real blur (`GlassSurface`: `BlurView` before iOS 26,
  `GlassView` Liquid Glass on iOS 26) stays on floating controls only: sheets, map buttons and
  chips (D-04). The system blur behind a collapsed large title (13.8) is the header's own.
- **Over a map, dense glass.** Basemaps stay light in dark mode (they do not follow the scheme),
  so floating controls take `GlassSurface`'s `surface` prop: `theme.visual.mapControl.glass` with
  its own ink for control-like overlays (`MapControls`, `MapTitlePill`, the Accueil map pills),
  `theme.visual.mapPanel` (the Explorer sheet's dense fill) for cards and banners that keep the
  theme's text (parcel picker card, offline banner).
- **Explorer sheet: native glass in both schemes** (12.2-23). On iOS 26 the sheet is Liquid Glass
  (`theme.visual.sheet.glass`): dark `darkGlassTint` (0.68 Graphite), light `lightGlassTint`
  (0.68 warm paper). Its content takes the glass ink (`withGlassInk`: brighter inks in dark,
  `glassInkLight` darker secondary, strong and danger inks in light), which keeps 4.5:1 over the
  white plan, the satellite and black (`app/glass-density.test.ts`). Older iOS and Android keep the
  blur with the 0.88 fill.
- **Forest card** (`ui/ForestCard.tsx`, at most one per screen: Accueil resume card, Mes Relevés
  summary card, survey detail score card). An unclipped shell carries the only coloured shadow; a
  clipped inner view carries the gradient (`#1D3418` to `#334E2B` to `#0E2210`, halo top right,
  dimmer in dark through one token, D-14), the solid fallback `#334E2B`, and its edge as an inset
  ring. Over the gradient and under the content, `ui/ForestAurora.tsx` draws the backdrop the owner
  tuned live in sketch 010 (`.planning/sketches/010-forest-card-motion/round4.html` for the values,
  `round5.html` for the diagonal lines):
  - three soft radial discs of mist (moss, teal, ochre) drifting on legs of 7 s, 9 s and 11.5 s;
  - four diagonal S-curve contour lines over the whole card, with a short dash of light flowing
    along each (passes of 7, 10, 13 and 10 s);
  - an SVG mask fading the lines behind text (12% left) and a feathered radial shield behind each
    measured block of text (`blocks`, `shield` props). No layer draws a flat zone or a hard edge.
  The aurora replaced earlier tries (drifting contours, waves, ripples). `motion={false}` draws the
  bare gradient.
- **Layering rules** (12.2-17): no `borderWidth` on a view that carries
  `experimental_backgroundImage` (RN tiles the gradient under the border; use `buildInsetRing`),
  and no `borderCurve`: corners are circular everywhere, because shadows and clips are circular
  (owner: the difference is invisible, D-29).
- **Radii** (`brandRadius`): `card` 22, `forestCard` 26, `forestHero` 28, tile 16, icon tile 12,
  field 18, pill 999, `bar` 6.
- **Backdrop** (D-19): `ScreenBackdrop` draws a moss and sage halo (forest in dark) on every screen
  through `ScreenFrame`, under a transparent header; content is inset below the header, never
  under it.

### 13.3 Typography

Sora and Jost stay (D-06). One new embedded file, `Sora-Light.ttf` (PostScript name `Sora-Light`).
New `brandTypography` roles:

| Role | Font, size / line height |
|------|--------------------------|
| `numeral` | `Sora-Light` 68 / 72, tracking -3.4 (Score page) |
| `numeralCard` | `Sora-Light` 56 / 60, tracking -2.8 (survey summary card, D-24) |
| `numeralUnit` | `Jost-Regular` 20 / 24 ("/50") |
| `screenTitle` | `Sora-SemiBold` 24 / 28, tracking -0.6 |
| `sectionHeader` | `Sora-SemiBold` 13 / 18 |
| `ringValue` | `Sora-SemiBold` 12 / 16 |
| `navLargeTitle`, `navTitle` | `Sora-SemiBold` 28 and 17 (native iOS large and collapsed titles, D-30) |

Weight 300 is used by the score numeral only. The factor input chrome, auth and onboarding keep
their legacy roles (`heroTitle`, `sectionTitle`, `label`, `input`, `button`).

### 13.4 Colour rules

- **Accent is reserved**: the active tab tint and the JS tab dot, the moss glow pill on the
  Accueil resume card, section header trailing actions, the high band of rings and bars, the glow
  bar, text links and the icon tiles of Compte and Paramètres. Not accent: chips, segments,
  chevrons, field borders.
- **Big calls to action are forest**, not moss: the native glass button (13.5) is tinted with the
  charter forest `#334E2B` and a white label (owner choice D-28).
- **Light mode high tone `#728A2D`** (3.6:1 on the light surface) for rings and bars; brand moss
  `#89A33A` is never text and never a ring or bar on a light surface (D-16).
- **Three sketch colours are forbidden** because they fail AA: the sketch's `text3` (`#8A9482`,
  and `#62666D` in dark) as text, moss as text or graphic on light surfaces, and the `--ok`
  `#4C7A2A` chip text. Light text never sits under the forest halo core.
- **Factor tones are a display convention**, not an IBP rule (D-15): 0 to 2 terracotta, 3 ochre,
  4 to 5 the high tone, in `app/ibp-display.ts`. Totals take `bandTone(totalBand(n))` from
  `@cortege/ibp-domain`; never a split copied from the sketch.
- **Explorer parcels**: a parcel without a score is warm grey (`parcelUnscored`); green means a
  high score only. A scored survey keeps its marker at parcel zoom until a scored parcel shows it
  (`markerItemsAtParcelZoom`), and a tap on a marker opens the survey directly (no intermediate
  card). The parcel picker keeps its sage and moss.
- **Terracotta** is for alerts, destructive actions and the low band only, never a CTA.

### 13.5 Primitives (`mobile/src/ui/`)

| Primitive | Role |
|-----------|------|
| `ForestCard`, `ForestAurora` | forest card and its animated backdrop (13.2) |
| `ContourLines` | static contour rings (`app/contour-paths.ts`): survey map card placeholder, behind the Accueil "Nouveau relevé" card; its drift exists but every use is still (`animated={false}`) |
| `GradientNumeral` | SVG score numeral, white to `#C8DDA0`; `NUMERAL_RENDER_MODE` stays `"gradient"` (kept at the batch 2 check), `"solid"` is the one-line fallback |
| `GlowBar`, `ScoreRing`, `FactorBarsChart` | glowing /50 gauge; 38 pt list ring on the trailing side of rows (D-27a), dashed when there is no score; ten non-interactive factor bars, on the Score page only (D-24) |
| `AnimatedNumber`, `HaloPulse` | count-up for tile values; one-shot halo on submit and sync success |
| `useFocusEntrance` / `EntranceView`, `useListEntrance` / `ListEntranceRow` | section slide-up on each focus (360 ms, 20 pt); list row entrance, rows 0 to 7, first mount |
| `RipplePressable` | green wave from the touch point on list rows (D-21), a highlight under Reduce Motion |
| `ScreenFrame`, `ScreenBackdrop` | canvas, halo and header inset; `largeTitle` for native collapsing titles |
| `AppCard` `variant="glass"`, `GlassSurface` `surface` | card glass without blur; floating glass with a dense fill over maps |
| `AppButton` `variant="glow"` | moss gradient pill, on the Accueil resume card only; the resume card only resumes (or starts a survey when there is no draft), and beside a draft "Nouveau relevé" is its own glass card below it (`home/NewSurveyCard.tsx`) |
| `GlassButton` | the big CTA: native SwiftUI `glassProminent` button on iOS 26 (`NativeGlassButton.ios.tsx`, `@expo/ui`), flat translucent forest fallback elsewhere; transparent floating action bar (D-27c, D-28) |
| `useScreenVisible` | focused and not under an app overlay: every loop and focus entrance waits for it |

Navigation-level: `DownloadEdgeGlowHost` (`navigation/download-edge-glow.tsx`) draws `EdgePulse`, a
full-screen pulsing green edge glow over the panel and the tab bar while the Explorer download panel
is open; `DownloadStatusView` shows the progress bar and its done and failed states.

### 13.6 Motion

Everything goes through `brandMotion` with `ReduceMotion.System`; haptics only through
`ui/feedback.ts`; no `LayoutAnimation`, no `useNativeDriver: false`; only transform, opacity and
SVG props animate.

| Area | Element | As shipped |
|------|---------|------------|
| Score | glow bar | 0 to value, 500 ms decelerate, 120 ms delay |
| | numeral | fade and 8 pt rise, `springs.snappy` |
| | list rings | 360 ms, 40 ms stagger, rows 0 to 7, once per survey and score |
| | factor bars | `scaleY` from the bottom, `springs.gentle`, 40 ms stagger |
| Entrances | Accueil sections and others | 360 ms slide-up of 20 pt, replayed on each focus, 40 ms stagger |
| | list rows | rows 0 to 7, first mount only |
| Feedback | press | `AppPressable` spring 0.97; list rows the 420 ms green wave |
| | finish and sync | `HaloPulse` 500 ms with `notify.success()`; the pager's "Terminer le relevé" finishes the survey (D-25, D-26) |
| Ambient | forest card mist and flowing light | endless, linear, per-mount jitter; fades in over 700 ms |
| | download edge glow | 750 ms half beats; full and still under Reduce Motion |
| | skeleton | 900 ms pulse |
| Transitions | stacks, sheets | native; JS tabs `fade` (`none` under Reduce Motion) |

Reduce Motion: values start at their final state, entrances jump to the end, loops stay still.
Every endless loop (`withRepeat`, `Animated.loop`) runs only while `useScreenVisible()` is true. A
screen shows at most two animated hero layers (forest aurora or drifting contours); today each
route has at most one. React Native `Animated` is allowed only in six listed files (sign-in,
welcome and splash screens, the confetti, the Explorer sheet), each with its own reduced-motion
guard; the confetti is only rendered when motion is allowed.

### 13.7 Gates

| Gate | File |
|------|------|
| Colour literals only in the five token files | `mobile/.eslintrc.json` |
| Contrast, both schemes; forest card worst case | `app/visual-tokens.test.ts`, `app/forest-aurora-tokens.test.ts` |
| Motion: guarded timings per call, legacy `Animated` allowlist, loops gated by `useScreenVisible`, hero budget of two, haptics only in `feedback.ts` | `src/__checks__/motion.test.ts` |
| Icons: every Ionicons glyph ends in `-outline` (D-07) | `src/__checks__/icons.test.ts` |
| No em dash in any string, template or JSX text (`survey-export.ts` excepted) | `src/__checks__/catalogue-dash.test.ts` |
| No border on a gradient view, no `borderCurve` | `src/__checks__/layers.test.ts` |
| Font file name equals PostScript name | `src/__checks__/fonts.test.ts` |
| 400-line cap on `src/screens` and `src/navigation`, unused style keys, user-facing literals | `src/__checks__/structure.test.ts` |

### 13.8 Tab bars and headers

- **Native iOS bar** (Release): the system Liquid Glass bar is kept; only the active tint
  (`visual.tab.activeTint`) and the label font are set. No dot, no custom shape.
- **JS bar** (Android, Expo Go): translucent glass fill without blur, top hairline, active label in
  SemiBold, 4 pt moss dot under the active icon, `fade` between tabs.
- **Headers** (iOS): transparent over the halo (D-19); native collapsing large titles with a
  `systemMaterial` blur behind the collapsed bar on Mes Relevés, Compte, Paramètres, Cartes hors
  ligne, the survey summary and its three sub-pages and the community survey page (D-30); the
  survey wizard uses the native header and back button (D-29). Accueil keeps its greeting in the
  bar.

### 13.9 Platform fallbacks

- **Android**: flat translucent fill on cards and floating controls (no blur), the JS tab bar, in-page
  titles and the wizard's own top bar, the flat forest button instead of the native glass button.
  `@expo/ui` is iOS only: only `*.ios.tsx` files import it, and `mobile/package.json` excludes it
  from Android autolinking (`expo.autolinking.android.exclude`).
- **Gradients and shadows**: a solid `backgroundColor` is always set; below API 28 there is no
  outset shadow, so the forest card loses its glow (accepted).
- **Before iOS 26**: `BlurView` instead of Liquid Glass, flat button fallback.
- **Android device pass: Phase 28** (Field Validation, numbered 13 before the flat renumbering; D-17). To check there: the inset glow at the navigation layer,
  the forest card SVG mask, the flat map control and sheet fills, the smoothness of the three mist
  discs and the flowing lines on an older phone (turn `ForestCard`'s `motion` off on Android if
  frames drop), and the Android header tint, which does not follow the scheme yet.

### 13.10 Status and open items

Status: approved by the owner on 2026-10-08, after the phone confirmation of build 39b4f005
(plan 12.2-23). The French direction text carries the same date.

Still open after the approval:
- Corsican parcel ids (`2A`, `2B`) stay unmatched (the parcel colour by score on the owner's survey was confirmed on the phone on 2026-10-08, after migration `020_parcel_idu_fields.sql` reached production).
- The iOS 26 tab bar glass and the search button are drawn by the system: their density cannot be
  changed without replacing the system bar, which D-08 rules out (13.8).
- Asked during the phase, not answered, carried to Phase 26 (the UX/UI audit, old 12.3) or later: the fixed form pager title
  (no native collapse); the sketch 009 elements (glowing pill on the wizard's next button and the
  counters' plus, completion ring in the header); the `GenusTargetSheet` native glass button and
  the `CasPicker` glass treatment; the wizard edge swipe on a device; the hard clip line under
  transparent headers on scroll.
- Explorer sheet drag runs on the JS thread (`PanResponder`): candidate for Phase 26. The Compte
  loading spinner is low contrast in dark: Phase 26.
- Android pass: Phase 28 (13.9).

### 13.11 Map backgrounds (Phase 23, 2026-10)

The map offers two backgrounds, picked by the owner on a comparison board of six candidates
(`.planning/sketches/map-basemaps/`): grey Plan IGN (the former default), standard Plan IGN in colour,
classic Plan IGN, standard and grey with the BD Forêt layer, and the aerial photographs.

- **Map** is the IGN "standard" vector style (`PLAN_IGN_STYLE_URL`, `map/maplibre/styles.ts`): roads,
  buildings and woods in colour. The grey style is no longer used.
- **Dark theme.** IGN publishes no dark style, so `map/maplibre/dark-style.ts` recolours the standard
  one: the lightness of every colour property is flipped (clamped to 8 to 88 %), the saturation is
  toned down to 75 %, hue and alpha are kept, and a dark ground (`brandMapTokens.darkBasemapBackground`)
  goes under the layers. Sources, sprite and glyphs are untouched, so the same vector tiles serve both
  themes. The recolouring runs on the fetched style (`plan-ign-style.ts`, fetched once per app run); if
  it fails the published light style stays, the map is never blank.
- **Satellite** has one look in both themes.
- **Offline.** One pack serves both themes (same tiles). `writeOfflineStyle` writes `map.json` (light,
  used to create the pack) and `map-dark.json` (dark) with the cadastre inside; in the dark theme the
  hook reads the dark file, or the light one for a pack downloaded before the dark variant existed.
- **Parcel colours** (selected, studied, not studied, score) are drawn above the basemap and must
  stay legible on it: check them on the phone in both themes after any change of palette.
- **BD Forêt** (forest inventory layer) and relief were looked at and not adopted: the layer is very
  loud at forest zoom and conflicts with the score colours. They stay in SEED-001.
