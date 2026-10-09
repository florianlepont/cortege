import { useMemo } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native"
import {
  brandDefaultFontFamily,
  brandSpacing4,
  brandTypeScale,
  brandTypography,
} from "../../app/brand-tokens"
import { buildEntriesFromCommunity } from "../../app/parcel-history"
import { type BrandTheme, useBrandTheme } from "../../app/theme"
import type { CommunitySurveyState } from "../../hooks/useCommunitySurvey"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppText as Text } from "../../ui/AppText"
import { useFrameInsetBehavior } from "../../ui/frame-large-title"
import { PageTitle } from "../../ui/PageTitle"
import { ParcelHistoryView } from "../survey-detail/ParcelHistoryView"
import { createSummaryScreenStyles } from "../survey-detail/summary-screen.styles"
import { useSubPageContentStyle } from "../survey-detail/useSubPageContent"

const t = fr.communitySurvey

type CommunityHistoryScreenProps = {
  state: CommunitySurveyState
  /** Opens another survey of the parcel, read-only. */
  onOpenSurvey: (surveyId: string) => void
}

function createStyles(theme: BrandTheme) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: brandSpacing4.smd,
      paddingHorizontal: brandSpacing4.lg,
    },
    message: {
      ...brandTypography.sectionBody,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
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
export function CommunityHistoryScreen({ state, onOpenSurvey }: CommunityHistoryScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const own = useMemo(() => createStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  const insetBehavior = useFrameInsetBehavior()
  const { detail, status } = state
  const entries = useMemo(() => (detail ? buildEntriesFromCommunity(detail.history) : []), [detail])

  if (status === "loading" || !detail) {
    return (
      <View style={[styles.scroll, own.centered]}>
        {status === "error" ? (
          <>
            <Text style={own.message}>{t.error}</Text>
            <AppButton label={t.retry} variant="secondary" onPress={state.reload} />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.colors.forest} />
            <Text style={own.message}>{t.loading}</Text>
          </>
        )}
      </View>
    )
  }

  return (
    <ScrollView
      // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19).
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
    >
      <PageTitle>{fr.navigation.headers.communityHistory}</PageTitle>
      <Text style={own.subtitle}>{fr.parcelHistory.page.subtitle}</Text>
      <ParcelHistoryView entries={entries} variant="community" onOpenSurvey={onOpenSurvey} />
    </ScrollView>
  )
}
