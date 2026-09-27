/** The ten IBP factors, A to J, in methodology order. */
export const FACTOR_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const

export type FactorKey = (typeof FACTOR_KEYS)[number]

/** Stand and management factors (A-G): the stand score, out of 35. */
export const STAND_FACTOR_KEYS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
] as const satisfies readonly FactorKey[]

/** Context factors (H-J): the context score, out of 15. */
export const CONTEXT_FACTOR_KEYS = ["H", "I", "J"] as const satisfies readonly FactorKey[]

/** Points a factor can score. */
export type FactorScore = 0 | 1 | 2 | 5

/** Class label of a factor score, as stored in `factor_results`. */
export type FactorClass = "S0" | "S1" | "S2" | "S5"

export function toFactorClass(score: FactorScore): FactorClass {
  return `S${score}` as FactorClass
}
