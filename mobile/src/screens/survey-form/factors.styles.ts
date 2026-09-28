import { StyleSheet } from "react-native"
import { brandColors, brandShadow, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createFactorStyles(theme: BrandTheme) {
  return StyleSheet.create({
    scoreHeroCard: {
      borderRadius: 28,
      backgroundColor: theme.semanticColors.surfaceElevated,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 4,
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
      color: theme.colors.forest,
    },
    scoreHeroMeta: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    factorGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    factorTile: {
      width: "30.5%",
      minWidth: 92,
      flexGrow: 1,
      borderRadius: 18,
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 4,
      borderWidth: 1,
    },
    factorTilePending: {
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
    factorTileComplete: {
      borderColor: brandColors.moss,
      backgroundColor: theme.colors.successSoft,
    },
    factorTileWarning: {
      borderColor: brandColors.terracotta,
      backgroundColor: theme.colors.errorSoft,
    },
    factorTileTopRow: {
      flexDirection: "row",
      gap: 6,
      justifyContent: "space-between",
      alignItems: "center",
    },
    factorTileIdentity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    factorBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: brandColors.forest,
    },
    factorBadgeText: {
      ...brandTypography.label,
      fontSize: 12,
      lineHeight: 12,
      color: brandColors.white,
    },
    factorIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    factorTileTitle: {
      ...brandTypography.label,
      fontSize: 12,
      lineHeight: 13,
      color: theme.colors.textPrimary,
    },
    factorTileMeta: {
      ...brandTypography.meta,
      fontSize: 12,
      lineHeight: 12,
      color: theme.colors.textSecondary,
    },
    factorTileState: {
      ...brandTypography.meta,
      fontSize: 12,
      lineHeight: 12,
      color: theme.colors.forest,
    },
  })
}
