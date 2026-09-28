import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native"
import type { BrandColorScheme, BrandSemanticColors } from "../app/theme"

// BUG-06 (UX audit, Phase 2) + DS-12 (Phase 12): dark-content on the light theme's canvas,
// light-content on the dark theme's near-black canvas.
export function statusBarStyleForScheme(
  scheme: BrandColorScheme,
): "light-content" | "dark-content" {
  return scheme === "dark" ? "light-content" : "dark-content"
}

// DS-12: the container theme colors the brief flash a screen transition can show before a screen's
// own themed background paints, and native-stack's default header/border colors on any screen that
// does not set its own headerStyle.
export function buildNavigationTheme(
  scheme: BrandColorScheme,
  semanticColors: BrandSemanticColors,
): Theme {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme
  return {
    ...base,
    colors: {
      ...base.colors,
      background: semanticColors.backgroundCanvas,
      card: semanticColors.surfaceElevated,
      text: semanticColors.textPrimary,
      border: semanticColors.surfaceSoft,
    },
  }
}
