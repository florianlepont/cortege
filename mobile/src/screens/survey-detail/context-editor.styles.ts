import { StyleSheet } from "react-native"
import { brandRadius, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// Styles of the scoring context card (ScoringContextEditor, plan 01.8-14), moved out of
// summary.styles.ts with the card.
export function createContextEditorStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // Glass card (variant I): same recipe as the photos card of the summary.
    detailMetadataCard: {
      gap: brandSpacing4.smd,
      padding: brandSpacing4.md,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      borderCurve: "continuous",
    },
    detailParcelsEditButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panelMuted,
      paddingHorizontal: brandSpacing4.smd,
      paddingVertical: brandSpacing4.sm,
    },
    methodBlock: {
      gap: brandSpacing4.sm,
    },
    groupTitle: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
    },
    summaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
    summaryItem: {
      color: theme.semanticColors.textStrong,
      backgroundColor: theme.colors.panelMuted,
    },
    summaryItemLabel: {
      color: theme.semanticColors.textStrong,
    },
    hint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    warningHint: {
      ...brandTypography.meta,
      color: theme.colors.terracotta,
    },
    switchVersionButton: {
      alignSelf: "flex-start",
    },
  })
}
