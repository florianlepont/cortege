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
