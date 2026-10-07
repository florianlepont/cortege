import { memo, useCallback } from "react"
import type { FactorKey } from "../../app/types"
import { fr } from "../../i18n"
import { FactorPager } from "../../screens/survey-form/FactorPager"
import { useSurveyFormState } from "../../state/survey-form-context"
import { ScreenFrame } from "../../ui/ScreenFrame"
import type { FactorDetailRouteProps } from "../types"

/**
 * Factor detail route (phase 01.9-18, D-01; FLOW-04 pager since phase 3): the form context only.
 * Hosts the A->J horizontal pager instead of a single factor screen, so navigating between factors
 * no longer round-trips through the factor grid. The native header names the factor on screen, and
 * "Terminer" on the last factor goes back to where the pager was opened from. D-19 (12.2-15): the
 * pager sits in a ScreenFrame under the stack's transparent header, so the halo runs on behind
 * the header and the pager starts below it.
 */
export const FactorDetailRoute = memo(function FactorDetailRoute({
  navigation,
  route,
}: FactorDetailRouteProps) {
  const { state } = useSurveyFormState()
  const { factor } = route.params

  const handleActiveFactorChange = useCallback(
    (active: FactorKey) => {
      navigation.setOptions({ title: fr.navigation.headers.factor(active) })
    },
    [navigation],
  )
  const handleFinish = useCallback(() => navigation.goBack(), [navigation])

  return (
    <ScreenFrame>
      <FactorPager
        initialFactor={factor}
        factorSections={state.factorSections}
        factorRetainedScores={state.factorRetainedScores}
        methodVersion={state.ibpMethodVersion}
        onActiveFactorChange={handleActiveFactorChange}
        onFinish={handleFinish}
      />
    </ScreenFrame>
  )
})
