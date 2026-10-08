// Phase 12 (DS-12): theme-invariant hues — the Etats Sauvages brand palette itself, plus a
// handful of neutrals that stay fixed because their handful of call sites are already pinned to a
// permanently-dark surface (forestNight, disabledMuted/disabledNeutral on the map's translucent
// panels) or always want pure white/black regardless of theme (an icon on a filled forest/moss
// button, a shadow color). Every neutral that actually needs to invert between light and dark
// (canvas, panel, text, field, status-soft colors, and everything derived from them) moved to
// `lightPalette`/`darkPalette` in `theme.ts`, resolved through `useBrandTheme()` — see
// `.planning/phases/12-interface-finishing/12-CONTEXT.md` for the full static/dynamic split.
export const brandColors = {
  terracotta: "#CD5833",
  moss: "#89A33A",
  forest: "#334E2B",
  sage: "#B0C78E",
  mauve: "#9494B0",
  ochre: "#CC701F",
  salmon: "#DA8D77",
  black: "#000000",
  white: "#FFFFFF",
  // Phase 4 (DS-04): additions surfaced by the hex-literal migration, not new brand hues.
  forestNight: "#0E2210",
  disabledMuted: "#8FA188",
  disabledNeutral: "#A6ABA3",
} as const

// Phase 4 (DS-03): Mazzard H has no licence yet and Avenir Next is Apple-proprietary (not
// redistributable, absent on Android), so neither can be embedded via `expo-font`. Sora and Jost —
// both OFL-licensed — are the stand-ins actually loaded (`mobile/assets/fonts/`, wired through the
// `expo-font` config plugin in `app.json`), chosen and approved by the product owner over a sketched
// alternative (2026-09-27, `.planning/phases/04-visual-foundations-motion/04-CONTEXT.md`). `preferred`
// stays the charter's real target name; `standIn` is the embedded family actually rendered today —
// swap it out the day Mazzard H ships without touching `brandTypography`'s role mapping.
export const brandFontFamilies = {
  title: {
    preferred: "Mazzard H",
    standIn: "Sora",
  },
  body: {
    preferred: "Mazzard H",
    standIn: "Sora",
  },
  meta: {
    preferred: "Futura",
    standIn: "Jost",
  },
  accent: {
    preferred: "HeadTurn Smooth",
    fallback: "Mazzard H Bold",
    standIn: "Sora",
  },
} as const

// Typography tokens with the embedded stand-in fonts wired in. Each role names a concrete weighted
// font file (e.g. `Sora-ExtraBold`) rather than a family + numeric `fontWeight`: these are static
// per-weight font files, and pairing a specific file with a numeric `fontWeight` risks Android
// synthesizing a different weight on top of it. Sora ships no 900 cut, so the two roles that want a
// 900 weight (`heroTitle`, `sectionTitle`) use its heaviest, `Sora-ExtraBold`.
//
// OA-05: the file name IS the font's PostScript name. iOS looks a font up by that internal name and
// Android by the file name, so with the two equal one string serves both. A file named differently
// (the old `Sora_800ExtraBold.ttf`) is not found on iOS, which then silently falls back to the system
// font in a normal weight. `src/__checks__/fonts.test.ts` reads the name inside each file and checks
// it against this file and `app.json`.
export const brandTypography = {
  heroEyebrow: {
    fontSize: 12,
    lineHeight: 14,
    fontFamily: "Jost-SemiBold",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: "Sora-ExtraBold",
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Sora-Medium",
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 31,
    fontFamily: "Sora-ExtraBold",
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Sora-Medium",
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: "Sora-ExtraBold",
    letterSpacing: 0.2,
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Sora-SemiBold",
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Sora-Bold",
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Jost-SemiBold",
  },
  // Phase 12.2: weight 300 (Sora-Light) is used by the score numeral only (UI-SPEC Typography).
  numeral: {
    fontSize: 68,
    lineHeight: 72,
    fontFamily: "Sora-Light",
    letterSpacing: -3.4,
  },
  // The numeral of the survey summary's forest card, one notch under `numeral` (D-24: a card about
  // 18 percent shorter). The Score page keeps the 68 pt `numeral`.
  numeralCard: {
    fontSize: 56,
    lineHeight: 60,
    fontFamily: "Sora-Light",
    letterSpacing: -2.8,
  },
  numeralUnit: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "Jost-Regular",
  },
  screenTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "Sora-SemiBold",
    letterSpacing: -0.6,
  },
  sectionHeader: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Sora-SemiBold",
  },
  // 12.2-17 (collapsing titles): the native iOS header titles. The large title sits under the bar
  // and shrinks into the small centred `navTitle` on scroll. 28 pt (`brandTypeScale.title1`) like
  // the header title of Accueil, between the 24 pt in-page title and the 34 pt iOS default, so a
  // survey name still fits a 375 pt phone. Only family and size reach the native bar (no line
  // height, no tracking); the weight is given beside them in `stack-options.ts`.
  navLargeTitle: {
    fontSize: 28,
    fontFamily: "Sora-SemiBold",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Sora-SemiBold",
  },
  ringValue: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Sora-SemiBold",
  },
} as const

// The default `<Text>` face for anything that does not spread a `brandTypography` role above —
// applied once via `Text.defaultProps` in `App.tsx` so no screen is left in the OS default face.
export const brandDefaultFontFamily = "Jost-Regular"

// Phase 9 (DS-05, audit §5): an iOS-style typographic scale with a 12pt floor — every role here is
// >= 12, unlike several of the 10-11pt literals it replaces at individual call sites. Additive next
// to `brandTypography` (named by content role, e.g. `heroTitle`) rather than a replacement for it:
// `brandTypeScale` is named by size step, for new call sites that want "a caption" or "a footnote"
// without picking a hero/section/label role that doesn't fit.
export const brandTypeScale = {
  display: { fontSize: 34, lineHeight: 41 },
  title1: { fontSize: 28, lineHeight: 34 },
  title2: { fontSize: 22, lineHeight: 28 },
  title3: { fontSize: 20, lineHeight: 25 },
  headline: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 17, lineHeight: 22 },
  callout: { fontSize: 16, lineHeight: 21 },
  subhead: { fontSize: 15, lineHeight: 20 },
  footnote: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const

// Phase 9 (DS-05): per-role caps for RN's `maxFontSizeMultiplier` `Text` prop, tested against AX3
// (~3.1x the base size) so a capped role still grows meaningfully under Larger Accessibility Sizes
// without breaking a fixed-width badge or a single-line title. Not merged into `brandTypography`/
// `brandTypeScale`'s objects: those are spread into `StyleSheet.create` style objects throughout the
// app, and `maxFontSizeMultiplier` is a `Text` prop, not a style property — merging it in would inject
// an invalid style key everywhere a role is spread. `AppText` applies `default` automatically; a
// caller passes a tighter role explicitly (e.g. a badge or a pill) via the `maxFontSizeMultiplier` prop.
export const brandFontScaleCaps = {
  default: 2,
  display: 1.35,
  title: 1.5,
  body: 1.8,
  label: 1.6,
  meta: 1.6,
  button: 1.4,
  input: 1.6,
} as const

export const brandRadius = {
  hero: 34,
  panel: 30,
  // Phase 12.2: 24 -> 22; forestCard, forestHero and bar are new (UI-SPEC Visual Contract).
  card: 22,
  forestCard: 26,
  forestHero: 28,
  bar: 6,
  field: 18,
  avatar: 20,
  pill: 999,
  // Phase 9 (DS-10): the IBP score badge's corner radius, previously two magic numbers
  // (`IbpScoreBadge.tsx`'s `badgeMd`/`badgeSm`) duplicated wherever a badge shape was needed.
  badge: 16,
  badgeSm: 12,
} as const

export const brandSpacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
} as const

// Phase 3 (D-0 token slice): a strict 4-grid, additive to `brandSpacing`. The aliases above stay in
// place during the migration (audit §5.1) — new field-entry components use this grid instead.
export const brandSpacing4 = {
  xxs: 2,
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const brandShadow = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
} as const

// Phase 9 (DS-10, audit §5 elevation): a 4-step shadow scale (iOS shadow props + Android
// `elevation`) — `brandShadow.card` above is kept as the one already-tokenised alias in wide use
// (equivalent to `level2`) rather than migrated, per the token file's own gradual-migration pattern.
export const brandElevation = {
  level0: {
    shadowColor: "#000000",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  level1: {
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  level2: {
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  level3: {
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
} as const

// Phase 12 (DS-12): `brandSemanticColors` (backgroundCanvas, surfaceBase, surfaceElevated,
// surfaceSoft, textPrimary/Secondary/Strong, ctaPrimary/Accent/SecondaryOutline/Danger,
// successSurface, errorSurface, warningSurface) moved wholesale to `makeSemanticColors()` in
// `theme.ts`, resolved through `useBrandTheme().semanticColors` — even its theme-invariant fields
// (the `cta*` aliases are plain brand hues), so every call site reads one source instead of
// picking between a static and a themed one per field. Only the hero-on-dark family stays here: a
// fixed glass-over-a-permanently-dark-forest-hero treatment, not a function of the app's own
// light/dark theme.
export const brandOnDarkColors = {
  // Warm off-white for body text on dark (forest) backgrounds — reduces glare vs pure white
  heroBodyOnDark: "#E8ECD9",
  heroMetaOnDark: "#D9E3C6",
  heroPanelBorderOnDark: "rgba(255, 255, 255, 0.14)",
  heroPanelBackgroundOnDark: "rgba(255, 255, 255, 0.08)",
  heroOrbOnDark: "rgba(137, 163, 58, 0.22)",
  // Sketch 001 A (OA-80): the decorative hero orb on the dark theme's bordered hero.
  heroOrbFaintOnDark: "rgba(255, 255, 255, 0.03)",
  // Phase 4 (DS-04): the rest of the "glass over a dark hero" family the hex-literal migration
  // surfaced — same surface, a stronger step, a stronger border, a sage (not moss) accent tint, a
  // muted text tone, a near-black scrim for photo/map backdrops, and a light-on-saturated halo.
  // Several distinct source opacities (0.1/0.16 into surface tokens, 0.22/0.28/0.3 into
  // borderStrong) were deliberately consolidated onto one value each rather than kept as one-off
  // magic numbers — see `.planning/phases/04-visual-foundations-motion/04-CONTEXT.md`.
  heroTextMutedOnDark: "#D7E3C0",
  heroSurfaceOnDark: "rgba(255, 255, 255, 0.12)",
  heroSurfaceStrongOnDark: "rgba(255, 255, 255, 0.18)",
  heroBorderStrongOnDark: "rgba(255, 255, 255, 0.24)",
  heroAccentTintOnDark: "rgba(176, 199, 142, 0.22)",
  heroScrimOnDark: "rgba(8, 13, 19, 0.72)",
  haloOnDark: "rgba(255, 255, 255, 0.50)",
} as const

// Phase 4 (DS-04): status tints for pills/cards over the dark forest hero (survey-detail header) —
// distinct from the generic `heroSurface*OnDark` above because these carry semantic meaning
// (ready/pending/blocked), not just a translucency level.
export const brandOnDarkStatus = {
  successBorder: "rgba(187, 208, 155, 0.28)",
  successBorderStrong: "rgba(208, 226, 182, 0.34)",
  successBackground: "rgba(176, 199, 142, 0.18)",
  warningBorder: "rgba(231, 194, 129, 0.34)",
  warningBackground: "rgba(204, 112, 31, 0.12)",
  dangerBorder: "rgba(228, 165, 149, 0.28)",
  dangerBorderStrong: "rgba(228, 165, 149, 0.34)",
  dangerBackground: "rgba(205, 88, 51, 0.14)",
  dangerBackgroundStrong: "rgba(205, 88, 51, 0.12)",
  // A stronger, near-opaque danger pair for a destructive action button over the near-black media
  // backdrop (`brandMediaBackdrop`), distinct from the lighter forest-hero pairs above.
  dangerScrimBackground: "rgba(129, 31, 31, 0.84)",
  dangerScrimBorder: "rgba(255, 210, 210, 0.42)",
} as const

// Phase 4 (DS-04): translucent panel surfaces floating over the map or a photo — a Liquid Glass
// placeholder (no blur yet, see DS-15 / Phase 12) at a few opacity steps used across the public map
// and parcel picker overlays.
export const brandTranslucentPanel = {
  subtle: "rgba(247, 246, 240, 0.94)",
  default: "rgba(247, 246, 240, 0.96)",
  strong: "rgba(247, 246, 240, 0.97)",
  strongest: "rgba(247, 246, 240, 0.98)",
  muted: "rgba(232, 229, 217, 0.94)",
} as const

// Phase 4 (DS-04): dark solid backdrop behind full-screen media/map surfaces before content loads.
export const brandMediaBackdrop = "#132434"

/** The live camera screen (genus recognition): controls and hints drawn over the preview. */
export const brandCameraTokens = {
  controlBackground: "rgba(15, 22, 12, 0.55)",
  hintBackground: "rgba(15, 22, 12, 0.62)",
  shutterRing: "rgba(255, 255, 255, 0.18)",
  guide: "#FFFFFF",
} as const

// Phase 12.2: scrims that were literal colours in `src/ui` and `src/screens` (same values, tokenised
// when the ESLint colour rule was repaired).
export const brandScrims = {
  actionSheetBackdrop: "rgba(15, 22, 12, 0.4)",
  letterBubble: "rgba(14, 34, 16, 0.92)",
} as const

// Phase 12 (DS-12): IBP score colours (`ibpScoreTokens`), the field-entry state triad
// (`brandFieldState`) and every color field previously nested inside `brandComponentTokens`
// (button/card/field backgrounds and borders, and all of statusChip/choiceChip/surveyList/notice)
// moved to `theme.ts`'s `makeComponentColors()`/`makeFieldState()`/`makeIbpScoreColors()`, resolved
// through `useBrandTheme()`. Only the size/spacing fields — never a function of light vs dark —
// stay here, unchanged, as plain dimensions a style can still import statically.
export const brandComponentTokens = {
  button: {
    minHeight: 44,
    minHeightSmall: 36,
    minHeightLarge: 50,
    minHeightPanel: 46, // 12.2-19: the offline panel's download, between md (too thin) and lg (too big)
    horizontalPaddingSmall: 10,
    horizontalPadding: 16,
    horizontalPaddingLarge: 14,
    iconOnlySizeSmall: 34,
    iconOnlySize: 40,
    iconOnlySizeLarge: 46,
  },
  card: {
    defaultPadding: brandSpacing.md,
    compactPadding: 12,
  },
  field: {
    minHeight: 48,
    horizontalPadding: brandSpacing.md,
    verticalPadding: 10,
    gap: brandSpacing.sm - 2,
  },
  choiceChip: {
    minHeight: 44,
  },
} as const

// Phase 3 (D-0 token slice, DS-06): shared pressed/disabled feedback for the new tap-first controls.
// Phase 4 adds `rippleColor` for AppPressable's Android `android_ripple`.
export const brandInteraction = {
  pressedScale: 0.97,
  pressedOpacity: 0.9,
  disabledOpacity: 0.4,
  hitTarget: { min: 44 },
  rippleColor: "rgba(0, 0, 0, 0.08)",
} as const

// Phase 3 (D-0 token slice, FLOW-09): parcel map polygon colors, readable in direct sunlight.
// Selected outranks studied; studied outranks the free/neutral default.
export const brandMapTokens = {
  parcelSelected: brandColors.terracotta,
  parcelSelectedFill: "rgba(205, 88, 51, 0.30)",
  parcelStudied: brandColors.moss,
  parcelStudiedFill: "rgba(137, 163, 58, 0.22)",
  parcelNeutral: brandColors.sage,
  parcelNeutralFill: "rgba(176, 199, 142, 0.16)",
  userLocation: brandColors.mauve,
  strokeWidthSelected: 3,
  strokeWidthDefault: 2,
  // Phase 9 (MAP-03): the public map's survey markers, by IBP total score band tone (bandTone
  // applied to totalBand — the same 3-tone split IbpScoreBadge already reads its colors from,
  // here as the saturated hue itself rather than a soft background). MAP-04: the device's own
  // position is `showsUserLocation`'s native halo, not a marker — no token needed for it.
  scoreMarker: {
    low: brandColors.terracotta,
    mid: brandColors.ochre,
    high: brandColors.moss,
  },
  scoreMarkerSelectedBorder: brandColors.forest,
  // OA-126: a studied parcel of the Explorer is filled with the colour of its score band.
  scoreParcelFill: {
    low: "rgba(205, 88, 51, 0.55)",
    mid: "rgba(204, 112, 31, 0.55)",
    high: "rgba(137, 163, 58, 0.55)",
  },
  // 12.2-19: an Explorer parcel without a score (never studied, or studied without a usable total)
  // is a warm grey, so green on that map only ever means a high score. The basemaps are not
  // scheme aware (plan or orthophoto, same in light and dark), so one pair reads on both: the
  // outline keeps 3:1 against the light plan and the dark orthophoto alike.
  parcelUnscored: "#8C847A",
  parcelUnscoredFill: "rgba(140, 132, 122, 0.22)",
} as const

// Phase 4 (DS-06..DS-09, audit §4): the motion system. Kept as plain data (durations in ms, easing
// control points, spring configs) rather than importing `react-native-reanimated` here, so this
// stays a framework-free token file like the rest of it — consumers pass these straight into
// `withTiming`/`Easing.bezier`/`withSpring`, whose config shapes these objects already match.
export const brandMotion = {
  durations: {
    instant: 100,
    fast: 160,
    base: 240,
    slow: 360,
    emphasis: 500,
  },
  // Bezier control points for `Easing.bezier(...)`.
  easings: {
    standard: [0.2, 0, 0, 1],
    decelerate: [0, 0, 0, 1],
    accelerate: [0.3, 0, 1, 1],
  },
  // Config objects for `withSpring(value, brandMotion.springs.press)`.
  springs: {
    press: { damping: 18, stiffness: 420, mass: 0.6 },
    snappy: { damping: 20, stiffness: 260 },
    gentle: { damping: 22, stiffness: 140 },
  },
  // List entrance stagger: 40ms per item, capped at 8 items so a long list doesn't take
  // noticeably longer to finish animating in than a short one.
  staggerMs: 40,
  staggerMax: 8,
  // Screen sections that slide up each time their screen becomes visible (Accueil, 12.2-10): the
  // distance in points. The owner did not notice the 240 ms fade of the first version.
  sectionEntranceTravel: 20,
  // Green wave on a pressed list row (D-21): it grows from the touch point over `durationMs` with the
  // decelerate easing while it fades out; `startRadius` is its size at the first frame. Reduce Motion
  // draws no wave, only the `reducedFadeMs` highlight fade.
  pressWave: { durationMs: 420, startRadius: 12, reducedFadeMs: 240 },
} as const
