import { brandColors } from "./brand-tokens"
import type { BrandColors, BrandColorScheme } from "./theme"
import {
  brandGlassFills,
  buildForestHeroImage,
  buildForestImage,
  buildInsetRing,
  buildLinearGradient,
  downloadEdgeGlow,
  forestHaloCore,
  glassCtaEdges,
  glassCtaFills,
  glassCtaInk,
  glassCtaSecondary,
  mapControlGlass,
  mixWithWhite,
  pillLabelColor,
  pressWaveFill,
  withAlpha,
} from "./visual-tokens"

// Phase 12.2: the variant I visual layer, resolved per scheme and published as `BrandTheme.visual`.
// Values are the contract of `12.2-UI-SPEC.md` ("Color", "Visual Contract"). The Graphite dark
// neutrals of `theme.ts` are untouched (D-03); this layer only adds surfaces, tones and glows.

export type BrandVisualTone = { base: string; top: string; image: string; shadow: string }

/**
 * A glass surface with its own tint (`GlassSurface`'s `surface`): `tint` for the Liquid Glass
 * (iOS 26), `fill` over the blur (older iOS), `android` the flat fill (no blur there, D-17).
 */
export type GlassFill = { tint: string; fill: string; android: string }

export type BrandVisual = {
  backdrop: string
  accentText: string
  /** Moss tint of the green wave on a pressed list row (D-21). */
  pressWave: string
  /** Inset green glow around the Explorer map in download mode (12.2-19, `EdgePulse`). */
  edgeGlow: string
  forest: {
    image: string
    heroImage: string
    fallback: string
    shadow: string
    highlight: string
    hairline: string
    /** The forest card's edge: the hairline as an inset ring plus the top highlight (12.2-17). */
    edge: string
    /** The hairline alone as an inset ring, for a small forest pill (no highlight). */
    ring: string
    title: string
    titleAccent: string
    body: string
    sage: string
    tagFill: string
    tagBorder: string
    tagText: string
    tileFill: string
    tileBorder: string
    numeralTop: string
    numeralBottom: string
    numeralFallback: string
    contourSage: string
    contourMoss: string
    glowTrack: string
    glowImage: string
    glowFallback: string
    glowShadow: string
  }
  pill: { image: string; fallback: string; top: string; label: string; shadow: string }
  glass: {
    cardFill: string
    cardBorder: string
    cardShadow: string
    controlFill: string
    androidFill: string
    iconTile: string
    iconTint: string
  }
  /**
   * Controls floating over a map (12.2-19 fix round): the map does not follow the scheme, so in
   * dark the glass is a near opaque forest graphite with light content. `glass` goes to
   * `GlassSurface`'s `surface`, `hairline` is the control's outline (fallback only, the Liquid
   * Glass draws its own rim), `icon` the glyph colour, `text` and `textMuted` the labels.
   */
  mapControl: {
    glass: GlassFill
    hairline: string
    icon: string
    text: string
    textMuted: string
  }
  /**
   * Forest glass of the big call-to-action buttons (D-27c, D-28, charter forest with a white
   * label): `tint` for the native iOS 26 glass button, `flat` with its `hairline`, `shadow` and
   * `sheen` for the fallback, the `*Off` entries for the disabled fallback, `ink` the label colour
   * on the forest (both), `inkOff` on the disabled.
   */
  glassCta: {
    tint: string
    flat: string
    ink: string
    hairline: string
    shadow: string
    sheen: string
    flatOff: string
    inkOff: string
    hairlineOff: string
    /** Secondary (system `glass`) button: label, fallback fill and outline. */
    secondary: { ink: string; flat: string; hairline: string }
  }
  tab: {
    activeTint: string
    inactiveTint: string
    dot: string
    dotShadow: string
    background: string
    border: string
  }
  score: { low: string; mid: string; high: string; track: string; neutral: string }
  factorBar: { low: BrandVisualTone; mid: BrandVisualTone; high: BrandVisualTone }
  chip: { fill: string; border: string; text: string; activeBg: string; activeText: string }
}

const backdrops: Record<BrandColorScheme, string> = {
  light:
    "radial-gradient(90% 40% at 0% 0%, rgba(137, 163, 58, 0.22), rgba(137, 163, 58, 0) 70%), radial-gradient(70% 35% at 100% 18%, rgba(176, 199, 142, 0.35), rgba(176, 199, 142, 0) 70%)",
  dark: "radial-gradient(90% 40% at 0% 0%, rgba(137, 163, 58, 0.16), rgba(137, 163, 58, 0) 70%), radial-gradient(70% 35% at 100% 20%, rgba(51, 78, 43, 0.45), rgba(51, 78, 43, 0) 70%)",
}

function makeTone(base: string): BrandVisualTone {
  const top = mixWithWhite(base, 0.2)
  return {
    base,
    top,
    image: buildLinearGradient(180, [
      [top, 0],
      [base, 100],
    ]),
    shadow: `0 0 12px ${withAlpha(base, 0.4)}`,
  }
}

export function makeVisualColors(scheme: BrandColorScheme, colors: BrandColors): BrandVisual {
  const dark = scheme === "dark"
  const accentText = dark ? "#9BC26A" : "#334E2B"
  const haloCore = forestHaloCore[scheme]
  const cardFill = dark ? "rgba(24, 25, 28, 0.72)" : "rgba(247, 246, 240, 0.78)"
  const cardBorder = dark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"
  // D-16: brand moss (2.63:1) fails on the light surface, so rings and bars use a darker moss there.
  const high = dark ? brandColors.moss : "#728A2D"
  // Forest edge (12.2-17): never a `borderWidth` on a gradient view, see `buildInsetRing`. The
  // highlight is a 2 pt band so its inner point sits just inside the 1 pt ring.
  const forestHairline = "rgba(255, 255, 255, 0.14)"
  const forestHighlight = "inset 0 2px 0 rgba(255, 255, 255, 0.14)"

  return {
    backdrop: backdrops[scheme],
    accentText,
    pressWave: pressWaveFill[scheme],
    edgeGlow: downloadEdgeGlow[scheme],
    forest: {
      image: buildForestImage(haloCore),
      heroImage: buildForestHeroImage(haloCore),
      fallback: "#334E2B",
      shadow: dark
        ? "0 16px 36px -12px rgba(0, 0, 0, 0.6)"
        : "0 16px 36px -12px rgba(30, 60, 25, 0.55)",
      highlight: forestHighlight,
      hairline: forestHairline,
      edge: `${buildInsetRing(forestHairline)}, ${forestHighlight}`,
      ring: buildInsetRing(forestHairline),
      title: brandColors.white,
      titleAccent: "#C8DDA0",
      body: "#D7E3C0",
      sage: "#B0C78E",
      tagFill: "rgba(255, 255, 255, 0.14)",
      tagBorder: "rgba(255, 255, 255, 0.22)",
      tagText: "#EAF1D8",
      tileFill: "rgba(255, 255, 255, 0.09)",
      tileBorder: "rgba(255, 255, 255, 0.12)",
      numeralTop: "#FFFFFF",
      numeralBottom: "#C8DDA0",
      numeralFallback: "#C8DDA0",
      contourSage: "#B0C78E",
      contourMoss: "#89A33A",
      glowTrack: "rgba(255, 255, 255, 0.14)",
      glowImage: buildLinearGradient(90, [
        ["#89A33A", 0],
        ["#D5EC8F", 100],
      ]),
      glowFallback: "#89A33A",
      glowShadow: "0 0 14px rgba(190, 230, 110, 0.8)",
    },
    pill: {
      image: buildLinearGradient(180, [
        ["#B9D76B", 0],
        ["#89A33A", 100],
      ]),
      fallback: "#89A33A",
      top: "#B9D76B",
      label: pillLabelColor,
      shadow: "0 8px 22px rgba(137, 163, 58, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
    },
    glass: {
      cardFill,
      cardBorder,
      cardShadow: dark
        ? "inset 0 1px 0 rgba(255, 255, 255, 0.05)"
        : "inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 8px 24px rgba(30, 45, 25, 0.06)",
      controlFill: brandGlassFills.control[scheme],
      androidFill: brandGlassFills.android[scheme],
      iconTile: "rgba(137, 163, 58, 0.18)",
      iconTint: accentText,
    },
    mapControl: {
      glass: {
        tint: mapControlGlass[scheme].tint,
        fill: mapControlGlass[scheme].fill,
        android: mapControlGlass[scheme].android,
      },
      hairline: dark ? mapControlGlass.dark.hairline : colors.divider,
      icon: mapControlGlass[scheme].icon,
      text: mapControlGlass[scheme].text,
      textMuted: mapControlGlass[scheme].textMuted,
    },
    glassCta: {
      tint: glassCtaFills[scheme].tint,
      flat: glassCtaFills[scheme].flat,
      ink: glassCtaInk[scheme].on,
      hairline: glassCtaEdges[scheme].hairline,
      shadow: `${buildInsetRing(glassCtaEdges[scheme].hairline)}, ${glassCtaEdges[scheme].shadow}`,
      sheen: glassCtaEdges[scheme].sheen,
      flatOff: glassCtaFills[scheme].flatOff,
      inkOff: glassCtaInk[scheme].off,
      hairlineOff: glassCtaEdges[scheme].hairlineOff,
      secondary: {
        ink: colors.textPrimary,
        flat: glassCtaSecondary[scheme].flat,
        hairline: glassCtaSecondary[scheme].hairline,
      },
    },
    tab: {
      activeTint: accentText,
      inactiveTint: colors.textSecondary,
      dot: "#89A33A",
      dotShadow: dark ? "0 0 8px rgba(155, 194, 106, 0.8)" : "0 0 8px rgba(137, 163, 58, 0.8)",
      background: cardFill,
      border: cardBorder,
    },
    score: {
      low: brandColors.terracotta,
      mid: brandColors.ochre,
      high,
      track: dark ? "rgba(242, 243, 241, 0.12)" : "rgba(36, 49, 31, 0.12)",
      neutral: dark ? "#9A9FA6" : "#51604B",
    },
    factorBar: {
      low: makeTone(brandColors.terracotta),
      mid: makeTone(brandColors.ochre),
      high: makeTone(high),
    },
    chip: {
      fill: cardFill,
      border: cardBorder,
      text: colors.textSecondary,
      activeBg: colors.textPrimary,
      activeText: colors.canvas,
    },
  }
}
