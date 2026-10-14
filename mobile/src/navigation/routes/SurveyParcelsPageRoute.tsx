import { memo } from "react"
import { SurveyParcelsScreen } from "../../screens/SurveyParcelsScreen"
import { resolveDisplayCoordinates } from "../../screens/survey-screen-helpers"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { SurveyParcelsPageRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"
import { SelectedSurveyGate } from "./SelectedSurveyGate"

/**
 * "Parcelles et parcours" (D-32): the map, the list of parcels, the "Parcours utilisé" card and the
 * offline map of the selected survey. The pencil on the map opens the parcel editor; the route card
 * opens the chooser in edit mode (a draft of the observer only; moved here from "Contexte" on
 * 2026-10-14).
 */
export const SurveyParcelsPageRoute = memo(function SurveyParcelsPageRoute({
  navigation,
}: SurveyParcelsPageRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()

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

  // The chooser reads the recorded answers itself, so only the survey travels (phase 30, D-09).
  const onEditRoute = useLatestCallback((surveyId: string) =>
    navigation.navigate("surveyRouteChoose", { surveyId, mode: "edit", surfaceHa: null }),
  )

  return (
    <SelectedSurveyGate navigation={navigation}>
      {(survey) => (
        // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
        <ScreenFrame largeTitle={usesNativeLargeTitle()}>
          <SurveyParcelsScreen
            apiUrl={session.apiUrl}
            accessToken={accessToken}
            selectedSurvey={survey}
            surveyDetails={state.surveyDetails}
            detailsLoadingSurveyId={state.detailsLoadingSurveyId}
            onOpenParcels={onOpenParcels}
            onEditRoute={onEditRoute}
          />
        </ScreenFrame>
      )}
    </SelectedSurveyGate>
  )
})
