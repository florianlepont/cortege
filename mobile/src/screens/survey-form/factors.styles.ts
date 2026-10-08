import { StyleSheet } from "react-native"
import {
  brandRadius,
  brandShadow,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// Phase 12.2 (variant I): the factor tiles are glass cards without blur (D-12), radius 22, gaps
// on the 4-grid; their sizes and touch targets are unchanged (D-05).
export const FACTOR_TILE_MIN_HEIGHT = 44

export function createFactorStyles(theme: BrandTheme) {
  return StyleSheet.create({
    scoreHeroCard: {
      borderRadius: brandRadius.card,
      backgroundColor: theme.semanticColors.surfaceElevated,
      paddingHorizontal: brandSpacing4.md,
      paddingVertical: brandSpacing4.md,
      gap: brandSpacing4.xs,
      ...brandShadow.card,
    },
    scoreHeroLabel: {
      ...brandTypography.heroEyebrow,
      color: theme.colors.textSecondary,
    },
    scoreHeroValue: {
      fontSize: 52,
      lineHeight: 56,
      fontWeight: "900",
      color: theme.semanticColors.textStrong,
    },
    scoreHeroMeta: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    factorGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
    factorTile: {
      width: "30.5%",
      minWidth: 92,
      minHeight: FACTOR_TILE_MIN_HEIGHT,
      flexGrow: 1,
      borderRadius: brandRadius.card,
      paddingHorizontal: brandSpacing4.sm,
      paddingVertical: brandSpacing4.sm,
      gap: brandSpacing4.xs,
      borderWidth: 1,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
    },
    // The tone is the hairline only: the glass fill stays, the ring says the progress.
    factorTilePending: {
      borderColor: theme.visual.glass.cardBorder,
    },
    factorTileComplete: {
      borderColor: theme.visual.score.high,
    },
    factorTileWarning: {
      borderColor: theme.onSurface.danger,
    },
    factorTileTopRow: {
      flexDirection: "row",
      gap: brandSpacing4.sm,
      justifyContent: "space-between",
      alignItems: "center",
    },
    factorTileIdentity: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
    },
    factorBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    factorBadgeText: {
      ...brandTypography.label,
      fontSize: brandTypeScale.caption.fontSize,
      // OA-35: a 12 pt line clipped accents on capitals ("Étape", "État").
      lineHeight: 16,
      color: theme.semanticColors.onCtaPrimary,
    },
    factorIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    // The input role's Sora SemiBold at the tile's 12 pt on 13 (sizes unchanged, D-05).
    factorTileTitle: {
      ...brandTypography.input,
      fontSize: brandTypeScale.caption.fontSize,
      lineHeight: 13,
      color: theme.colors.textPrimary,
    },
    factorTileMeta: {
      ...brandTypography.meta,
      // OA-35: a 12 pt line clipped accents on capitals ("Étape", "État").
      lineHeight: 16,
      color: theme.colors.textSecondary,
    },
    factorTileState: {
      ...brandTypography.meta,
      // OA-35: a 12 pt line clipped accents on capitals ("Étape", "État").
      lineHeight: 16,
      color: theme.semanticColors.textStrong,
    },
  })
}
