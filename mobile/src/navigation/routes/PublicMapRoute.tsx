import { memo, useCallback, useContext, useEffect, useMemo, useRef } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useBasemapPreference } from "../../hooks/useBasemapPreference"
import { useIsOffline } from "../../hooks/useIsOffline"
import { useOfflinePendingParcelDrain } from "../../hooks/useOfflinePendingParcelDrain"
import { ownDraftMapItems } from "../../map/own-drafts"
import { usePublicMapExplorer } from "../../hooks/usePublicMapExplorer"
import { PublicMapScreen } from "../../screens/PublicMapScreen"
import { useAccessToken, useSession } from "../../state/session-context"
import { useSurveyActions, useSurveys } from "../../state/surveys-context"
import { useSyncActions } from "../../state/sync-actions-context"
import { useLatestCallback } from "../../state/useLatestCallback"
import { PublicMapReloadContext } from "../public-map-reload"
import { styles } from "../styles"
import type { PublicMapRouteProps } from "../types"

/**
 * Public map route (phase 01.9-18, D-01). The map explorer state lives here,
 * not in the navigation tree: the map items, filters and loading flags only
 * re-render this screen. An Explorer tab press reloads the map through the
 * reload signal (see public-map-reload.ts).
 *
 * The map loads by viewport (01.9-28, D-05). A tab press forces a reload of the
 * last viewport bbox the screen reported. The press that mounted the route is
 * served by the screen's own first viewport load, so it is not forced (the
 * explorer skips the identical request instead of sending it twice).
 */
export const PublicMapRoute = memo(function PublicMapRoute({
  navigation,
  route,
}: PublicMapRouteProps) {
  const insets = useSafeAreaInsets()
  const { state: session } = useSession()
  const accessToken = useAccessToken()
  const { state: surveys } = useSurveys()
  const surveyActions = useSurveyActions()
  const syncActions = useSyncActions()
  const reloadSignal = useContext(PublicMapReloadContext)

  const isOffline = useIsOffline()
  const { basemap, setBasemap } = useBasemapPreference()
  useOfflinePendingParcelDrain(session.apiUrl, accessToken, isOffline)

  const explorer = usePublicMapExplorer({
    apiUrl: session.apiUrl,
    accessToken,
    isOffline,
    onStatusChange: syncActions.setStatus,
  })

  // OA-59: the author's drafts are drawn beside the public surveys, from the details the phone has.
  const draftItems = useMemo(
    () => ownDraftMapItems(surveys.surveyDetails, new Set(explorer.items.map((i) => i.survey_id))),
    [surveys.surveyDetails, explorer.items],
  )
  const handleOpenSurvey = useLatestCallback((surveyId: string) => {
    if (draftItems.some((item) => item.survey_id === surveyId)) {
      // A draft has no community page: it opens as the author's own survey.
      surveyActions.openSurvey(surveyId)
      navigation.navigate("surveys", { screen: "surveyDetail" })
      return
    }
    navigation.navigate("communitySurvey", { surveyId })
  })

  const viewportBboxRef = useRef<string | undefined>(undefined)
  const handleViewportBboxChange = useCallback((bbox: string) => {
    viewportBboxRef.current = bbox
  }, [])

  const reload = useLatestCallback((force: boolean) => {
    void explorer.loadPublicMap({ bbox: viewportBboxRef.current, force })
  })

  useEffect(() => {
    if (!reloadSignal) return undefined
    // A press made before the route existed is delivered inside subscribe().
    let pendingFromBeforeMount = true
    const unsubscribe = reloadSignal.subscribe(() => reload(!pendingFromBeforeMount))
    pendingFromBeforeMount = false
    return unsubscribe
  }, [reload, reloadSignal])

  return (
    <View style={[styles.tabScreenContainer, { marginTop: -insets.top }]}>
      <PublicMapScreen
        apiUrl={session.apiUrl}
        accessToken={accessToken}
        items={explorer.items}
        parcelStatuses={explorer.parcelStatuses}
        draftItems={draftItems}
        focus={route.params?.focus}
        loading={explorer.loading}
        onLoad={explorer.loadPublicMap}
        onLoadParcels={explorer.loadPublicParcels}
        onViewportBboxChange={handleViewportBboxChange}
        isOffline={isOffline}
        basemap={basemap}
        onChangeBasemap={setBasemap}
        onOpenSurvey={handleOpenSurvey}
      />
    </View>
  )
})
