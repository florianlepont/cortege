import { memo, useCallback, useMemo } from "react"
import type { ExportMode } from "../../app/survey-pdf-export"
// Straight from its module, not the facade: the facade also loads the print and share pipeline,
// which the navigation tree (and its tests) must not pull in just to count pages.
import { estimateCompletePages } from "../../app/survey-pdf/page-estimate"
import { ExportChoiceSheet } from "../../screens/export-choice/ExportChoiceSheet"
import { useExportChoice } from "../../screens/export-choice/useExportChoice"
import { isPhotoAttachment } from "../../screens/survey-screen-helpers"
import { useSurveys } from "../../state/surveys-context"
import type { ExportChoiceRouteProps } from "../types"

/**
 * Phase 33, D-14: the export choice, a screen of the survey stack presented as a native form sheet
 * on iOS and a modal on Android (`exportChoiceScreenOptions`). The sheet only chooses: "Exporter le
 * PDF" pops back to the survey summary with the chosen mode in `exportRequest`, and the summary
 * (which owns the survey data and the export lock) runs the export once the sheet is gone, so the
 * OS share sheet never opens from a closing form sheet (research Pitfall 3).
 *
 * D-09 and D-18: whether the survey is a draft is read from the stored survey alone (any status but
 * "submitted"), so a submitted survey that is not yet synced may produce the summary.
 */
export const ExportChoiceRoute = memo(function ExportChoiceRoute({
  navigation,
  route,
}: ExportChoiceRouteProps) {
  const { surveyId } = route.params
  const { state } = useSurveys()
  const survey = useMemo(
    () => state.surveys.find((item) => item.id === surveyId) ?? null,
    [state.surveys, surveyId],
  )
  const isDraft = survey !== null && survey.status !== "submitted"
  // The attachments in the context are those of the selected survey only.
  const photoCount = useMemo(
    () =>
      state.selectedSurveyId === surveyId
        ? state.selectedSurveyAttachments.filter(isPhotoAttachment).length
        : 0,
    [state.selectedSurveyId, state.selectedSurveyAttachments, surveyId],
  )
  const completePages = estimateCompletePages({ photoCount })

  const handleClose = useCallback(() => {
    if (navigation.isFocused()) navigation.goBack()
  }, [navigation])
  const handleConfirm = useCallback(
    (mode: ExportMode) => {
      // Back to the summary below the sheet; its other params stay (`merge`). The nonce is new at
      // each confirm, so the same choice made twice is applied twice.
      navigation.popTo(
        "surveyDetail",
        { exportRequest: { mode, nonce: Date.now() } },
        { merge: true },
      )
    },
    [navigation],
  )
  const choice = useExportChoice({
    isDraft,
    surveyFound: survey !== null,
    onConfirm: handleConfirm,
    onClose: handleClose,
  })

  if (survey === null) return null
  return (
    <ExportChoiceSheet
      siteName={survey.site_name}
      mode={choice.mode}
      isDraft={isDraft}
      completePages={completePages}
      onSelect={choice.select}
      onConfirm={choice.confirm}
      onClose={handleClose}
    />
  )
})
