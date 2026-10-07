import { useMemo } from "react"
import { Platform, ScrollView, View } from "react-native"
import { useHeaderHeight } from "@react-navigation/elements"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppGroupedList } from "../ui/AppGroupedList"
import { AppText as Text } from "../ui/AppText"
import { PageTitle } from "../ui/PageTitle"
import { MapActionPill } from "./public-map/MapChips"
import { ParcelMapCard } from "./survey-detail/ParcelMapCard"
import { ScoringContextEditor } from "./survey-detail/ScoringContextEditor"
import { type SurveyContextScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"

const t = fr.surveyDetail.contextScreen
const a11y = fr.surveyDetail.a11y

/**
 * "Contexte et parcelles" (OA-46): the survey's parcels on a large map with the editing button on
 * the map itself (OA-44), the list of parcels, then the method and the station context.
 */
export function SurveyContextScreen({
  apiUrl,
  accessToken,
  selectedSurvey,
  surveyDetails,
  detailsLoadingSurveyId,
  onOpenParcels,
  onUpdateRegionVersion,
  onUpdateVegetationStage,
  onUpdateIbpCas,
  onUpdateCas3Scale,
  onSwitchToV32,
}: SurveyContextScreenProps) {
  const theme = useBrandTheme()
  const headerHeight = useHeaderHeight()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)
  const { detail, canEditSurvey, activeSiteName, parcelIds } = data

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
    <ScrollView
      style={[styles.scroll, Platform.OS === "ios" ? { marginTop: headerHeight } : null]}
      contentContainerStyle={styles.subContent}
    >
      <PageTitle>{fr.navigation.headers.surveyContext}</PageTitle>
      <ParcelMapCard
        apiUrl={apiUrl}
        accessToken={accessToken}
        siteName={activeSiteName}
        displayLocation={detail?.display_location}
        parcelIds={parcelIds}
        surveyId={selectedSurvey.id}
        style={styles.mapTall}
      >
        {canEditSurvey ? (
          <MapActionPill
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

      <ScoringContextEditor
        surveyId={selectedSurvey.id}
        canEditSurvey={canEditSurvey}
        scoringContext={data.scoringContext}
        activeRegion={data.activeRegion}
        activeVegetationStage={data.activeVegetationStage}
        onUpdateRegionVersion={onUpdateRegionVersion}
        onUpdateVegetationStage={onUpdateVegetationStage}
        onUpdateIbpCas={onUpdateIbpCas}
        onUpdateCas3Scale={onUpdateCas3Scale}
        onSwitchToV32={onSwitchToV32}
      />
    </ScrollView>
  )
}
