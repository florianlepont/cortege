import { useMemo } from "react"
import type { BStratumCode, IbpMethodVersion } from "@cortege/ibp-domain"
import { selectionOptionsFor } from "../../app/factor-selections"
import { fr } from "../../i18n"
import { ValueSection, ValueSectionNote } from "../../ui/value-rows/ValueSection"
import { PercentRow } from "../../ui/value-rows/PercentRow"

const t = fr.factorDetail.countingMode

const ignoreTouch = (): void => undefined

type StrataCoverFieldsProps = {
  /** The survey's method: the strata are listed in the order and with the labels of B's options. */
  methodVersion: IbpMethodVersion | null
  /** Cover per stratum as typed (percent). */
  coverText: Partial<Record<BStratumCode, string>>
  /** The strata count the form derived from the covers through the package, "" when none. */
  strataCountText: string
  onChange: (code: BStratumCode, text: string) => void
  editable?: boolean
}

/**
 * Phase 30 (D-07, spec section 7, UI-SPEC section 11), in the grouped-row look since follow-up
 * 32-31: the entry of factor B when the recorded route counts it in full. A header "Couvert de
 * chaque strate" with the count of strata counted at its right (the only place that count is
 * written besides the key figure), then one row per stratum, a percent from 0 to 100 with a
 * draggable track (step 5, follow-up 32-33) and a typeable value, and the 20 % rule as the note
 * under the list. The count is the package's (`strataCountFromCover`, called by the form): this block only types and shows it.
 */
export function StrataCoverFields({
  methodVersion,
  coverText,
  strataCountText,
  onChange,
  editable = true,
}: StrataCoverFieldsProps) {
  const options = useMemo(() => selectionOptionsFor("B", methodVersion, null), [methodVersion])
  const anyCover = Object.values(coverText).some((text) => (text ?? "").trim().length > 0)
  const count = Number.parseInt(strataCountText, 10)

  return (
    <ValueSection
      testID="strata-cover-fields"
      title={t.strataTitle}
      countText={anyCover && Number.isFinite(count) ? t.strataCounted({ count }) : null}
      countTestID="strata-cover-count"
      note={<ValueSectionNote>{t.strataHelper}</ValueSectionNote>}
    >
      {options.map((option, index) => {
        const code = option.value as BStratumCode
        return (
          <PercentRow
            key={code}
            label={option.label}
            value={coverText[code] ?? ""}
            onChange={(text) => onChange(code, text)}
            onTouch={ignoreTouch}
            step={5}
            editable={editable}
            testID={`strata-stepper-${index}`}
            inputTestID={`strata-cover-${index}`}
          />
        )
      })}
    </ValueSection>
  )
}
