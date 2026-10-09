// Text helpers of the global search. The server folds with PostgreSQL `unaccent` (migration 022)
// and both sides are tested on the same fixture list of accented letters (D-16).

/** Combining marks left by an NFD decomposition (written with escapes, no property escapes). */
const COMBINING_MARKS = /[̀-ͯ]/g

/** Accented letters of the fixture list, used only when the runtime cannot decompose (NFD). */
const FALLBACK_TABLE: Record<string, string> = {
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  à: "a",
  â: "a",
  ç: "c",
  ï: "i",
  î: "i",
  ô: "o",
  ù: "u",
  û: "u",
  ü: "u",
  ÿ: "y",
  É: "E",
  È: "E",
  Ê: "E",
  Ë: "E",
  À: "A",
  Â: "A",
  Ç: "C",
  Ï: "I",
  Î: "I",
  Ô: "O",
  Ù: "U",
  Û: "U",
  Ü: "U",
  Ÿ: "Y",
}

const FALLBACK_PATTERN = new RegExp(`[${Object.keys(FALLBACK_TABLE).join("")}]`, "g")

/** Detected once: does this runtime split "é" into "e" plus a combining mark? */
const RUNTIME_DECOMPOSES = "é".normalize("NFD").length === 2

/**
 * Lowercases and strips accents so that "Forêt" and "foret" compare equal. The ligatures œ and æ
 * become "oe" and "ae", as the server does.
 */
export function foldSearchText(text: string): string {
  const withLigatures = text
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE")
  const stripped = RUNTIME_DECOMPOSES
    ? withLigatures.normalize("NFD").replace(COMBINING_MARKS, "")
    : withLigatures.replace(FALLBACK_PATTERN, (letter) => FALLBACK_TABLE[letter] ?? letter)
  return stripped.toLowerCase()
}

/** Trims the query and collapses every whitespace run to one space; accents are kept. */
export function normalizeSearchQuery(text: string): string {
  return text.trim().replace(/\s+/g, " ")
}
