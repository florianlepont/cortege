import { StyleSheet } from "react-native"
import { brandTypography } from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"

export function createSearchStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    top: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
      backgroundColor: theme.colors.canvas,
    },
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    field: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
      paddingVertical: 0,
    },
    clearButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    cancel: {
      ...brandTypography.input,
      color: theme.colors.forest,
      paddingVertical: 10,
    },
    segments: {
      flexDirection: "row",
      padding: 3,
      gap: 3,
      borderRadius: 14,
      backgroundColor: theme.colors.divider,
    },
    segment: {
      flex: 1,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
    },
    segmentActive: {
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
    segmentLabel: {
      ...brandTypography.meta,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    segmentLabelActive: {
      color: theme.colors.forest,
      fontWeight: "600",
    },
    chips: {
      flexDirection: "row",
      gap: 8,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      gap: 10,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    hint: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      paddingTop: 8,
    },
  })
}
