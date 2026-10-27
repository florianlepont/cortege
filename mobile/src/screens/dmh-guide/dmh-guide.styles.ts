import { StyleSheet } from "react-native"
import { brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"

// Phase 32 (32-UI-SPEC "Spacing Scale" and "Typography"): the styles of the guide sheet, shared by
// the group page, the sources page (plan 32-12) and the shell and catalogue (plan 32-13). Sizes
// are on the 4-grid; every pressable target is at least 44 high. Colours come from the theme only.

export const DMH_GUIDE_HEADER_HEIGHT = 56
export const DMH_GUIDE_TARGET = 44
export const DMH_GUIDE_ROW_MIN_HEIGHT = 56
export const DMH_GUIDE_SEARCH_MIN_HEIGHT = 48
const BULLET_DOT = 6

export function createDmhGuideStyles(theme: BrandTheme) {
  const headline = {
    fontSize: brandTypeScale.headline.fontSize,
    lineHeight: brandTypeScale.headline.lineHeight,
    fontFamily: "Sora-SemiBold",
  }
  const body = {
    fontSize: brandTypeScale.subhead.fontSize,
    lineHeight: brandTypeScale.subhead.lineHeight,
    fontFamily: "Jost-Regular",
  }
  return StyleSheet.create({
    // The sheet and its one scroll view (the header row is its first item, as the help sheet).
    sheet: {
      flex: 1,
      backgroundColor: theme.semanticColors.backgroundCanvas,
    },
    sheetContent: {
      paddingHorizontal: brandSpacing4.lg,
      paddingTop: brandSpacing4.md,
      paddingBottom: brandSpacing4.xl,
      gap: brandSpacing4.md,
    },
    // Header row: 56 high, back (or title) on the left, close on the right.
    headerRow: {
      minHeight: DMH_GUIDE_HEADER_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
    },
    sheetTitleBox: {
      flex: 1,
    },
    sheetTitle: {
      ...headline,
      color: theme.semanticColors.textStrong,
    },
    backButton: {
      minHeight: DMH_GUIDE_TARGET,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.xs,
    },
    backText: {
      ...headline,
      color: theme.visual.accentText,
    },
    closeButton: {
      width: DMH_GUIDE_TARGET,
      height: DMH_GUIDE_TARGET,
      borderRadius: DMH_GUIDE_TARGET / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    // The pages: a column of blocks, 16 apart.
    page: {
      gap: brandSpacing4.md,
    },
    lead: {
      ...body,
      color: theme.colors.textSecondary,
    },
    // Group page title block (no card): the form caption, then the group label.
    titleBlock: {
      gap: brandSpacing4.xs,
    },
    formCaption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    pageTitle: {
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    // One glass block of a page.
    block: {
      gap: brandSpacing4.smd,
    },
    blockTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    blockTitle: {
      flexShrink: 1,
      ...headline,
      color: theme.semanticColors.textStrong,
    },
    subTitle: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    bodyText: {
      ...body,
      color: theme.colors.textPrimary,
    },
    meta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    // The drawing sits above the recognition text, 12 apart.
    recogniseBlock: {
      gap: brandSpacing4.smd,
    },
    // Confusion bullets: a 6 pt dot, 12 apart, one element per bullet.
    bulletList: {
      gap: brandSpacing4.smd,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.smd,
    },
    bulletDot: {
      width: BULLET_DOT,
      height: BULLET_DOT,
      marginTop: 7,
      borderRadius: BULLET_DOT / 2,
      backgroundColor: theme.colors.textSecondary,
    },
    bulletText: {
      flex: 1,
      ...body,
      color: theme.colors.textPrimary,
    },
    typeGroup: {
      gap: brandSpacing4.sm,
    },
    typeRow: {
      ...body,
      color: theme.colors.textPrimary,
    },
    // The foot of a page: the source line, then the accent link 32 below the last card.
    footer: {
      marginTop: brandSpacing4.md,
      gap: brandSpacing4.xs,
    },
    link: {
      minHeight: DMH_GUIDE_TARGET,
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    linkText: {
      ...headline,
      color: theme.visual.accentText,
    },
    // Sources page: a document card.
    documentLine: {
      ...body,
      color: theme.colors.textPrimary,
    },
    // Catalogue (plan 32-13): a row, its caption under the label, the empty card.
    row: {
      minHeight: DMH_GUIDE_ROW_MIN_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
      paddingVertical: brandSpacing4.smd,
    },
    rowCopy: {
      flex: 1,
      gap: brandSpacing4.xs,
    },
    rowLabel: {
      ...body,
      color: theme.colors.textPrimary,
    },
    rowDivider: {
      height: 1,
      marginLeft: brandSpacing4.md,
      backgroundColor: theme.colors.divider,
    },
    // The card of rows has no padding of its own: the rows run edge to edge.
    rowsCard: {
      overflow: "hidden",
    },
    // A form header over its card, 8 apart.
    formSection: {
      gap: brandSpacing4.sm,
    },
    formHeader: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    searchRow: {
      minHeight: DMH_GUIDE_SEARCH_MIN_HEIGHT,
    },
    // The sources link, 32 below the last card (the page gap is 16).
    catalogueFoot: {
      marginTop: brandSpacing4.md,
    },
  })
}
