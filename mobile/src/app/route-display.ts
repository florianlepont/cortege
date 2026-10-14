import type { RouteAnswers, SurveyRoute } from "@cortege/ibp-domain"
import { fr } from "../i18n"
import { COUNTING_TEXT, ROUTE_METHOD_TEXT, formatDecimalFr, formatHectares } from "./route-text"

// Phase 30 (plan 30-11, spec section 9): the rows of the "Parcours utilisé" display, built once for
// the Contexte card and the PDF block so both say the same thing (D-09). Pure: plain strings come
// out (the PDF block escapes them when it prints, T-30-28). The words are those of the official
// method (O-12); the captions come from `fr.surveyDetail.route` and `fr.surveyExport.route`.

export type RouteDisplayRowId =
  | "method"
  | "counting"
  | "factors"
  | "zone"
  | "complement"
  | "choice"
  | "answers"

export type RouteDisplayRow = { id: RouteDisplayRowId; caption: string; value: string }

/**
 * "detail": the Contexte card of the observer's own survey. "pdf": the export block. "community":
 * another member's survey (O-15), read-only and without the rows that speak to the reader as the
 * observer ("Choix", "Vos réponses").
 */
export type RouteDisplayVariant = "detail" | "pdf" | "community"

const detail = fr.surveyDetail.route
const parts = detail.answerParts

/** The parcours name, for the short label that follows the cas on the survey summary (U-O9). */
export function routeShortLabel(route: SurveyRoute): string {
  return ROUTE_METHOD_TEXT[route.method].name
}

/**
 * The closed answers as one sentence: "Peuplement de 8 ha, homogène, facile à observer". Only the
 * answers that exist are said; a regular experience says nothing, a beginner is said.
 */
export function routeAnswersSentence(answers: RouteAnswers): string {
  const said: string[] = []
  const surface = formatHectares(answers.surface_ha)
  said.push(answers.subdivided === true ? parts.pieceSurface(surface) : parts.standSurface(surface))
  if (answers.subdivided === true) said.push(parts.subdivided)
  if (answers.homogeneity !== undefined) said.push(parts[answers.homogeneity])
  if (answers.difficulty !== undefined) said.push(answers.difficulty ? parts.hard : parts.easy)
  if (answers.narrow !== undefined) said.push(answers.narrow ? parts.narrow : parts.wide)
  if (answers.experience === "beginner") said.push(parts.beginner)
  if (answers.hours_available !== undefined) {
    said.push(
      parts.hoursAvailable({
        hours: answers.hours_available,
        text: formatDecimalFr(answers.hours_available, 2),
      }),
    )
  }
  return said.join(", ")
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function factorsValue(route: SurveyRoute): string | null {
  if (route.counting !== "uncapped" || route.uncapped_factors === undefined) return null
  return route.uncapped_factors
    .map((letter) => detail.factorItem({ letter, title: fr.labels.factorTitles[letter] }))
    .join(", ")
}

function complementValue(route: SurveyRoute): string | null {
  const { complement } = route
  if (complement === undefined) return null
  if (!complement.done || complement.total_surface_ha === undefined) return detail.complementNo
  return detail.complementDone(formatHectares(complement.total_surface_ha))
}

function choiceValue(route: SurveyRoute, variant: RouteDisplayVariant): string {
  const { guide } = route
  if (variant === "detail") {
    return guide.chosen_by === "guide" ? detail.choiceGuide : detail.choiceObserver
  }
  if (guide.chosen_by !== "guide") return fr.surveyExport.route.choiceObserver
  return fr.surveyExport.route.choiceGuide({
    answers: guide.answers === undefined ? null : lowerFirst(routeAnswersSentence(guide.answers)),
  })
}

/**
 * The rows of the "Parcours utilisé" display, in the order of spec section 9: Parcours, Mode de
 * relevé, Facteurs comptés en entier (relevé déplafonné only), Surface décrite, Reste du peuplement
 * (parcours partiel only), Choix, and for the Contexte card Vos réponses. The community variant
 * stops before Choix (another member's survey, O-15). The PDF says the answers
 * inside the "Choix" sentence and has no row of their own.
 */
export function routeDisplayRows(
  route: SurveyRoute,
  variant: RouteDisplayVariant,
): RouteDisplayRow[] {
  const captions = variant === "pdf" ? fr.surveyExport.route : detail
  const rows: RouteDisplayRow[] = [
    { id: "method", caption: captions.parcours, value: ROUTE_METHOD_TEXT[route.method].name },
    { id: "counting", caption: captions.counting, value: COUNTING_TEXT[route.counting].name },
  ]
  const factors = factorsValue(route)
  if (factors !== null) {
    rows.push({ id: "factors", caption: captions.countedFactors, value: factors })
  }
  rows.push({
    id: "zone",
    caption: captions.zone,
    value: detail.zoneValue(formatHectares(route.zone_surface_ha)),
  })
  const complement = complementValue(route)
  if (complement !== null) {
    rows.push({ id: "complement", caption: captions.complement, value: complement })
  }
  if (variant === "community") return rows
  rows.push({ id: "choice", caption: captions.choice, value: choiceValue(route, variant) })
  if (variant === "detail" && route.guide.answers !== undefined) {
    rows.push({
      id: "answers",
      caption: detail.answers,
      value: routeAnswersSentence(route.guide.answers),
    })
  }
  return rows
}
