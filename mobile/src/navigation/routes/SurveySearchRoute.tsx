import { memo, useState } from "react"
import { useNavigation } from "@react-navigation/native"
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"
import {
  SurveySearchScreen,
  type SearchScope,
} from "../../screens/survey-search/SurveySearchScreen"
import { useCommunitySurveys } from "../../hooks/useCommunitySurveys"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { RootTabParamList } from "../types"

/**
 * The search page (OA-52): the user's own surveys through the shared list filters, and the
 * community through the API. Used by the iOS search tab and, pushed from Mes Relevés, by the
 * other platforms; it reads its navigation from the hook so both mount it unchanged.
 */
export const SurveySearchRoute = memo(function SurveySearchRoute() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>()
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state, actions } = useSurveys()
  const [scope, setScope] = useState<SearchScope>("mine")
  const community = useCommunitySurveys({
    apiUrl: session.apiUrl,
    accessToken,
    query: state.surveyQuery,
    active: scope === "community",
  })

  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    actions.openSurvey(surveyId)
    navigation.navigate("surveys", { screen: "surveyDetail", initial: false })
  })
  const onOpenCommunitySurvey = useLatestCallback((surveyId: string) => {
    navigation.navigate("surveys", {
      screen: "communitySurvey",
      params: { surveyId },
      initial: false,
    })
  })
  const onCancel = useLatestCallback(() => {
    actions.resetFilters()
    setScope("mine")
    // Pushed from Mes Relevés: back. The iOS search tab has nothing to go back to: return to Mes Relevés.
    if (navigation.canGoBack()) navigation.goBack()
    else navigation.navigate("surveys")
  })

  return (
    <SurveySearchScreen
      query={state.surveyQuery}
      onQueryChange={actions.setSurveyQuery}
      scope={scope}
      onScopeChange={setScope}
      statusFilter={state.statusFilter}
      onStatusFilterChange={actions.setStatusFilter}
      attachmentFilter={state.attachmentFilter}
      onAttachmentFilterChange={actions.setAttachmentFilter}
      sortMode={state.sortMode}
      onSortModeChange={actions.setSortMode}
      surveys={state.visibleSurveys}
      surveyDetails={state.surveyDetails}
      selectedSurveyId={state.selectedSurveyId}
      community={community}
      onOpenSurvey={onOpenSurvey}
      onOpenCommunitySurvey={onOpenCommunitySurvey}
      onDeleteSurvey={actions.confirmDeleteSurvey}
      onCancel={onCancel}
    />
  )
})
