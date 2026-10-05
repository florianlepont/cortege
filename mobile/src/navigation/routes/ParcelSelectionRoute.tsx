import { memo } from "react"
import { SurveyParcelSelectionScreen } from "../../screens/SurveyParcelSelectionScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { ParcelSelectionRouteProps } from "../types"

/** Parcel selection route (phase 01.9-18, D-01): the form context and the API URL. */
export const ParcelSelectionRoute = memo(function ParcelSelectionRoute({
  navigation,
  route,
}: ParcelSelectionRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveyFormState()

  const isWizard = route.params.mode === "wizard"

  // Last step of a new survey: the draft is finalised, then the survey page replaces the whole
  // creation flow so back returns to the list.
  const onSave = useLatestCallback(async () => {
    if (isWizard) {
      const created = await actions.createDraft()
      if (created) {
        navigation.reset({
          index: 1,
          routes: [{ name: "surveysHome" }, { name: "surveyDetail" }],
        })
      }
      return
    }
    const saved = await actions.saveSurveyEdits()
    if (saved) navigation.goBack()
  })

  return (
    <SurveyParcelSelectionScreen
      apiUrl={session.apiUrl}
      accessToken={accessToken}
      gpsLocation={state.gpsLocation}
      selectedParcelIds={state.selectedParcelIds}
      onToggleParcelSelection={actions.toggleParcelSelection}
      onCaptureGpsLocation={actions.captureGpsLocation}
      wizard={isWizard}
      onSave={onSave}
    />
  )
})
