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
