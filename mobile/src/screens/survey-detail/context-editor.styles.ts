import { StyleSheet } from "react-native"
import { brandColors, brandRadius, brandShadow, brandTypography } from "../../app/brand-tokens"

// Styles of the scoring context card (ScoringContextEditor, plan 01.8-14), moved out of
// summary.styles.ts with the card.
export const styles = StyleSheet.create({
  detailMetadataCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: brandColors.divider,
    backgroundColor: brandColors.panel,
    padding: 18,
    gap: 12,
    ...brandShadow.card,
  },
  detailParcelsEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: brandRadius.pill,
    borderWidth: 1,
    borderColor: brandColors.divider,
    backgroundColor: brandColors.panelMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  methodBlock: {
    gap: 6,
  },
  groupTitle: {
    ...brandTypography.heroEyebrow,
    color: brandColors.textSecondary,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryItem: {
    color: brandColors.forest,
    backgroundColor: brandColors.panelMuted,
  },
  summaryItemLabel: {
    color: brandColors.forest,
  },
  hint: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
  },
  warningHint: {
    ...brandTypography.meta,
    color: brandColors.terracotta,
  },
  switchVersionButton: {
    alignSelf: "flex-start",
  },
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  scaleCopy: {
    flex: 1,
    gap: 2,
  },
  scaleLabel: {
    ...brandTypography.label,
    color: brandColors.textPrimary,
  },
})
