import { View } from "react-native"
import { clampPercentText, formatDecimalComma, toFieldText } from "../../app/decimal-text"
import { fr } from "../../i18n"
import { NumberRow } from "./NumberRow"
import { PercentTrackRow } from "./PercentTrackRow"
import { parseFiniteNumberInput } from "../../app/number-utils"

const rows = fr.factorDetail.valueRows

const PERCENT_MAX = 100

type PercentRowProps = {
  /** The row's label as the page shows it, without the "(%)" (the value carries the sign). */
  label: string
  /** The value as the form keeps it: text, "" when nothing is entered. */
  value: string
  onChange: (text: string) => void
  /** The field was acted on: the form may now show its error. */
  onTouch: () => void
  /** What the track snaps to: 5 for A's cover and B's strata, 1 for G. */
  step: 1 | 5
  /** The "0 %" and "100 %" ends named over the track (G). */
  showEnds?: boolean
  /** False: the value is shown, not editable, and there is no track. */
  editable?: boolean
  testID: string
  inputTestID?: string
}

/**
 * Follow-up 32-33: a percent row of the grouped list, 0 to 100: the label and the big typeable
 * value (tap it, numeric keyboard) on the first line, the draggable track under them, all one row.
 * No -/+ capsule: the capsule's step of 1 made a 0 to 100 value tedious to reach. A drag writes the
 * percent on the row's step as the form's text; a typed value is stored as typed, held to 100.
 */
export function PercentRow({
  label,
  value,
  onChange,
  onTouch,
  step,
  showEnds = false,
  editable = true,
  testID,
  inputTestID,
}: PercentRowProps) {
  const percent = Math.min(PERCENT_MAX, Math.max(0, parseFiniteNumberInput(value) ?? 0))
  return (
    <View testID={`${testID}-group`}>
      <NumberRow
        label={label}
        value={value}
        onChange={onChange}
        onTouch={onTouch}
        max={PERCENT_MAX}
        step={step}
        format={formatDecimalComma}
        unitSuffix={rows.percentSuffix}
        spokenValue={(text) => rows.spoken.percent({ text })}
        keyboardType="decimal-pad"
        clampText={clampPercentText}
        editable={editable}
        showButtons={false}
        testID={testID}
        inputTestID={inputTestID}
      />
      {editable ? (
        <PercentTrackRow
          label={label}
          percent={percent}
          step={step}
          showEnds={showEnds}
          onChangePercent={(next) => onChange(toFieldText(next))}
          onTouch={onTouch}
          testID={`${testID}-slider`}
        />
      ) : null}
    </View>
  )
}
