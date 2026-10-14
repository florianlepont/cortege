import type { CountingMode, RouteMethod } from "@cortege/ibp-domain"
import type { GlossaryTermId } from "../../ui/GlossaryInfo"

// Phase 30 (plan 30-18): which words of the glossary (spec section 3) belong to a parcours and to a
// mode de relevé. Shared by the glyphs of the suggestion card and the order of "Comprendre les mots".

/** The glossary term of each parcours. */
export const METHOD_TERM: Readonly<Record<RouteMethod, GlossaryTermId>> = {
  full: "parcoursEnPlein",
  partial_strip: "parBande",
  partial_plot: "parPlacette",
}

/** The glossary term of each mode de relevé. */
export const COUNTING_TERM: Readonly<Record<CountingMode, GlossaryTermId>> = {
  capped: "relevePlafonne",
  uncapped: "releveDeplafonne",
}

/**
 * The terms the current selection uses, in reading order: the parcours, what a partial parcours is
 * and the rest of the stand (partial only), the mode, the surface described and the stand. These come
 * first in "Comprendre les mots".
 */
export function termsOfSelection(method: RouteMethod, counting: CountingMode): GlossaryTermId[] {
  const partial = method !== "full"
  return [
    METHOD_TERM[method],
    ...(partial ? (["parcoursPartiel"] as const) : []),
    COUNTING_TERM[counting],
    "surfaceDecrite",
    ...(partial ? (["resteDuPeuplement"] as const) : []),
    "peuplement",
  ]
}
