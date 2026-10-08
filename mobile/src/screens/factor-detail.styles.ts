import { StyleSheet } from "react-native"
import {
  brandOnDarkColors,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme } from "../app/theme"

// Field sizes (D-05): the score line and the help link keep their heights.
export const SCORE_LINE_MIN_HEIGHT = 52
export const HELP_LINK_MIN_HEIGHT = 44

/**
 * OA-30: the factor screen is the input first. No hero, the score on one line, the help behind a
 * link. Phase 12.2 (variant I): the input card (AppCard `glass`), the pending score line and the
 * help hints are glass without blur (D-12) at the card radius, block gaps on the 4-grid. The input
 * chrome (`fieldBlock`, `fieldLabel`, `input`) keeps its legacy roles (UI-SPEC Typography exception).
 */
export function createDetailStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      gap: brandSpacing4.md,
    },
    panel: {
      gap: brandSpacing4.smd,
    },
    scoreLine: {
      minHeight: SCORE_LINE_MIN_HEIGHT,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      paddingHorizontal: brandSpacing4.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    // A scored factor keeps its soft green (the state reads at a glance); the hairline melts in.
    scoreLineFilled: {
      backgroundColor: theme.colors.successSoft,
      borderColor: theme.colors.successSoft,
    },
    scoreLinePending: {
      backgroundColor: theme.visual.glass.cardFill,
      borderColor: theme.visual.glass.cardBorder,
    },
    scoreLineText: {
      flex: 1,
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
    scoreLinePoints: {
      ...brandTypography.sectionTitle,
      fontSize: brandTypeScale.headline.fontSize,
      color: theme.semanticColors.textStrong,
    },
    helpLink: {
      minHeight: HELP_LINK_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.xs,
    },
    helpLinkText: {
      ...brandTypography.button,
      color: theme.semanticColors.textStrong,
    },
    fieldsList: {
      gap: brandSpacing4.smd,
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
      gap: brandSpacing4.md,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sheetTitle: {
      ...brandTypography.sectionTitle,
      fontSize: brandTypeScale.title2.fontSize,
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
      gap: brandSpacing4.smd,
    },
    hintRow: {
      flexDirection: "row",
      gap: brandSpacing4.smd,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      padding: brandSpacing4.smd,
      backgroundColor: theme.visual.glass.cardFill,
      borderColor: theme.visual.glass.cardBorder,
    },
    // D-16: the score green (darker moss in light), not the brand moss.
    hintDot: {
      width: 8,
      height: 8,
      marginTop: 7,
      borderRadius: 4,
      backgroundColor: theme.visual.score.high,
    },
    hintText: {
      flex: 1,
      ...brandTypography.sectionBody,
      color: theme.colors.textPrimary,
    },
  })
}
