import { useEffect, useRef, type ReactNode } from "react"
import { StyleSheet } from "react-native"
import Animated, { LinearTransition, ReduceMotion } from "react-native-reanimated"
import { brandSpacing4 } from "../../app/brand-tokens"
import { AnswerRow } from "./AnswerRow"
import { QuestionCard } from "./QuestionCard"
import { RefineSection } from "./RefineSection"
import type { RouteGuideState } from "./useRouteGuideState"

type QuestionStackProps = {
  state: RouteGuideState
  /** Drawn at the end of the unfolded "Pour affiner" section (the advice block, 30-20). */
  refineFooter?: ReactNode
}

/**
 * The accordion of the route step (UI-SPEC section 3, D-05): the answered questions as rows, exactly
 * one open question card, then the folded "Pour affiner" section. A question not needed is not
 * drawn: the model takes that from the package. The cards close and open with the layout
 * transition of `AppCollapsibleSection` (instant under Reduce Motion).
 */
export function QuestionStack({ state, refineFooter }: QuestionStackProps) {
  const { view, actions } = state
  // The first card is on screen when the page opens: only a later card takes the focus.
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
  }, [])

  return (
    <Animated.View
      style={styles.stack}
      layout={LinearTransition.reduceMotion(ReduceMotion.System)}
      testID="route-question-stack"
    >
      {view.rows.map((row) => (
        <AnswerRow key={row.id} row={row} onReopen={actions.reopen} />
      ))}
      {view.open ? (
        <QuestionCard
          key={view.open.id}
          question={view.open}
          actions={actions}
          focusOnMount={mounted.current}
        />
      ) : null}
      <RefineSection refine={view.refine} actions={actions} footer={refineFooter} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: brandSpacing4.smd,
  },
})
