import { StyleSheet } from "react-native"
import { brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export const PAGE_CONTENT_GAP = 10

// Screen-level styles and the few keys several survey list parts share.
export function createListStyles(theme: BrandTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },

    // ── Scroll ────────────────────────────────────────────────────────────────
    pageScroll: {
      flex: 1,
    },
    pageContent: {
      paddingHorizontal: 16,
      paddingTop: 0,
      gap: PAGE_CONTENT_GAP, // P3-COMPACT-03: 14 → 10
    },
    pageContentNativeSearch: {
      paddingTop: 8,
    },

    // ── Section headers ───────────────────────────────────────────────────────
    homeSectionTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 24,
      lineHeight: 28,
    },
    homeSectionSubtitle: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    listSectionHeader: {
      paddingHorizontal: 2,
    },

    // ── Shared interaction ────────────────────────────────────────────────────
    resetButton: {
      alignSelf: "flex-start",
    },
  })
}
