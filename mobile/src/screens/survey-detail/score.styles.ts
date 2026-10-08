import { StyleSheet } from "react-native"
import {
  brandDefaultFontFamily,
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

const BADGE = 32

/** Styles of the "Score IBP" page: the total with its two sub-scores, then one row per factor. */
export function createScoreStyles(theme: BrandTheme) {
  const hairline = theme.visual.glass.cardBorder
  return StyleSheet.create({
    breakdown: {
      gap: brandSpacing4.md,
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: brandSpacing4.sm,
    },
    totalValue: {
      ...brandTypography.numeral,
      color: theme.colors.textPrimary,
    },
    // No score yet: the words stay at title size, a 68 pt numeral would not fit them.
    totalUnknown: {
      ...brandTypography.screenTitle,
      color: theme.colors.textSecondary,
    },
    totalMax: {
      ...brandTypography.numeralUnit,
      color: theme.colors.textSecondary,
    },
    subScore: {
      gap: brandSpacing4.sm,
    },
    subScoreHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    subScoreLabel: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    subScoreValue: {
      ...brandTypography.input,
      color: theme.colors.textPrimary,
    },
    chartCard: {
      gap: brandSpacing4.smd,
    },
    listBlock: {
      gap: brandSpacing4.sm,
    },
    listTitle: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
    },
    list: {
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: hairline,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      overflow: "hidden",
    },
    row: {
      minHeight: brandInteraction.hitTarget.min + brandSpacing4.smd,
      paddingVertical: brandSpacing4.sm,
      paddingLeft: brandSpacing4.md,
      paddingRight: brandSpacing4.md,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
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
      borderRadius: brandRadius.badgeSm,
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
      fontFamily: brandTypography.button.fontFamily,
      fontSize: 14,
      color: theme.semanticColors.textStrong,
    },
    rowCopy: {
      flex: 1,
      gap: brandSpacing4.xxs,
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
      fontFamily: brandTypography.meta.fontFamily,
      color: theme.colors.textPrimary,
    },
    rowPointsMax: {
      fontFamily: brandDefaultFontFamily,
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
