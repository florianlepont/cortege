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
record: `.planning/phases/04-visual-foundations-motion/`.

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
`rgba(`/`rgb(` literals) rejects a new one anywhere under `mobile/src` except the tokens file itself.

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
