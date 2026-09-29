import { memo, useEffect, useLayoutEffect, useRef } from "react"
import { Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { SearchBarCommands } from "react-native-screens"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { SurveyListScreen } from "../../screens/SurveyListScreen"
import { HeaderCircleButton } from "../../ui/HeaderCircleButton"
import { HeaderLeftTitle } from "../../ui/HeaderLeftTitle"
import { useSurveys } from "../../state/surveys-context"
import { useSyncActions } from "../../state/sync-actions-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { useSurveysStackConfig } from "../stacks/surveys-stack-config"
import type { SurveyListRouteProps } from "../types"

/**
 * Survey list route (phase 01.9-18, D-01): the surveys context and the sync
 * actions. It also owns the native header search bar (options and text sync),
 * so the surveys stack navigator does not subscribe to the surveys context.
 * The native-nav boolean is static navigator configuration read from
 * SurveysStackConfigContext, not data.
 *
 * Search (01.9-25, D-08): in the native iOS tree, Mes Relevés carries the
 * native header search bar (placement "automatic": a visible field under the
 * title, kept on scroll); on Android and in the JS fallback the list keeps its
 * inline search. The list is always the filtered one.
 *
 * HOME-01/SYNC-02 (phase 7): the native header also carries the "+" create action and the
 * SyncStatusPill (headerRight); the JS/Android path renders both inside ListHero instead.
 */
export const SurveyListRoute = memo(function SurveyListRoute({ navigation }: SurveyListRouteProps) {
  const { useNativeNav } = useSurveysStackConfig()
  const { state, actions } = useSurveys()
  const syncActions = useSyncActions()
  const theme = useBrandTheme()

  const nativeSearchEnabled = useNativeNav && Platform.OS === "ios"
  const searchBarRef = useRef<SearchBarCommands>(null!)

  const onOpenCreateSurvey = useLatestCallback(() => {
    actions.openCreateSurvey()
    navigation.navigate("surveyForm")
  })
  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    actions.openSurvey(surveyId)
    navigation.navigate("surveyDetail")
  })

  useLayoutEffect(() => {
    if (!nativeSearchEnabled) return
    navigation.setOptions({
      headerSearchBarOptions: {
        ref: searchBarRef,
        placeholder: fr.navigation.search.placeholder,
        placement: "automatic",
        hideWhenScrolling: false,
        obscureBackground: false,
        autoCapitalize: "none",
        tintColor: theme.semanticColors.accent,
        onChangeText: (event) => {
          actions.setSurveyQuery(event.nativeEvent.text)
        },
        onCancelButtonPress: () => {
          actions.setSurveyQuery("")
        },
      },
      // OA-85: the title sits left and the "+" right, on one row shared with Accueil.
      headerTitle: "",
      headerLeft: () => <HeaderLeftTitle title={fr.navigation.headers.surveys} />,
      // OA-85: the same glass circle as Accueil's profile button, so both sit at the same place.
      headerRight: () => (
        <HeaderCircleButton label={fr.surveyList.a11y.createSurvey} onPress={onOpenCreateSurvey}>
          <Ionicons name="add" size={24} color={theme.semanticColors.accent} />
        </HeaderCircleButton>
      ),
    })
  }, [actions, nativeSearchEnabled, navigation, onOpenCreateSurvey, theme])

  useEffect(() => {
    if (!nativeSearchEnabled) return
    if (state.surveyQuery.trim().length === 0) {
      searchBarRef.current?.clearText()
      return
    }

    searchBarRef.current?.setText(state.surveyQuery)
  }, [nativeSearchEnabled, state.surveyQuery])

  return (
    <SurveyListScreen
      surveys={state.surveys}
      visibleSurveys={state.visibleSurveys}
      selectedSurveyId={state.selectedSurveyId}
      attachmentsBySurvey={state.attachmentsBySurvey}
      surveyDetails={state.surveyDetails}
      surveyQuery={state.surveyQuery}
      setSurveyQuery={actions.setSurveyQuery}
      surveyFromDate={state.surveyFromDate}
      setSurveyFromDate={actions.setSurveyFromDate}
      surveyToDate={state.surveyToDate}
      setSurveyToDate={actions.setSurveyToDate}
      statusFilter={state.statusFilter}
      setStatusFilter={actions.setStatusFilter}
      visibilityFilter={state.visibilityFilter}
      setVisibilityFilter={actions.setVisibilityFilter}
      syncFilter={state.syncFilter}
      setSyncFilter={actions.setSyncFilter}
      blockedFilter={state.blockedFilter}
      setBlockedFilter={actions.setBlockedFilter}
      attachmentFilter={state.attachmentFilter}
      setAttachmentFilter={actions.setAttachmentFilter}
      sortMode={state.sortMode}
      setSortMode={actions.setSortMode}
      resetFilters={actions.resetFilters}
      useNativeSearchUI={nativeSearchEnabled}
      showInlineSearch={!nativeSearchEnabled}
      onRefresh={syncActions.handlePullChanges}
      onDeleteSurvey={actions.confirmDeleteSurvey}
      onOpenCreateSurvey={onOpenCreateSurvey}
      onOpenSurvey={onOpenSurvey}
      onEnsureAttachmentPreviews={syncActions.handleEnsureAttachmentPreviews}
    />
  )
})
