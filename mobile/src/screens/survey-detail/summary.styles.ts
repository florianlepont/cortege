import { StyleSheet } from "react-native"
import { brandRadius, brandShadow, brandSpacing4, brandTypography } from "../../app/brand-tokens"
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
  })
}
