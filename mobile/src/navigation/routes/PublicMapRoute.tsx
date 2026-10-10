import { memo, useCallback, useContext, useEffect, useMemo, useRef } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useBasemapPreference } from "../../hooks/useBasemapPreference"
import { useIsOffline } from "../../hooks/useIsOffline"
import { useOfflinePendingParcelDrain } from "../../hooks/useOfflinePendingParcelDrain"
import { useLocalSurveyMapData } from "../../hooks/useLocalSurveyMapData"
import { ownSurveyMapItems } from "../../map/own-surveys"
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

  // OA-59 and phase 29 D-01, D-09: the author's own surveys are drawn beside the public ones, from
  // the local rows and the parcels of the downloaded areas. An id the API already returned is drawn
  // once (the API copy wins); drafts keep the dashed marker, submitted surveys a normal one.
  const localMap = useLocalSurveyMapData(surveys.surveys, isOffline)
  const publishedIds = useMemo(
    () => new Set(explorer.items.map((item) => item.survey_id)),
    [explorer.items],
  )
  const ownMap = useMemo(
    () =>
      ownSurveyMapItems({
        sources: localMap.sources,
        parcels: localMap.parcels,
        surveyDetails: surveys.surveyDetails,
        publishedIds,
      }),
    [localMap, surveys.surveyDetails, publishedIds],
  )
  const localIds = useMemo(
    () => new Set(surveys.surveys.map((survey) => survey.id)),
    [surveys.surveys],
  )
  const handleOpenSurvey = useLatestCallback((surveyId: string) => {
    if (localIds.has(surveyId)) {
      // A survey the phone holds opens as the owner's own survey, never the community page: a draft
      // has none, and offline an own marker must not reach it.
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
        draftItems={ownMap.drafts}
        ownItems={ownMap.own}
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
