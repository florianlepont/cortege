import { memo } from "react"
import { SurveyHistoryScreen } from "../../screens/SurveyHistoryScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import type { SurveyHistoryRouteProps } from "../types"

/** "Historique": the steps of the selected survey and the earlier surveys of its parcel. */
export const SurveyHistoryRoute = memo(function SurveyHistoryRoute(
  _props: SurveyHistoryRouteProps,
) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()

  if (!state.selectedSurvey) return null

  return (
    <SurveyHistoryScreen
      apiUrl={session.apiUrl}
      accessToken={accessToken}
      selectedSurvey={state.selectedSurvey}
      surveyDetails={state.surveyDetails}
      detailsLoadingSurveyId={state.detailsLoadingSurveyId}
      surveyEvents={state.surveyEvents}
      eventsLoadingSurveyId={state.eventsLoadingSurveyId}
      onLoadSurveyEvents={actions.loadSurveyEvents}
    />
  )
})
