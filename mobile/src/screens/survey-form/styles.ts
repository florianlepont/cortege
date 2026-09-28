import { StyleSheet } from "react-native"
import { brandRadius, brandShadow, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createFormStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    pageScroll: {
      flex: 1,
    },
    pageContent: {
      paddingHorizontal: 16,
      paddingTop: 0,
      paddingBottom: 108,
      gap: 10,
    },
    panel: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 16,
      gap: 10,
      ...brandShadow.card,
    },
    identityStepContent: {
      gap: 10,
    },
    panelHeaderCompact: {
      flex: 1,
      gap: 3,
    },
    panelTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 19,
      lineHeight: 22,
      color: theme.semanticColors.textStrong,
    },
    panelBody: {
      ...brandTypography.sectionBody,
      fontSize: 12,
      lineHeight: 17,
      color: theme.colors.textSecondary,
    },
    label: {
      ...brandTypography.label,
      color: theme.colors.textPrimary,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: brandRadius.field,
      backgroundColor: theme.colors.inputFill,
      color: theme.colors.textPrimary,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...brandTypography.input,
    },
    choiceRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    casRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    casCaption: {
      ...brandTypography.sectionBody,
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
      color: theme.colors.textSecondary,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    switchCopy: {
      flex: 1,
      gap: 2,
    },
    primaryButton: {
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.forest,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingVertical: 13,
      ...brandShadow.card,
    },
  })
}
