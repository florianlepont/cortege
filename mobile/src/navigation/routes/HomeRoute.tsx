import { memo } from "react"
import { HomeScreen } from "../../screens/HomeScreen"
import { useNearbyParcelsState } from "../../state/nearby-parcels-context"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveys } from "../../state/surveys-context"
import { useSyncActions } from "../../state/sync-actions-context"
import { useSyncStatus } from "../../state/sync-status-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { HomeRouteProps } from "../types"

/**
 * Home route (phase 01.9-18, D-01): the signed-in user, the local surveys and
 * the nearby parcels. Phase 7 (SYNC-02) also reads the narrow sync-status
 * context's `isOnline`/`isSyncing` booleans, for the dashboard's `SyncStatusPill`.
 */
export const HomeRoute = memo(function HomeRoute({ navigation }: HomeRouteProps) {
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state: surveys, actions } = useSurveys()
  const nearbyParcels = useNearbyParcelsState()
  const syncActions = useSyncActions()
  const { isOnline, isSyncing } = useSyncStatus()

  const onCreateSurvey = useLatestCallback(() => {
    actions.openCreateSurvey()
    navigation.navigate("surveys", { screen: "surveyForm", initial: false })
  })
  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    actions.openSurvey(surveyId)
    navigation.navigate("surveys", { screen: "surveyDetail", initial: false })
  })
  const onNavigateToExplorer = useLatestCallback(() => {
    navigation.navigate("publicMap")
  })
  const onOpenSyncStatus = useLatestCallback(() => {
    navigation.navigate("settings")
  })
  // HOME-06: the avatar navigates to Compte.
  const onNavigateToAccount = useLatestCallback(() => {
    navigation.navigate("accountHome")
  })

  return (
    <HomeScreen
      currentUser={session.currentUser}
      accessToken={accessToken}
      apiUrl={session.apiUrl}
      surveys={surveys.surveys}
      surveyStats={surveys.surveyStats}
      isOnline={isOnline}
      isSyncing={isSyncing}
      nearbyParcels={nearbyParcels.state}
      onLoadNearbyParcels={nearbyParcels.load}
      onCreateSurvey={onCreateSurvey}
      onOpenSurvey={onOpenSurvey}
      onRetrySurvey={actions.retrySurvey}
      onOpenSyncStatus={onOpenSyncStatus}
      onNavigateToExplorer={onNavigateToExplorer}
      onNavigateToAccount={onNavigateToAccount}
      onRefresh={syncActions.handlePullChanges}
    />
  )
})
