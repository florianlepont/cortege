import { StyleSheet } from "react-native"
import {
  brandColors,
  brandOnDarkColors,
  brandRadius,
  brandShadow,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createHeaderStyles(theme: BrandTheme) {
  return StyleSheet.create({
    heroShell: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      paddingTop: 10,
      paddingHorizontal: 16,
    },
    heroCard: {
      flex: 1,
      position: "relative",
      overflow: "hidden",
      borderRadius: 34,
      // OA-80 (sketch 001, A Graphite): forest in light, a bordered surface in dark.
      backgroundColor: theme.semanticColors.heroSurface,
      borderWidth: 1,
      borderColor: theme.semanticColors.heroBorder,
      ...brandShadow.card,
    },
    heroAccentOrb: {
      position: "absolute",
      top: -24,
      right: -18,
      width: 126,
      height: 126,
      borderRadius: 999,
      backgroundColor: brandOnDarkColors.heroAccentTintOnDark,
    },
    heroExpandedLayer: {
      ...StyleSheet.absoluteFill,
      justifyContent: "space-between",
      paddingTop: 18,
      paddingBottom: 16,
      paddingHorizontal: 20,
    },
    heroExpandedHeader: {
      gap: 8,
      paddingRight: 46,
    },
    heroEyebrow: {
      ...brandTypography.heroEyebrow,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    heroTitleExpanded: {
      ...brandTypography.heroTitle,
      fontSize: 30,
      lineHeight: 34,
      color: brandColors.white,
    },
    heroBody: {
      ...brandTypography.heroBody,
      fontSize: 13,
      lineHeight: 18,
      color: brandOnDarkColors.heroBodyOnDark,
      maxWidth: 300,
    },
    heroMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    heroMetaPill: {
      borderRadius: brandRadius.pill,
      backgroundColor: brandOnDarkColors.heroSurfaceOnDark,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    heroMetaPillText: {
      ...brandTypography.meta,
      color: brandColors.white,
    },
    heroCompactLayer: {
      ...StyleSheet.absoluteFill,
      justifyContent: "flex-end",
      paddingHorizontal: 20,
      paddingRight: 64,
      paddingBottom: 12,
      gap: 8,
    },
    heroCompactSummary: {
      ...brandTypography.meta,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    compactProgressWrap: {
      gap: 5,
    },
    compactProgressCount: {
      ...brandTypography.heroEyebrow,
      fontSize: 12,
      // OA-35: a 12 pt line clipped accents on capitals ("Étape", "État").
      lineHeight: 16,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    compactProgressTrack: {
      flexDirection: "row",
      gap: 6,
    },
    compactProgressSegment: {
      flex: 1,
      height: 6,
      borderRadius: 999,
      backgroundColor: brandOnDarkColors.heroSurfaceStrongOnDark,
    },
    compactProgressSegmentActive: {
      backgroundColor: brandColors.white,
    },
    compactProgressSegmentComplete: {
      backgroundColor: brandOnDarkColors.heroTextMutedOnDark,
    },
    stepRailWrap: {
      zIndex: 1,
      overflow: "hidden",
      paddingBottom: 0,
    },
    stepRailCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 6,
      ...brandShadow.card,
    },
    stepRow: {
      flexDirection: "row",
      gap: 8,
    },
    stepButton: {
      flex: 1,
      minHeight: 72,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
      paddingHorizontal: 9,
      paddingVertical: 7,
      gap: 2,
    },
    stepButtonActive: {
      borderColor: brandColors.forest,
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    stepButtonComplete: {
      borderColor: brandColors.moss,
      backgroundColor: theme.colors.successSoft,
    },
    stepButtonDisabled: {
      opacity: 0.52,
    },
    stepButtonTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    stepIndexPill: {
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.panelMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    stepIndexPillActive: {
      backgroundColor: brandOnDarkColors.heroSurfaceStrongOnDark,
    },
    stepIndexText: {
      ...brandTypography.heroEyebrow,
      fontSize: 12,
      // OA-35: a 12 pt line clipped accents on capitals ("Étape", "État").
      lineHeight: 16,
      color: theme.semanticColors.textStrong,
    },
    stepIndexTextActive: {
      color: theme.semanticColors.onCtaPrimary,
    },
    stepButtonTitle: {
      ...brandTypography.label,
      color: theme.colors.textPrimary,
    },
    stepButtonTitleActive: {
      color: theme.semanticColors.onCtaPrimary,
    },
    stepButtonMeta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    stepButtonMetaActive: {
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    stepButtonHint: {
      marginTop: "auto",
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
    },
    stepButtonHintActive: {
      color: theme.semanticColors.onCtaPrimary,
    },
  })
}
