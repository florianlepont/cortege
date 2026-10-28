import { StyleSheet } from "react-native"
import {
  brandInteraction,
  brandSpacing4,
  brandTypography,
} from "../../app/brand-tokens"
import type { BrandTheme } from "../../app/theme"
import { DMH_STEPPER_SIZE } from "../../ui/DmhCounterStepper"
import { SELECTION_CIRCLE_SIZE } from "../../ui/SelectionCircle"

// Phase 32 (plan 32-11, 32-UI-SPEC S1; redesign 32-18 A-I1 to A-I4): the sizes are the spacing scale
// of the contract, the colours come from the theme only. The row's "+" uses DMH_STEPPER_SIZE, so it
// and the stepper segments share the 48 pt glove height (O-32-1). The rows sit in one
// AppGroupedContainer, so a row carries no card, no border and no horizontal padding of its own:
// its check zone runs to the container's edge, so the pressed fill does too.
const ROW_MIN_HEIGHT = 56
const ROW_SIDE_PADDING = brandSpacing4.md
const CIRCLE_SIZE = SELECTION_CIRCLE_SIZE
const INFO_SIZE = brandInteraction.hitTarget.min
const ADD_DISC_SIZE = 36
const INFO_DISC_SIZE = 32
/** The second line of a row is indented to the label: padding 16, circle 24 and the 12 gap. */
export const DMH_LABEL_INSET = ROW_SIDE_PADDING + CIRCLE_SIZE + brandSpacing4.smd

export function createDmhListStyles(theme: BrandTheme) {
  return StyleSheet.create({
    root: {
      gap: brandSpacing4.md,
    },
    sections: {
      gap: brandSpacing4.md,
    },
    row: {
      minHeight: ROW_MIN_HEIGHT,
      justifyContent: "center",
    },
    line1: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: ROW_MIN_HEIGHT,
      paddingRight: brandSpacing4.xs,
    },
    checkZone: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: brandSpacing4.smd,
      minHeight: ROW_MIN_HEIGHT,
      paddingLeft: ROW_SIDE_PADDING,
    },
    // The pressed look of an AppGroupedList row.
    checkZonePressed: {
      backgroundColor: theme.colors.surfaceSoft,
    },
    label: {
      ...brandTypography.heroBody,
      flex: 1,
      color: theme.colors.textPrimary,
    },
    infoButton: {
      width: INFO_SIZE,
      height: INFO_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    infoDisc: {
      width: INFO_DISC_SIZE,
      height: INFO_DISC_SIZE,
      borderRadius: INFO_DISC_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.control.fill,
    },
    addButton: {
      width: DMH_STEPPER_SIZE,
      height: DMH_STEPPER_SIZE,
      minHeight: DMH_STEPPER_SIZE,
      marginLeft: brandSpacing4.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    addDisc: {
      width: ADD_DISC_SIZE,
      height: ADD_DISC_SIZE,
      borderRadius: ADD_DISC_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.visual.control.fill,
    },
    line2: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: brandSpacing4.sm,
      marginTop: brandSpacing4.sm,
      marginBottom: brandSpacing4.sm,
      marginLeft: DMH_LABEL_INSET,
      marginRight: ROW_SIDE_PADDING,
    },
    caption: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    locked: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      marginBottom: brandSpacing4.sm,
      marginLeft: DMH_LABEL_INSET,
      marginRight: ROW_SIDE_PADDING,
    },
  })
}

export type DmhListStyles = ReturnType<typeof createDmhListStyles>
