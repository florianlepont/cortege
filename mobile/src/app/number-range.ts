import { parseFiniteNumberInput } from "./number-utils"

/**
 * A number the form accepts: parsed like `parseFiniteNumberInput`, then null when it is not a whole
 * number (`integer`) or falls outside `min` and `max`. The draft payload and the key figures of the
 * factor pages read the form through this one rule.
 */
export const toFiniteNumberInRange = (
  value: string,
  options?: { min?: number; max?: number; integer?: boolean },
): number | null => {
  const parsed = parseFiniteNumberInput(value)
  if (parsed === null) return null
  if (options?.integer && !Number.isInteger(parsed)) return null
  if (typeof options?.min === "number" && parsed < options.min) return null
  if (typeof options?.max === "number" && parsed > options.max) return null
  return parsed
}
