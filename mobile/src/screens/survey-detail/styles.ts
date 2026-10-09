import { StyleSheet } from "react-native"
import { brandSpacing, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createDetailStyles(theme: BrandTheme) {
  return StyleSheet.create({
    mainScroll: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    detailScreenContent: {
      padding: brandSpacing.md,
      gap: brandSpacing.md,
      paddingBottom: 120,
    },
    filterChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
    },
    detailSection: {
      gap: brandSpacing4.smd,
    },
    rowMeta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    warningText: {
      ...brandTypography.meta,
      color: theme.colors.ochre,
    },
  })
}
