import { useEffect, useRef } from "react"
import { AccessibilityInfo } from "react-native"
import { LargeStandOptions } from "./LargeStandOptions"
import { QuestionCard } from "./QuestionCard"
import { questionTitle } from "./question-text"
import { SuggestionEntrance } from "./SuggestionEntrance"
import type { RouteGuideState } from "./useRouteGuideState"

type QuestionStepProps = {
  state: RouteGuideState
}

/**
 * One screen of the route step (D-05, one question a screen like the other creation steps): the
 * open question alone, its field or choices, no answered rows above it. The large-stand choice
 * above the subdivision bound is a screen of its own. A new question fades and rises in (instant
 * under Reduce Motion) and its title is announced to the screen reader; the pinned "Suivant" is
 * the screen's, not the card's. Draws nothing once no question is open (the result is drawn).
 */
export function QuestionStep({ state }: QuestionStepProps) {
  const { view, actions } = state
  const { open } = view
  const openId = open?.id ?? null
  const title = open === null ? null : questionTitle(open)
  // The first question is on screen when the page opens: only a later one is announced.
  const announced = useRef<string | null>(null)
  useEffect(() => {
    if (title === null) return
    if (announced.current !== null && announced.current !== title) {
      AccessibilityInfo.announceForAccessibility(title)
    }
    announced.current = title
  }, [title])

  if (open === null) return null
  if (open.id === "largeStand") {
    return (
      <LargeStandOptions
        options={open.options}
        preselected={open.preselected}
        selected={open.selected}
        onChoose={actions.pickLargeStand}
      />
    )
  }
  return (
    <SuggestionEntrance trigger={openId ?? "result"}>
      <QuestionCard question={open} actions={actions} />
    </SuggestionEntrance>
  )
}
