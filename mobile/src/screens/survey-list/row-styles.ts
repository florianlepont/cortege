import { StyleSheet } from "react-native"
import {
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// The status line of a row is as tall as a status chip (two 5 pt paddings, the 1 pt hairline on both
// sides and one line of `brandTypography.meta`), so a row whose second line is plain text (a
// community row) is exactly as tall as one that carries a chip (D-23).
export const ROW_STATUS_MIN_HEIGHT = 2 * 5 + 2 + brandTypography.meta.lineHeight

/** Width of the trailing ring column of a list row (the 38 pt ring, centred). */
export const SURVEY_ROW_RING_COLUMN = 40

// Survey list row styles (01.9-22), moved from SurveyListScreen. Phase 12.2-11: glass card (no
// elevation or shadow spread: an Android elevation under a translucent fill smears grey), 4-grid
// spacing, Sora row title.
export function createRowStyles(theme: BrandTheme) {
  return StyleSheet.create({
    surveyCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.sm,
      minHeight: brandInteraction.hitTarget.min,
      borderRadius: brandRadius.card,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
    },
    surveySwipeable: {
      overflow: "visible",
    },
    surveyDeleteAction: {
      width: 124,
      alignSelf: "stretch",
      // OA-57: a gap between the card and the delete button.
      marginLeft: brandSpacing4.sm,
      marginRight: brandSpacing4.sm,
      borderRadius: brandRadius.card,
      backgroundColor: theme.colors.terracotta,
      alignItems: "center",
      justifyContent: "center",
      gap: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.md,
    },
    surveyDeleteActionPressed: {
      opacity: 0.88,
    },
    surveyDeleteActionText: {
      ...brandTypography.meta,
      color: theme.colors.white,
    },
    surveyCardSelected: {
      borderColor: theme.componentColors.surveyList.cardSelectedBorder,
      backgroundColor: theme.componentColors.surveyList.cardSelectedBackground,
    },
    surveyCardAccent: {
      width: 4,
      alignSelf: "stretch",
      borderRadius: 999,
      backgroundColor: theme.componentColors.surveyList.cardAccentNeutral,
    },
    surveyCardAccentSuccess: {
      backgroundColor: theme.componentColors.surveyList.cardAccentSuccess,
    },
    surveyCardAccentWarning: {
      backgroundColor: theme.componentColors.surveyList.cardAccentWarning,
    },
    surveyCardAccentDanger: {
      backgroundColor: theme.componentColors.surveyList.cardAccentDanger,
    },
    surveyCardAccentNeutral: {
      backgroundColor: "transparent",
    },
    // LIST-01, D-27: the score ring column, always shown, on the trailing side and centred on the
    // row. It never shrinks, so the text column (minWidth 0) wraps or truncates before the ring.
    surveyCardIndicator: {
      width: SURVEY_ROW_RING_COLUMN,
      flexShrink: 0,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: brandSpacing4.xs,
    },
    surveyCardContent: {
      flex: 1,
      minWidth: 0,
      gap: brandSpacing4.xs,
    },
    surveyCardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.sm,
    },
    surveyCardTitle: {
      flex: 1,
      ...brandTypography.input,
      lineHeight: 22,
      color: theme.colors.textPrimary,
    },
    surveyCardSelectedIcon: {
      marginTop: 2,
    },
    // Status + date on same row
    surveyCardStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      flexWrap: "wrap",
      minHeight: ROW_STATUS_MIN_HEIGHT,
    },
    surveyCardMeta: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    surveyCardSupport: {
      ...brandTypeScale.footnote,
      color: theme.componentColors.surveyList.supportDangerText,
    },
    badgeTextDanger: {
      color: theme.componentColors.surveyList.badgeDangerText,
    },
  })
}
