import { useMemo } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native"
import { Image as ExpoImage } from "expo-image"
import { brandSpacing, brandSpacing4, brandTypography } from "../../app/brand-tokens"
import { formatDay } from "../../app/formatters"
import { buildEntriesFromCommunity, historyRowState } from "../../app/parcel-history"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { CommunitySurveyState } from "../../hooks/useCommunitySurvey"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppGroupedList } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"
import { useFrameInsetBehavior, useFrameLargeTitle } from "../../ui/frame-large-title"
import { FactorsList } from "../survey-detail/FactorsList"
import { toHistoryRow } from "../survey-detail/history-row"
import { ParcelMapCard } from "../survey-detail/ParcelMapCard"
import { PhotoGallery } from "../survey-detail/PhotoGallery"
import { createPhotoStyles } from "../survey-detail/photos.styles"
import { ScoreBreakdown } from "../survey-detail/ScoreBreakdown"
import { createSummaryScreenStyles } from "../survey-detail/summary-screen.styles"
import { useSubPageContentStyle } from "../survey-detail/useSubPageContent"
import { toContextRows, toDisplayedScores, toFactorEntries } from "./view-model"

const t = fr.communitySurvey

type CommunitySurveyScreenProps = {
  apiUrl: string
  accessToken: string | null
  state: CommunitySurveyState
  /** Opens the parcel's history page. */
  onOpenHistory: () => void
}

/**
 * The page of a finished survey of another member (OA-59), read-only: who made it and when, the
 * score and its ten factors, the method and station, an approximate position, the photos and, when
 * the parcels have other surveys, one row opening the parcel history page (D-03). It reuses the
 * survey's own score and map components and never shows the change log.
 */
export function CommunitySurveyScreen({
  apiUrl,
  accessToken,
  state,
  onOpenHistory,
}: CommunitySurveyScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  const photoStyles = useMemo(() => createPhotoStyles(theme), [theme])
  const own = useMemo(() => createOwnStyles(theme), [theme])
  const { detail, photos, status, photosFailed } = state
  // 12.2-17: under the native iOS large title the header names the survey and iOS insets the page.
  const nativeTitle = useFrameLargeTitle()
  const insetBehavior = useFrameInsetBehavior()

  const scores = useMemo(() => (detail ? toDisplayedScores(detail) : null), [detail])
  const factorEntries = useMemo(() => (detail ? toFactorEntries(detail) : []), [detail])
  const parcelSections = useMemo(
    () => [
      {
        key: "parcels",
        title: fr.surveyDetail.contextScreen.parcelsHeading(detail?.parcel_ids.length ?? 0),
        rows: (detail?.parcel_ids ?? []).map((parcelId, index) => ({
          key: parcelId,
          label: fr.surveyDetail.contextScreen.parcelLabel(index + 1),
          value: parcelId,
        })),
      },
    ],
    [detail],
  )
  const contextSections = useMemo(
    () => [
      {
        key: "context",
        title: t.contextTitle,
        rows: detail ? toContextRows(detail) : [],
      },
    ],
    [detail],
  )

  const historySections = useMemo(() => {
    if (!detail || detail.history.length <= 1) return null
    const row = toHistoryRow(
      historyRowState(
        { hasParcel: true, loading: false, error: false, offline: false },
        buildEntriesFromCommunity(detail.history),
      ),
    )
    return [
      {
        key: "history",
        rows: [
          {
            key: "history",
            label: fr.surveyDetail.rows.history,
            value: row.value,
            multiline: true,
            accessibilityLabel: row.accessibilityLabel,
            onPress: onOpenHistory,
          },
        ],
      },
    ]
  }, [detail, onOpenHistory])

  // The header is transparent: the route's ScreenFrame starts the page below it (D-19).
  const scrollStyle = styles.scroll

  if (status === "loading" || !detail) {
    return (
      <View style={[scrollStyle, own.centered]}>
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

  const author = detail.author_name?.trim() || t.unknownAuthor
  // Year, version and method as chips instead of a grey line (OA-115).
  const chips = [
    detail.observation_year !== null ? String(detail.observation_year) : null,
    detail.version_number !== null ? t.versionChip(detail.version_number) : null,
    ...toContextRows(detail)
      .filter((row) => row.label === t.rows.method)
      .map((row) => row.value),
  ].filter((chip): chip is string => chip !== null && chip !== "")

  return (
    <ScrollView
      style={scrollStyle}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
    >
      {/* The same skeleton as one of my surveys (OA-115): title and status line, score, photos,
        map, then Contexte et parcelles, Score IBP and the row opening the parcel's history. */}
      <View style={own.titleBlock}>
        {nativeTitle ? null : (
          <Text accessibilityRole="header" style={own.title}>
            {detail.site_name.trim() || fr.common.untitledSurvey}
          </Text>
        )}
        <Text style={own.meta}>
          {t.statusLine({ author, date: formatDay(detail.submitted_at) })}
        </Text>
        <View style={own.chips}>
          {chips.map((chip) => (
            <View key={chip} style={own.chip}>
              <Text style={own.chipText}>{chip}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScoreBreakdown scores={scores} />
      <Text style={own.readOnly}>{t.readOnly}</Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {fr.surveyDetail.photos.title}
            {photos.length > 0 ? (
              <Text style={styles.sectionTitleCount}>
                {fr.surveyDetail.photos.countSuffix(photos.length)}
              </Text>
            ) : null}
          </Text>
        </View>
        {photos.length > 0 ? (
          <PhotoGallery
            ids={photos.map((photo) => photo.id)}
            renderPhoto={(id, index, size) => {
              const photo = photos[index]
              return (
                <View
                  style={[photoStyles.photo, { width: size.width, height: size.height }]}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={t.a11y.photo({ index: index + 1, total: photos.length })}
                >
                  <ExpoImage
                    source={{ uri: photo.uri, headers: photo.headers }}
                    style={photoStyles.photoImage}
                    contentFit="cover"
                    cachePolicy="memory"
                    recyclingKey={id}
                  />
                </View>
              )
            }}
          />
        ) : (
          <Text style={styles.photoEmpty}>
            {photosFailed ? t.photosFailed : fr.surveyDetail.photos.emptyReadOnly}
          </Text>
        )}
      </View>

      <ParcelMapCard
        apiUrl={apiUrl}
        accessToken={accessToken}
        siteName={detail.site_name}
        displayLocation={detail.display_location ?? undefined}
        parcelIds={detail.parcel_ids}
        surveyId={detail.survey_id}
        style={styles.mapTall}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{fr.navigation.headers.surveyContext}</Text>
      </View>
      <AppGroupedList sections={contextSections} />
      {detail.parcel_ids.length > 0 ? <AppGroupedList sections={parcelSections} /> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{fr.navigation.headers.surveyScore}</Text>
      </View>
      <FactorsList
        factorEntries={factorEntries}
        showLoadingHint={false}
        canEditSurvey={false}
        onOpenFactor={() => undefined}
      />

      {historySections ? <AppGroupedList sections={historySections} /> : null}
    </ScrollView>
  )
}

function createOwnStyles(theme: BrandTheme) {
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
    titleBlock: {
      gap: brandSpacing4.xs,
    },
    title: {
      ...brandTypography.sectionTitle,
      fontSize: 25,
      lineHeight: 29,
      color: theme.colors.forest,
    },
    meta: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: brandSpacing4.sm,
      paddingTop: brandSpacing.xs,
    },
    chip: {
      borderRadius: 14,
      paddingHorizontal: brandSpacing4.smd,
      paddingVertical: 5,
      backgroundColor: theme.colors.panelMuted,
    },
    chipText: {
      ...brandTypography.meta,
      color: theme.semanticColors.textStrong,
    },
    readOnly: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      paddingTop: brandSpacing4.xs,
    },
  })
}
