// Parsing helpers for untrusted survey input (API body or phone payload). Internal: not exported
// from the package entry. Ported verbatim from the pre-01.8 engines (ibp-rules.service.ts, and
// mobile/src/app/ibp-scoring.ts).

/** A plain object (not null, not an array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A finite number, or a non-blank string that parses to one; anything else is null. */
export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** The first of `keys` whose value reads as a number, or null. */
export function pickNumber(obj: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = asNumber(obj[key])
    if (value !== null) return value
  }
  return null
}
