import { ReactNode, useMemo } from "react"
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { brandComponentTokens, brandRadius, brandShadow } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import type { GlassFill } from "../app/theme-visual"
import { GlassSurface } from "./GlassSurface"

/**
 * `glass` is the card look of variant I without blur (D-12): a translucent fill, a hairline and an
 * inner highlight (light also a soft shadow), no elevation. The blurred surface for a card floating
 * over a map or photo stays the separate boolean `glass` prop below (D-04).
 */
type AppCardVariant = "panel" | "panelElevated" | "surface" | "soft" | "hero" | "glass"

type AppCardProps = {
  children: ReactNode
  variant?: AppCardVariant
  padding?: number
  /** DS-15 (Phase 12): a real blurred glass surface instead of a flat fill, for a card floating
   * over a map or photo (ignores `variant`'s own background — the blur supplies it). */
  glass?: boolean
  /**
   * With `glass`, the surface's own glass (`GlassSurface`'s `surface`): a card over a map passes
   * `theme.visual.mapPanel`, so its text keeps 4.5:1 over any basemap (12.2-21 dark pass).
   */
  surface?: GlassFill
  style?: StyleProp<ViewStyle>
}

export function AppCard({
  children,
  variant = "panel",
  padding = brandComponentTokens.card.defaultPadding,
  glass = false,
  surface,
  style,
}: AppCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (glass) {
    return (
      <GlassSurface surface={surface} style={[styles.base, styles.glassBorder, { padding }, style]}>
        {children}
      </GlassSurface>
    )
  }

  return <View style={[styles.base, styles[variant], { padding }, style]}>{children}</View>
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    base: {
      borderRadius: brandRadius.card,
    },
    panel: {
      backgroundColor: theme.colors.panel,
    },
    panelElevated: {
      backgroundColor: theme.colors.panel,
      borderWidth: 1,
      borderColor: theme.componentColors.card.panelBorder,
      ...brandShadow.card,
    },
    surface: {
      backgroundColor: theme.semanticColors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.componentColors.card.surfaceBorder,
      ...brandShadow.card,
    },
    soft: {
      backgroundColor: theme.componentColors.card.softSurface,
      borderWidth: 1,
      borderColor: theme.componentColors.card.surfaceBorder,
    },
    // Dark premium surface — for identity/hero cards on dark brand background
    hero: {
      // OA-80 (sketch 001, A Graphite): forest in light, a bordered surface in dark.
      backgroundColor: theme.semanticColors.heroSurface,
      borderWidth: 1,
      borderColor: theme.semanticColors.heroBorder,
      ...brandShadow.card,
    },
    // No `brandShadow.card` here: an Android elevation under a translucent fill smears grey.
    glass: {
      backgroundColor: theme.visual.glass.cardFill,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      boxShadow: theme.visual.glass.cardShadow,
    },
    glassBorder: {
      borderWidth: 1,
      borderColor: theme.componentColors.card.panelBorder,
      ...brandShadow.card,
    },
  })
}
