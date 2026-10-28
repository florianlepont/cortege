import { useMemo } from "react"
import { View } from "react-native"
import { parseFiniteNumberInput } from "../../app/number-utils"
import { toFieldText } from "../../app/decimal-text"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../AppText"
import { ValueStepper } from "../ValueStepper"
import { createValueRowStyles } from "./value-rows.styles"

const t = fr.factorDetail.valueRows

const plain = (text: string): string => text

export type NumberRowProps = {
  /** The row's label as the page shows it (the field's label, with its required marker). */
  label: string
  /** The value as the form keeps it: text, "" when nothing is entered. */
  value: string
  onChange: (text: string) => void
  /** The field was acted on: the form may now show its error. */
  onTouch: () => void
  min?: number
  max: number
  step: number
  /** How the number is drawn in the row, without the unit sign. */
  format: (value: number) => string
  /** The unit sign drawn after the number (a no-break space and "%"), none by default. */
  unitSuffix?: string
  /** The spoken value from the drawn number ("70" gives "70 %"). */
  spokenValue?: (text: string) => string
  keyboardType?: "numeric" | "decimal-pad"
  /** What a typed text becomes before it is stored (a percent is held to 100). */
  clampText?: (text: string) => string
  editable?: boolean
  /** False: the value alone, no -/+ capsule (a percent row, which has its draggable track). */
  showButtons?: boolean
  testID: string
  inputTestID?: string
}

/**
 * Follow-up 32-31: one numeric row of the grouped list: the label on the left, the value and the
 * -/+ capsule on the right (`ValueStepper`, the stepper of F's rows). A step writes the new number as
 * the form's text and touches the field; a typed value is stored as typed (held by `clampText`), so
 * the form's own validation still tells a missing or out-of-range value. An empty field reads 0
 * without storing anything.
 */
export function NumberRow({
  label,
  value,
  onChange,
  onTouch,
  min = 0,
  max,
  step,
  format,
  unitSuffix = "",
  spokenValue = plain,
  keyboardType = "numeric",
  clampText,
  editable = true,
  showButtons = true,
  testID,
  inputTestID,
}: NumberRowProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createValueRowStyles(theme), [theme])
  const number = parseFiniteNumberInput(value) ?? 0
  const draw = (n: number): string => `${format(n)}${unitSuffix}`
  return (
    <View style={styles.row} testID={`${testID}-row`}>
      <Text style={styles.label}>{label}</Text>
      <ValueStepper
        value={number}
        onStep={(next) => {
          onChange(toFieldText(next))
          onTouch()
        }}
        onSubmitText={(text) => {
          onChange(clampText ? clampText(text) : text)
          onTouch()
        }}
        accessibilityLabel={label}
        accessibilityValueText={spokenValue(format(number))}
        editHint={t.stepper.editHint}
        incrementLabel={t.stepper.increment}
        decrementLabel={t.stepper.decrement}
        editable={editable}
        showButtons={showButtons}
        min={min}
        max={max}
        step={step}
        format={draw}
        keyboardType={keyboardType}
        testID={testID}
        inputTestID={inputTestID}
      />
    </View>
  )
}
