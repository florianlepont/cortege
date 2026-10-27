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

const ELLIPSIS = "…"

/**
 * Shortens `text` to at most `max` characters for a fixed box (no CSS ellipsis: the builder shortens,
 * so the print is the same on both platforms). A shortened text ends with one U+2026; it is cut at
 * the last space when that space lies in the second half of the box, else inside the word. It never
 * escapes: callers escape the result, so an entity is never cut in two.
 */
export function shortenText(text: string, max: number): string {
  if (text.length <= max) return text
  if (max <= 0) return ""
  const space = text.lastIndexOf(" ", max - 1)
  const cut = space >= max / 2 ? text.slice(0, space) : text.slice(0, max - 1)
  return `${cut.trimEnd()}${ELLIPSIS}`
}

/**
 * Splits a label into one or two lines for a fixed chart box: one line when it fits in `maxChars`
 * or holds no space, else two lines cut at the space that makes the longer line shortest (the first
 * such space on a tie). It never shortens and never escapes: callers escape each line.
 */
export function splitLabel(text: string, maxChars: number): string[] {
  if (text.length <= maxChars || !text.includes(" ")) return [text]
  let best = { at: -1, longest: Number.POSITIVE_INFINITY }
  for (let at = text.indexOf(" "); at !== -1; at = text.indexOf(" ", at + 1)) {
    const longest = Math.max(at, text.length - at - 1)
    if (longest < best.longest) best = { at, longest }
  }
  return [text.slice(0, best.at), text.slice(best.at + 1)]
}
