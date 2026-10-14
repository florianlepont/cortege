import { useCallback, useMemo } from "react"
import { View } from "react-native"
import { useSurveyRoute } from "../hooks/useSurveyRoute"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppGroupedList } from "../ui/AppGroupedList"
import { AppText as Text } from "../ui/AppText"
import { useFrameInsetBehavior } from "../ui/frame-large-title"
import { PageTitle } from "../ui/PageTitle"
import { TitledScrollView } from "../ui/TitledScrollView"
import { GlassIconButton } from "./public-map/GlassIconButton"
import { ParcelMapCard } from "./survey-detail/ParcelMapCard"
import { type SurveyParcelsScreenProps } from "./survey-detail/screen-props"
import { RouteSection } from "./survey-detail/route/RouteSection"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { SurveyOfflineMapRow } from "./survey-detail/SurveyOfflineMapRow"
import { useLocalParcelGeometry } from "./survey-detail/useLocalParcelGeometry"
import { useSubPageContentStyle } from "./survey-detail/useSubPageContent"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"

const t = fr.surveyDetail.parcelsScreen
const a11y = fr.surveyDetail.a11y

/**
 * "Parcelles et parcours" (OA-46, D-32): the survey's parcels on a large map with the editing
 * button on the map itself (OA-44), the list of parcels, the "Parcours utilisé" card (phase 30,
 * D-09: the recorded route as text, with the link to change it or to choose it on the observer's
 * own draft; moved here from "Contexte" on 2026-10-14), then the offline map row (is the map
 * around the survey on the phone, and a way to fetch it). The method, the station context and the
 * weather are the "Contexte" page.
 */
export function SurveyParcelsScreen({
  apiUrl,
  accessToken,
  selectedSurvey,
  surveyDetails,
  detailsLoadingSurveyId,
  onOpenParcels,
  onEditRoute,
}: SurveyParcelsScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  // 12.2-17: iOS insets the page under the native large title (PageTitle then draws nothing).
  const insetBehavior = useFrameInsetBehavior()
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)
  const { detail, canEditSurvey, activeSiteName, parcelIds } = data
  const surveyId = selectedSurvey.id
  const surveyRoute = useSurveyRoute(selectedSurvey)
  const editRoute = useCallback(() => onEditRoute(surveyId), [onEditRoute, surveyId])
  // A draft that never synced has no server position (D-36): the offline map row follows the
  // parcels' own position, like the map above it.
  const local = useLocalParcelGeometry(selectedSurvey.id, parcelIds, selectedSurvey.updated_at)
  const offlineLocation = useMemo(() => {
    if (detail?.display_location) return detail.display_location
    if (local.point) return local.point
    if (!local.bounds) return undefined
    return {
      lat: (local.bounds.south + local.bounds.north) / 2,
      lng: (local.bounds.west + local.bounds.east) / 2,
    }
  }, [detail?.display_location, local])

  const parcelSections = useMemo(
    () =>
      parcelIds.length > 0
        ? [
            {
              key: "parcels",
              title: t.parcelsHeading(parcelIds.length),
              rows: parcelIds.map((parcelId, index) => ({
                key: parcelId,
                label: t.parcelLabel(index + 1),
                value: parcelId,
              })),
            },
          ]
        : [],
    [parcelIds],
  )

  return (
    <TitledScrollView
      collapsingTitle={fr.navigation.headers.surveyParcelsPage}
      // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19).
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
    >
      <PageTitle>{fr.navigation.headers.surveyParcelsPage}</PageTitle>
      <ParcelMapCard
        apiUrl={apiUrl}
        accessToken={accessToken}
        siteName={activeSiteName}
        displayLocation={detail?.display_location}
        parcelIds={parcelIds}
        surveyId={selectedSurvey.id}
        refreshKey={selectedSurvey.updated_at}
        style={styles.mapTall}
      >
        {canEditSurvey ? (
          <GlassIconButton
            variant="map-pill"
            icon="pencil-outline"
            label={t.editParcels}
            accessibilityLabel={a11y.editParcels(activeSiteName)}
            onPress={() => void onOpenParcels(selectedSurvey.id)}
          />
        ) : null}
      </ParcelMapCard>

      {parcelSections.length > 0 ? (
        <AppGroupedList sections={parcelSections} />
      ) : (
        <View style={styles.section}>
          <Text style={styles.photoEmpty}>{t.noParcel}</Text>
        </View>
      )}

      <RouteSection
        route={surveyRoute.route}
        loaded={surveyRoute.loaded}
        status={canEditSurvey ? "draft" : "readonly"}
        editable={canEditSurvey}
        variant="detail"
        onEdit={editRoute}
      />

      <SurveyOfflineMapRow
        apiUrl={apiUrl}
        accessToken={accessToken}
        siteName={activeSiteName}
        displayLocation={offlineLocation}
      />
    </TitledScrollView>
  )
}
