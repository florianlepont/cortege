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
  canvas: "#EEF1E8",
  panel: "#F7F6F0",
  surfaceSoft: "#F0EEE4",
  panelMuted: "#E8E5D9",
  warningSoft: "#F7E6CA",
  inputFill: "#F2F0E8",
  inputBorder: "#D6D1C3",
  divider: "#D3D7C8",
  textPrimary: "#24311F",
  textSecondary: "#51604B",
  successSoft: "#E6ECCE",
  errorSoft: "#F3D3C8",
  // Phase 4 (DS-04): additions surfaced by the hex-literal migration, not new brand hues.
  forestNight: "#0E2210",
  disabledMuted: "#8FA188",
  disabledNeutral: "#A6ABA3",
} as const

// Phase 4 (DS-01/DS-02): darkened text for saturated-adjacent tokens (warningSoft, errorSoft, the
// IBP "high" band) that failed WCAG as white-on-saturated or ochre/terracotta-on-soft. Contrast
// verified against `warningSoft`/`errorSoft` at >= 4.5:1.
export const brandOnWarningSurface = "#7A4A0A"
export const brandOnDangerSurface = "#8A2F14"
export const brandOnSuccessSurface = brandColors.forest

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
// font file (e.g. `Sora_800ExtraBold`) rather than a family + numeric `fontWeight`: these are static
// per-weight font files, and pairing a specific file with a numeric `fontWeight` risks Android
// synthesizing a different weight on top of it. Sora ships no 900 cut, so the two roles that want a
// 900 weight (`heroTitle`, `sectionTitle`) use its heaviest, `Sora_800ExtraBold`.
export const brandTypography = {
  heroEyebrow: {
    fontSize: 12,
    lineHeight: 14,
    fontFamily: "Jost_600SemiBold",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: "Sora_800ExtraBold",
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Sora_500Medium",
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 31,
    fontFamily: "Sora_800ExtraBold",
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Sora_500Medium",
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: "Sora_800ExtraBold",
    letterSpacing: 0.2,
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Sora_600SemiBold",
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Sora_700Bold",
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Jost_600SemiBold",
  },
} as const

// The default `<Text>` face for anything that does not spread a `brandTypography` role above —
// applied once via `Text.defaultProps` in `App.tsx` so no screen is left in the OS default face.
export const brandDefaultFontFamily = "Jost_400Regular"

export const brandRadius = {
  hero: 34,
  panel: 30,
  card: 24,
  field: 18,
  avatar: 20,
  pill: 999,
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

export const brandSemanticColors = {
  backgroundCanvas: brandColors.canvas,
  surfaceBase: brandColors.panel,
  surfaceElevated: brandColors.white,
  surfaceSoft: brandColors.surfaceSoft,
  textPrimary: brandColors.textPrimary,
  textSecondary: brandColors.textSecondary,
  textStrong: brandColors.forest,
  ctaPrimary: brandColors.forest,
  ctaAccent: brandColors.moss,
  ctaSecondaryOutline: brandColors.forest,
  ctaDanger: brandColors.terracotta,
  successSurface: brandColors.successSoft,
  errorSurface: brandColors.errorSoft,
  warningSurface: brandColors.warningSoft,
  // Warm off-white for body text on dark (forest) backgrounds — reduces glare vs pure white
  heroBodyOnDark: "#E8ECD9",
  heroMetaOnDark: "#D9E3C6",
  heroPanelBorderOnDark: "rgba(255, 255, 255, 0.14)",
  heroPanelBackgroundOnDark: "rgba(255, 255, 255, 0.08)",
  heroOrbOnDark: "rgba(137, 163, 58, 0.22)",
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

// Phase 4 (DS-04): decorative tint overlays on a light (not dark-hero) surface — CreateSurveyCard's
// accent orb, border and badge.
export const brandTintOnLight = {
  forestBorder: "rgba(51, 78, 43, 0.18)",
  mossOrb: "rgba(137, 163, 58, 0.12)",
  sageBadge: "rgba(176, 199, 142, 0.24)",
} as const

// Phase 4 (DS-04): StatTile's severity-tinted chip background/border, at two opacity steps.
export const brandStatTileTint = {
  dangerSoft: "rgba(205, 88, 51, 0.20)",
  dangerStrong: "rgba(205, 88, 51, 0.40)",
  warningSoft: "rgba(204, 112, 31, 0.20)",
  warningStrong: "rgba(204, 112, 31, 0.40)",
} as const

// IBP score colours keyed by the package's band tone (@cortege/ibp-domain bandTone): faible and
// assez faible → low, moyenne → mid, assez forte and forte → high. No score cut-offs live here.
// Phase 4 (DS-01): white-on-moss measured at 2.85:1 (WCAG fail); every band now pairs a soft
// background with a darkened text token instead of white on a saturated fill (owner-approved
// 2026-09-27, see 04-CONTEXT.md). The saturated hues stay in use elsewhere (progress ring, filled
// pill) — this only changes where text sits directly on the fill.
export const ibpScoreTokens = {
  colors: {
    high: { background: brandColors.sage, text: brandColors.forest },
    mid: { background: brandColors.warningSoft, text: brandOnWarningSurface },
    low: { background: brandColors.errorSoft, text: brandOnDangerSurface },
    empty: { background: brandColors.panelMuted, text: brandColors.textSecondary },
  },
} as const

export const brandComponentTokens = {
  button: {
    minHeight: 44,
    minHeightSmall: 36,
    minHeightLarge: 50,
    horizontalPaddingSmall: 10,
    horizontalPadding: 16,
    horizontalPaddingLarge: 14,
    iconOnlySizeSmall: 34,
    iconOnlySize: 40,
    iconOnlySizeLarge: 46,
    primaryBackground: brandSemanticColors.ctaPrimary,
    secondaryBackground: brandSemanticColors.surfaceElevated,
    secondaryBorder: brandSemanticColors.ctaSecondaryOutline,
    dangerBackground: brandSemanticColors.ctaDanger,
  },
  card: {
    defaultPadding: brandSpacing.md,
    compactPadding: 12,
    surfaceBorder: brandColors.panelMuted,
    softSurface: brandSemanticColors.surfaceSoft,
    panelBorder: brandColors.divider,
  },
  field: {
    minHeight: 48,
    horizontalPadding: brandSpacing.md,
    verticalPadding: 10,
    gap: brandSpacing.sm - 2,
    background: brandColors.inputFill,
    border: brandColors.inputBorder,
    borderError: brandColors.terracotta,
  },
  statusChip: {
    neutralBorder: brandColors.divider,
    neutralBackground: brandColors.panelMuted,
    successBorder: "#BBD09B",
    successBackground: brandColors.successSoft,
    warningBorder: "#E7C281",
    warningBackground: brandColors.warningSoft,
    dangerBorder: "#E4A595",
    dangerBackground: brandColors.errorSoft,
    textColor: brandColors.forest,
    onDarkBorder: "rgba(255, 255, 255, 0.25)",
    onDarkBackground: "rgba(255, 255, 255, 0.15)",
    onDarkTextColor: "rgba(255, 255, 255, 0.90)",
  },
  choiceChip: {
    minHeight: 44,
    border: brandColors.inputBorder,
    background: brandColors.panelMuted,
    interactiveBorder: brandColors.forest,
    interactiveBackground: brandColors.white,
    activeBorder: brandColors.forest,
    activeBackground: brandColors.forest,
    text: brandColors.forest,
    activeText: brandColors.white,
    staticText: brandColors.textSecondary,
    successBackground: brandColors.successSoft,
    warningBackground: brandColors.warningSoft,
    dangerBackground: brandColors.errorSoft,
  },
  surveyList: {
    cardAccentNeutral: brandColors.divider,
    cardAccentSuccess: brandColors.sage,
    cardAccentWarning: brandColors.ochre,
    cardAccentDanger: brandColors.terracotta,
    cardSelectedBorder: brandColors.forest,
    cardSelectedBackground: brandColors.panel,
    workflowNeutralBackground: brandColors.panelMuted,
    workflowSuccessBackground: brandColors.successSoft,
    workflowWarningBackground: brandColors.warningSoft,
    workflowDangerBackground: brandColors.errorSoft,
    workflowNeutralText: brandColors.forest,
    workflowSuccessText: brandColors.forest,
    // Phase 4 (DS-02): ochre/terracotta text directly on their soft backgrounds measured 2.90:1 and
    // 2.97:1 (WCAG fail) — darkened tokens instead of the raw hue.
    workflowWarningText: brandOnWarningSurface,
    workflowDangerText: brandOnDangerSurface,
    progressTrack: brandColors.divider,
    supportDangerText: brandOnDangerSurface,
    badgeDangerText: brandOnDangerSurface,
  },
  notice: {
    infoBackground: brandColors.panelMuted,
    infoBorder: brandColors.divider,
    successBackground: brandColors.successSoft,
    successBorder: "#BBD09B",
    warningBackground: brandColors.warningSoft,
    warningBorder: "#E7C281",
    dangerBackground: brandColors.errorSoft,
    dangerBorder: "#E4A595",
    title: brandColors.textPrimary,
    text: brandColors.textSecondary,
    // Phase 4 (DS-02): same contrast fix as surveyList above.
    warningText: brandOnWarningSurface,
    dangerText: brandOnDangerSurface,
    successText: brandColors.forest,
  },
} as const

// Phase 3 (D-0 token slice, FLOW-02): the three states a field-entry control can be in. Empty is
// neutral (never alarming before the user has done anything); error only renders once a caller
// gates it on "touched or submission attempted"; complete is moss, never the same hue as error.
export const brandFieldState = {
  empty: {
    border: brandColors.inputBorder,
    background: brandColors.inputFill,
    icon: brandColors.textSecondary,
    text: brandColors.textPrimary,
  },
  error: {
    border: brandColors.terracotta,
    background: brandColors.errorSoft,
    // Phase 4 (DS-02): terracotta text/icon directly on errorSoft measured 2.97:1 (WCAG fail).
    icon: brandOnDangerSurface,
    text: brandOnDangerSurface,
  },
  complete: {
    border: brandColors.moss,
    background: brandColors.successSoft,
    icon: brandColors.forest,
    text: brandColors.forest,
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
  // Phase 4 (DS-04): the public map's pin colors, tokenized as-is — MAP-03's actual redesign
  // (score-band markers with a legend) is Phase 9's job, not this phase's.
  publicMarkerSurvey: "#2a7a52",
  publicMarkerCurrentPosition: "#245f96",
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
} as const
