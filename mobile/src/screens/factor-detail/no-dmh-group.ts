import { DMH_GROUP_CODES, type DmhGroupCode } from "@cortege/ibp-domain"
import { parseFiniteNumberInput } from "../../app/number-utils"

const KNOWN_CODES: ReadonlySet<string> = new Set(DMH_GROUP_CODES)

/** True when at least one group has a count above 0. */
export function anyDmhCount(counts: Partial<Record<DmhGroupCode, number>> | undefined): boolean {
  return Object.values(counts ?? {}).some((count) => (count ?? 0) > 0)
}

/**
 * Follow-up 32-25: "no tree carries a dendromicrohabitat" is derived, never stored. It holds when
 * the stored trees per hectare is 0 and no group is ticked or counted, so it is also true of an
 * older survey that typed 0, and of counters brought back to 0 and unticked.
 */
export function isNoDmhGroup(input: {
  treesPerHaText: string
  selected: readonly string[] | null
  counts: Partial<Record<DmhGroupCode, number>> | undefined
}): boolean {
  const ticked = (input.selected ?? []).some((code) => KNOWN_CODES.has(code))
  return !ticked && !anyDmhCount(input.counts) && parseFiniteNumberInput(input.treesPerHaText) === 0
}
