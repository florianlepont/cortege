import { fr } from "../i18n"
import { VALUE_STEPPER_SIZE, ValueStepper } from "./ValueStepper"

/** The 48 pt height of the stepper, under the name F's tests and styles know (O-32-1). */
export const DMH_STEPPER_SIZE = VALUE_STEPPER_SIZE

const MIN_TREES = 0
const MAX_TREES = 999

const t = fr.factorDetail.dmhList.stepper

type DmhCounterStepperProps = {
  /** The group label, used in the accessibility label. */
  label: string
  value: number
  /** A step from a button, a hold repeat or an accessibility action: already clamped. */
  onStep: (next: number) => void
  /** The text typed in the count field, passed as is (an empty text included). */
  onSubmitText: (text: string) => void
  editable?: boolean
  /**
   * The highest count, for the capped survey mode where a group holds at most 2 trees per hectare.
   * Absent: the counted-in-full bound (999). With it the "+" does nothing at the bound and the
   * spoken value and hint name the cap and the unit.
   */
  max?: number
  testID: string
}

/**
 * Compact -/+ counter with a typeable count for a ticked dendromicrohabitat row (counting modes):
 * `ValueStepper` with the spoken texts of trees. One accessibility element (adjustable); the buttons
 * and the count are hidden from it.
 */
export function DmhCounterStepper({
  label,
  value,
  onStep,
  onSubmitText,
  editable = true,
  max,
  testID,
}: DmhCounterStepperProps) {
  return (
    <ValueStepper
      value={value}
      onStep={onStep}
      onSubmitText={onSubmitText}
      accessibilityLabel={t.label({ label })}
      accessibilityValueText={
        max === undefined ? t.value({ trees: value }) : t.valueCapped({ trees: value, max })
      }
      editHint={max === undefined ? t.editHint : t.editHintCapped({ max })}
      incrementLabel={t.increment}
      decrementLabel={t.decrement}
      editable={editable}
      min={MIN_TREES}
      max={max ?? MAX_TREES}
      testID={testID}
    />
  )
}
