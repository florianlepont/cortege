import { StyleSheet } from "react-native"
import {
  brandDefaultFontFamily,
  brandRadius,
  brandShadow,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createSummaryStyles(theme: BrandTheme) {
  return StyleSheet.create({
    actionPanel: {
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: brandSpacing4.md,
      gap: brandSpacing4.smd,
      ...brandShadow.card,
    },
    // DET-04: a lesser-weight link, not an equal-weight button next to "Réessayer" (now the sync
    // notice's own integrated action).
    discardLink: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      textDecorationLine: "underline",
      alignSelf: "flex-start",
    },
    // Glass card of the history page (variant I): same recipe as the photos card of the summary.
    historyPanel: {
      gap: brandSpacing4.smd,
      padding: brandSpacing4.md,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
    },
    historyRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      paddingTop: brandSpacing4.smd,
      gap: brandSpacing4.xxs,
    },
    historyRowTitle: {
      ...brandTypography.input,
      color: theme.colors.textPrimary,
    },
    historyRowMeta: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    historyDeltaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
      marginTop: brandSpacing4.sm,
    },
    historyDeltaPill: {
      borderRadius: brandRadius.pill,
      paddingHorizontal: brandSpacing4.smd,
      paddingVertical: brandSpacing4.xs,
      backgroundColor: theme.colors.panelMuted,
    },
    historyDeltaPillText: {
      ...brandTypography.meta,
      color: theme.colors.textPrimary,
    },
  })
}
