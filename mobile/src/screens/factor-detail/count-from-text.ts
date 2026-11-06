import { parseFiniteNumberInput } from "../../app/number-utils"

/** A typed count as a whole number of 0 or more; NaN when empty (the form then drops the entry). */
export function countFromText(text: string): number {
  const parsed = parseFiniteNumberInput(text)
  return parsed === null ? Number.NaN : Math.max(0, Math.round(parsed))
}
