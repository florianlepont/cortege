import { memo } from "react"
import { SurveyJournalScreen } from "../../screens/SurveyJournalScreen"
import { useSurveys } from "../../state/surveys-context"
import type { SurveyJournalRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"

/**
 * "Journal du relevé" (D-02, D-11): the change log of the selected survey. Own surveys only: the
 * route is registered in the survey stack alone and reads the surveys context.
 */
export const SurveyJournalRoute = memo(function SurveyJournalRoute(
  _props: SurveyJournalRouteProps,
) {
  const { state, actions } = useSurveys()

  if (!state.selectedSurvey) return null

  return (
    // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <SurveyJournalScreen
        selectedSurvey={state.selectedSurvey}
        surveyEvents={state.surveyEvents}
        eventsLoadingSurveyId={state.eventsLoadingSurveyId}
        onLoadSurveyEvents={actions.loadSurveyEvents}
      />
    </ScreenFrame>
  )
})
