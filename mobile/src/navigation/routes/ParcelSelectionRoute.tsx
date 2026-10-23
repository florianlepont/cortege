import { memo } from "react"
import { SurveyParcelSelectionScreen } from "../../screens/SurveyParcelSelectionScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useWeatherPrefillState } from "../../state/weather-context"
import type { WeatherPoint } from "../../storage/weather"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { ParcelSelectionRouteProps } from "../types"

/**
 * Parcel selection route (phase 01.9-18, D-01): the form context and the API URL. Phase 27, D-10:
 * after a successful save the centre of the chosen parcels goes to the weather hook, which asks
 * for the weather at once when online and keeps the point for the catch-up when offline. Phase 30:
 * in the wizard the map hands the point and the computed surface to the route step instead.
 */
export const ParcelSelectionRoute = memo(function ParcelSelectionRoute({
  navigation,
  route,
}: ParcelSelectionRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveyFormState()
  const weather = useWeatherPrefillState()

  const isWizard = route.params.mode === "wizard"
  const onSave = useLatestCallback(
    async (weatherPoint: WeatherPoint | null, surfaceHa: number | null) => {
      if (isWizard) {
        // Phase 30 (O-19, P-1): the parcel map is the fourth of the five steps of a new survey. The
        // draft is NOT finalised here any more: the route step comes next and finalises it only when
        // the route is accepted (`RouteGuideRoute`: route written, draft finalised, weather point
        // kept, the creation flow replaced by the survey page). Going back from the route step lands
        // on this map with the selection and the editing session intact and nothing written.
        navigation.navigate("surveyRouteGuide", {
          surveyId: state.editingSurveyId,
          mode: "create",
          surfaceHa,
          weatherPoint,
        })
        return
      }
      // Read before the save: it may close the editing session.
      const surveyId = state.editingSurveyId
      const saved = await actions.saveSurveyEdits()
      if (saved) {
        // The point of the weather lookup follows the saved parcels.
        if (surveyId !== null && weatherPoint !== null) {
          void weather.actions.rememberPoint(surveyId, weatherPoint)
        }
        navigation.goBack()
      }
    },
  )

  return (
    <SurveyParcelSelectionScreen
      apiUrl={session.apiUrl}
      accessToken={accessToken}
      gpsLocation={state.gpsLocation}
      // Editing a survey's parcels: the map starts where its page shows them, not on the phone.
      startPoint={route.params.startPoint ?? null}
      siteName={state.siteName}
      selectedParcelIds={state.selectedParcelIds}
      onToggleParcelSelection={actions.toggleParcelSelection}
      onCaptureGpsLocation={actions.captureGpsLocation}
      wizard={isWizard}
      onSave={onSave}
    />
  )
})
