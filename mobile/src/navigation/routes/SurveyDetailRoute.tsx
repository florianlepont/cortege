import { memo, useMemo } from "react"
import { devOnlyHandler } from "../../app/dev-tools"
import type { FactorKey } from "../../app/types"
import { SurveyDetailScreen } from "../../screens/SurveyDetailScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { resolveDisplayCoordinates } from "../../screens/survey-screen-helpers"
import { useSyncActions } from "../../state/sync-actions-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { SurveyDetailRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { usesNativeLargeTitle } from "../large-title"

/**
 * Survey detail route (phase 01.9-18, D-01): the selected survey and its
 * caches from the surveys context, the API URL from the session, and the sync
 * actions. Renders nothing until a survey is selected. It is the summary; its sub-pages
 * (context, score, history) are the routes next to it, opened from rows, and the journal is
 * opened from the "…" menu (D-02).
 */
export const SurveyDetailRoute = memo(function SurveyDetailRoute({
  navigation,
}: SurveyDetailRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()
  const syncActions = useSyncActions()

  const onOpenContext = useLatestCallback(() => navigation.navigate("surveyContext"))
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

  if (!state.selectedSurvey) return null

  return (
    // 12.2-17: the native large title in the native iOS tab tree (the stack sets the header).
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <SurveyDetailScreen
        apiUrl={session.apiUrl}
        accessToken={accessToken}
        observerName={session.currentUser?.display_name ?? null}
        selectedSurvey={state.selectedSurvey}
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
        onOpenParcels={onOpenParcels}
        onOpenScore={onOpenScore}
        onOpenFactor={onOpenFactor}
        onOpenHistory={onOpenHistory}
        onOpenJournal={onOpenJournal}
        onEnsureAttachmentPreviews={syncActions.handleEnsureAttachmentPreviews}
        onSimulateMissingAttachmentFile={onSimulateMissingAttachmentFile}
      />
    </ScreenFrame>
  )
})
