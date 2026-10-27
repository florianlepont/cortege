import { StyleSheet } from "react-native"
import { brandRadius, brandSpacing4, brandTypeScale, brandTypography } from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"
import { DMH_STEPPER_SIZE } from "../../ui/DmhCounterStepper"

// Phase 32 (plan 32-11, 32-UI-SPEC S1): the sizes are the spacing scale of the contract, the colours
// come from the theme only. The row's "+" uses DMH_STEPPER_SIZE, so it and the stepper buttons share
// one size (O-32-1).
const ROW_MIN_HEIGHT = 56
const CHECKBOX_SIZE = 24
const CHECKBOX_RADIUS = 8
/** The second line of a row is indented to the label: checkbox 24 plus the 12 gap. */
const LINE2_INDENT = CHECKBOX_SIZE + brandSpacing4.smd

export function createDmhListStyles(theme: BrandTheme) {
  return StyleSheet.create({
    row: {
      minHeight: ROW_MIN_HEIGHT,
      paddingVertical: brandSpacing4.sm,
      paddingHorizontal: brandSpacing4.md,
      justifyContent: "center",
    },
    line1: {
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.sm,
    },
    checkZone: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: ROW_MIN_HEIGHT,
    },
    checkbox: {
      width: CHECKBOX_SIZE,
      height: CHECKBOX_SIZE,
      borderRadius: CHECKBOX_RADIUS,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOn: {
      backgroundColor: theme.visual.chip.activeBg,
      borderColor: theme.visual.chip.activeBg,
    },
    label: {
      ...brandTypeScale.subhead,
      flex: 1,
      color: theme.colors.textPrimary,
    },
    addButton: {
      width: DMH_STEPPER_SIZE,
      height: DMH_STEPPER_SIZE,
      minHeight: DMH_STEPPER_SIZE,
      borderRadius: brandRadius.field,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.chip.fill,
      borderWidth: 1,
      borderColor: theme.visual.chip.border,
    },
    line2: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.sm,
      marginTop: brandSpacing4.sm,
      marginLeft: LINE2_INDENT,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    locked: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      marginTop: brandSpacing4.xs,
      marginLeft: LINE2_INDENT,
    },
  })
}

export type DmhListStyles = ReturnType<typeof createDmhListStyles>
