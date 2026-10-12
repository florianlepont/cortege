import type { FactorAnnotations } from "@cortege/ibp-domain"
import type { DisplayedFactorResult } from "../screens/survey-detail/useLocalDraftSummary"

/**
 * The doubt flag and the note of each factor (phase 27, D-13) put on the factor rows the screens and
 * the PDF show. Display only: points, class and warnings are copied as they are (D-14). The input
 * entries are not mutated, and a factor without annotation keeps its entry untouched.
 */
export function attachFactorAnnotations(
  entries: Array<[string, DisplayedFactorResult]>,
  annotations: FactorAnnotations,
): Array<[string, DisplayedFactorResult]> {
  return entries.map(([code, result]): [string, DisplayedFactorResult] => {
    const annotation = (annotations as Record<string, FactorAnnotations[keyof FactorAnnotations]>)[
      code
    ]
    if (!annotation) return [code, result]
    const next: DisplayedFactorResult = { ...result }
    if (annotation.doubt === true) next.doubt = true
    if (typeof annotation.note === "string") next.note = annotation.note
    return [code, next]
  })
}
