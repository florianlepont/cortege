import { StyleSheet } from "react-native"
import {
  brandColors,
  brandRadius,
  brandSemanticColors,
  brandShadow,
  brandTypography,
} from "../../app/brand-tokens"

export const headerStyles = StyleSheet.create({
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
    backgroundColor: brandColors.forest,
    ...brandShadow.card,
  },
  heroAccentOrb: {
    position: "absolute",
    top: -24,
    right: -18,
    width: 126,
    height: 126,
    borderRadius: 999,
    backgroundColor: brandSemanticColors.heroAccentTintOnDark,
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
    color: brandSemanticColors.heroTextMutedOnDark,
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
    color: brandSemanticColors.heroBodyOnDark,
    maxWidth: 300,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroMetaPill: {
    borderRadius: brandRadius.pill,
    backgroundColor: brandSemanticColors.heroSurfaceOnDark,
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
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  compactProgressWrap: {
    gap: 5,
  },
  compactProgressCount: {
    ...brandTypography.heroEyebrow,
    fontSize: 10,
    lineHeight: 12,
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  compactProgressTrack: {
    flexDirection: "row",
    gap: 6,
  },
  compactProgressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: brandSemanticColors.heroSurfaceStrongOnDark,
  },
  compactProgressSegmentActive: {
    backgroundColor: brandColors.white,
  },
  compactProgressSegmentComplete: {
    backgroundColor: brandSemanticColors.heroTextMutedOnDark,
  },
  stepRailWrap: {
    zIndex: 1,
    overflow: "hidden",
    paddingBottom: 0,
  },
  stepRailCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: brandColors.divider,
    backgroundColor: brandColors.panel,
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
    borderColor: brandColors.divider,
    backgroundColor: brandColors.white,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 2,
  },
  stepButtonActive: {
    borderColor: brandColors.forest,
    backgroundColor: brandColors.forest,
  },
  stepButtonComplete: {
    borderColor: brandColors.moss,
    backgroundColor: brandColors.successSoft,
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
    backgroundColor: brandColors.panelMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepIndexPillActive: {
    backgroundColor: brandSemanticColors.heroSurfaceStrongOnDark,
  },
  stepIndexText: {
    ...brandTypography.heroEyebrow,
    fontSize: 10,
    lineHeight: 12,
    color: brandColors.forest,
  },
  stepIndexTextActive: {
    color: brandColors.white,
  },
  stepButtonTitle: {
    ...brandTypography.label,
    color: brandColors.textPrimary,
  },
  stepButtonTitleActive: {
    color: brandColors.white,
  },
  stepButtonMeta: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
  },
  stepButtonMetaActive: {
    color: brandSemanticColors.heroTextMutedOnDark,
  },
  stepButtonHint: {
    marginTop: "auto",
    ...brandTypography.meta,
    color: brandColors.forest,
  },
  stepButtonHintActive: {
    color: brandColors.white,
  },
})
