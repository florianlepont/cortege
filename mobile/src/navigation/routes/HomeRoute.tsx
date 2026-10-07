import { memo, useLayoutEffect, useMemo } from "react"
import type { CnpfFactorAGenusCode } from "@cortege/ibp-domain"
import { fr } from "../../i18n"
import { getNativeTabsAvailability } from "../native-tabs-availability"
import { HomeScreen } from "../../screens/HomeScreen"
import { getFirstName } from "../../screens/home/first-name"
import { ProfileHeaderButton } from "../../screens/home/ProfileHeaderButton"
import { resolveProfilePictureUri } from "../../screens/account/IdentityCard"
import { useBrandTheme } from "../../app/theme"
import { iconHeaderButton, titleHeaderItems } from "../header-items"
import { backdropHeader } from "../stacks/stack-options"
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
 * context's `isOnline`/`isSyncing` booleans, for the dashboard's `SyncStatusLine`.
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
  // OA-107: the photo tool's "commencer un relevé avec ce genre".
  const onCreateSurveyWithGenus = useLatestCallback((genus: CnpfFactorAGenusCode) => {
    actions.openCreateSurvey({ genus })
    navigation.navigate("surveys", { screen: "surveyForm", initial: false })
  })
  const onOpenSurvey = useLatestCallback((surveyId: string) => {
    actions.openSurvey(surveyId)
    navigation.navigate("surveys", { screen: "surveyDetail", initial: false })
  })
  // D-20c: "Tout voir" of the recent surveys goes to the list itself, not to a survey page the
  // Mes Relevés stack may still be showing. No `initial: false`: the list is the stack's first
  // screen, so it would be pushed a second time on top of itself.
  const onOpenSurveyList = useLatestCallback(() => {
    navigation.navigate("surveys", { screen: "surveysHome" })
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

  // OA-85: on the native iOS tab tree the greeting and the profile button live in the native
  // header, on the same row as Mes Relevés' title and "+". Elsewhere HomeScreen draws its own.
  const nativeHeader = useMemo(() => getNativeTabsAvailability().native, [])
  const firstName = getFirstName(session.currentUser)
  const pictureUri = resolveProfilePictureUri(
    session.currentUser?.profile_picture_url,
    session.apiUrl,
  )
  const theme = useBrandTheme()
  useLayoutEffect(() => {
    if (!nativeHeader) return
    navigation.setOptions({
      headerShown: true,
      title: "",
      // 12.2-10: transparent, so the backdrop halo of the screen runs on behind the header.
      ...backdropHeader,
      unstable_headerLeftItems: () =>
        titleHeaderItems(
          firstName ? fr.home.greetingWithName({ name: firstName }) : fr.home.greeting,
        ),
      unstable_headerRightItems: () => [
        pictureUri
          ? {
              type: "custom" as const,
              element: (
                <ProfileHeaderButton
                  pictureUri={pictureUri}
                  accessToken={accessToken}
                  onPress={onNavigateToAccount}
                />
              ),
            }
          : iconHeaderButton({
              label: fr.home.avatar,
              sfSymbol: "person.crop.circle",
              tintColor: theme.semanticColors.accent,
              onPress: onNavigateToAccount,
            }),
      ],
    })
  }, [nativeHeader, navigation, firstName, pictureUri, accessToken, onNavigateToAccount, theme])

  return (
    <HomeScreen
      nativeHeader={nativeHeader}
      currentUser={session.currentUser}
      accessToken={accessToken}
      apiUrl={session.apiUrl}
      surveys={surveys.surveys}
      surveyDetails={surveys.surveyDetails}
      surveyStats={surveys.surveyStats}
      isOnline={isOnline}
      isSyncing={isSyncing}
      nearbyParcels={nearbyParcels.state}
      onLoadNearbyParcels={nearbyParcels.load}
      onCreateSurvey={onCreateSurvey}
      onCreateSurveyWithGenus={onCreateSurveyWithGenus}
      onAddGenusToSurvey={actions.addGenusToSurvey}
      onOpenSurvey={onOpenSurvey}
      onRetrySurvey={actions.retrySurvey}
      onOpenSyncStatus={onOpenSyncStatus}
      onOpenSurveyList={onOpenSurveyList}
      onNavigateToExplorer={onNavigateToExplorer}
      onNavigateToAccount={onNavigateToAccount}
      onRefresh={syncActions.handlePullChanges}
    />
  )
})
