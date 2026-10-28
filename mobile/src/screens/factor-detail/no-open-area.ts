import { parseFiniteNumberInput } from "../../app/number-utils"

/**
 * Follow-up 32-35: "no open flowering zone" is derived, never stored. It holds when G's stored
 * percent is 0 and the list has no zone, so it is also true of an older survey that typed 0. A zone
 * at 0 ha is still a zone: the row is then locked, not ticked.
 */
export function isNoOpenArea(input: { percentText: string; areas: readonly number[] }): boolean {
  return input.areas.length === 0 && parseFiniteNumberInput(input.percentText) === 0
}
