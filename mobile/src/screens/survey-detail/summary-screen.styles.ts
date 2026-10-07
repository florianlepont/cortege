import { StyleSheet } from "react-native"
import {
  brandRadius,
  brandSpacing,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"
import { FINISH_BAR } from "./finish-bar-layout"

const HIT_TARGET = 44

/** Styles of the survey summary screen (OA-46): title block, score card, photos, map, rows, CTA. */
export function createSummaryScreenStyles(theme: BrandTheme) {
  const hairline = theme.componentColors.card.panelBorder
  return StyleSheet.create({
    // D-19: no background, the route's ScreenFrame is the page (canvas and halo).
    scroll: {
      flex: 1,
    },
    content: {
      padding: brandSpacing.md,
      gap: 18,
      paddingBottom: brandSpacing.lg,
    },
    // Title block.
    titleBlock: {
      gap: 8,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconButton: {
      width: HIT_TARGET,
      height: HIT_TARGET,
      borderRadius: HIT_TARGET / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.semanticColors.surfaceElevated,
      borderWidth: 1,
      borderColor: hairline,
    },
    renameRow: {
      gap: 10,
    },
    renameActions: {
      flexDirection: "row",
      gap: 10,
    },
    statusLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statusDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
    // Score card (forest hero, variant I). Text stays in the left and lower part of the card, away
    // from the halo at the top right (RESEARCH Pitfall 4).
    scoreWrap: {
      position: "relative",
    },
    // D-24: 16 pt around instead of 24, tighter gaps between the blocks, and the 56 pt numeral: the
    // card is about 18 percent shorter than before (about 222 pt with the hint instead of 272).
    scoreContent: {
      padding: brandSpacing4.md,
    },
    scoreCaption: {
      ...brandTypography.label,
      color: theme.visual.forest.body,
    },
    scoreNumeral: {
      alignSelf: "flex-start",
      marginTop: brandSpacing4.xs,
    },
    scoreBar: {
      marginTop: brandSpacing4.sm,
    },
    scoreTiles: {
      flexDirection: "row",
      gap: brandSpacing4.smd,
      marginTop: brandSpacing4.smd,
    },
    scoreTile: {
      flex: 1,
      gap: brandSpacing4.xs,
      paddingVertical: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.smd,
      borderRadius: brandRadius.badge,
      borderWidth: 1,
      borderColor: theme.visual.forest.tileBorder,
      backgroundColor: theme.visual.forest.tileFill,
    },
    scoreTileLabel: {
      ...brandTypeScale.footnote,
      fontFamily: "Jost-Regular",
      color: theme.visual.forest.body,
    },
    scoreTileValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: brandSpacing4.xs,
    },
    scoreTileValue: {
      ...brandTypography.input,
      color: theme.visual.forest.title,
    },
    scoreTileOutOf: {
      ...brandTypeScale.footnote,
      fontFamily: "Jost-Regular",
      color: theme.visual.forest.sage,
    },
    scoreHint: {
      ...brandTypography.meta,
      marginTop: brandSpacing4.sm,
      color: theme.visual.forest.body,
    },
    // Sections. The photo block is styled in `photos.styles.ts`; `section`, `sectionHeader` and the
    // titles below are also read by the context and community pages.
    section: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    // The title of a card on the summary (Photos), the role of `AppSectionHeader` and of the other
    // cards (D-24). `sectionTitle` below is the legacy 28 pt role the community page still reads.
    cardTitle: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textPrimary,
    },
    cardTitleCount: {
      ...brandTypography.sectionHeader,
      color: theme.colors.textSecondary,
    },
    sectionTitle: {
      ...brandTypography.sectionTitle,
      color: theme.semanticColors.textStrong,
    },
    sectionTitleCount: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    photoEmpty: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    // Map card.
    // The contour placeholder sits under the live map and shows only where it has not drawn.
    mapCard: {
      height: 190,
      borderRadius: brandRadius.card,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      borderCurve: "continuous",
    },
    map: {
      ...StyleSheet.absoluteFill,
    },
    mapTall: {
      height: 300,
    },
    // Bottom bar.
    titlePressable: {
      flex: 1,
    },
    // D-27c: no background. The bar floats over the bottom of the page (the content scrolls behind
    // it) and the green glass button is its only filled element; the screen pads the scroll
    // content by the bar's height. `paddingTop` is `FINISH_BAR.paddingTop`.
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: brandSpacing.md,
      paddingTop: FINISH_BAR.paddingTop,
    },
    // Sub-pages shared.
    subContent: {
      padding: brandSpacing4.md,
      gap: brandSpacing4.lg,
      paddingBottom: brandSpacing4.xxl,
    },
    hairline: {
      height: 1,
      backgroundColor: hairline,
    },
  })
}
