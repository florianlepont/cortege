import { Platform, StyleSheet } from "react-native"
import {
  brandOnDarkColors,
  brandRadius,
  brandSpacing,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

const PAGE_H = 20

export function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    content: {
      gap: 0,
    },

    // Greeting
    greeting: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: PAGE_H,
      marginBottom: 16,
    },
    greetingTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.semanticColors.textStrong,
      lineHeight: 32,
    },
    greetingDate: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      marginTop: 2,
      textTransform: "capitalize",
    },
    headerTrailing: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing.sm,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.panelMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    // HOME-06: the avatar is a tappable button (to Compte) whether it shows a photo or the fallback.
    avatarButton: {
      borderRadius: brandRadius.pill,
    },
    avatarImage: {
      width: 44,
      height: 44,
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.panelMuted,
    },

    // Notice
    notice: {
      marginHorizontal: PAGE_H,
      marginBottom: 16,
    },

    // Hero CTA
    heroCta: {
      marginHorizontal: PAGE_H,
      // OA-80 (sketch 001, A Graphite): forest in light, a bordered surface in dark.
      backgroundColor: theme.semanticColors.heroSurface,
      borderWidth: 1,
      borderColor: theme.semanticColors.heroBorder,
      borderRadius: brandRadius.card,
      padding: 24,
      paddingBottom: 28,
      gap: 8,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.black,
          shadowOpacity: 0.15,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
        },
        android: { elevation: 4 },
      }),
    },
    heroEyebrow: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.5,
      color: theme.colors.moss,
      textTransform: "uppercase",
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: "900",
      // OA-83: canvas was light text on the forest hero in light mode only; the hero stays forest in
      // both themes, so its text is a fixed light tone.
      color: brandOnDarkColors.heroBodyOnDark,
      lineHeight: 30,
    },
    heroBody: {
      ...brandTypography.sectionBody,
      color: brandOnDarkColors.heroBodyOnDark,
      marginBottom: 4,
    },
    heroButton: {
      backgroundColor: theme.colors.moss,
      marginTop: 4,
    },
    heroButtonLabel: {
      color: theme.colors.forestNight,
    },
    // HOME-02: secondary "Nouveau relevé" action once the primary CTA becomes "Reprendre".
    heroSecondaryButton: {
      marginTop: 4,
      borderColor: brandOnDarkColors.heroPanelBorderOnDark,
      backgroundColor: "transparent",
    },
    heroSecondaryButtonLabel: {
      color: brandOnDarkColors.heroBodyOnDark,
    },

    // Sections
    section: {
      marginTop: brandSpacing.xl + 4,
    },
    sectionHeader: {
      paddingHorizontal: PAGE_H,
      marginBottom: 14,
    },
    trailingLink: {
      ...brandTypography.label,
      color: theme.colors.moss,
    },

    // HOME-01/HOME-02: the merged SurveyProgressCard, shown under the resume hero.
    resumeCardWrap: {
      paddingHorizontal: PAGE_H,
    },

    // Parcels
    parcelsList: {
      paddingHorizontal: PAGE_H,
      gap: 10,
    },
    loadingRow: {
      paddingHorizontal: PAGE_H,
      gap: 10,
    },
    // Sector score card
    sectorCard: {
      backgroundColor: theme.semanticColors.surfaceSoft,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: 16,
      gap: 10,
      marginTop: 4,
    },
    sectorHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectorLabel: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: theme.semanticColors.textStrong,
      textTransform: "uppercase",
      flex: 1,
    },
    sectorScore: {
      fontSize: 22,
      fontWeight: "900",
      color: theme.semanticColors.textStrong,
    },
    scoreDotsRow: {
      flexDirection: "row",
      gap: 6,
    },
    scoreDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    sectorMeta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}
