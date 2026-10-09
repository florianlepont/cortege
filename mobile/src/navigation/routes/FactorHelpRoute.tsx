import { memo } from "react"
import { FactorHelpSheet } from "../../screens/FactorHelpSheet"
import type { FactorHelpRouteProps } from "../types"

/**
 * The factor help as a screen of the survey stack: presented as a native form sheet on iOS, a
 * modal on Android (`factorHelpScreenOptions`). The texts travel as params, chosen by the survey's
 * method version where "Que relever ?" was tapped.
 */
export const FactorHelpRoute = memo(function FactorHelpRoute({
  navigation,
  route,
}: FactorHelpRouteProps) {
  return (
    <FactorHelpSheet
      help={route.params.help}
      hints={route.params.hints}
      onClose={() => navigation.goBack()}
    />
  )
})
