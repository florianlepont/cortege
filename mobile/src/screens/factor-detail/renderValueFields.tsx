import type { ReactElement } from "react"
import {
  clampPercentText,
  formatDecimalComma,
  formatHectares,
  toFieldText,
  withoutPercentUnit,
} from "../../app/decimal-text"
import { parseFiniteNumberInput } from "../../app/number-utils"
import type { FactorField, FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { NumberRow, type NumberRowProps } from "../../ui/value-rows/NumberRow"
import { PercentTrackRow } from "../../ui/value-rows/PercentTrackRow"
import { ValueSection } from "../../ui/value-rows/ValueSection"
import { SurfaceFromRouteRow } from "./SurfaceFromRouteRow"
import { humanizeFieldLabel, type FieldVariant } from "./renderFactorField"

const t = fr.factorDetail
const rows = t.valueRows

// Follow-up 32-31: the bounds and steps of the numeric rows. A count keeps the old counter's 0 to
// 999 (the form's own rule accepts any whole number, so a larger typed count is still stored); a
// surface steps by a tenth of a hectare from 0 to 100000; a percent steps by 1 from 0 to 100.
const COUNT_MAX = 999
const SURFACE_MAX = 100000
const SURFACE_STEP = 0.1
const PERCENT_MAX = 100

type RowSpec = Pick<
  NumberRowProps,
  "max" | "step" | "format" | "unitSuffix" | "spokenValue" | "keyboardType" | "clampText"
>

const COUNT_ROW: RowSpec = {
  max: COUNT_MAX,
  step: 1,
  format: String,
  keyboardType: "numeric",
}

/** F's own surface (counted in full) and the surface of C, D and E share this row. */
export const SURFACE_ROW: RowSpec = {
  max: SURFACE_MAX,
  step: SURFACE_STEP,
  format: formatHectares,
  spokenValue: (text) => rows.spoken.hectares({ text }),
  keyboardType: "decimal-pad",
}

const DENSITY_ROW: RowSpec = {
  max: SURFACE_MAX,
  step: 1,
  format: formatDecimalComma,
  keyboardType: "numeric",
}

export const PERCENT_ROW: RowSpec = {
  max: PERCENT_MAX,
  step: 1,
  format: formatDecimalComma,
  unitSuffix: rows.percentSuffix,
  spokenValue: (text) => rows.spoken.percent({ text }),
  keyboardType: "decimal-pad",
  clampText: clampPercentText,
}

const labelOf = (field: FactorField): string =>
  field.required
    ? t.requiredField({ label: humanizeFieldLabel(field.label) })
    : humanizeFieldLabel(field.label)

const errorOf = (field: FactorField): string | null =>
  field.touched && field.error ? field.error : null

function rowOf(
  factor: FactorKey,
  index: number,
  field: FactorField,
  spec: RowSpec,
  label: string,
  testID: string,
): ReactElement {
  return (
    <NumberRow
      key={`${factor}-${index}`}
      label={label}
      value={field.value}
      onChange={field.onChange}
      onTouch={field.onTouch}
      testID={testID}
      {...spec}
    />
  )
}

type ValueSectionsInput = {
  factor: FactorKey
  variants: readonly FieldVariant[]
  fields: readonly FactorField[]
  /**
   * Follow-up 32-32: the surface of C, D or E is the route's zone (in hectares): a read-only caption
   * line stands in for the "Surface" section. Null: the section is drawn.
   */
  surfaceCaptionHa: number | null
  /**
   * The factor is counted in full: both counters stay on the page. In the capped mode the lower
   * counter (BMm, GB) is hidden while the package does not need it (`FactorField.notNeeded`).
   */
  countedInFull: boolean
  /**
   * True when F's group list counts (either mode): the trees per hectare is then its sum line and
   * not a row. False (a page given no counting entry): it stays a typed row.
   */
  groupCounters: boolean
}

/**
 * Follow-up 32-31: the numeric controls of the factor page as grouped rows on the canvas, in the
 * look of F's list. The counters of C, D and E share one section ("Comptage"), their surface is the
 * next ("Surface", with "D'après le parcours" under it while it is the route's zone), A's native
 * cover is "Couvert", and G is a section holding the draggable track over the value row. The choice
 * controls and the counted-in-full blocks of B and F are drawn by the screen. F's own trees per
 * hectare is a row only when no group counter is given.
 */
export function renderValueSections({
  factor,
  variants,
  fields,
  surfaceCaptionHa,
  countedInFull,
  groupCounters,
}: ValueSectionsInput): ReactElement[] {
  const nodes: ReactElement[] = []
  const counters: { field: FactorField; index: number }[] = []
  fields.forEach((field, index) => {
    const variant = variants[index]
    if (variant?.kind === "counter") {
      // A lower counter the package does not need is hidden in the capped mode; what was typed in
      // it stays in the form and in the draft.
      if (!(field.notNeeded === true && !countedInFull)) counters.push({ field, index })
      return
    }
    if (variant?.kind === "slider") {
      nodes.push(renderSlider(factor, index, field))
      return
    }
    if (variant?.kind === "numeric" && (variant.companion === undefined || !groupCounters)) {
      nodes.push(renderNumeric(factor, index, field, surfaceCaptionHa))
    }
  })
  if (counters.length > 0) {
    nodes.unshift(
      <ValueSection
        key={`${factor}-counters`}
        testID={`counters-${factor}`}
        title={rows.headers.count}
        errors={counters.map(({ field }) => errorOf(field)).filter((e): e is string => e !== null)}
      >
        {counters.map(({ field, index }) =>
          rowOf(factor, index, field, COUNT_ROW, labelOf(field), `counter-${factor}-${index}`),
        )}
      </ValueSection>,
    )
  }
  return nodes
}

function renderNumeric(
  factor: FactorKey,
  index: number,
  field: FactorField,
  /** The route's zone (ha) when the caption line replaces the surface section, else null. */
  surfaceCaptionHa: number | null,
): ReactElement {
  const error = errorOf(field)
  if (factor === "A") {
    return (
      <ValueSection
        key={`${factor}-${index}`}
        testID={`cover-${factor}-section`}
        title={rows.headers.cover}
        errors={error ? [error] : []}
      >
        {rowOf(
          factor,
          index,
          field,
          PERCENT_ROW,
          withoutPercentUnit(labelOf(field)),
          `cover-${factor}`,
        )}
      </ValueSection>
    )
  }
  if (factor === "F") {
    return (
      <ValueSection
        key={`${factor}-${index}`}
        testID="density-F-section"
        title={rows.headers.density}
        errors={error ? [error] : []}
      >
        {rowOf(factor, index, field, DENSITY_ROW, labelOf(field), "density-F")}
      </ValueSection>
    )
  }
  if (surfaceCaptionHa !== null) {
    return (
      <SurfaceFromRouteRow
        key={`${factor}-${index}`}
        hectares={surfaceCaptionHa}
        testID={`surface-${factor}-from-route`}
      />
    )
  }
  return (
    <ValueSection
      key={`${factor}-${index}`}
      testID={`surface-${factor}-section`}
      title={rows.headers.surface}
      errors={error ? [error] : []}
    >
      {rowOf(factor, index, field, SURFACE_ROW, labelOf(field), `surface-${factor}`)}
    </ValueSection>
  )
}

function renderSlider(factor: FactorKey, index: number, field: FactorField): ReactElement {
  const error = errorOf(field)
  const label = withoutPercentUnit(labelOf(field))
  const percent = Math.min(100, Math.max(0, parseFiniteNumberInput(field.value) ?? 0))
  return (
    <ValueSection
      key={`${factor}-${index}`}
      testID={`percent-${factor}-section`}
      title={rows.headers.percent}
      errors={error ? [error] : []}
    >
      <PercentTrackRow
        label={label}
        percent={percent}
        onChangePercent={(next) => field.onChange(toFieldText(next))}
        onTouch={field.onTouch}
        testID={`percent-${factor}-slider`}
      />
      {rowOf(factor, index, field, PERCENT_ROW, label, `percent-${factor}`)}
    </ValueSection>
  )
}
