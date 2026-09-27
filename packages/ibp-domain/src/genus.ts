import type { IbpCas } from "./context/cas"

// Factor A native-genus list (D-01, D-15; ADR-003 CH-12): the closed CNPF regional list, IBP FR
// v3.2 p. 3 and Table 1 (p. 10-11). Recognition and counting are genus-level only (D-01): there is
// no species entity anywhere in this package. Quercus is the one genus CNPF splits into two
// countable classes (deciduous / evergreen, p. 6), so this list matches the 34-class label set
// ADR-002 already built for on-device recognition (Phase 6) — the two efforts share one vocabulary.

/** The 29 taxa (28 genera, Quercus split) counted under every cas (v3.2 p. 3, main list). */
export const CNPF_FACTOR_A_MAIN_GENERA = [
  "Abies",
  "Acer",
  "Alnus",
  "Arbutus",
  "Betula",
  "Carpinus",
  "Castanea",
  "Celtis",
  "Cupressus",
  "Fagus",
  "Fraxinus",
  "Juglans",
  "Juniperus",
  "Larix",
  "Malus",
  "Ostrya",
  "Picea",
  "Pinus",
  "Populus",
  "Prunus",
  "Pyrus",
  "Quercus_deciduae",
  "Quercus_sempervirens",
  "Salix",
  "Sorbus",
  "Tamarix",
  "Taxus",
  "Tilia",
  "Ulmus",
] as const

/**
 * The 5 genera counted only in cas 4 and cas 2 (v3.2 p. 3, "supplementary genera"): Ceratonia,
 * Cercis, Olea, Phillyrea, Pistacia.
 *
 * Pistacia decision (ADR-003 open question 2, "the CNPF answer" the ROADMAP refers to): p. 3
 * lists Pistacia as a supplementary genus, but its only native species (P. lentiscus,
 * P. terebinthus) appear only in Table 2 (shrubs, never counted, p. 11). p. 3 is the
 * methodology's own scale definition and names the genus explicitly as countable; Table 2 is a
 * look-alike-exclusion list scoped to species that are shrubs of an otherwise-tree genus (the same
 * pattern as Juniperus below). Pistacia is therefore counted as a supplementary genus, per p. 3.
 */
export const CNPF_FACTOR_A_SUPPLEMENTARY_GENERA = [
  "Ceratonia",
  "Cercis",
  "Olea",
  "Phillyrea",
  "Pistacia",
] as const

export type CnpfFactorAGenusCode =
  | (typeof CNPF_FACTOR_A_MAIN_GENERA)[number]
  | (typeof CNPF_FACTOR_A_SUPPLEMENTARY_GENERA)[number]

/** All 34 countable classes (33 genera, Quercus split), main list first. */
export const CNPF_FACTOR_A_GENUS_CODES: readonly CnpfFactorAGenusCode[] = [
  ...CNPF_FACTOR_A_MAIN_GENERA,
  ...CNPF_FACTOR_A_SUPPLEMENTARY_GENERA,
]

const GENUS_CODE_SET: ReadonlySet<string> = new Set(CNPF_FACTOR_A_GENUS_CODES)
const SUPPLEMENTARY_SET: ReadonlySet<string> = new Set(CNPF_FACTOR_A_SUPPLEMENTARY_GENERA)

/**
 * Ficus decision (A-6): Ficus carica is in Table 1 (p. 10-11) but the genus Ficus is not in the
 * p. 3 list, and p. 6 restricts counting to listed genera. The conservative reading applies:
 * Ficus is not a valid Factor A genus code at all (not in `CNPF_FACTOR_A_GENUS_CODES`).
 *
 * Juniperus decision (ADR-003 CH-12, "coastal-only Juniperus"): Table 1 restricts two of the
 * genus's three countable species to coastal stands (J. macrocarpa, J. phoenicea) while its third
 * (J. thurifera) carries no such restriction. Because recognition and counting are genus-level
 * only (D-01), the software never distinguishes which Juniperus species was observed, so it
 * cannot gate the genus on coastal-ness without sometimes excluding a genuinely countable inland
 * J. thurifera stand. Juniperus is therefore in the main list unconditionally, like every other
 * genus; the species-level coastal restriction (and the Table 2 exclusion of the shrub
 * J. communis / J. oxycedrus) is field guidance for the observer, not a data-model gate — the same
 * treatment every other genus's Table 2 look-alikes already get.
 */
export function isCnpfFactorAGenusCode(raw: unknown): raw is CnpfFactorAGenusCode {
  return typeof raw === "string" && GENUS_CODE_SET.has(raw)
}

export function isSupplementaryFactorAGenus(code: CnpfFactorAGenusCode): boolean {
  return SUPPLEMENTARY_SET.has(code)
}

/**
 * Genera countable for a station: the main list always, plus the supplementary genera when the
 * cas is 4 or 2 (v3.2 p. 3). v3.0 has no cas (`cas === null`): it never counts the supplementary
 * genera, since v3.0 never had a genus list before this phase and there is no v3.0-era cas to key
 * it by.
 */
export function allowedFactorAGenusCodes(cas: IbpCas | null): readonly CnpfFactorAGenusCode[] {
  return cas === 2 || cas === 4 ? CNPF_FACTOR_A_GENUS_CODES : CNPF_FACTOR_A_MAIN_GENERA
}
