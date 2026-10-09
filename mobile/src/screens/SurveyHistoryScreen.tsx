import { useMemo } from "react"
import { RefreshControl, StyleSheet, View } from "react-native"
import {
  brandDefaultFontFamily,
  brandRadius,
  brandSpacing4,
  brandTypeScale,
} from "../app/brand-tokens"
import { buildEntriesFromOwn } from "../app/parcel-history"
import { type BrandTheme, useBrandTheme } from "../app/theme"
import { useIsOffline } from "../hooks/useIsOffline"
import { useParcelSurveyHistory } from "../hooks/useParcelSurveyHistory"
import { fr } from "../i18n"
import { AppNotice } from "../ui/AppNotice"
import { AppText as Text } from "../ui/AppText"
import { useFrameInsetBehavior } from "../ui/frame-large-title"
import { PageTitle } from "../ui/PageTitle"
import { SkeletonRow } from "../ui/Skeleton"
import { ParcelHistoryView } from "./survey-detail/ParcelHistoryView"
import { type SurveyHistoryScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { useSubPageContentStyle } from "./survey-detail/useSubPageContent"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"
import { TitledScrollView } from "../ui/TitledScrollView"

const page = fr.parcelHistory.page

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    subtitle: {
      ...brandTypeScale.footnote,
      fontFamily: brandDefaultFontFamily,
      color: theme.colors.textSecondary,
    },
    // Glass recipe of the cards of the app, three placeholder rows inside.
    skeletonCard: {
      gap: brandSpacing4.md,
      padding: brandSpacing4.md,
      borderRadius: brandRadius.card,
      borderWidth: 1,
      borderColor: theme.visual.glass.cardBorder,
      backgroundColor: theme.visual.glass.cardFill,
    },
  })
}

/**
 * "Historique de la parcelle" (D-06 to D-10): the trend of the totals, the change per factor since
 * the survey just before, and the list of the surveys of this parcel. The change log of the survey
 * moved to `SurveyJournalScreen` (D-02). One state block at a time: no parcel, offline, error with
 * a reload action, first load (skeleton), or the loaded view. Pull to refresh reloads while the
 * previous content stays.
 */
export function SurveyHistoryScreen({
  apiUrl,
  accessToken,
  selectedSurvey,
  surveyDetails,
  detailsLoadingSurveyId,
  onOpenSurvey,
}: SurveyHistoryScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const ownStyles = useMemo(() => createStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  // 12.2-17: iOS insets the page under the native large title (PageTitle then draws nothing).
  const insetBehavior = useFrameInsetBehavior()
  const { parcelIds } = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)
  const parcelId = parcelIds[0] ?? null
  const isOffline = useIsOffline()
  const history = useParcelSurveyHistory(
    apiUrl,
    accessToken,
    parcelId,
    isOffline,
    selectedSurvey.status,
  )
  const entries = useMemo(
    () => buildEntriesFromOwn(history.items, selectedSurvey.id),
    [history.items, selectedSurvey.id],
  )
  const hasItems = history.items.length > 0

  let body
  if (parcelId === null) {
    body = <AppNotice tone="info" message={page.noParcel} />
  } else if (isOffline || history.offline) {
    body = <AppNotice tone="warning" message={page.offline} />
  } else if (history.error) {
    body = (
      <AppNotice
        tone="danger"
        message={fr.parcelHistory.loadFailed}
        action={{ label: page.reload, onPress: history.reload }}
      />
    )
  } else if ((history.loading && !hasItems) || accessToken === null) {
    // A missing token is a first load too: it never reads as "first survey of the parcel".
    body = (
      <View
        style={ownStyles.skeletonCard}
        accessible
        accessibilityLabel={fr.parcelHistory.loading}
        accessibilityLiveRegion="polite"
      >
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </View>
    )
  } else {
    body = <ParcelHistoryView entries={entries} variant="own" onOpenSurvey={onOpenSurvey} />
  }

  return (
    <TitledScrollView
      collapsingTitle={fr.navigation.headers.surveyHistory}
      // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19).
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
      refreshControl={
        <RefreshControl
          refreshing={history.loading && hasItems}
          onRefresh={history.reload}
          tintColor={theme.colors.forest}
        />
      }
    >
      <PageTitle>{fr.navigation.headers.surveyHistory}</PageTitle>
      <Text style={ownStyles.subtitle}>{page.subtitle}</Text>
      {body}
    </TitledScrollView>
  )
}
