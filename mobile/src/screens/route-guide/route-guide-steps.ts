import { recommendRoute, routeQuestionsFor } from "@cortege/ibp-domain"
import { answersOf, choiceOf, nextOpen } from "./route-guide-answers"
import type { GuideOpenId, GuideQuestionId, RouteGuideModel } from "./route-guide-state"

// Phase 30, one question a screen: the screens of the route step, "Suivant" and the back trail. Pure;
// which questions are needed is the package's (`routeQuestionsFor`).

/**
 * The screens the observer can walk, in order: the questions the package needs for these answers
 * and, above the subdivision bound, the large-stand choice right after the homogeneity question.
 * "Pour affiner" is part of the result, never a screen of its own.
 */
export function screensOf(model: RouteGuideModel): GuideOpenId[] {
  const answers = answersOf(model)
  const screens = routeQuestionsFor(answers, choiceOf(model)).filter(
    (id): id is GuideQuestionId => id !== "refine",
  )
  if (recommendRoute(answers).status !== "options") return screens
  const at = screens.indexOf("homogeneity")
  return [...screens.slice(0, at + 1), "largeStand", ...screens.slice(at + 1)]
}

/**
 * The screen to draw: the requested question while it is still needed; the result (null) once the
 * observer left the last question and something can be shown (a route, or a parcours picked in the
 * chooser); else the first question still missing.
 */
export function currentOpen(model: RouteGuideModel): GuideOpenId | null {
  const requested = model.openId
  if (requested !== null && screensOf(model).includes(requested)) return requested
  if (requested === null) {
    const resultReady =
      model.pick !== null || recommendRoute(answersOf(model), choiceOf(model)).status === "route"
    if (resultReady) return null
  }
  return nextOpen(model)
}

/** The question after `current` in the order of the screens, null when it was the last. */
function screenAfter(model: RouteGuideModel, current: GuideOpenId): GuideOpenId | null {
  const screens = screensOf(model)
  const at = screens.indexOf(current)
  return at < 0 ? nextOpen(model) : (screens[at + 1] ?? null)
}

/** "Suivant" from `current`: the question is left on the trail and the next screen opens. */
export function leave(model: RouteGuideModel, current: GuideOpenId): RouteGuideModel {
  return { ...model, trail: [...model.trail, current], openId: screenAfter(model, current) }
}

/** The question that holds an answer: "Suivant" waits for it. */
export function isAnswered(model: RouteGuideModel, id: GuideOpenId): boolean {
  switch (id) {
    case "surface":
      return true
    case "largeStand":
      return (model.largeStandDraft ?? model.largeStandOption) !== undefined
    default:
      return model[id] !== undefined
  }
}

/** True when "Suivant" can be pressed on `id`. */
export function canGoNext(model: RouteGuideModel, id: GuideOpenId | null): boolean {
  return id !== null && isAnswered(model, id)
}

/** The screen "back" returns to: the latest question on the trail that is still needed. */
export function previousScreen(
  model: RouteGuideModel,
): { id: GuideOpenId; trail: GuideOpenId[] } | null {
  const screens = screensOf(model)
  const current = currentOpen(model)
  const trail = [...model.trail]
  while (trail.length > 0) {
    const id = trail.pop() as GuideOpenId
    if (id !== current && screens.includes(id)) return { id, trail }
  }
  return null
}

/** True when "back" has a question to return to (false on the first question). */
export function canStepBack(model: RouteGuideModel): boolean {
  return previousScreen(model) !== null
}
