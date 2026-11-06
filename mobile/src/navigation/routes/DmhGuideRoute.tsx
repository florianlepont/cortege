import { memo } from "react"
import { DMH_GROUP_CODES, type DmhGroupCode } from "@cortege/ibp-domain"
import { DmhGuideScreen } from "../../screens/dmh-guide/DmhGuideScreen"
import { useSurveyFormState } from "../../state/survey-form-context"
import type { DmhGuideRouteProps } from "../types"

/**
 * The dendromicrohabitat guide as a screen of the survey stack (phase 32, D-04 and D-05): presented
 * as a native form sheet on iOS, a modal on Android (`dmhGuideScreenOptions`). The group param is
 * untrusted (a stale deep state): a value outside the fifteen codes opens the catalogue (T-32-32).
 * Reads only the survey's method version from the form context, which words the rule of groups 6,
 * 12 and 15.
 */
export const DmhGuideRoute = memo(function DmhGuideRoute({
  navigation,
  route,
}: DmhGuideRouteProps) {
  const { state } = useSurveyFormState()
  const requested = route.params?.group
  const initialGroup: DmhGroupCode | null =
    requested !== undefined && DMH_GROUP_CODES.includes(requested) ? requested : null
  return (
    <DmhGuideScreen
      initialGroup={initialGroup}
      methodVersion={state.ibpMethodVersion}
      onClose={() => navigation.goBack()}
    />
  )
})
