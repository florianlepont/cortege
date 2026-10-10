// HTML escape and deterministic formatting for the PDF builders (phase 25.1). Pure: no Intl for
// numbers (the Hermes build may lack it), only the date goes through the platform locale as before.

/** Escapes the five HTML-significant characters; the only escape of the PDF builders. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** A number rounded to `digits` decimals, with a dot, and no negative zero. */
function fixed(value: number, digits: number, keepZeros: boolean): string {
  if (!Number.isFinite(value)) return "0"
  const text = value.toFixed(digits)
  if (Number(text) === 0) return "0"
  if (keepZeros || !text.includes(".")) return text
  return text.replace(/0+$/, "").replace(/\.$/, "")
}

/** French decimal (comma) with at most `maxDigits` decimals and no trailing zeros. */
export function formatDecimal(value: number, maxDigits = 1): string {
  return fixed(value, maxDigits, false).replace(".", ",")
}

/** A WGS 84 coordinate with five decimals and a comma. */
export function formatCoordinate(value: number): string {
  return fixed(value, 5, true).replace(".", ",")
}

/** Long French date ("10 octobre 2026"), or `fallback` when the ISO string is not a date. */
export function formatDateFr(iso: string, fallback: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
}

/** A number for SVG syntax: one decimal, a dot. SVG coordinates are only ever written with this. */
export function svgNumber(value: number): string {
  return fixed(value, 1, false)
}
