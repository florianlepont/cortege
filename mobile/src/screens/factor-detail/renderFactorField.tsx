import {
  DMH_GROUP_DENSITY_CAP_PER_HA,
  type DmhGroupCode,
  type IbpMethodVersion,
} from "@cortege/ibp-domain"
import {
  selectionOptionsFor,
  type SelectionFactor,
  type SelectionOption,
} from "../../app/factor-selections"
import type { FactorField, FactorKey } from "../../app/types"
import { AppField } from "../../ui/AppField"
import type { createDetailStyles } from "../factor-detail.styles"
import { FactorCounterInput } from "../../ui/FactorCounterInput"
import { FactorSliderInput } from "../../ui/FactorSliderInput"
import { fr } from "../../i18n"
import { DmhGroupList } from "./DmhGroupList"
import type { UncappedEntryProps } from "./UncappedFieldBlock"

const t = fr.factorDetail

// FLOW-01: which FactorInput variant each factor's fields render as, in the fixed order
// useSurveyForm's factorSections builds them. F's trees_per_ha has no natural discrete variant and
// stays numeric. Phase 25.1 (D-12): F and H carry an optional companion to their scored field
// (F: the dendromicrohabitat group list since phase 32, D-08, which the screen draws after the input
// card, straight on the canvas, redesign 32-18 A-C1; H: the continuity sources under it), and the
// options of B, I and J come from selectionOptionsFor so I and J follow the CNPF typology of the
// survey's method (D-09). Follow-up 32-30: the "segmented", "chips" and "genusList" variants are
// drawn by `renderChoiceField` as grouped choice lists on the canvas; this file renders the rest.
type SegmentedOption = { value: string; label: string }
type OptionsFor = (selected: readonly string[] | null) => SelectionOption[]
type Companion = "F" | "H"

export type FieldVariant =
  | { kind: "numeric"; companion?: Companion }
  | { kind: "counter" }
  | { kind: "segmented"; options: readonly SegmentedOption[]; companion?: Companion }
  | { kind: "chips"; optionsFor: OptionsFor }
  | { kind: "genusList" }
  | { kind: "slider" }

export const ignoreSelectionChange = (): void => undefined

export function fieldVariantsFor(
  factor: FactorKey,
  methodVersion: IbpMethodVersion | null,
): readonly FieldVariant[] {
  const chipsFor = (selectionFactor: SelectionFactor): FieldVariant => ({
    kind: "chips",
    optionsFor: (selected) => selectionOptionsFor(selectionFactor, methodVersion, selected),
  })
  switch (factor) {
    case "A":
      return [{ kind: "genusList" }, { kind: "numeric" }]
    case "B":
      return [chipsFor("B")]
    case "C":
    case "D":
    case "E":
      return [{ kind: "counter" }, { kind: "counter" }, { kind: "numeric" }]
    case "F":
      return [{ kind: "numeric", companion: "F" }]
    case "G":
      return [{ kind: "slider" }]
    case "H":
      return [{ kind: "segmented", options: fr.factorInput.continuityOptions, companion: "H" }]
    case "I":
      return [chipsFor("I")]
    case "J":
      return [chipsFor("J")]
  }
}

export function humanizeFieldLabel(label: string): string {
  const labels: Record<string, string> = t.fieldLabels
  return Object.prototype.hasOwnProperty.call(labels, label)
    ? labels[label]
    : label.replace(/_/g, " ")
}

/** What the factor F page hands its group list: the counting entry and the guide opener. */
export type FactorFieldExtras = {
  /** Phase 30: the detail inputs; F's counting is on only when the route counts F in full. */
  uncappedEntry?: UncappedEntryProps
  /**
   * Follow-up of phase 32: the same entry for the capped survey mode. The rows then count trees per
   * hectare up to the package's cap of 2 per group, and the sum derives `trees_per_ha`.
   */
  cappedEntry?: UncappedEntryProps
  /** Phase 32 (D-04): opens the guide on the catalogue (no argument) or on one group. */
  onOpenDmhGuide?: (group: DmhGroupCode) => void
}

/** True when the variant's companion is F's group list, which the screen draws after its card. */
export function hasDmhListCompanion(variant: FieldVariant | undefined): boolean {
  return variant !== undefined && "companion" in variant && variant.companion === "F"
}

/**
 * F's companion: the group list, counting only when `extras` carries the entry (full mode). The
 * screen calls it after the input card (A-C1), so the list is not one more frame inside the card.
 */
export function renderDmhGroupList(
  field: FactorField,
  methodVersion: IbpMethodVersion | null,
  extras: FactorFieldExtras,
) {
  const entry = extras.uncappedEntry
  const capped = extras.cappedEntry
  return (
    <DmhGroupList
      key={`F-${field.label}-companion`}
      methodVersion={methodVersion}
      treesPerHaText={field.value}
      selected={field.selection?.selected ?? null}
      onChangeSelection={field.selection?.onChange ?? ignoreSelectionChange}
      counting={
        entry
          ? {
              counts: entry.state.dmhCounts,
              onBump: entry.bumpDmhGroup,
              onSetCount: entry.setDmhCount,
              onMarkNone: (next) => entry.markNoDmhGroup(next),
            }
          : capped
            ? {
                counts: capped.state.dmhCounts,
                max: DMH_GROUP_DENSITY_CAP_PER_HA,
                onBump: (code, delta) =>
                  capped.bumpDmhGroup(code, delta, DMH_GROUP_DENSITY_CAP_PER_HA),
                onSetCount: (code, count) =>
                  capped.setDmhCount(code, count, DMH_GROUP_DENSITY_CAP_PER_HA),
                onMarkNone: (next) => capped.markNoDmhGroup(next, DMH_GROUP_DENSITY_CAP_PER_HA),
              }
            : undefined
      }
      onOpenDmhGuide={extras.onOpenDmhGuide ?? ignoreSelectionChange}
    />
  )
}

export function renderFactorField(
  factor: FactorKey,
  variant: FieldVariant | undefined,
  field: FactorField,
  methodVersion: IbpMethodVersion | null,
  detailStyles: ReturnType<typeof createDetailStyles>,
) {
  const current: FieldVariant = variant ?? { kind: "numeric" }
  const label = field.required
    ? t.requiredField({ label: humanizeFieldLabel(field.label) })
    : humanizeFieldLabel(field.label)
  const key = `${factor}-${field.label}`
  switch (current.kind) {
    case "counter":
      return (
        <FactorCounterInput
          key={key}
          label={label}
          value={field.value}
          onChange={field.onChange}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
        />
      )
    case "slider":
      return (
        <FactorSliderInput
          key={key}
          label={label}
          value={field.value}
          onChange={field.onChange}
          touched={field.touched}
          onTouch={field.onTouch}
          error={field.error}
        />
      )
    case "numeric":
    default:
      return (
        <AppField
          key={key}
          label={label}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onTouch}
          keyboardType="numeric"
          placeholder={t.numericPlaceholder}
          error={field.touched ? field.error : null}
          containerStyle={detailStyles.fieldBlock}
          labelStyle={detailStyles.fieldLabel}
          inputStyle={detailStyles.input}
        />
      )
  }
}
