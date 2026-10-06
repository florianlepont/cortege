import { StyleSheet } from "react-native"
import { brandOnDarkColors, brandRadius, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

const BADGE = 32

/** Styles of the "Score IBP" page: the total with its two sub-scores, then one row per factor. */
export function createScoreStyles(theme: BrandTheme) {
  const hairline = theme.componentColors.card.panelBorder
  return StyleSheet.create({
    breakdown: {
      borderRadius: brandRadius.card,
      padding: 18,
      gap: 16,
      backgroundColor: theme.semanticColors.heroSurface,
      borderWidth: 1,
      borderColor: theme.semanticColors.heroBorder,
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 6,
    },
    totalValue: {
      fontFamily: "Sora-Bold",
      fontSize: 44,
      lineHeight: 48,
      color: theme.colors.white,
    },
    totalMax: {
      fontSize: 18,
      color: theme.colors.white,
      opacity: 0.8,
    },
    subScore: {
      gap: 6,
    },
    subScoreHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    subScoreLabel: {
      ...brandTypography.sectionBody,
      color: theme.colors.white,
      flexShrink: 1,
    },
    subScoreValue: {
      ...brandTypography.sectionBody,
      fontFamily: "Jost-SemiBold",
      color: theme.colors.white,
    },
    track: {
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: brandOnDarkColors.heroBorderStrongOnDark,
    },
    fill: {
      height: 8,
      backgroundColor: theme.semanticColors.accent,
    },
    listTitle: {
      ...brandTypography.sectionTitle,
      color: theme.semanticColors.textStrong,
    },
    list: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: hairline,
      backgroundColor: theme.semanticColors.surfaceElevated,
      overflow: "hidden",
    },
    row: {
      minHeight: 56,
      paddingLeft: 16,
      paddingRight: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowPressed: {
      backgroundColor: theme.colors.panelMuted,
    },
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: hairline,
    },
    badge: {
      width: BADGE,
      height: BADGE,
      borderRadius: BADGE / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeFilled: {
      backgroundColor: theme.colors.successSoft,
    },
    badgePending: {
      backgroundColor: theme.colors.errorSoft,
    },
    badgeText: {
      fontFamily: "Sora-Bold",
      fontSize: 14,
      color: theme.semanticColors.textStrong,
    },
    rowCopy: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
    rowWarning: {
      ...brandTypography.meta,
      color: theme.colors.ochre,
    },
    rowPoints: {
      ...brandTypography.sectionBody,
      fontFamily: "Jost-SemiBold",
      color: theme.colors.textPrimary,
    },
    rowPointsMax: {
      fontFamily: "Jost-Regular",
      color: theme.colors.textSecondary,
    },
    rowPending: {
      ...brandTypography.sectionBody,
      fontFamily: "Jost-Medium",
      color: theme.onSurface.danger,
    },
    hint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
