import { StyleSheet } from "react-native"
import { brandShadow, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createSummaryStyles(theme: BrandTheme) {
  return StyleSheet.create({
    factorTilesCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
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
      borderColor: theme.componentColors.notice.successBorder,
      backgroundColor: theme.colors.successSoft,
    },
    factorTilePending: {
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
    },
    factorTileEditable: {
      borderColor: theme.colors.divider,
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
      backgroundColor: theme.semanticColors.ctaPrimary,
    },
    factorBadgeText: {
      ...brandTypography.label,
      fontSize: 12,
      lineHeight: 14,
      color: theme.colors.white,
    },
    factorTileIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
    factorTileIconWrapCompleted: {
      backgroundColor: theme.colors.panelMuted,
    },
    factorTileIconWrapPending: {
      backgroundColor: theme.colors.panelMuted,
    },
    factorTileClass: {
      ...brandTypography.label,
      fontSize: 13,
      lineHeight: 16,
      color: theme.colors.textPrimary,
    },
    factorTileCode: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    factorTileClassCompleted: {
      color: theme.semanticColors.textStrong,
    },
    factorTileClassPending: {
      color: theme.colors.textSecondary,
    },
    factorTileStatusPill: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    factorTileStatusPillCompleted: {
      backgroundColor: theme.colors.successSoft,
    },
    factorTileStatusPillPending: {
      backgroundColor: theme.colors.panelMuted,
    },
    factorTileWarning: {
      ...brandTypography.meta,
      color: theme.colors.terracotta,
    },
    actionPanel: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 18,
      gap: 12,
      ...brandShadow.card,
    },
    // DET-04: a lesser-weight link, not an equal-weight button next to "Réessayer" (now the sync
    // notice's own integrated action).
    discardLink: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      textDecorationLine: "underline",
      alignSelf: "flex-start",
    },
    historyPanel: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 18,
      gap: 10,
      ...brandShadow.card,
    },
    historyRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      paddingTop: 8,
      gap: 2,
    },
    historyRowTitle: {
      ...brandTypography.label,
      color: theme.semanticColors.textStrong,
    },
    historyRowMeta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
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
      backgroundColor: theme.colors.panelMuted,
    },
    historyDeltaPillText: {
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
    },
    submittedReadonlyBanner: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.componentColors.notice.successBorder,
      backgroundColor: theme.colors.panel,
      padding: 18,
      gap: 8,
    },
    deadlineCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 18,
      gap: 6,
    },
    deadlineCardWarning: {
      borderColor: theme.componentColors.notice.warningBorder,
      backgroundColor: theme.colors.warningSoft,
    },
    deadlineLabel: {
      ...brandTypography.heroEyebrow,
      color: theme.colors.textSecondary,
    },
    deadlineValue: {
      fontSize: 22,
      lineHeight: 26,
      fontWeight: "900",
      color: theme.semanticColors.textStrong,
    },
    deadlineValueWarning: {
      color: theme.colors.ochre,
    },
  })
}
