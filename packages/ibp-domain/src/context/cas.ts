import { resolveThresholdRegion } from "./region-stage"

// v3.2 station context (D-08 amended): the cas (v3.2 p. 2, growth constraints) plus one flag that
// selects the cas-3 scale for A and G. Always named `ibp_cas`: "CAS" already means compare-and-swap
// in this codebase.

export const IBP_CAS_VALUES = [1, 2, 3, 4] as const

/**
 * 1: no strong constraint; 2: very infertile station; 3: middle and upper subalpine (and similar
 * constraints); 4: Mediterranean thermo- and meso-Mediterranean (v3.2 p. 2).
 */
export type IbpCas = (typeof IBP_CAS_VALUES)[number]

export function isIbpCas(raw: unknown): raw is IbpCas {
  return (IBP_CAS_VALUES as readonly unknown[]).includes(raw)
}

/**
 * The cas-3 scale applies to A and G when the cas is 3, or when `ibp_cas3_scale` is set: cas 2 in
 * a zone whose macroclimate matches cas 3, and stands on lapiaz, dunes, peat bogs or dominated by
 * Juniperus thurifera (v3.2 p. 3 "Cas 1, 4 et 2*", p. 4 footnote *, p. 7).
 */
export function usesCas3Scale(input: {
  ibp_cas?: number | null
  ibp_cas3_scale?: boolean | null
}): boolean {
  return input.ibp_cas === 3 || input.ibp_cas3_scale === true
}

/**
 * The cas a v3.0 region and stage map to, or null where the mapping is ambiguous and the observer
 * must choose (ADR-003 "Region and stage to cas mapping"):
 * - ACA planitiaire, collineen, montagnard → 1; montagnard_mediterraneen → 1 (assumption A5);
 * - ACA subalpin → null (lower subalpine is cas 1, middle and upper cas 3);
 * - M thermo- and meso-Mediterranean → 4; M supra-Mediterranean → null (mostly 4, but 1 when humid
 *   or riparian: flagged for review);
 * - anything else → null.
 */
export function casFromRegionStage(region: unknown, stage: unknown): IbpCas | null {
  const thresholdRegion = resolveThresholdRegion(region, stage)
  if (thresholdRegion === "ACA") {
    switch (stage) {
      case "planitiaire":
      case "collineen":
      case "montagnard":
      case "montagnard_mediterraneen":
        return 1
      default:
        return null
    }
  }
  if (thresholdRegion === "M") {
    return stage === "thermo_mediterraneen" || stage === "meso_mediterraneen" ? 4 : null
  }
  return null
}
