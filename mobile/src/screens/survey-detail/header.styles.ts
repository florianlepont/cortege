import { StyleSheet } from "react-native"
import {
  brandOnDarkColors,
  brandOnDarkStatus,
  brandRadius,
  brandShadow,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createHeaderStyles(theme: BrandTheme) {
  return StyleSheet.create({
    detailHeroStickyWrap: {
      backgroundColor: theme.colors.canvas,
    },
    detailHeroCard: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 34,
      // OA-80 (sketch 001, A Graphite): forest in light, a bordered surface in dark.
      backgroundColor: theme.semanticColors.heroSurface,
      borderWidth: 1,
      borderColor: theme.semanticColors.heroBorder,
      padding: 20,
      gap: 12,
      ...brandShadow.card,
    },
    detailHeroCardCompressed: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
    },
    detailHeroAccentOrb: {
      position: "absolute",
      top: -24,
      right: -18,
      width: 138,
      height: 138,
      borderRadius: 999,
      // Sketch 001 A: the decorative orb stays on the forest hero in light mode; on the dark
      // bordered hero it is a faint neutral disc.
      backgroundColor:
        theme.scheme === "dark"
          ? brandOnDarkColors.heroOrbFaintOnDark
          : brandOnDarkColors.heroAccentTintOnDark,
    },
    // DET-03/04: the "…" menu button (Renommer/Partager/Supprimer), its own row so it never
    // overlaps the score card that sits at the top of both the compressed and expanded layouts.
    detailHeroMenuRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    detailHeroMenuButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: brandOnDarkColors.heroSurfaceOnDark,
    },
    detailHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 14,
    },
    detailHeroCopy: {
      flex: 1,
      gap: 8,
    },
    detailHeroEyebrow: {
      ...brandTypography.heroEyebrow,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailSurveyTitle: {
      ...brandTypography.heroTitle,
      color: theme.colors.white,
    },
    detailHeroMetricCard: {
      minWidth: 116,
      maxWidth: 168,
      borderRadius: 24,
      backgroundColor: brandOnDarkColors.heroSurfaceOnDark,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    detailHeroMetricLabel: {
      ...brandTypography.heroEyebrow,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailHeroMetricValue: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: "900",
      color: theme.colors.white,
    },
    detailHeroMetricMeta: {
      ...brandTypography.meta,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailHeroSubScores: {
      gap: 4,
    },
    detailHeroSubScorePill: {
      alignSelf: "flex-start",
      borderRadius: brandRadius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    detailHeroSubScoreText: {
      ...brandTypography.meta,
    },
    detailHeroCompactHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    detailHeroCompactCopy: {
      flex: 1,
      gap: 4,
    },
    detailHeroCompactTitle: {
      ...brandTypography.sectionTitle,
      fontSize: 24,
      lineHeight: 27,
      color: theme.colors.white,
    },
    detailHeroCompactMeta: {
      ...brandTypography.meta,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailHeroCompactMetricPill: {
      minWidth: 92,
      borderRadius: brandRadius.card,
      backgroundColor: brandOnDarkColors.heroSurfaceOnDark,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: "flex-end",
      gap: 2,
    },
    detailHeroCompactMetricLabel: {
      ...brandTypography.meta,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailHeroCompactMetricValue: {
      ...brandTypography.label,
      fontSize: 18,
      lineHeight: 21,
      color: theme.colors.white,
    },
    detailRenameRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      flexWrap: "wrap",
      gap: 8,
    },
    detailRenameField: {
      flex: 1,
      minWidth: 200,
    },
    detailRenameLabel: {
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailRenameInput: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: brandOnDarkColors.heroSurfaceStrongOnDark,
      backgroundColor: brandOnDarkColors.heroSurfaceOnDark,
      color: theme.colors.white,
    },
    detailRenameSaveButton: {
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.sage,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    detailRenameSaveButtonText: {
      ...brandTypography.meta,
      color: theme.colors.forest,
    },
    detailRenameCancelButton: {
      borderRadius: brandRadius.pill,
      borderWidth: 1,
      borderColor: brandOnDarkColors.heroBorderStrongOnDark,
      backgroundColor: brandOnDarkColors.heroPanelBackgroundOnDark,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    detailRenameCancelButtonText: {
      ...brandTypography.meta,
      color: theme.colors.white,
    },
    detailHeroStatusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    detailHeroStatusPill: {
      borderRadius: brandRadius.pill,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderWidth: 1,
    },
    detailHeroStatusPillNeutral: {
      borderColor: brandOnDarkColors.heroSurfaceOnDark,
      backgroundColor: brandOnDarkColors.heroPanelBackgroundOnDark,
    },
    detailHeroStatusPillSuccess: {
      borderColor: brandOnDarkStatus.successBorder,
      backgroundColor: brandOnDarkStatus.successBackground,
    },
    detailHeroStatusPillDanger: {
      borderColor: brandOnDarkStatus.dangerBorder,
      backgroundColor: brandOnDarkStatus.dangerBackground,
    },
    detailHeroStatusPillText: {
      ...brandTypography.meta,
      color: theme.colors.white,
    },
    heroMetaPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: brandRadius.pill,
      backgroundColor: brandOnDarkColors.heroSurfaceOnDark,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    heroMetaText: {
      ...brandTypography.meta,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailHeroProgressCard: {
      gap: 8,
      borderRadius: 22,
      backgroundColor: brandOnDarkColors.heroPanelBackgroundOnDark,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    detailHeroProgressCardCompact: {
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    detailHeroProgressHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    detailHeroProgressLabel: {
      ...brandTypography.heroEyebrow,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailHeroProgressValue: {
      ...brandTypography.label,
      color: theme.colors.white,
    },
    detailHeroProgressTrack: {
      height: 10,
      overflow: "hidden",
      borderRadius: brandRadius.pill,
      backgroundColor: brandOnDarkColors.heroPanelBorderOnDark,
    },
    detailHeroProgressFill: {
      height: "100%",
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.sage,
    },
    detailHeroProgressFooter: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    detailHeroSubmitCard: {
      gap: 10,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: brandOnDarkColors.heroSurfaceOnDark,
      backgroundColor: brandOnDarkColors.heroPanelBackgroundOnDark,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    detailHeroSubmitCardCompact: {
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    detailHeroSubmitCardReady: {
      borderColor: brandOnDarkStatus.successBorderStrong,
      backgroundColor: brandOnDarkStatus.successBackground,
    },
    detailHeroSubmitCardPendingSync: {
      borderColor: brandOnDarkStatus.warningBorder,
      backgroundColor: brandOnDarkStatus.warningBackground,
    },
    detailHeroSubmitCardBlocked: {
      borderColor: brandOnDarkStatus.dangerBorderStrong,
      backgroundColor: brandOnDarkStatus.dangerBackgroundStrong,
    },
    detailHeroSubmitHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    detailHeroSubmitHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    detailHeroSubmitTitle: {
      ...brandTypography.label,
      color: theme.colors.white,
    },
    detailHeroSubmitBody: {
      ...brandTypography.meta,
      color: brandOnDarkColors.heroTextMutedOnDark,
    },
    detailHeroSubmitPill: {
      borderRadius: brandRadius.pill,
      backgroundColor: brandOnDarkColors.heroSurfaceOnDark,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    detailHeroSubmitPillText: {
      ...brandTypography.meta,
      color: theme.colors.white,
    },
    detailHeroSubmitButtonInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.white,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    detailHeroSubmitButtonCompact: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: brandRadius.pill,
      backgroundColor: theme.colors.white,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    detailHeroSubmitButtonText: {
      ...brandTypography.meta,
      color: theme.colors.forest,
    },
  })
}
