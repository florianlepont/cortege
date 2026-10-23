import type { CountingMode, RouteMethod } from "@cortege/ibp-domain"
import type { GlossaryTermId } from "../../ui/GlossaryInfo"

// Phase 30 (plan 30-18): which words of the glossary (spec section 3) belong to a parcours and to a
// mode de relevé. Used by the glyphs of the suggestion card, the chooser cards and the counting picker.

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
