import { StyleSheet } from "react-native"
import {
  brandColors,
  brandOnDarkStatus,
  brandRadius,
  brandSemanticColors,
  brandShadow,
  brandTypography,
} from "../../app/brand-tokens"

export const styles = StyleSheet.create({
  detailHeroStickyWrap: {
    backgroundColor: brandColors.canvas,
  },
  detailHeroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 34,
    backgroundColor: brandColors.forest,
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
    backgroundColor: brandSemanticColors.heroAccentTintOnDark,
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
    backgroundColor: brandSemanticColors.heroSurfaceOnDark,
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
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  detailSurveyTitle: {
    ...brandTypography.heroTitle,
    color: brandColors.white,
  },
  detailHeroMetricCard: {
    minWidth: 116,
    maxWidth: 168,
    borderRadius: 24,
    backgroundColor: brandSemanticColors.heroSurfaceOnDark,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  detailHeroMetricLabel: {
    ...brandTypography.heroEyebrow,
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  detailHeroMetricValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    color: brandColors.white,
  },
  detailHeroMetricMeta: {
    ...brandTypography.meta,
    color: brandSemanticColors.heroTextMutedOnDark,
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
    color: brandColors.white,
  },
  detailHeroCompactMeta: {
    ...brandTypography.meta,
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  detailHeroCompactMetricPill: {
    minWidth: 92,
    borderRadius: brandRadius.card,
    backgroundColor: brandSemanticColors.heroSurfaceOnDark,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "flex-end",
    gap: 2,
  },
  detailHeroCompactMetricLabel: {
    ...brandTypography.meta,
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  detailHeroCompactMetricValue: {
    ...brandTypography.label,
    fontSize: 18,
    lineHeight: 21,
    color: brandColors.white,
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
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  detailRenameInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: brandSemanticColors.heroSurfaceStrongOnDark,
    backgroundColor: brandSemanticColors.heroSurfaceOnDark,
    color: brandColors.white,
  },
  detailRenameSaveButton: {
    borderRadius: brandRadius.pill,
    backgroundColor: brandColors.sage,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailRenameSaveButtonText: {
    ...brandTypography.meta,
    color: brandColors.forest,
  },
  detailRenameCancelButton: {
    borderRadius: brandRadius.pill,
    borderWidth: 1,
    borderColor: brandSemanticColors.heroBorderStrongOnDark,
    backgroundColor: brandSemanticColors.heroPanelBackgroundOnDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailRenameCancelButtonText: {
    ...brandTypography.meta,
    color: brandColors.white,
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
    borderColor: brandSemanticColors.heroSurfaceOnDark,
    backgroundColor: brandSemanticColors.heroPanelBackgroundOnDark,
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
    color: brandColors.white,
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: brandRadius.pill,
    backgroundColor: brandSemanticColors.heroSurfaceOnDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroMetaText: {
    ...brandTypography.meta,
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  detailHeroProgressCard: {
    gap: 8,
    borderRadius: 22,
    backgroundColor: brandSemanticColors.heroPanelBackgroundOnDark,
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
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  detailHeroProgressValue: {
    ...brandTypography.label,
    color: brandColors.white,
  },
  detailHeroProgressTrack: {
    height: 10,
    overflow: "hidden",
    borderRadius: brandRadius.pill,
    backgroundColor: brandSemanticColors.heroPanelBorderOnDark,
  },
  detailHeroProgressFill: {
    height: "100%",
    borderRadius: brandRadius.pill,
    backgroundColor: brandColors.sage,
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
    borderColor: brandSemanticColors.heroSurfaceOnDark,
    backgroundColor: brandSemanticColors.heroPanelBackgroundOnDark,
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
    color: brandColors.white,
  },
  detailHeroSubmitBody: {
    ...brandTypography.meta,
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  detailHeroSubmitPill: {
    borderRadius: brandRadius.pill,
    backgroundColor: brandSemanticColors.heroSurfaceOnDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailHeroSubmitPillText: {
    ...brandTypography.meta,
    color: brandColors.white,
  },
  detailHeroSubmitButtonInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: brandRadius.pill,
    backgroundColor: brandColors.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  detailHeroSubmitButtonCompact: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: brandRadius.pill,
    backgroundColor: brandColors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailHeroSubmitButtonText: {
    ...brandTypography.meta,
    color: brandColors.forest,
  },
})
