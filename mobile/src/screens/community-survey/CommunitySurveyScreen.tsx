import { useMemo } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Image as ExpoImage } from "expo-image"
import { brandTypography } from "../../app/brand-tokens"
import { formatDay } from "../../app/formatters"
import { BrandTheme, useBrandTheme } from "../../app/theme"
import type { CommunitySurveyState } from "../../hooks/useCommunitySurvey"
import { fr } from "../../i18n"
import { AppButton } from "../../ui/AppButton"
import { AppGroupedList } from "../../ui/AppGroupedList"
import { AppText as Text } from "../../ui/AppText"
import { FactorsList } from "../survey-detail/FactorsList"
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
  /** Opens another survey of the history. */
  onOpenSurvey: (surveyId: string) => void
}

/**
 * The page of a finished survey of another member (OA-59), read-only: who made it and when, the
 * score and its ten factors, the method and station, an approximate position, the photos and the
 * other surveys of the same parcels. It reuses the survey's own score and map components.
 */
export function CommunitySurveyScreen({
  apiUrl,
  accessToken,
  state,
  onOpenSurvey,
}: CommunitySurveyScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  const photoStyles = useMemo(() => createPhotoStyles(theme), [theme])
  const own = useMemo(() => createOwnStyles(theme), [theme])
  const { detail, photos, status, photosFailed } = state

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
    <ScrollView style={scrollStyle} contentContainerStyle={contentStyle}>
      {/* The same skeleton as one of my surveys (OA-115): title and status line, score, photos,
        map, then Contexte et parcelles, Score IBP and the parcel's history. */}
      <View style={own.titleBlock}>
        <Text accessibilityRole="header" style={own.title}>
          {detail.site_name.trim() || fr.common.untitledSurvey}
        </Text>
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

      {detail.history.length > 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.history.title}</Text>
          <View style={own.historyList}>
            {detail.history.map((item) => (
              <Pressable
                key={item.survey_id}
                disabled={item.is_current}
                onPress={() => onOpenSurvey(item.survey_id)}
                accessibilityRole={item.is_current ? "text" : "button"}
                accessibilityLabel={t.history.open({
                  name: item.site_name,
                  total: item.ibp_total,
                })}
                style={[own.historyRow, item.is_current ? own.historyRowCurrent : null]}
                testID={`community-history-${item.survey_id}`}
              >
                <View style={own.historyCopy}>
                  <Text numberOfLines={1} style={own.historyTitle}>
                    {item.site_name.trim() || fr.common.untitledSurvey}
                  </Text>
                  <Text numberOfLines={1} style={own.meta}>
                    {item.is_current
                      ? t.history.current
                      : t.history.row({
                          author: item.author_name?.trim() || t.unknownAuthor,
                          year: item.observation_year,
                          version: item.version_number,
                        })}
                  </Text>
                </View>
                <Text style={own.historyTotal}>{t.history.total(item.ibp_total)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  )
}

function createOwnStyles(theme: BrandTheme) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 24,
    },
    message: {
      ...brandTypography.sectionBody,
      textAlign: "center",
      color: theme.colors.textSecondary,
    },
    titleBlock: {
      gap: 4,
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
      gap: 8,
      paddingTop: 6,
    },
    chip: {
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 5,
      backgroundColor: theme.colors.panelMuted,
    },
    chipText: {
      ...brandTypography.meta,
      fontFamily: "Jost-SemiBold",
      color: theme.semanticColors.textStrong,
    },
    readOnly: {
      ...brandTypography.meta,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      paddingTop: 4,
    },
    historyList: {
      gap: 8,
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      backgroundColor: theme.semanticColors.surfaceElevated,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    historyRowCurrent: {
      borderColor: theme.colors.forest,
    },
    historyCopy: {
      flex: 1,
      gap: 2,
    },
    historyTitle: {
      ...brandTypography.input,
      color: theme.semanticColors.textStrong,
    },
    historyTotal: {
      ...brandTypography.input,
      fontWeight: "700",
      color: theme.colors.forest,
    },
  })
}
