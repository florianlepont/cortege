import { StyleSheet } from "react-native"
import { brandSpacing4, brandTypography } from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"

// Follow-up 32-31: the faces of the numeric rows, the same as the choice lists (32-30) and F's
// group rows: a 56 pt row, the label in the 15/21 medium face, a section header in the grouped-list
// face, the error caption in the field-state error tone. Colours come from the theme only.
const ROW_MIN_HEIGHT = 56

export function createValueRowStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      gap: brandSpacing4.sm,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: brandSpacing4.sm,
      marginTop: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.xs,
    },
    title: {
      ...brandTypography.sectionHeader,
      flexShrink: 1,
      color: theme.colors.textSecondary,
    },
    count: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.smd,
      minHeight: ROW_MIN_HEIGHT,
      paddingVertical: brandSpacing4.sm,
      paddingLeft: brandSpacing4.md,
      paddingRight: brandSpacing4.md,
    },
    label: {
      ...brandTypography.heroBody,
      flex: 1,
      color: theme.colors.textPrimary,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      paddingHorizontal: brandSpacing4.xs,
    },
    error: {
      ...brandTypography.meta,
      fontWeight: "700",
      color: theme.fieldState.error.text,
      paddingHorizontal: brandSpacing4.xs,
    },
    // The percent row's track, under the label and the value: its ends named above (G only).
    trackRow: {
      paddingHorizontal: brandSpacing4.md,
      gap: brandSpacing4.xs,
    },
    trackEnds: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    trackEnd: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
  })
}

export type ValueRowStyles = ReturnType<typeof createValueRowStyles>
