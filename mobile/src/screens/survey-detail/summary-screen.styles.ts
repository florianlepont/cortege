import { StyleSheet } from "react-native"
import { brandRadius, brandSpacing, brandTypography } from "../../app/brand-tokens"
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
    title: {
      flex: 1,
      ...brandTypography.heroTitle,
      fontSize: 25,
      lineHeight: 29,
      color: theme.semanticColors.textStrong,
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
    statusStrong: {
      ...brandTypography.sectionBody,
      fontFamily: "Jost-SemiBold",
      color: theme.colors.textPrimary,
    },
    statusMuted: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
      flexShrink: 1,
    },
    // Score card.
    scoreCard: {
      borderRadius: brandRadius.card,
      padding: 18,
      gap: 12,
      backgroundColor: theme.semanticColors.heroSurface,
      borderWidth: 1,
      borderColor: theme.semanticColors.heroBorder,
    },
    scoreTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    scoreValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 6,
    },
    scoreValue: {
      fontFamily: "Sora-Bold",
      fontSize: 40,
      lineHeight: 44,
      color: theme.colors.white,
    },
    scoreMax: {
      fontSize: 18,
      color: theme.colors.white,
      opacity: 0.8,
    },
    scoreCaptionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    scoreCaption: {
      ...brandTypography.sectionBody,
      color: theme.colors.white,
      opacity: 0.9,
    },
    scoreSegments: {
      flexDirection: "row",
      gap: 4,
    },
    scoreSegment: {
      flex: 1,
      height: 6,
      borderRadius: 3,
    },
    scoreHint: {
      ...brandTypography.meta,
      color: theme.colors.white,
      opacity: 0.85,
    },
    // Photos.
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
    mapCard: {
      height: 190,
      borderRadius: brandRadius.card,
      overflow: "hidden",
      backgroundColor: theme.colors.panelMuted,
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
