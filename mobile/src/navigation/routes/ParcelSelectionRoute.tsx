import { memo } from "react"
import { SurveyParcelSelectionScreen } from "../../screens/SurveyParcelSelectionScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveyActions } from "../../state/surveys-context"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useWeatherPrefillState } from "../../state/weather-context"
import type { WeatherPoint } from "../../storage/weather"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { ParcelSelectionRouteProps } from "../types"

/**
 * Parcel selection route (phase 01.9-18, D-01): the form context and the API URL. Phase 27, D-10:
 * after a successful save the centre of the chosen parcels goes to the weather hook, which asks
 * for the weather at once when online and keeps the point for the catch-up when offline.
 */
export const ParcelSelectionRoute = memo(function ParcelSelectionRoute({
  navigation,
  route,
}: ParcelSelectionRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveyFormState()
  const weather = useWeatherPrefillState()
  const surveyActions = useSurveyActions()

  const isWizard = route.params.mode === "wizard"
  // Last step of a new survey: the draft is finalised, then the survey page replaces the whole
  // creation flow so back returns to the list.
  const onSave = useLatestCallback(async (weatherPoint: WeatherPoint | null) => {
    // Read before the save: it may close the editing session. The wizard opens its draft with the
    // first step, so the id is already known here; the rare path that creates the draft at save
    // time has none, gets no stored point, and the hook falls back to the cached parcel geometry.
    const surveyId = state.editingSurveyId
    const rememberPoint = (): void => {
      if (surveyId !== null && weatherPoint !== null) {
        void weather.actions.rememberPoint(surveyId, weatherPoint)
      }
    }
    if (isWizard) {
      const createdId = await actions.createDraft()
      if (createdId !== null) {
        rememberPoint()
        navigation.reset({
          index: 1,
          routes: [{ name: "surveysHome" }, { name: "surveyDetail" }],
        })
        // Selected after the reset: removing an older summary screen (the wizard launched from
        // Accueil, a search or Explorer keeps the stack) clears the selection while the reset
        // runs, and the new summary would open on no survey (D-45).
        surveyActions.openSurvey(createdId)
      }
      return
    }
    const saved = await actions.saveSurveyEdits()
    if (saved) {
      rememberPoint()
      navigation.goBack()
    }
  })

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
