import { memo } from "react"
import { SurveyContextScreen } from "../../screens/SurveyContextScreen"
import { useIsOffline } from "../../hooks/useIsOffline"
import { useSurveys } from "../../state/surveys-context"
import { useWeatherPrefillState } from "../../state/weather-context"
import type { SurveyContextRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"

/**
 * "Contexte" (D-32): the method, the station context and the weather of the selected survey. The
 * `section` param opens the page scrolled to the weather.
 */
export const SurveyContextRoute = memo(function SurveyContextRoute({
  route,
}: SurveyContextRouteProps) {
  const { state, actions } = useSurveys()
  const { state: weather, actions: weatherActions } = useWeatherPrefillState()
  const offline = useIsOffline()

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
        selectedSurvey={state.selectedSurvey}
        surveyDetails={state.surveyDetails}
        detailsLoadingSurveyId={state.detailsLoadingSurveyId}
        onUpdateRegionVersion={actions.updateRegionVersion}
        onUpdateVegetationStage={actions.updateVegetationStage}
        onUpdateIbpCas={actions.updateIbpCas}
        onUpdateCas3Scale={actions.updateCas3Scale}
        onSwitchToV32={actions.switchToV32}
        onEditWeather={actions.updateSurveyWeather}
        onRetryWeather={weatherActions.retry}
        onRefillWeather={weatherActions.refill}
      />
    </ScreenFrame>
  )
})
