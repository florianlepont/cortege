import { StyleSheet } from "react-native"
import { brandRadius, brandSpacing, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"
import { HOME_GAPS, NEW_SURVEY_LAYOUT } from "./layout-budget"

// Compact density (D-05): the page inset is 16, blocks and sections sit 16 apart (`HOME_GAPS`, the
// vertical budget that keeps the nearby map in view at launch).
const PAGE_H = brandSpacing4.md

export function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // The root view carries the canvas and the backdrop halo; the scroll view stays transparent.
    screen: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    scroll: {
      flex: 1,
    },
    content: {
      gap: 0,
    },

    // Greeting
    greeting: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    greetingTitle: {
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    greetingText: {
      flex: 1,
      flexShrink: 1,
      marginRight: brandSpacing.sm,
    },
    greetingBlock: {
      paddingHorizontal: PAGE_H,
      marginBottom: brandSpacing4.md,
      gap: brandSpacing4.xs,
    },
    nativeHeaderSync: {
      flexDirection: "row",
      paddingHorizontal: PAGE_H,
      marginBottom: brandSpacing4.md,
    },
    pageInset: {
      marginHorizontal: PAGE_H,
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
      marginBottom: brandSpacing4.md,
    },

    // The resume card block (ResumeCard draws the card itself).
    block: {
      marginHorizontal: PAGE_H,
    },
    // The "Nouveau relevé" card under it, when there is a draft (`NEW_SURVEY_LAYOUT`).
    newSurvey: {
      marginTop: NEW_SURVEY_LAYOUT.gap,
    },

    // Sections
    section: {
      marginTop: HOME_GAPS.section,
    },
    sectionHeader: {
      paddingHorizontal: PAGE_H,
      marginBottom: HOME_GAPS.sectionHeader,
    },
    trailingLink: {
      ...brandTypography.label,
      color: theme.visual.accentText,
    },

    loadingRow: {
      paddingHorizontal: PAGE_H,
      gap: brandSpacing.sm,
    },
  })
}
