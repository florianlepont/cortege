import { StyleSheet } from "react-native"
import { brandShadow, brandTypography } from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

export function createTabsStyles(theme: BrandTheme) {
  return StyleSheet.create({
    eventsCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 18,
      gap: 12,
      ...brandShadow.card,
    },
    eventRow: {
      gap: 4,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      paddingTop: 12,
    },
    eventTitle: {
      ...brandTypography.label,
      color: theme.colors.forest,
    },
    eventPayload: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    // DET-05: the icon timeline replacing EventsTab's plain text rows — a dot per event on a
    // vertical rail, connected to the next one, with no rail below the last event.
    timelineRow: {
      flexDirection: "row",
      gap: 12,
    },
    timelineRail: {
      alignItems: "center",
      width: 28,
    },
    timelineDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    timelineConnector: {
      flex: 1,
      width: 2,
      marginVertical: 2,
      backgroundColor: theme.colors.divider,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: 16,
      gap: 2,
    },
    debugCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 18,
      gap: 6,
      ...brandShadow.card,
    },
    debugAttachmentBlock: {
      gap: 10,
    },
    debugAttachmentCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.colors.panel,
      padding: 14,
      gap: 6,
    },
    debugAttachmentPreview: {
      width: "100%",
      height: 180,
      borderRadius: 18,
      backgroundColor: theme.colors.panelMuted,
    },
    debugAttachmentPreviewPlaceholder: {
      width: "100%",
      height: 180,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.panelMuted,
    },
  })
}
