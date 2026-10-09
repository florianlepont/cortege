import { memo } from "react"
import { SurveyHistoryScreen } from "../../screens/SurveyHistoryScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { useSurveys } from "../../state/surveys-context"
import type { SurveyHistoryRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"

/**
 * "Historique de la parcelle": the trend, the deltas and the surveys of the selected survey's
 * parcel. Another survey of the list opens read-only on the community page.
 */
export const SurveyHistoryRoute = memo(function SurveyHistoryRoute({
  navigation,
}: SurveyHistoryRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state } = useSurveys()
  const onOpenSurvey = useLatestCallback((surveyId: string) =>
    navigation.push("communitySurvey", { surveyId }),
  )

  if (!state.selectedSurvey) return null

  return (
    // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <SurveyHistoryScreen
        apiUrl={session.apiUrl}
        accessToken={accessToken}
        selectedSurvey={state.selectedSurvey}
        surveyDetails={state.surveyDetails}
        detailsLoadingSurveyId={state.detailsLoadingSurveyId}
        onOpenSurvey={onOpenSurvey}
      />
    </ScreenFrame>
  )
})
