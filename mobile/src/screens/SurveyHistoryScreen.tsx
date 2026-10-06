import { useEffect, useMemo } from "react"
import { Platform, RefreshControl, ScrollView } from "react-native"
import { useHeaderHeight } from "@react-navigation/elements"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { PageTitle } from "../ui/PageTitle"
import { EventsTab } from "./survey-detail/EventsTab"
import { HistorySection } from "./survey-detail/HistorySection"
import { type SurveyHistoryScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"

/**
 * "Historique": the steps of this survey (created, synced, photos) as a timeline, and the earlier
 * surveys of its parcel with the change since the latest. Pull to refresh reloads the steps.
 */
export function SurveyHistoryScreen({
  apiUrl,
  accessToken,
  selectedSurvey,
  surveyDetails,
  detailsLoadingSurveyId,
  surveyEvents,
  eventsLoadingSurveyId,
  onLoadSurveyEvents,
}: SurveyHistoryScreenProps) {
  const theme = useBrandTheme()
  const headerHeight = useHeaderHeight()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const { detail, parcelIds } = useSurveyDetailData(
    selectedSurvey,
    surveyDetails,
    detailsLoadingSurveyId,
  )
  const isLoading = eventsLoadingSurveyId === selectedSurvey.id

  useEffect(() => {
    void onLoadSurveyEvents(selectedSurvey.id)
    // Load once per survey: the pull to refresh reloads on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurvey.id])

  return (
    <ScrollView
      style={[styles.scroll, Platform.OS === "ios" ? { marginTop: headerHeight } : null]}
      contentContainerStyle={styles.subContent}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => void onLoadSurveyEvents(selectedSurvey.id)}
          tintColor={theme.colors.forest}
        />
      }
    >
      <PageTitle>{fr.navigation.headers.surveyHistory}</PageTitle>
      <EventsTab events={surveyEvents[selectedSurvey.id] ?? []} isLoading={isLoading} />
      <HistorySection
        apiUrl={apiUrl}
        accessToken={accessToken}
        parcelId={parcelIds[0] ?? null}
        currentSurveyId={selectedSurvey.id}
        currentScores={detail?.scores ?? null}
        currentFactorResults={detail?.factor_results ?? null}
      />
    </ScrollView>
  )
}
