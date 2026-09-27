import { isCnpfFactorAGenusCode, type CnpfFactorAGenusCode } from "@cortege/ibp-domain"

// Factor A's genus list travels through the generic FactorField channel as a single string
// (mobile/src/app/types.ts: FactorField.value is always a plain string), the same convention
// FactorChipsInput already uses for B/I/J's derived counts. Here the string carries the actual
// genus codes themselves, comma-joined, since Factor A needs identity (which genus), not just a
// count: a recognition suggestion must be able to add one specific genus to whatever the surveyor
// already picked, and reopening a draft must show the same genera again, not just their number.
const SEPARATOR = ","

/** Comma-joined value -> deduplicated, order-preserving list of valid CNPF genus codes. */
export function parseGenusListValue(value: string): CnpfFactorAGenusCode[] {
  const seen = new Set<string>()
  const output: CnpfFactorAGenusCode[] = []
  for (const raw of value.split(SEPARATOR)) {
    const code = raw.trim()
    if (!code || seen.has(code) || !isCnpfFactorAGenusCode(code)) continue
    seen.add(code)
    output.push(code)
  }
  return output
}

/** The inverse of `parseGenusListValue`, for writing a list back into the field's string value. */
export function serializeGenusListValue(genera: readonly string[]): string {
  return genera.join(SEPARATOR)
}

/** Toggles one genus code in/out of the field's string value (chip tap). */
export function toggleGenusInListValue(value: string, genus: CnpfFactorAGenusCode): string {
  const current = parseGenusListValue(value)
  const next = current.includes(genus)
    ? current.filter((code) => code !== genus)
    : [...current, genus]
  return serializeGenusListValue(next)
}

/**
 * Adds a genus to the field's string value if it is not already there (a confirmed recognition
 * suggestion never applies itself twice — ADR-002 D-11 confirmation is always explicit, but
 * confirming the same genus a second time should not create a duplicate).
 */
export function addGenusToListValue(value: string, genus: CnpfFactorAGenusCode): string {
  const current = parseGenusListValue(value)
  if (current.includes(genus)) return serializeGenusListValue(current)
  return serializeGenusListValue([...current, genus])
}
