import { memo, useMemo } from "react"
import { SurveyWizardScreen } from "../../screens/survey-wizard/SurveyWizardScreen"
import type { SurveyFormMethod } from "../../screens/survey-wizard/method"
import { useSurveyFormState } from "../../state/survey-form-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { ScreenFrame } from "../../ui/ScreenFrame"
import type { SurveyFormRouteProps } from "../types"

/**
 * New-survey route (OA-25): the wizard's first three questions; the fourth, the parcels, is the
 * `surveyParcels` screen, which finalises the draft. D-19 (12.2-16): the wizard sits in a
 * ScreenFrame, so the halo is behind it like on every other page. The stack hides the header (the
 * wizard draws its own top bar under the status bar), so the frame's header inset is 0 and nothing
 * can slide under a header.
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
      />
    </ScreenFrame>
  )
})
