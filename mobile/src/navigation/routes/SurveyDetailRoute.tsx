import { memo, useMemo } from "react"
import { devOnlyHandler } from "../../app/dev-tools"
import type { FactorKey } from "../../app/types"
import { SurveyDetailScreen } from "../../screens/SurveyDetailScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useIsOffline } from "../../hooks/useIsOffline"
import { useWeatherPrefillState } from "../../state/weather-context"
import { useSyncActions } from "../../state/sync-actions-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { SurveyDetailRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"
import { SelectedSurveyGate } from "./SelectedSurveyGate"

/**
 * Survey detail route (phase 01.9-18, D-01): the selected survey and its
 * caches from the surveys context, the API URL from the session, and the sync
 * actions. Until a survey is selected it shows the shared loading state (SelectedSurveyGate). It is the summary; its sub-pages
 * (context, parcels, factors, history) are the routes next to it, opened from rows, and the journal is
 * opened from the "…" menu (D-02).
 */
export const SurveyDetailRoute = memo(function SurveyDetailRoute({
  navigation,
}: SurveyDetailRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()
  const syncActions = useSyncActions()
  const { state: weatherState } = useWeatherPrefillState()
  const offline = useIsOffline()

  const onOpenContext = useLatestCallback(() => navigation.navigate("surveyContext"))
  // D-15: the summary's weather card opens the Contexte page scrolled to the weather section.
  const onOpenConditions = useLatestCallback(() =>
    navigation.navigate("surveyContext", { section: "conditions" }),
  )
  const onOpenParcelsPage = useLatestCallback(() => navigation.navigate("surveyParcelsPage"))
  const onOpenScore = useLatestCallback(() => navigation.navigate("surveyScore"))
  const onOpenFactor = useLatestCallback(async (surveyId: string, factor: FactorKey) => {
    const loaded = await actions.startEditSurvey(surveyId)
    if (loaded) navigation.navigate("surveyFactorDetail", { factor })
  })
  const onOpenHistory = useLatestCallback(() => navigation.navigate("surveyHistory"))
  const onOpenJournal = useLatestCallback(() => navigation.navigate("surveyJournal"))
  const onSimulateMissingAttachmentFile = useMemo(
    () => devOnlyHandler(syncActions.handleSimulateMissingAttachmentFile),
    [syncActions],
  )

  return (
    <SelectedSurveyGate navigation={navigation}>
      {(survey) => (
        // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
        <ScreenFrame largeTitle={usesNativeLargeTitle()}>
          <SurveyDetailScreen
            apiUrl={session.apiUrl}
            accessToken={accessToken}
            observerName={session.currentUser?.display_name ?? null}
            selectedSurvey={survey}
            selectedSurveyAttachments={state.selectedSurveyAttachments}
            navigation={navigation}
            surveyDetails={state.surveyDetails}
            detailsLoadingSurveyId={state.detailsLoadingSurveyId}
            surveyEvents={state.surveyEvents}
            onTakePhoto={actions.queueAttachmentFromCamera}
            onPickPhoto={actions.queueAttachmentFromLibrary}
            onDeleteAttachment={actions.deleteAttachment}
            onDeleteSurvey={actions.confirmDeleteSurvey}
            onSubmitSurvey={actions.submitSurvey}
            onRetrySurvey={actions.retrySurvey}
            onDiscardSurvey={actions.discardSurvey}
            onRenameSurvey={actions.renameSurvey}
            onOpenContext={onOpenContext}
            onOpenConditions={onOpenConditions}
            conditionsLoading={weatherState.inFlightIds.has(survey.id)}
            conditionsOffline={offline}
            onChangeNote={actions.updateSurveyNote}
            onOpenParcelsPage={onOpenParcelsPage}
            onOpenScore={onOpenScore}
            onOpenFactor={onOpenFactor}
            onOpenHistory={onOpenHistory}
            onOpenJournal={onOpenJournal}
            onEnsureAttachmentPreviews={syncActions.handleEnsureAttachmentPreviews}
            onSimulateMissingAttachmentFile={onSimulateMissingAttachmentFile}
          />
        </ScreenFrame>
      )}
    </SelectedSurveyGate>
  )
})
