import { StyleSheet } from "react-native"
import {
  brandInteraction,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"

export function createSearchStyles(theme: BrandTheme) {
  return StyleSheet.create({
    // D-19: no background on the page or its top block, the route's ScreenFrame is the page
    // (canvas and halo), so the halo runs on behind the field.
    container: {
      flex: 1,
    },
    top: {
      paddingHorizontal: brandSpacing4.md,
      paddingBottom: brandSpacing4.smd,
      gap: brandSpacing4.smd,
    },
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
    },
    // Glass field: same fill, hairline and radius as the cards below it.
    field: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
      minHeight: brandInteraction.hitTarget.min,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
      boxShadow: theme.visual.glass.cardShadow,
      paddingHorizontal: brandSpacing4.md,
    },
    input: {
      flex: 1,
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
      paddingVertical: 0,
    },
    clearButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    cancel: {
      ...brandTypography.input,
      // `forest` is theme-invariant and vanishes on the dark canvas (OA-83); the accent text token is
      // the brand green in light and a light green in dark, both at 4.5:1 or more on the canvas.
      color: theme.visual.accentText,
      paddingVertical: brandSpacing4.smd,
    },
    // The glass segment container (fill and border are set from `theme.visual.chip` at the call
    // site, like the Settings picker); each scope is one chip of at least 44 pt.
    segments: {
      flexDirection: "row",
      padding: brandSpacing4.xs,
      gap: brandSpacing4.xs,
      borderRadius: brandRadius.pill,
      borderWidth: 1,
    },
    segment: {
      flex: 1,
      minHeight: brandInteraction.hitTarget.min,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: brandRadius.pill,
    },
    segmentActive: {
      backgroundColor: theme.visual.chip.activeBg,
    },
    segmentLabel: {
      ...brandTypography.meta,
      fontSize: brandTypeScale.subhead.fontSize,
      lineHeight: 20,
      color: theme.visual.chip.text,
    },
    segmentLabelActive: {
      color: theme.visual.chip.activeText,
    },
    chips: {
      flexDirection: "row",
      gap: brandSpacing4.sm,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: brandSpacing4.md,
      gap: brandSpacing4.smd,
    },
    caption: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
    },
    hint: {
      ...brandTypeScale.footnote,
      color: theme.colors.textSecondary,
      paddingTop: brandSpacing4.sm,
    },
  })
}
