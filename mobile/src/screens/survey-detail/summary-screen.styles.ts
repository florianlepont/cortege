import { StyleSheet } from "react-native"
import {
  brandRadius,
  brandSpacing,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

const PHOTO_SIZE = 104
const HIT_TARGET = 44

/** Styles of the survey summary screen (OA-46): title block, score card, photos, map, rows, CTA. */
export function createSummaryScreenStyles(theme: BrandTheme) {
  const hairline = theme.componentColors.card.panelBorder
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
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
    scoreContent: {
      padding: brandSpacing4.lg,
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
      marginTop: brandSpacing4.smd,
    },
    scoreTiles: {
      flexDirection: "row",
      gap: brandSpacing4.smd,
      marginTop: brandSpacing4.md,
    },
    scoreTile: {
      flex: 1,
      gap: brandSpacing4.xs,
      padding: brandSpacing4.smd,
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
      marginTop: brandSpacing4.smd,
      color: theme.visual.forest.body,
    },
    // Photos. `photosCard` is the glass card of the summary strip; `section`, `sectionHeader` and
    // `photoRow` are also read by the context and community pages.
    photosCard: {
      gap: brandSpacing4.smd,
      padding: brandSpacing4.md,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      borderCurve: "continuous",
    },
    section: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: {
      ...brandTypography.sectionTitle,
      color: theme.semanticColors.textStrong,
    },
    sectionTitleCount: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    addButton: {
      minHeight: HIT_TARGET,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    addButtonText: {
      ...brandTypography.button,
      color: theme.semanticColors.textStrong,
    },
    photoRow: {
      flexDirection: "row",
      gap: 10,
    },
    photo: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      borderRadius: 16,
      overflow: "hidden",
    },
    photoImage: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
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
    bottomBar: {
      paddingHorizontal: brandSpacing.md,
      paddingTop: 10,
      backgroundColor: theme.colors.canvas,
    },
    // Sub-pages shared.
    subContent: {
      padding: brandSpacing.md,
      gap: 18,
      paddingBottom: 48,
    },
    hairline: {
      height: 1,
      backgroundColor: hairline,
    },
  })
}
