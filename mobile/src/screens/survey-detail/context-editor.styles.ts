import { StyleSheet } from "react-native"
import { brandRadius, brandShadow, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// Styles of the scoring context card (ScoringContextEditor, plan 01.8-14), moved out of
// summary.styles.ts with the card.
export function createContextEditorStyles(theme: BrandTheme) {
  return StyleSheet.create({
    detailMetadataCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 18,
      gap: 12,
      ...brandShadow.card,
    },
    detailParcelsEditButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panelMuted,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    methodBlock: {
      gap: 6,
    },
    groupTitle: {
      ...brandTypography.heroEyebrow,
      color: theme.colors.textSecondary,
    },
    summaryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    summaryItem: {
      color: theme.colors.forest,
      backgroundColor: theme.colors.panelMuted,
    },
    summaryItemLabel: {
      color: theme.colors.forest,
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
    scaleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    scaleCopy: {
      flex: 1,
      gap: 2,
    },
    scaleLabel: {
      ...brandTypography.label,
      color: theme.colors.textPrimary,
    },
  })
}
