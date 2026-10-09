import { memo } from "react"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { CommunityHistoryScreen } from "../../screens/community-survey/CommunityHistoryScreen"
import { useCommunitySurvey } from "../../hooks/useCommunitySurvey"
import { useAccessToken, useSession } from "../../state/session-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { usesNativeLargeTitle } from "../large-title"
import type { CommunityHistoryRouteProps } from "../types"
import { ScreenFrame } from "../../ui/ScreenFrame"

/**
 * The parcel history of a finished survey of another member (OA-115, D-03), opened from the
 * "Historique de la parcelle" row of its page. Mounted by the survey stack and by the Explorer
 * stack, like `communitySurvey`. It reads the survey for its `history` only, so it loads it without
 * its photos, and it reaches nothing of the change log: no header items, no events.
 */
export const CommunityHistoryRoute = memo(function CommunityHistoryRoute({
  route,
}: CommunityHistoryRouteProps) {
  // Whichever stack mounts it registers the same screen names, so the push stays in that stack.
  const navigation = useNavigation<
    NativeStackNavigationProp<{
      communitySurvey: { surveyId: string }
      communityHistory: { surveyId: string }
    }>
  >()
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const state = useCommunitySurvey(session.apiUrl, accessToken, route.params.surveyId, {
    withPhotos: false,
  })

  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    navigation.push("communitySurvey", { surveyId })
  })

  return (
    <ScreenFrame largeTitle={usesNativeLargeTitle()}>
      <CommunityHistoryScreen state={state} onOpenSurvey={onOpenSurvey} />
    </ScreenFrame>
  )
})
