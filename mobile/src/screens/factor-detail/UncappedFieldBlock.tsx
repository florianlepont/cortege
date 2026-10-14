import type { BStratumCode, DmhGroupCode, IbpMethodVersion } from "@cortege/ibp-domain"
import type { UncappedState } from "../../hooks/useUncappedEntry"
import type { FactorField, FactorKey } from "../../app/types"
import { DmhCountFields } from "./DmhCountFields"
import { StrataCoverFields } from "./StrataCoverFields"

/**
 * Phase 30 (D-07, plan 30-19): the detail inputs of the relevé déplafonné as the factor pages get
 * them from the form: the typed state and the three setters of plan 30-12 (one object, one prop).
 */
export type UncappedEntryProps = {
  state: UncappedState
  setStratumCover: (code: BStratumCode, text: string) => void
  setDmhCount: (code: DmhGroupCode, count: number) => void
  setFSurface: (text: string) => void
}

type UncappedFieldBlockProps = {
  factor: FactorKey
  /** The factor field the block sits with: B's strata count, F's trees per hectare. */
  field: FactorField
  methodVersion: IbpMethodVersion | null
  entry: UncappedEntryProps
  zoneSurfaceHa: number | null
}

/**
 * The detail block of a factor counted in full: B's cover per stratum (it replaces the strata
 * chips) or F's counts per group and its surface (it comes under the group chips). Nothing for the
 * other factors, which keep their entry.
 */
export function UncappedFieldBlock({
  factor,
  field,
  methodVersion,
  entry,
  zoneSurfaceHa,
}: UncappedFieldBlockProps) {
  if (factor === "B") {
    return (
      <StrataCoverFields
        methodVersion={methodVersion}
        coverText={entry.state.strataCoverText}
        strataCountText={field.value}
        onChange={entry.setStratumCover}
      />
    )
  }
  if (factor === "F") {
    return (
      <DmhCountFields
        methodVersion={methodVersion}
        selectedGroups={field.selection?.selected ?? []}
        counts={entry.state.dmhCounts}
        surfaceText={entry.state.fSurfaceText}
        zoneSurfaceHa={zoneSurfaceHa}
        onChangeCount={entry.setDmhCount}
        onChangeSurface={entry.setFSurface}
      />
    )
  }
  return null
}

/** True for the two factors that have a detail block. */
export function hasUncappedBlock(factor: FactorKey): boolean {
  return factor === "B" || factor === "F"
}
