import { StyleSheet } from "react-native"
import { brandSpacing4 } from "../../app/brand-tokens"

// 12 pt between cards, on the 4 grid (12.2-11); the owner asked for clear separation (12.2-10).
export const PAGE_CONTENT_GAP = brandSpacing4.smd

// Screen-level styles and the few keys several survey list parts share. No colour since D-19: the
// route's ScreenFrame is the page (canvas and halo).
export const listStyles = StyleSheet.create({
  container: {
    flex: 1,
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
