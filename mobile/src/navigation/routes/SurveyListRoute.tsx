import { memo, useEffect, useLayoutEffect, useRef } from "react"
import { Platform, Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { SearchBarCommands } from "react-native-screens"
import { brandColors } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { SurveyListScreen } from "../../screens/SurveyListScreen"
import { useSurveys } from "../../state/surveys-context"
import { useSyncActions } from "../../state/sync-actions-context"
import { useSyncStatus } from "../../state/sync-status-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { SyncStatusPill } from "../../ui/SyncStatusPill"
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
  const { isOnline, isSyncing } = useSyncStatus()

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
  const onOpenSyncStatus = useLatestCallback(() => {
    navigation.navigate("account", { screen: "settings" })
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
        tintColor: brandColors.forest,
        onChangeText: (event) => {
          actions.setSurveyQuery(event.nativeEvent.text)
        },
        onCancelButtonPress: () => {
          actions.setSurveyQuery("")
        },
      },
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <SyncStatusPill
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={state.surveyStats.pending}
            onPress={onOpenSyncStatus}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fr.surveyList.a11y.createSurvey}
            hitSlop={8}
            onPress={onOpenCreateSurvey}
            style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="add-circle" size={26} color={brandColors.forest} />
          </Pressable>
        </View>
      ),
    })
  }, [
    actions,
    isOnline,
    isSyncing,
    nativeSearchEnabled,
    navigation,
    onOpenCreateSurvey,
    onOpenSyncStatus,
    state.surveyStats.pending,
  ])

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
      isOnline={isOnline}
      isSyncing={isSyncing}
      onOpenSyncStatus={onOpenSyncStatus}
    />
  )
})
