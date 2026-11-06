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
  /** `cap`: the capped survey mode (follow-up of phase 32), trees per hectare held at `cap`. */
  setDmhCount: (code: DmhGroupCode, count: number, cap?: number) => void
  /** Phase 32: the first "+" of a row ticks the group and counts 1. Same `cap`. */
  bumpDmhGroup: (code: DmhGroupCode, delta: number, cap?: number) => void
  /** Follow-up 32-25: the "no tree carries one" row; `cap` as above (the capped mode has no surface). */
  markNoDmhGroup: (on: boolean, cap?: number) => void
  setFSurface: (text: string) => void
  /**
   * Follow-up 32-35: G's zones. Adding a row changes no sum; the others take the survey's described
   * surface (hectares), from which the form recomputes G's percent. `markNoOpenArea` records 0 %.
   */
  addOpenArea: () => void
  setOpenArea: (index: number, hectares: number, zoneSurfaceHa: number) => void
  removeOpenArea: (index: number, zoneSurfaceHa: number) => void
  markNoOpenArea: (on: boolean) => void
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
 * chips) or F's own surface (it comes under the group list, which holds the counts since phase 32).
 * Nothing for the other factors, which keep their entry.
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
        surfaceText={entry.state.fSurfaceText}
        zoneSurfaceHa={zoneSurfaceHa}
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
