import { foldSearchText } from "./search-text"

// Display order only. Never reorder the package constant CNPF_FACTOR_A_GENUS_CODES, the
// classifier manifest (index to label mapping) or a stored `factors.A.genera` array: they keep
// their own order. Sort a copy at render or print time (Phase 26, decision D-06).

/** Latin sort key of a genus code: "Quercus_deciduae" becomes "quercus deciduae". */
export function genusSortKey(code: string): string {
  return foldSearchText(code.replace(/_/g, " "))
}

type Collator = { compare(a: string, b: string): number }

/** Comparator on the Latin keys: through the collator when there is one, else a plain compare. */
export function createGenusComparator(collator: Collator | null): (a: string, b: string) => number {
  return (a, b) => {
    const keyA = genusSortKey(a)
    const keyB = genusSortKey(b)
    if (collator !== null) return collator.compare(keyA, keyB)
    if (keyA < keyB) return -1
    if (keyA > keyB) return 1
    return 0
  }
}

const defaultCollator: Collator | null =
  typeof Intl !== "undefined" && typeof Intl.Collator === "function"
    ? new Intl.Collator("fr", { sensitivity: "base" })
    : null

export const compareGenusCodes = createGenusComparator(defaultCollator)

/** A new array of the codes in Latin order; the input is left as it is. */
export function sortGenusCodes<T extends string>(codes: readonly T[]): T[] {
  return [...codes].sort(compareGenusCodes)
}
