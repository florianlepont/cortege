import { StyleSheet } from "react-native"
import {
  brandRadius,
  brandShadow,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// The panel around the factor grid (`FactorsList`). Variant I: the card radius and the 4-grid gaps.
export function createFormStyles(theme: BrandTheme) {
  return StyleSheet.create({
    panel: {
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: brandSpacing4.md,
      gap: brandSpacing4.smd,
      ...brandShadow.card,
    },
    panelTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 19,
      lineHeight: 22,
      color: theme.semanticColors.textStrong,
    },
    panelBody: {
      ...brandTypography.sectionBody,
      fontSize: brandTypeScale.caption.fontSize,
      lineHeight: 17,
      color: theme.colors.textSecondary,
    },
  })
}
