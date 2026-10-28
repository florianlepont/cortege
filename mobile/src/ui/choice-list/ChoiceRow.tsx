import { memo } from "react"
import { AppPressable } from "../AppPressable"
import { AppText as Text } from "../AppText"
import { feedback } from "../feedback"
import { SelectionCircle } from "../SelectionCircle"
import type { ChoiceListStyles } from "./choice-list.styles"

export type ChoiceMode = "multi" | "single"

export type ChoiceRowProps = {
  value: string
  label: string
  selected: boolean
  mode: ChoiceMode
  onChoose: (value: string) => void
  styles: ChoiceListStyles
  testID: string
}

/**
 * One row of a choice list (follow-up 32-30): the leading circle and the label, the whole row a
 * 56 pt target with a soft fill while pressed. A multi-select list reads as checkboxes, a
 * single-select one as radios; both speak the visible label and the checked state, the circle itself
 * is decorative. Memoised on its own props, so a tap re-renders the rows whose state changed.
 */
export const ChoiceRow = memo(function ChoiceRow({
  value,
  label,
  selected,
  mode,
  onChoose,
  styles,
  testID,
}: ChoiceRowProps) {
  const onPress = (): void => {
    onChoose(value)
    feedback.selection()
  }

  return (
    <AppPressable
      disableScale
      disableRipple
      onPress={onPress}
      accessibilityRole={mode === "single" ? "radio" : "checkbox"}
      accessibilityState={
        mode === "single" ? { checked: selected, selected } : { checked: selected }
      }
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      testID={testID}
    >
      <SelectionCircle selected={selected} />
      <Text style={styles.label}>{label}</Text>
    </AppPressable>
  )
})
