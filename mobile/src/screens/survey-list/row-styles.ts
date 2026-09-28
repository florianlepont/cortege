import { StyleSheet } from "react-native"
import { brandRadius, brandShadow, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// Survey list row styles (01.9-22), moved from SurveyListScreen.
export function createRowStyles(theme: BrandTheme) {
  return StyleSheet.create({
    surveyCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
      padding: 10, // P2-COMPACT-01: 12 → 10
      ...brandShadow.card,
    },
    surveySwipeable: {
      overflow: "visible",
    },
    surveyDeleteAction: {
      width: 124,
      alignSelf: "stretch",
      // OA-57: a gap between the card and the delete button.
      marginLeft: 8,
      marginRight: 8,
      borderRadius: brandRadius.card,
      backgroundColor: theme.colors.terracotta,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 14,
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
    // LIST-01: the score badge / progress ring column, always shown.
    surveyCardIndicator: {
      width: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    // P2-COMPACT-01: reduced thumbnail size
    surveyCardMedia: {
      width: 56,
      height: 72,
    },
    surveyCardPreview: {
      width: "100%",
      height: "100%",
      borderRadius: 12,
      backgroundColor: theme.colors.panelMuted,
    },
    surveyCardPreviewPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    surveyCardContent: {
      flex: 1,
      gap: 5,
    },
    surveyCardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
    },
    surveyCardTitle: {
      flex: 1,
      ...brandTypography.input,
      fontSize: 17,
      lineHeight: 21,
      fontWeight: "800",
      color: theme.colors.textPrimary,
    },
    surveyCardSelectedIcon: {
      marginTop: 2,
    },
    // Status + date on same row
    surveyCardStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    surveyCardMeta: {
      ...brandTypography.meta,
      fontSize: 12,
      lineHeight: 14,
      color: theme.colors.textSecondary,
    },
    surveyCardSupport: {
      ...brandTypography.meta,
      fontSize: 12,
      lineHeight: 14,
      color: theme.componentColors.surveyList.supportDangerText,
    },
    surveyCardPressed: {
      backgroundColor: theme.colors.surfaceSoft,
    },
    badgeTextDanger: {
      color: theme.componentColors.surveyList.badgeDangerText,
    },
  })
}
