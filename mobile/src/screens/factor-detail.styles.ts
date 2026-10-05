import { StyleSheet } from "react-native"
import {
  brandColors,
  brandOnDarkColors,
  brandRadius,
  brandSpacing,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme } from "../app/theme"

/** OA-30: the factor screen is the input first. No hero, the score on one line, the help behind a link. */
export function createDetailStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      gap: brandSpacing.md,
    },
    panel: {
      gap: 12,
    },
    scoreLine: {
      minHeight: 52,
      borderRadius: 16,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    scoreLineFilled: {
      backgroundColor: theme.colors.successSoft,
    },
    scoreLinePending: {
      backgroundColor: theme.colors.panelMuted,
    },
    scoreLineText: {
      flex: 1,
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
    scoreLinePoints: {
      ...brandTypography.sectionTitle,
      fontSize: 17,
      color: theme.semanticColors.textStrong,
    },
    helpLink: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 4,
    },
    helpLinkText: {
      ...brandTypography.button,
      color: theme.semanticColors.textStrong,
    },
    fieldsList: {
      gap: 12,
    },
    fieldBlock: {
      gap: 6,
    },
    fieldLabel: {
      ...brandTypography.label,
      color: theme.colors.textPrimary,
    },
    input: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    // The help sheet.
    sheetBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: brandOnDarkColors.heroScrimOnDark,
    },
    sheet: {
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      maxHeight: "80%",
      backgroundColor: theme.semanticColors.backgroundCanvas,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 34,
      gap: 14,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sheetTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 22,
      color: theme.semanticColors.textStrong,
    },
    sheetClose: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    sheetBody: {
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
    hintsList: {
      gap: 10,
    },
    hintRow: {
      flexDirection: "row",
      gap: 10,
      borderRadius: brandRadius.field,
      padding: 12,
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
    hintDot: {
      width: 8,
      height: 8,
      marginTop: 7,
      borderRadius: 4,
      backgroundColor: brandColors.moss,
    },
    hintText: {
      flex: 1,
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
  })
}
