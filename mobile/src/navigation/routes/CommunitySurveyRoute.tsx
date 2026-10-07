import { memo, useLayoutEffect } from "react"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { CommunitySurveyScreen } from "../../screens/community-survey/CommunitySurveyScreen"
import { useCommunitySurvey } from "../../hooks/useCommunitySurvey"
import { useAccessToken, useSession } from "../../state/session-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { fr } from "../../i18n"
import { usesNativeLargeTitle } from "../large-title"
import type { CommunitySurveyRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"

/**
 * The page of a finished survey of another member (OA-59), opened from the Communauté search, from
 * the Explorer map (a tapped parcel's history or a selected survey) or from the history of another
 * such page: the same page from every entrance. It reads nothing from the surveys context: the survey is
 * not the user's, so it is loaded from the API by the id in the route.
 *
 * 12.2-17: in the native iOS tab tree the page is named by the native large title: the stack's
 * "Relevé de la communauté" while loading, then the survey's name, which stays in the bar as the
 * page scrolls.
 */
export const CommunitySurveyRoute = memo(function CommunitySurveyRoute({
  route,
}: CommunitySurveyRouteProps) {
  // Pushed from the search, from the Explorer map or from another such page: whichever stack
  // mounts it registers the same screen name, so the push stays in that stack.
  const navigation =
    useNavigation<NativeStackNavigationProp<{ communitySurvey: { surveyId: string } }>>()
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const state = useCommunitySurvey(session.apiUrl, accessToken, route.params.surveyId)

  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    navigation.push("communitySurvey", { surveyId })
  })

  const largeTitle = usesNativeLargeTitle()
  const siteName = state.detail ? state.detail.site_name.trim() || fr.common.untitledSurvey : null
  useLayoutEffect(() => {
    if (largeTitle && siteName !== null) navigation.setOptions({ title: siteName })
  }, [largeTitle, navigation, siteName])

  return (
    <ScreenFrame largeTitle={largeTitle}>
      <CommunitySurveyScreen
        apiUrl={session.apiUrl}
        accessToken={accessToken}
        state={state}
        onOpenSurvey={onOpenSurvey}
      />
    </ScreenFrame>
  )
})
