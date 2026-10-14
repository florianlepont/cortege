import { memo, useMemo } from "react"
import { SurveyHistoryScreen } from "../../screens/SurveyHistoryScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { useSurveys } from "../../state/surveys-context"
import type { SurveyHistoryRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"
import { SelectedSurveyGate } from "./SelectedSurveyGate"

/**
 * "Historique de la parcelle": the trend, the deltas and the surveys of the selected survey's
 * parcel. A survey the phone holds (the observer's own, private ones included) opens on the
 * owner's summary, as the pager's finish does: the community page answers 404 for a private survey
 * (phase 29, D-10). Only another member's survey opens read-only on the community page.
 */
export const SurveyHistoryRoute = memo(function SurveyHistoryRoute({
  navigation,
}: SurveyHistoryRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()
  const localIds = useMemo(() => new Set(state.surveys.map((survey) => survey.id)), [state.surveys])
  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    if (localIds.has(surveyId)) {
      // The summary shows the newly selected survey; popTo is the same back target as the pager.
      actions.openSurvey(surveyId)
      navigation.popTo("surveyDetail")
      return
    }
    navigation.push("communitySurvey", { surveyId })
  })

  return (
    <SelectedSurveyGate navigation={navigation}>
      {(survey) => (
        // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
        <ScreenFrame largeTitle={usesNativeLargeTitle()}>
          <SurveyHistoryScreen
            apiUrl={session.apiUrl}
            accessToken={accessToken}
            selectedSurvey={survey}
            surveyDetails={state.surveyDetails}
            detailsLoadingSurveyId={state.detailsLoadingSurveyId}
            onOpenSurvey={onOpenSurvey}
          />
        </ScreenFrame>
      )}
    </SelectedSurveyGate>
  )
})
