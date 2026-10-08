import { StyleSheet } from "react-native"
import {
  brandDefaultFontFamily,
  brandRadius,
  brandShadow,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { BrandTheme } from "../../app/theme"

const TIMELINE_TILE = 32

export function createTabsStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // Glass card of the history page (variant I): same recipe as the photos card of the summary.
    eventsCard: {
      gap: brandSpacing4.smd,
      padding: brandSpacing4.md,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
    },
    eventRow: {
      gap: 4,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      paddingTop: 12,
    },
    eventTitle: {
      ...brandTypography.label,
      color: theme.semanticColors.textStrong,
    },
    eventPayload: {
      ...brandTypography.sectionBody,
      color: theme.colors.textSecondary,
    },
    // DET-05: the icon timeline: a tile per event on a vertical rail, connected to the next one,
    // with no rail below the last event.
    timelineRow: {
      flexDirection: "row",
      gap: brandSpacing4.smd,
    },
    timelineRail: {
      alignItems: "center",
      width: TIMELINE_TILE,
    },
    timelineDot: {
      width: TIMELINE_TILE,
      height: TIMELINE_TILE,
      borderRadius: brandRadius.badgeSm,
      alignItems: "center",
      justifyContent: "center",
    },
    timelineConnector: {
      flex: 1,
      width: 2,
      marginVertical: brandSpacing4.xxs,
      backgroundColor: theme.colors.divider,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: brandSpacing4.md,
      gap: brandSpacing4.xxs,
    },
    timelineTitle: {
      ...brandTypography.input,
      color: theme.colors.textPrimary,
    },
    timelineMeta: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
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
