import { ReactNode, useMemo } from "react"
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { brandComponentTokens, brandRadius, brandShadow } from "../app/brand-tokens"
import { BrandTheme, useBrandTheme } from "../app/theme"
import { GlassSurface } from "./GlassSurface"

type AppCardVariant = "panel" | "panelElevated" | "surface" | "soft" | "hero"

type AppCardProps = {
  children: ReactNode
  variant?: AppCardVariant
  padding?: number
  /** DS-15 (Phase 12): a real blurred glass surface instead of a flat fill, for a card floating
   * over a map or photo (ignores `variant`'s own background — the blur supplies it). */
  glass?: boolean
  style?: StyleProp<ViewStyle>
}

export function AppCard({
  children,
  variant = "panel",
  padding = brandComponentTokens.card.defaultPadding,
  glass = false,
  style,
}: AppCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  if (glass) {
    return (
      <GlassSurface style={[styles.base, styles.glassBorder, { padding }, style]}>
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
      backgroundColor: theme.colors.forest,
      ...brandShadow.card,
    },
    glassBorder: {
      borderWidth: 1,
      borderColor: theme.componentColors.card.panelBorder,
      ...brandShadow.card,
    },
  })
}
