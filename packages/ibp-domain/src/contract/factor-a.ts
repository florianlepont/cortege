import type { CnpfFactorAGenusCode } from "../genus"

// Factor A wire shape (phase 5, ADR-002 D-15, ADR-003 CH-12): a survey observes a list of native
// genera, drawn from the closed CNPF regional list, instead of a bare count. The count is derived
// from the list (see `genus.ts` / `evaluate.ts`); it is never sent separately for a new survey.

/**
 * Factor A payload shape for a survey recording its genera as a list (new surveys, this phase
 * onward). `genera` may repeat a code or include a supplementary genus outside its cas: repeats
 * are deduplicated and an out-of-cas supplementary genus is silently excluded from the derived
 * count, exactly as a genus not observed at all. An unlisted code is rejected
 * (`factor_a_genus_invalid`).
 */
export type FactorAGenusInput = {
  genera: CnpfFactorAGenusCode[]
  native_cover_percent?: number
  native_cover_below_50?: boolean
}

/**
 * Legacy Factor A payload shape: a bare count, never decomposable into named genera (phase 5
 * migration). Surveys recorded before this phase keep this shape and their score is unchanged;
 * new surveys should use `FactorAGenusInput` instead.
 */
export type FactorALegacyCountInput = {
  native_genus_count: number
  native_cover_percent?: number
  native_cover_below_50?: boolean
}
