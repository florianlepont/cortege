import { memo } from "react"
import { SurveyContextScreen } from "../../screens/SurveyContextScreen"
import { resolveDisplayCoordinates } from "../../screens/survey-screen-helpers"
import { useIsOffline } from "../../hooks/useIsOffline"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { useWeatherPrefillState } from "../../state/weather-context"
import type { SurveyContextRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"

/**
 * "Contexte et parcelles": the map, the parcels, the method and the Conditions (weather and survey
 * note) of the selected survey. The `section` param opens the page scrolled to the Conditions.
 */
export const SurveyContextRoute = memo(function SurveyContextRoute({
  navigation,
  route,
}: SurveyContextRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()
  const { state: weather, actions: weatherActions } = useWeatherPrefillState()
  const offline = useIsOffline()

  const onOpenParcels = useLatestCallback(async (surveyId: string) => {
    const loaded = await actions.startEditSurvey(surveyId)
    if (!loaded) return
    const startPoint = resolveDisplayCoordinates(state.surveyDetails[surveyId]?.display_location)
    navigation.navigate("surveyParcels", {
      surveyId,
      mode: "edit",
      ...(startPoint && { startPoint }),
    })
  })

  if (!state.selectedSurvey) return null
  const surveyId = state.selectedSurvey.id

  return (
    // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <SurveyContextScreen
        section={route.params?.section}
        weatherRequest={{
          online: !offline,
          inFlight: weather.inFlightIds.has(surveyId),
          unavailable: weather.unavailableIds.has(surveyId),
        }}
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
        onChangeNote={actions.updateSurveyNote}
        onEditWeather={actions.updateSurveyWeather}
        onRetryWeather={weatherActions.retry}
        onRefillWeather={weatherActions.refill}
      />
    </ScreenFrame>
  )
})
