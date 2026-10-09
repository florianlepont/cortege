import { useEffect, useMemo } from "react"
import { RefreshControl, ScrollView, StyleSheet } from "react-native"
import { brandDefaultFontFamily, brandTypeScale } from "../app/brand-tokens"
import { type BrandTheme, useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppText as Text } from "../ui/AppText"
import { EntranceView } from "../ui/EntranceView"
import { useFrameInsetBehavior } from "../ui/frame-large-title"
import { PageTitle } from "../ui/PageTitle"
import { EventsTab } from "./survey-detail/EventsTab"
import { type SurveyJournalScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { useSubPageContentStyle } from "./survey-detail/useSubPageContent"

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    subtitle: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
  })
}

/**
 * "Journal du relevé" (D-11): the change log of this survey (created, synced, photos) as a
 * timeline. Reached from the summary's "..." menu (D-02), own surveys only (the events endpoint
 * refuses another member's survey). Pull to refresh reloads it; there is no reload button.
 */
export function SurveyJournalScreen({
  selectedSurvey,
  surveyEvents,
  eventsLoadingSurveyId,
  onLoadSurveyEvents,
}: SurveyJournalScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const ownStyles = useMemo(() => createStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  // 12.2-17: iOS insets the page under the native large title (PageTitle then draws nothing).
  const insetBehavior = useFrameInsetBehavior()
  const isLoading = eventsLoadingSurveyId === selectedSurvey.id

  useEffect(() => {
    void onLoadSurveyEvents(selectedSurvey.id)
    // Load once per survey: the pull to refresh reloads on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurvey.id])

  return (
    <ScrollView
      // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19).
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => void onLoadSurveyEvents(selectedSurvey.id)}
          tintColor={theme.colors.forest}
        />
      }
    >
      <PageTitle>{fr.navigation.headers.surveyJournal}</PageTitle>
      <Text style={ownStyles.subtitle}>{fr.surveyDetail.journal.subtitle}</Text>
      <EntranceView index={0}>
        <EventsTab
          hideHeader
          events={surveyEvents[selectedSurvey.id] ?? []}
          isLoading={isLoading}
        />
      </EntranceView>
    </ScrollView>
  )
}
