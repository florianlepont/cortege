// FLOW-03/BUG-04: the French decimal separator is a comma ("12,5"), which `Number()` rejects
// outright. Every numeric entry point in the app funnels through this one parser, so normalizing
// here fixes the bug everywhere at once instead of at each call site.
export const parseFiniteNumberInput = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const normalized = trimmed.replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

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
