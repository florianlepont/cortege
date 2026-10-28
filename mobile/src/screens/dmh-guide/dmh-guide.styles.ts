import { StyleSheet } from "react-native"
import {
  brandDefaultFontFamily,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"
import { DMH_PLATE_PADDING } from "../../ui/DmhDrawing"

// Phase 32 (32-UI-SPEC "Spacing Scale" and "Typography", redesign brief B-C2 and B-I1): the styles
// of the guide sheet, shared by the shell, the catalogue, the group page and the sources page. Sizes
// are on the 4-grid; every pressable target is at least 44 high. Colours come from the theme only
// and fonts from the brand tokens, in two weights: Sora-SemiBold for titles and headings, Sora-Medium
// for links and list labels, Jost-Regular for the text itself and Jost-SemiBold for captions.

export const DMH_GUIDE_TARGET = 44
export const DMH_GUIDE_ROW_MIN_HEIGHT = 56
export const DMH_GUIDE_SEARCH_MIN_HEIGHT = 48
/** The hero plate of a group page is 168 pt tall at most: the drawing plus its padding. */
export const DMH_GUIDE_HERO_PLATE_HEIGHT = 168
export const DMH_GUIDE_HERO_DRAWING_HEIGHT = DMH_GUIDE_HERO_PLATE_HEIGHT - 2 * DMH_PLATE_PADDING
/** Where the hairlines of a list of icon rows start: 16 padding, an 18 pt glyph, a 12 gap. */
export const DMH_GUIDE_ICON_ROW_INSET = brandSpacing4.md + 18 + brandSpacing4.smd

export function createDmhGuideStyles(theme: BrandTheme) {
  const headingFamily = brandTypography.sectionHeader.fontFamily
  const body = {
    fontSize: brandTypeScale.subhead.fontSize,
    lineHeight: brandTypeScale.subhead.lineHeight,
    fontFamily: brandDefaultFontFamily,
  }
  return StyleSheet.create({
    // The sheet and its one scroll view (the nav bar is its first item and sticks to the top). The
    // side padding lives on the body, not on the scroll content, so the sticky bar spans the full
    // width with an opaque canvas background and no text shows beside it.
    sheet: {
      flex: 1,
      backgroundColor: theme.semanticColors.backgroundCanvas,
    },
    sheetContent: {
      paddingBottom: brandSpacing4.xl,
    },
    body: {
      paddingHorizontal: brandSpacing4.lg,
      paddingTop: brandSpacing4.md,
    },
    // The catalogue and the sources page: a column of blocks, 16 apart.
    page: {
      gap: brandSpacing4.md,
    },
    // 16 pt Jost: the lead paragraph of a page (the word defined, the definition of a group).
    lead: {
      fontSize: brandTypeScale.callout.fontSize,
      lineHeight: brandTypeScale.callout.lineHeight,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    // Group page, top to bottom: the hero plate, the title block, the definition, the callout, then
    // headed sections. The spacing is explicit (16 / 16 / 24 / 24 above a heading, 8 below).
    hero: {
      marginBottom: brandSpacing4.md,
    },
    titleBlock: {
      gap: brandSpacing4.xs,
      marginBottom: brandSpacing4.md,
    },
    formCaption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    pageTitle: {
      ...brandTypography.screenTitle,
      color: theme.semanticColors.textStrong,
    },
    definition: {
      marginBottom: brandSpacing4.lg,
    },
    guideHeading: {
      marginTop: brandSpacing4.lg,
      marginBottom: brandSpacing4.sm,
      fontSize: brandTypeScale.headline.fontSize,
      lineHeight: brandTypeScale.headline.lineHeight,
      fontFamily: headingFamily,
      color: theme.semanticColors.textStrong,
    },
    bodyText: {
      ...body,
      color: theme.colors.textPrimary,
    },
    meta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    // The one tinted block of a group page: the rule that counts for the IBP (and, merged in, the
    // pocket guide's different threshold). Fill and inks are an AA pair (dmh-guide.contrast.test).
    callout: {
      borderRadius: brandRadius.field,
      padding: brandSpacing4.md,
      backgroundColor: theme.componentColors.statusChip.successBackground,
      gap: brandSpacing4.sm,
    },
    calloutHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    calloutTitle: {
      flexShrink: 1,
      ...brandTypography.sectionHeader,
      color: theme.onSurface.success,
    },
    calloutBlock: {
      gap: brandSpacing4.xs,
    },
    calloutRule: {
      fontSize: brandTypeScale.body.fontSize,
      lineHeight: brandTypeScale.body.lineHeight,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textPrimary,
    },
    calloutDivider: {
      height: 1,
      marginVertical: brandSpacing4.smd,
      backgroundColor: theme.colors.divider,
    },
    calloutNote: {
      gap: brandSpacing4.xs,
    },
    // A row of a grouped list: a leading 18 pt glyph and the text (confusions and types).
    listRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
      paddingVertical: brandSpacing4.smd,
    },
    listIcon: {
      marginTop: 1,
    },
    listText: {
      flex: 1,
      ...body,
      color: theme.colors.textPrimary,
    },
    // Types: up to two lists, each under a grouped header.
    typeLists: {
      gap: brandSpacing4.md,
    },
    typeList: {
      gap: brandSpacing4.sm,
    },
    groupedHeader: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
      paddingHorizontal: brandSpacing4.xs,
    },
    // The foot of a group page: the source line, then the "Sources et licence" row.
    footer: {
      marginTop: brandSpacing4.lg,
      gap: brandSpacing4.smd,
    },
    // Sources page: a document container, the label as a caption over the value.
    documentTitle: {
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
      paddingHorizontal: brandSpacing4.md,
      paddingVertical: brandSpacing4.smd,
    },
    documentRow: {
      gap: brandSpacing4.xxs,
      paddingHorizontal: brandSpacing4.md,
      paddingVertical: brandSpacing4.smd,
    },
    sourcesFoot: {
      gap: brandSpacing4.xs,
    },
    // Catalogue: the search field's row, and the empty state (no card, centred).
    searchRow: {
      minHeight: DMH_GUIDE_SEARCH_MIN_HEIGHT,
    },
    empty: {
      alignItems: "center",
      gap: brandSpacing4.sm,
      paddingVertical: brandSpacing4.lg,
    },
    emptyTitle: {
      textAlign: "center",
      fontSize: brandTypeScale.headline.fontSize,
      lineHeight: brandTypeScale.headline.lineHeight,
      fontFamily: headingFamily,
      color: theme.semanticColors.textStrong,
    },
    emptyBody: {
      ...body,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
    link: {
      minHeight: DMH_GUIDE_TARGET,
      justifyContent: "center",
      alignItems: "center",
    },
    linkText: {
      fontSize: brandTypeScale.body.fontSize,
      lineHeight: brandTypeScale.body.lineHeight,
      fontFamily: brandTypography.heroBody.fontFamily,
      color: theme.visual.accentText,
    },
  })
}
