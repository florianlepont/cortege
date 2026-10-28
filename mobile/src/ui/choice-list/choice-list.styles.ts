import { StyleSheet } from "react-native"
import { brandSpacing4, brandTypography } from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"
import { SELECTION_CIRCLE_SIZE } from "../SelectionCircle"

// Follow-up 32-30: the sizes and faces of F's group list (`DmhGroupRow`), so a choice list of the
// other factors reads the same: a 56 pt row, the circle, the label in the 15/21 medium face, a
// pressed fill, and a section header in the grouped-list face. Colours come from the theme only.
const ROW_MIN_HEIGHT = 56

/** The hairlines start under the label: padding 16, circle 24 and the 12 gap. */
export const CHOICE_LABEL_INSET = brandSpacing4.md + SELECTION_CIRCLE_SIZE + brandSpacing4.smd

export function createChoiceListStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      gap: brandSpacing4.sm,
    },
    // The grouped-list header (`AppGroupedList` section title): outside the container, no chrome.
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
      gap: brandSpacing4.smd,
      minHeight: ROW_MIN_HEIGHT,
      paddingVertical: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.md,
    },
    // The pressed look of an AppGroupedList row.
    rowPressed: {
      backgroundColor: theme.colors.surfaceSoft,
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
    // A missing required choice: the error tone of the field states, bold like the old shell's.
    error: {
      ...brandTypography.meta,
      fontWeight: "700",
      color: theme.fieldState.error.text,
      paddingHorizontal: brandSpacing4.xs,
    },
  })
}

export type ChoiceListStyles = ReturnType<typeof createChoiceListStyles>
