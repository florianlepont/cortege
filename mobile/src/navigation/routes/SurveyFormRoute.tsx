import { memo, useEffect, useMemo } from "react"
import { SurveyWizardScreen } from "../../screens/survey-wizard/SurveyWizardScreen"
import type { SurveyFormMethod } from "../../screens/survey-wizard/method"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useSurveyActions } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { ScreenFrame } from "../../ui/ScreenFrame"
import { wizardUsesNativeHeader } from "../stacks/stack-options"
import type { SurveyFormRouteProps } from "../types"

/**
 * New-survey route (OA-25): the wizard's first three questions; the fourth, the parcels, is the
 * `surveyParcels` screen, which finalises the draft. D-19 (12.2-16): the wizard sits in a
 * ScreenFrame, so the halo is behind it like on every other page. On iOS (12.2-17) the stack shows
 * its native transparent header with the system back button and the wizard puts its step counter
 * there; the frame starts the page below the header, so nothing slides under it. On Android the
 * stack hides the header and the wizard draws its own top bar under the status bar (frame inset 0).
 */
export const SurveyFormRoute = memo(function SurveyFormRoute({ navigation }: SurveyFormRouteProps) {
  const { state, actions } = useSurveyFormState()

  // The form never holds a submitted survey (useEditingDraft refuses to open one), so the version
  // stays open here; the draft patcher and the API still enforce the lock (D-02).
  const method = useMemo<SurveyFormMethod>(
    () => ({
      version: state.ibpMethodVersion,
      cas: state.ibpCas,
      cas3Scale: state.ibpCas3Scale,
      locked: false,
      setVersion: actions.setIbpMethodVersion,
      setCas: actions.setIbpCas,
      setCas3Scale: actions.setIbpCas3Scale,
    }),
    [actions, state.ibpCas, state.ibpCas3Scale, state.ibpMethodVersion],
  )

  const onOpenParcels = useLatestCallback(() => {
    navigation.navigate("surveyParcels", {
      surveyId: state.editingSurveyId ?? "draft",
      mode: "wizard",
    })
  })
  const onClose = useLatestCallback(() => navigation.goBack())

  // The wizard opens a draft at once so every answer autosaves. Leaving it (the close button, the
  // system back, the iOS back button) before the site is named, with no parcel and no factor, would
  // leave an empty "Relevé sans titre" in the list and in the sync queue: it is dropped instead.
  const { discardEmptyDraft } = useSurveyActions()
  const discardIfEmpty = useLatestCallback(() => {
    const surveyId = state.editingSurveyId
    if (state.formMode !== "create" || surveyId === null) return
    if (state.siteName.trim().length > 0) return
    if (state.selectedParcelIds.length > 0) return
    if (Object.keys(state.draftInput.factors ?? {}).length > 0) return
    void discardEmptyDraft(surveyId)
  })
  useEffect(
    () => navigation.addListener("beforeRemove", discardIfEmpty),
    [navigation, discardIfEmpty],
  )

  return (
    <ScreenFrame>
      <SurveyWizardScreen
        siteName={state.siteName}
        setSiteName={actions.setSiteName}
        formErrors={state.formErrors}
        method={method}
        regionVersion={state.regionVersion}
        vegetationStage={state.vegetationStage}
        setVegetationStage={actions.setVegetationStage}
        onRegionChange={actions.handleRegionChange}
        onOpenParcels={onOpenParcels}
        onClose={onClose}
        nativeHeader={wizardUsesNativeHeader()}
      />
    </ScreenFrame>
  )
})
