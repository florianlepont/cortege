import {
  normalizeParcelPartToDigits,
  normalizeParcelSection,
  parseParcelIdu,
} from "./surveys-normalize.utils"

/**
 * A free-text parcel search read as one of the forms of D-13:
 * - `key`: commune INSEE code, section and number, ready for API Carto;
 * - `communeName`: a commune name to resolve to INSEE codes first (the geocoder does that);
 * - `sectionNumber`: section and number only, looked up among the parcels the app already knows,
 *   narrowed to a department when one was typed ("77 AB 0123").
 */
export type ParcelQuery =
  | { kind: "key"; communeCode: string; section: string; number: string }
  | { kind: "communeName"; communeName: string; section: string; number: string }
  | { kind: "sectionNumber"; section: string; number: string; departmentPrefix: string | null }

/** Longest text read; the search endpoint caps the text at the same length. */
const MAX_QUERY_LENGTH = 100
// Words that only decorate a parcel number ("parcelle AB 123", "section AB n° 123").
const FILLER_WORDS = new Set(["PARCELLE", "PARCELLES", "SECTION", "NUMERO", "NUMÉRO"])
// A cadastral section as typed: one or two letters, "0A", or two digits (Alsace-Moselle).
const SECTION_TOKEN = /^(?:[A-Z]{1,2}|0[A-Z]|\d{2})$/
// Letters-only compact forms: 5-digit commune code, lettered section, number ("77186AB123").
const COMPACT_KEY = /^(\d{5})([A-Z]{1,2}|0[A-Z])(\d{1,4})$/
const NUMBER_TOKEN = /^\d{1,4}$/
const COMMUNE_CODE_TOKEN = /^\d{5}$/
// Metropolitan department numbers, Corsica and the overseas 97x.
const DEPARTMENT_TOKEN = /^(?:\d{2}|2A|2B|97\d)$/

type Tokens = { raw: string[]; upper: string[] }

/** Words of the text without the separators and filler words, original case kept in `raw`. */
function tokenize(text: string): Tokens {
  const words = text
    .replace(/(^|\s)n°/gi, "$1 ")
    .replace(/[-.,/;°]/g, " ")
    .split(/\s+/)
    .filter((word) => word !== "")
  const raw: string[] = []
  const upper: string[] = []
  for (const word of words) {
    const folded = word.toUpperCase()
    // "NO" is also a possible section, so it is dropped only after another section-like word
    // ("AB no 123").
    const afterSection = upper.length > 0 && SECTION_TOKEN.test(upper[upper.length - 1])
    if (FILLER_WORDS.has(folded) || (folded === "NO" && afterSection)) {
      continue
    }
    raw.push(word)
    upper.push(folded)
  }
  return { raw, upper }
}

/** Section and number in the stored form; null for an all-zero section ("00"). */
function sectionAndNumber(
  rawSection: string,
  rawNumber: string,
): { section: string; number: string } | null {
  const section = normalizeParcelSection(rawSection)
  const number = normalizeParcelPartToDigits(rawNumber, 4)
  return section && number ? { section, number } : null
}

function compactKey(compact: string): ParcelQuery | null {
  if (compact.length === 14) {
    const idu = parseParcelIdu(compact)
    return idu ? { kind: "key", ...idu } : null
  }
  const match = COMPACT_KEY.exec(compact)
  if (!match) {
    return null
  }
  const parts = sectionAndNumber(match[2], match[3])
  return parts ? { kind: "key", communeCode: match[1], ...parts } : null
}

/** The words around a section and a number, read as a commune name; null without a real name. */
function communeNameOf(words: string[], upper: string[]): string | null {
  const hasLetter = upper.some((word) => /\p{L}/u.test(word))
  const lone = upper.length === 1 && SECTION_TOKEN.test(upper[0])
  return hasLetter && !lone ? words.join(" ") : null
}

function readAround(
  tokens: Tokens,
  sectionAt: number,
  section: string,
  number: string,
): ParcelQuery | null {
  const before = tokens.upper.slice(0, sectionAt)
  const after = tokens.upper.slice(sectionAt + 2)
  if (before.length === 0 && after.length === 0) {
    return { kind: "sectionNumber", section, number, departmentPrefix: null }
  }
  if (after.length === 0 && before.length === 1) {
    if (DEPARTMENT_TOKEN.test(before[0])) {
      return { kind: "sectionNumber", section, number, departmentPrefix: before[0] }
    }
    if (COMMUNE_CODE_TOKEN.test(before[0])) {
      return { kind: "key", communeCode: before[0], section, number }
    }
  }
  const words = [...tokens.raw.slice(0, sectionAt), ...tokens.raw.slice(sectionAt + 2)]
  const communeName = communeNameOf(words, [...before, ...after])
  return communeName ? { kind: "communeName", communeName, section, number } : null
}

/**
 * Reads a typed parcel reference (D-13). Pure: no call is made and nothing is looked up, so the
 * endpoint can answer an empty list for text that is not a parcel at no cost. Anything that does
 * not read as one of the accepted forms is null; the placeholder `parseParcelIdentifier` returns
 * for unknown forms is never used.
 */
export function parseParcelQuery(text: string): ParcelQuery | null {
  if (text.length > MAX_QUERY_LENGTH) {
    return null
  }
  const tokens = tokenize(text)
  const compact = compactKey(tokens.upper.join(""))
  if (compact) {
    return compact
  }
  // The number is the last 1 to 4 digit word that follows a section-like word; when that reading
  // fails ("AB 12 34") the previous candidate is tried.
  for (let at = tokens.upper.length - 1; at >= 1; at -= 1) {
    if (!NUMBER_TOKEN.test(tokens.upper[at]) || !SECTION_TOKEN.test(tokens.upper[at - 1])) {
      continue
    }
    const parts = sectionAndNumber(tokens.upper[at - 1], tokens.upper[at])
    const read = parts ? readAround(tokens, at - 1, parts.section, parts.number) : null
    if (read) {
      return read
    }
  }
  return null
}
