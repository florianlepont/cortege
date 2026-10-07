import { memo, useCallback, useMemo, useState } from "react"
import type { FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { FactorPager, type PagerFinishAction } from "../../screens/survey-form/FactorPager"
import { PagerFinishNotice } from "../../screens/survey-form/PagerFinishNotice"
import { usePagerFinish } from "../../screens/survey-form/usePagerFinish"
import { useStatus } from "../../state/status-context"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { ScreenFrame } from "../../ui/ScreenFrame"
import type { FactorDetailRouteProps } from "../types"

/**
 * The status message at the moment a pager finish ended without finishing, kept as it was: a later
 * status (a background sync) does not replace it. Mounted only then (keyed by the attempt), so the
 * status context still re-renders nothing on the pager otherwise.
 */
export function FinishStatusNotice() {
  const { status } = useStatus()
  const [message] = useState(status)
  return <PagerFinishNotice message={message} />
}

/**
 * Factor detail route (phase 01.9-18, D-01; FLOW-04 pager since phase 3): the form context, and
 * the surveys context for the finish. Hosts the A->J horizontal pager instead of a single factor
 * screen, so navigating between factors no longer round-trips through the factor grid. The native
 * header names the factor on screen, and "Terminer" on the last factor goes back to where the pager
 * was opened from. D-19 (12.2-15): the pager sits in a ScreenFrame under the stack's transparent
 * header, so the halo runs on behind the header and the pager starts below it.
 *
 * D-26: when the survey being edited is complete and named, the last factor offers "Terminer le
 * relevé", the survey detail's finish; once the survey is finished the stack goes back to the
 * summary, which plays the success haptic, halo and pop.
 */
export const FactorDetailRoute = memo(function FactorDetailRoute({
  navigation,
  route,
}: FactorDetailRouteProps) {
  const { state, actions } = useSurveyFormState()
  const { state: surveysState, actions: surveyActions } = useSurveys()
  const { factor } = route.params
  const { editingSurveyId } = state
  const survey = useMemo(
    () => surveysState.surveys.find((item) => item.id === editingSurveyId) ?? null,
    [surveysState.surveys, editingSurveyId],
  )

  const handleActiveFactorChange = useCallback(
    (active: FactorKey) => {
      navigation.setOptions({ title: fr.navigation.headers.factor(active) })
    },
    [navigation],
  )
  const handleFinish = useCallback(() => navigation.goBack(), [navigation])
  // Back to the summary, also when the pager was opened from the Score page.
  const handleFinished = useLatestCallback(() => navigation.popTo("surveyDetail"))

  const { offered, busy, attempts, finish } = usePagerFinish({
    survey,
    draft: state.draftInput,
    flushDraft: actions.flushDraft,
    submitSurvey: surveyActions.submitSurvey,
    onFinished: handleFinished,
  })
  const siteName = survey?.site_name ?? ""
  const finishAction = useMemo<PagerFinishAction | null>(
    () =>
      offered
        ? {
            label: fr.surveyDetail.cta.finish,
            accessibilityLabel: fr.surveyDetail.a11y.finishSurvey(siteName),
            loading: busy,
            onPress: finish,
            notice: attempts > 0 && !busy ? <FinishStatusNotice key={attempts} /> : null,
          }
        : null,
    [offered, busy, attempts, finish, siteName],
  )

  return (
    <ScreenFrame>
      <FactorPager
        initialFactor={factor}
        factorSections={state.factorSections}
        factorRetainedScores={state.factorRetainedScores}
        methodVersion={state.ibpMethodVersion}
        onActiveFactorChange={handleActiveFactorChange}
        onFinish={handleFinish}
        finishAction={finishAction}
      />
    </ScreenFrame>
  )
})
