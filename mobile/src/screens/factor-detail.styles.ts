import { StyleSheet } from "react-native"
import {
  brandColors,
  brandOnDarkColors,
  brandShadow,
  brandSpacing,
  brandTypography,
} from "../app/brand-tokens"
import { BrandTheme } from "../app/theme"

export function createDetailStyles(theme: BrandTheme) {
  return StyleSheet.create({
    screen: {
      gap: brandSpacing.md,
    },
    heroCard: {
      overflow: "hidden",
      borderRadius: 32,
      backgroundColor: brandColors.forest,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 18,
      gap: 10,
      ...brandShadow.card,
    },
    heroAccentOrb: {
      position: "absolute",
      top: -22,
      right: -14,
      width: 110,
      height: 110,
      borderRadius: 999,
      backgroundColor: brandOnDarkColors.heroAccentTintOnDark,
    },
    heroHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroFactorBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: brandOnDarkColors.heroPanelBorderOnDark,
    },
    heroFactorBadgeText: {
      ...brandTypography.button,
      color: brandColors.white,
    },
    heroProgressText: {
      ...brandTypography.meta,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    heroTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 26,
      lineHeight: 30,
      color: brandColors.white,
    },
    heroBody: {
      ...brandTypography.sectionBody,
      color: brandOnDarkColors.heroBodyOnDark,
    },
    heroScoreRow: {
      marginTop: 2,
      gap: 6,
    },
    heroScoreCard: {
      alignSelf: "flex-start",
      borderRadius: 22,
      backgroundColor: brandOnDarkColors.heroSurfaceOnDark,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 2,
    },
    heroScoreLabel: {
      ...brandTypography.heroEyebrow,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    heroScoreValue: {
      fontSize: 32,
      lineHeight: 36,
      fontWeight: "900",
      color: brandColors.white,
    },
    heroScoreMeta: {
      ...brandTypography.meta,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    panel: {
      gap: 12,
    },
    panelTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 22,
      lineHeight: 25,
      color: theme.semanticColors.textStrong,
    },
    panelBody: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    panelToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    panelToggleCopy: {
      flex: 1,
      gap: 4,
    },
    panelToggleMeta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    hintsList: {
      gap: 10,
    },
    hintRow: {
      flexDirection: "row",
      gap: 10,
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
  })
}
