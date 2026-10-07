import { StyleSheet } from "react-native"
import { brandSpacing4 } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

// 12 pt between cards, on the 4 grid (12.2-11); the owner asked for clear separation (12.2-10).
export const PAGE_CONTENT_GAP = brandSpacing4.smd

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
      paddingHorizontal: brandSpacing4.md,
      paddingTop: 0,
      gap: PAGE_CONTENT_GAP,
    },

    listHeader: {
      gap: PAGE_CONTENT_GAP,
    },
  })
}
