import { memo } from "react"
import type { FactorKey } from "../../app/types"
import { SurveyScoreScreen } from "../../screens/SurveyScoreScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { SurveyScoreRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"

/** "Score IBP": the total, the sub-scores and the factors of the selected survey. */
export const SurveyScoreRoute = memo(function SurveyScoreRoute({
  navigation,
}: SurveyScoreRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()

  const onOpenFactor = useLatestCallback(async (surveyId: string, factor: FactorKey) => {
    const loaded = await actions.startEditSurvey(surveyId)
    if (loaded) {
      navigation.navigate("surveyFactorDetail", { factor })
    }
  })

  if (!state.selectedSurvey) return null

  return (
    <ScreenFrame>
      <SurveyScoreScreen
        apiUrl={session.apiUrl}
        accessToken={accessToken}
        selectedSurvey={state.selectedSurvey}
        surveyDetails={state.surveyDetails}
        detailsLoadingSurveyId={state.detailsLoadingSurveyId}
        onOpenFactor={onOpenFactor}
      />
    </ScreenFrame>
  )
})
