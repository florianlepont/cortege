import { memo, useCallback, useEffect, useMemo } from "react"
import { BackHandler } from "react-native"
import { useIsOffline } from "../../hooks/useIsOffline"
import { FinishSheet } from "../../screens/FinishSheet"
import { useFinishSheet } from "../../screens/finish-sheet/useFinishSheet"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useSurveys } from "../../state/surveys-context"
import type { FinishSheetRouteProps } from "../types"

/**
 * Phase 29, D-04: the submission step of a survey, a screen of the survey stack presented as a
 * native form sheet on iOS and a modal on Android (`finishSheetScreenOptions`). It is reached from
 * both "Terminer le relevé" entries (the summary button and the factor pager pill, plan 29-08).
 * Success is the stored status becoming "submitted", whose haptic and pulse stay in
 * `useSubmitSuccessPulse`; the pager's own return to the summary is programmatic and never blocked
 * here.
 *
 * While the finish runs the sheet cannot be dismissed by hand: the iOS swipe down is switched off
 * through `gestureEnabled` and the Android back press is swallowed with `BackHandler`. That is not
 * `usePreventRemove`, which would also block the pager's programmatic return when the submit
 * succeeds.
 */
export const FinishSheetRoute = memo(function FinishSheetRoute({
  navigation,
  route,
}: FinishSheetRouteProps) {
  const { surveyId } = route.params
  const { state, actions } = useSurveys()
  const { actions: formActions } = useSurveyFormState()
  const offline = useIsOffline()
  const survey = useMemo(
    () => state.surveys.find((item) => item.id === surveyId) ?? null,
    [state.surveys, surveyId],
  )
  const handleClose = useCallback(() => {
    if (navigation.isFocused()) navigation.goBack()
  }, [navigation])
  const sheet = useFinishSheet({
    survey,
    offline,
    flushDraft: formActions.flushDraft,
    setDraftVisibility: actions.setDraftVisibility,
    submitSurvey: actions.submitSurvey,
    onClose: handleClose,
  })
  const submitting = sheet.phase === "submitting"

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !submitting })
  }, [navigation, submitting])

  useEffect(() => {
    if (!submitting) return undefined
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true)
    return () => subscription.remove()
  }, [submitting])

  return (
    <FinishSheet
      siteName={survey?.site_name ?? ""}
      choice={sheet.choice}
      phase={sheet.phase}
      outcomeKey={sheet.outcomeKey}
      offline={offline}
      onSelect={sheet.select}
      onConfirm={sheet.confirm}
      onCancel={handleClose}
    />
  )
})
