import { ROUTE_HOURS_MAX, recommendRoute } from "@cortege/ibp-domain"
import type { RouteAnswers, RouteChoice } from "@cortege/ibp-domain"
import { parseHectaresInput } from "../../app/route-text"
import type { GuideOpenId, GuideQuestionId, RouteGuideModel } from "./route-guide-state"

// Phase 30 (plan 30-17): what the model's answers say, read by the package (answers, choice, the
// first question still missing) and the roundings of what was typed. Pure.

const DECIMALS_FACTOR = 100

/** Rounds to the two decimals of the record (surfaces and hours). */
export function roundTwo(value: number): number {
  return Math.round(value * DECIMALS_FACTOR) / DECIMALS_FACTOR
}

/** The hectares of a typed text, rounded like the record, null when it is not a number. */
export function parseRounded(text: string): number | null {
  const parsed = parseHectaresInput(text)
  return parsed === null ? null : roundTwo(parsed)
}

/** The valid hours the observer gave, null when empty or unusable. */
export function hoursOf(model: RouteGuideModel): number | null {
  const hours = parseRounded(model.hoursText)
  return hours !== null && hours > 0 && hours <= ROUTE_HOURS_MAX ? hours : null
}

/** The answers as the package reads them; a key is absent until it is given. */
export function answersOf(model: RouteGuideModel): Partial<RouteAnswers> {
  const answers: Partial<RouteAnswers> = {}
  if (model.surfaceHa !== null) answers.surface_ha = model.surfaceHa
  if (model.homogeneity !== undefined) answers.homogeneity = model.homogeneity
  if (model.difficulty !== undefined) answers.difficulty = model.difficulty
  if (model.narrow !== undefined) answers.narrow = model.narrow
  if (model.experience !== undefined) answers.experience = model.experience
  const hours = hoursOf(model)
  if (hours !== null) answers.hours_available = hours
  if (model.subdivided) answers.subdivided = true
  return answers
}

export function choiceOf(model: RouteGuideModel): RouteChoice {
  return model.largeStandOption === undefined ? {} : { largeStandOption: model.largeStandOption }
}

/** The first question still missing, null when the answers give a route: where a record opens. */
export function nextOpen(model: RouteGuideModel): GuideOpenId | null {
  const recommendation = recommendRoute(answersOf(model), choiceOf(model))
  switch (recommendation.status) {
    case "needs_surface":
      return "surface"
    case "incomplete":
      return recommendation.missing[0] as GuideQuestionId
    case "options":
      return "largeStand"
    case "route":
      return null
  }
}
