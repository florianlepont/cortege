import type { ReactElement } from "react"
import type { IbpMethodVersion } from "@cortege/ibp-domain"
import {
  selectionOptionsFor,
  withSelectionToggled,
  type SelectionFactor,
  type SelectionOption,
} from "../../app/factor-selections"
import { parseFiniteNumberInput } from "../../app/number-utils"
import type { FactorField, FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { ChoiceList } from "../../ui/choice-list/ChoiceList"
import { GenusChoice } from "./GenusChoice"
import { humanizeFieldLabel, ignoreSelectionChange, type FieldVariant } from "./renderFactorField"

const t = fr.factorDetail
const countLabel = (count: number): string => fr.factorInput.chips.selectedCount({ count })

type ChoiceVariant = Extract<FieldVariant, { kind: "chips" | "segmented" | "genusList" }>

/** The variants drawn as a grouped choice list, straight on the canvas and not in the input card. */
export function isChoiceVariant(variant: FieldVariant | undefined): variant is ChoiceVariant {
  return (
    variant !== undefined &&
    (variant.kind === "chips" || variant.kind === "segmented" || variant.kind === "genusList")
  )
}

/** The count ticked before the detail was stored, read from the field text while no selection is. */
function legacyCountOf(field: FactorField): number | null {
  if (field.selection?.selected) return null
  const parsed = parseFiniteNumberInput(field.value)
  return parsed === null ? null : Math.max(0, Math.round(parsed))
}

/** The header: the catalogue's own name when it has one, else the field's label, starred if required. */
function headerOf(factor: FactorKey, field: FactorField): string {
  const named: Partial<Record<FactorKey, string>> = t.choice.headers
  const label = named[factor] ?? humanizeFieldLabel(field.label)
  return field.required ? t.requiredField({ label }) : label
}

/** B, I and J: the types or strata ticked, counted into the field (`type_count`, `strata_count`). */
function renderSelectionList(
  factor: SelectionFactor,
  optionsFor: (selected: readonly string[] | null) => SelectionOption[],
  field: FactorField,
  methodVersion: IbpMethodVersion | null,
  key: string,
): ReactElement {
  const selected = field.selection?.selected ?? null
  const legacy = legacyCountOf(field)
  const awaitingDetail = selected === null && (legacy ?? 0) > 0
  const options = optionsFor(selected)
  return (
    <ChoiceList
      key={key}
      factor={factor}
      testID={`choice-list-${factor}`}
      title={headerOf(factor, field)}
      mode="multi"
      options={options}
      selected={new Set(selected ?? [])}
      onChoose={(code) => {
        const on = !(selected ?? []).includes(code)
        const next = withSelectionToggled(factor, methodVersion, selected, code, on)
        ;(field.selection?.onChange ?? ignoreSelectionChange)(next)
        field.onTouch()
      }}
      countText={awaitingDetail ? null : countLabel(selected?.length ?? 0)}
      note={awaitingDetail ? fr.factorInput.chips.legacyCount({ count: legacy ?? 0 }) : null}
      error={field.touched && field.error ? field.error : null}
    />
  )
}

/** H: the class as a single choice, then the optional sources of the continuity as a multi list. */
function renderContinuity(
  field: FactorField,
  options: readonly { value: string; label: string }[],
  methodVersion: IbpMethodVersion | null,
  key: string,
): ReactElement[] {
  const evidence = field.selection?.selected ?? null
  return [
    <ChoiceList
      key={key}
      factor="H"
      testID="choice-list-H"
      title={headerOf("H", field)}
      mode="single"
      options={options}
      selected={new Set(field.value === "" ? [] : [field.value])}
      // The chosen class is not cleared by a second tap: the class is required and has no empty row.
      onChoose={(value) => {
        field.onChange(value)
        field.onTouch()
      }}
      error={field.touched && field.error ? field.error : null}
    />,
    <ChoiceList
      key={`${key}-companion`}
      factor="H"
      testID="choice-list-H-evidence"
      title={t.companionLabels.evidence}
      mode="multi"
      options={selectionOptionsFor("H", methodVersion, evidence)}
      selected={new Set(evidence ?? [])}
      onChoose={(code) => {
        const on = !(evidence ?? []).includes(code)
        ;(field.selection?.onChange ?? ignoreSelectionChange)(
          withSelectionToggled("H", methodVersion, evidence, code, on),
        )
      }}
      countText={countLabel(evidence?.length ?? 0)}
    />,
  ]
}

/**
 * The choice controls of the factor page (follow-up 32-30): B capped, H, I and J lists and A's genus
 * list, each a header over a grouped list of circle rows. The caller drops them on the canvas after
 * the pills; the numeric and counter fields stay in the input card (`renderFactorField`).
 */
export function renderChoiceField(
  factor: FactorKey,
  variant: ChoiceVariant,
  field: FactorField,
  methodVersion: IbpMethodVersion | null,
): ReactElement | ReactElement[] {
  const key = `${factor}-${field.label}`
  switch (variant.kind) {
    case "chips":
      return renderSelectionList(
        factor as SelectionFactor,
        variant.optionsFor,
        field,
        methodVersion,
        key,
      )
    case "segmented":
      return renderContinuity(field, variant.options, methodVersion, key)
    case "genusList":
      return (
        <GenusChoice
          key={key}
          title={headerOf(factor, field)}
          value={field.value}
          onChange={field.onChange}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
        />
      )
  }
}
