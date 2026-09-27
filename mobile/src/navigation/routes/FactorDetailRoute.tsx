import { memo } from "react"
import { FactorPager } from "../../screens/survey-form/FactorPager"
import { useSurveyFormState } from "../../state/survey-form-context"
import type { FactorDetailRouteProps } from "../types"

/**
 * Factor detail route (phase 01.9-18, D-01; FLOW-04 pager since phase 3): the form context only.
 * Hosts the A->J horizontal pager instead of a single factor screen, so navigating between factors
 * no longer round-trips through the factor grid.
 */
export const FactorDetailRoute = memo(function FactorDetailRoute({
  route,
}: FactorDetailRouteProps) {
  const { state } = useSurveyFormState()
  const { factor } = route.params

  return (
    <FactorPager
      initialFactor={factor}
      factorSections={state.factorSections}
      factorRetainedScores={state.factorRetainedScores}
      methodVersion={state.ibpMethodVersion}
    />
  )
})
