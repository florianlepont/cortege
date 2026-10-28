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
