import type { LargeStandOption, RouteHomogeneity } from "@cortege/ibp-domain"
import { LARGE_STAND_OPTION_TEXT, ROUTE_QUESTION_TEXT } from "../../app/route-text"
import { fr } from "../../i18n"
import type { OpenQuestion } from "./route-guide-model"
import type { RouteGuideActions } from "./useRouteGuideState"

// Phase 30 (plan 30-17): the words of the question cards and of the answered rows, mapped from the
// model's codes to the catalogue (`fr.routeGuide`). No rule here: which question is open and what
// it is selected on come from the model.

const guide = fr.routeGuide

export type QuestionChoice = {
  /** The suffix of the testID: `route-choice-{question}-{key}`. */
  key: string
  title: string
  caption: string
  /** An accent word on the title line ("Conseillé"). */
  tag?: string
  selected: boolean
  onSelect: () => void
}

type ChoiceQuestion = Exclude<OpenQuestion, { id: "surface" }>

export function questionTitle(question: OpenQuestion): string {
  if (question.id === "largeStand") return guide.largeStand.title
  if (question.id === "surface" && question.subStand) return guide.questions.surface.subStand
  return ROUTE_QUESTION_TEXT[question.id].title
}

export function questionWhy(question: OpenQuestion): string {
  if (question.id === "largeStand") return guide.reasons.largeStand
  if (question.id === "surface" && question.subStand) return guide.questions.surface.subStandWhy
  return ROUTE_QUESTION_TEXT[question.id].why
}

/** The choice cards of a question, each with its caption and an example (the owner's concern). */
export function choicesFor(question: ChoiceQuestion, actions: RouteGuideActions): QuestionChoice[] {
  switch (question.id) {
    case "homogeneity": {
      const { options } = guide.questions.homogeneity
      const homogeneity: RouteHomogeneity[] = ["homogeneous", "heterogeneous"]
      return homogeneity.map((value) => ({
        key: value,
        ...options[value],
        selected: question.selected === value,
        onSelect: () => actions.answerHomogeneity(value),
      }))
    }
    case "difficulty": {
      const { options } = guide.questions.difficulty
      return [
        {
          key: "hard",
          ...options.hard,
          selected: question.selected === true,
          onSelect: () => actions.answerDifficulty(true),
        },
        {
          key: "easy",
          ...options.easy,
          selected: question.selected === false,
          onSelect: () => actions.answerDifficulty(false),
        },
      ]
    }
    case "narrow": {
      const { options } = guide.questions.narrow
      return [
        {
          key: "yes",
          ...options.yes,
          selected: question.selected === true,
          onSelect: () => actions.answerNarrow(true),
        },
        {
          key: "no",
          ...options.no,
          selected: question.selected === false,
          onSelect: () => actions.answerNarrow(false),
        },
      ]
    }
    case "largeStand":
      return question.options.map((option: LargeStandOption) => ({
        key: option,
        ...LARGE_STAND_OPTION_TEXT[option],
        tag: option === question.preselected ? guide.largeStand.recommended : undefined,
        selected: question.selected === option,
        onSelect: () => actions.chooseLargeStandOption(option),
      }))
  }
}
