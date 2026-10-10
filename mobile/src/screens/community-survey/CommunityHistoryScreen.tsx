import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { brandDefaultFontFamily, brandTypeScale } from "../../app/brand-tokens"
import { buildEntriesFromCommunity } from "../../app/parcel-history"
import { type BrandTheme, useBrandTheme } from "../../app/theme"
import type { CommunitySurveyState } from "../../hooks/useCommunitySurvey"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { CenteredState } from "../../ui/CenteredState"
import { useFrameInsetBehavior } from "../../ui/frame-large-title"
import { PageTitle } from "../../ui/PageTitle"
import { ParcelHistoryView } from "../survey-detail/ParcelHistoryView"
import { createSummaryScreenStyles } from "../survey-detail/summary-screen.styles"
import { useSubPageContentStyle } from "../survey-detail/useSubPageContent"
import { TitledScrollView } from "../../ui/TitledScrollView"

const t = fr.communitySurvey

type CommunityHistoryScreenProps = {
  state: CommunitySurveyState
  /** Opens another survey of the parcel, read-only. */
  onOpenSurvey: (surveyId: string) => void
  /** Read from the network state by the route, never from the error (D-03). */
  offline?: boolean
}

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
 * Another member's parcel history (OA-115, D-03): the trend of the totals and the list of the
 * surveys of the parcel, with the loading and error states of the survey page. It never shows the
 * per-factor changes nor the change log, which belong to the survey's owner.
 */
export function CommunityHistoryScreen({
  state,
  onOpenSurvey,
  offline = false,
}: CommunityHistoryScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const own = useMemo(() => createStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  const insetBehavior = useFrameInsetBehavior()
  const { detail, status } = state
  const entries = useMemo(() => (detail ? buildEntriesFromCommunity(detail.history) : []), [detail])

  if (status !== "ready" || !detail) {
    if (offline) {
      return (
        <CenteredState
          icon="cloud-offline-outline"
          message={t.offline}
          actionLabel={t.retry}
          onAction={state.reload}
          testID="community-offline"
        />
      )
    }
    if (status === "error") {
      return (
        <CenteredState
          icon="alert-circle-outline"
          message={t.error}
          actionLabel={t.retry}
          onAction={state.reload}
          testID="community-error"
        />
      )
    }
    return <CenteredState busy message={t.loading} testID="community-loading" />
  }

  return (
    <TitledScrollView
      collapsingTitle={fr.navigation.headers.communityHistory}
      // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19).
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
    >
      <PageTitle>{fr.navigation.headers.communityHistory}</PageTitle>
      <Text style={own.subtitle}>{fr.parcelHistory.page.subtitle}</Text>
      <ParcelHistoryView entries={entries} variant="community" onOpenSurvey={onOpenSurvey} />
    </TitledScrollView>
  )
}
