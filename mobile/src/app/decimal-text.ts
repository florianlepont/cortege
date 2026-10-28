// Follow-up 32-31: how the -/+ steppers of the factor pages write and draw a number. The form keeps
// every numeric field as text and `parseFiniteNumberInput` reads a comma or a point, so a step
// writes the French decimal comma, like the route's surface prefill does.

/** A step's value as the text the form keeps: the French decimal comma, no trailing zero. */
export function toFieldText(value: number): string {
  return String(Number(value.toFixed(6))).replace(".", ",")
}

/** A value as drawn in a row: up to two decimals, a comma, no grouping ("70", "12,5"). */
export function formatDecimalComma(value: number): string {
  return String(Number(value.toFixed(2))).replace(".", ",")
}

/** A surface in hectares as drawn in a row: always a decimal ("2,0", "0,25"), a comma. */
export function formatHectares(value: number): string {
  const text = formatDecimalComma(value)
  return text.includes(",") ? text : `${text},0`
}

/**
 * What a percent field keeps of what is typed (T-30-41): digits and one decimal separator, a value
 * above 100 is brought back to 100. The form keeps the text as typed, so the cursor never jumps.
 */
export function clampPercentText(text: string): string {
  const kept = text.replace(/[^0-9.,]/g, "")
  const separator = kept.search(/[.,]/)
  const cleaned =
    separator === -1
      ? kept
      : `${kept.slice(0, separator + 1)}${kept.slice(separator + 1).replace(/[.,]/g, "")}`
  const value = Number(cleaned.replace(",", "."))
  return Number.isFinite(value) && value > 100 ? "100" : cleaned
}

/** A percent row's label without its trailing "(%)": the drawn value carries the sign. */
export function withoutPercentUnit(label: string): string {
  return label.replace(/\s*\(%\)(?=\s*\*?$)/, "")
}
