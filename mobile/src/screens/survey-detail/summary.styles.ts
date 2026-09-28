import { StyleSheet } from "react-native"
import {
  brandColors,
  brandComponentTokens,
  brandShadow,
  brandTypography,
} from "../../app/brand-tokens"

export const styles = StyleSheet.create({
  factorTilesCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: brandColors.divider,
    backgroundColor: brandColors.panel,
    padding: 18,
    gap: 12,
    ...brandShadow.card,
  },
  factorTilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  factorTile: {
    width: "31%",
    minWidth: 98,
    flexGrow: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  factorTileCompleted: {
    borderColor: brandComponentTokens.notice.successBorder,
    backgroundColor: brandColors.successSoft,
  },
  factorTilePending: {
    borderColor: brandColors.divider,
    backgroundColor: brandColors.white,
  },
  factorTileEditable: {
    borderColor: brandColors.divider,
  },
  factorTileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  factorTileIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  factorBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.forest,
  },
  factorBadgeText: {
    ...brandTypography.label,
    fontSize: 12,
    lineHeight: 14,
    color: brandColors.white,
  },
  factorTileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.panelMuted,
  },
  factorTileIconWrapCompleted: {
    backgroundColor: brandColors.panelMuted,
  },
  factorTileIconWrapPending: {
    backgroundColor: brandColors.panelMuted,
  },
  factorTileClass: {
    ...brandTypography.label,
    fontSize: 13,
    lineHeight: 16,
    color: brandColors.textPrimary,
  },
  factorTileCode: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
  },
  factorTileClassCompleted: {
    color: brandColors.forest,
  },
  factorTileClassPending: {
    color: brandColors.textSecondary,
  },
  factorTileStatusPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  factorTileStatusPillCompleted: {
    backgroundColor: brandColors.successSoft,
  },
  factorTileStatusPillPending: {
    backgroundColor: brandColors.panelMuted,
  },
  factorTileWarning: {
    ...brandTypography.meta,
    color: brandColors.terracotta,
  },
  actionPanel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: brandColors.divider,
    backgroundColor: brandColors.panel,
    padding: 18,
    gap: 12,
    ...brandShadow.card,
  },
  // DET-04: a lesser-weight link, not an equal-weight button next to "Réessayer" (now the sync
  // notice's own integrated action).
  discardLink: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
    textDecorationLine: "underline",
    alignSelf: "flex-start",
  },
  historyPanel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: brandColors.divider,
    backgroundColor: brandColors.panel,
    padding: 18,
    gap: 10,
    ...brandShadow.card,
  },
  historyRow: {
    borderTopWidth: 1,
    borderTopColor: brandColors.divider,
    paddingTop: 8,
    gap: 2,
  },
  historyRowTitle: {
    ...brandTypography.label,
    color: brandColors.forest,
  },
  historyRowMeta: {
    ...brandTypography.meta,
    color: brandColors.textSecondary,
  },
  historyDeltaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  historyDeltaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: brandColors.panelMuted,
  },
  historyDeltaPillText: {
    ...brandTypography.meta,
    color: brandColors.forest,
  },
  submittedReadonlyBanner: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: brandComponentTokens.notice.successBorder,
    backgroundColor: brandColors.panel,
    padding: 18,
    gap: 8,
  },
  deadlineCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: brandColors.divider,
    backgroundColor: brandColors.panel,
    padding: 18,
    gap: 6,
  },
  deadlineCardWarning: {
    borderColor: brandComponentTokens.notice.warningBorder,
    backgroundColor: brandColors.warningSoft,
  },
  deadlineLabel: {
    ...brandTypography.heroEyebrow,
    color: brandColors.textSecondary,
  },
  deadlineValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
    color: brandColors.forest,
  },
  deadlineValueWarning: {
    color: brandColors.ochre,
  },
})
