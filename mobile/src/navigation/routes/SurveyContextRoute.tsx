import { memo } from "react"
import { SurveyContextScreen } from "../../screens/SurveyContextScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { SurveyContextRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"

/** "Contexte et parcelles": the map, the parcels and the method of the selected survey. */
export const SurveyContextRoute = memo(function SurveyContextRoute({
  navigation,
}: SurveyContextRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()

  const onOpenParcels = useLatestCallback(async (surveyId: string) => {
    const loaded = await actions.startEditSurvey(surveyId)
    if (loaded) {
      navigation.navigate("surveyParcels", { surveyId, mode: "edit" })
    }
  })

  if (!state.selectedSurvey) return null

  return (
    <ScreenFrame>
      <SurveyContextScreen
        apiUrl={session.apiUrl}
        accessToken={accessToken}
        selectedSurvey={state.selectedSurvey}
        surveyDetails={state.surveyDetails}
        detailsLoadingSurveyId={state.detailsLoadingSurveyId}
        onOpenParcels={onOpenParcels}
        onUpdateRegionVersion={actions.updateRegionVersion}
        onUpdateVegetationStage={actions.updateVegetationStage}
        onUpdateIbpCas={actions.updateIbpCas}
        onUpdateCas3Scale={actions.updateCas3Scale}
        onSwitchToV32={actions.switchToV32}
      />
    </ScreenFrame>
  )
})
