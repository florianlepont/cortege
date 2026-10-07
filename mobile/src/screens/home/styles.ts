import { StyleSheet } from "react-native"
import { brandRadius, brandSpacing, brandTypography } from "../../app/brand-tokens"
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
    },
    greetingTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.semanticColors.textStrong,
      lineHeight: 32,
    },
    greetingText: {
      flex: 1,
      flexShrink: 1,
      marginRight: brandSpacing.sm,
    },
    greetingBlock: {
      paddingHorizontal: PAGE_H,
      marginBottom: 16,
      gap: 6,
    },
    nativeHeaderSync: {
      flexDirection: "row",
      paddingHorizontal: PAGE_H,
      marginBottom: 16,
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
      marginBottom: 16,
    },

    // The resume card block (ResumeCard draws the card itself).
    block: {
      marginHorizontal: PAGE_H,
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
      color: theme.semanticColors.accent,
    },

    loadingRow: {
      paddingHorizontal: PAGE_H,
      gap: 10,
    },
  })
}
