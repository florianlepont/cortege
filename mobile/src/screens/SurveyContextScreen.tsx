import { useCallback, useMemo, useRef } from "react"
import { LayoutChangeEvent, ScrollView, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"
import { useBrandTheme } from "../app/theme"
import { weatherViewState } from "../app/weather"
import { fr } from "../i18n"
import { AppGroupedList } from "../ui/AppGroupedList"
import { AppText as Text } from "../ui/AppText"
import { useFrameInsetBehavior } from "../ui/frame-large-title"
import { PageTitle } from "../ui/PageTitle"
import { GlassIconButton } from "./public-map/GlassIconButton"
import { ConditionsSection } from "./survey-detail/conditions/ConditionsSection"
import { useSurveyConditions } from "./survey-detail/conditions/useSurveyConditions"
import { ParcelMapCard } from "./survey-detail/ParcelMapCard"
import { ScoringContextEditor } from "./survey-detail/ScoringContextEditor"
import { type SurveyContextScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { useSubPageContentStyle } from "./survey-detail/useSubPageContent"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"
import { TitledScrollView } from "../ui/TitledScrollView"

const t = fr.surveyDetail.contextScreen
const a11y = fr.surveyDetail.a11y

/** Room kept above a field that is scrolled into view, so its label stays visible. */
const FIELD_TOP_MARGIN = 8

/**
 * "Contexte et parcelles" (OA-46): the survey's parcels on a large map with the editing button on
 * the map itself (OA-44), the list of parcels, then the method and the station context, and last
 * the Conditions (weather and survey note, phase 27 D-15). With the `conditions` section param the
 * page scrolls once to the Conditions after its first layout; no field takes focus by itself.
 */
export function SurveyContextScreen({
  section,
  weatherRequest,
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
  onEditWeather,
  onRetryWeather,
  onRefillWeather,
}: SurveyContextScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  // 12.2-17: iOS insets the page under the native large title (PageTitle then draws nothing).
  const insetBehavior = useFrameInsetBehavior()
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)
  const { detail, canEditSurvey, activeSiteName, parcelIds } = data
  const surveyId = selectedSurvey.id
  const conditions = useSurveyConditions(selectedSurvey)
  const conditionsViewState = weatherViewState({
    hasParcel: parcelIds.length > 0,
    online: weatherRequest.online,
    inFlight: weatherRequest.inFlight,
    unavailable: weatherRequest.unavailable,
    weather: conditions.weather,
  })
  const reduceMotion = useReducedMotion()

  // Scroll to the Conditions once, when the section is measured and the page has its final height
  // (the draft was read and the cards are drawn): both events must have happened.
  const scrollRef = useRef<ScrollView>(null)
  const sectionY = useRef<number | null>(null)
  const sized = useRef(false)
  const scrolled = useRef(false)
  const loaded = useRef(conditions.loaded)
  loaded.current = conditions.loaded

  const scrollToSection = useCallback(() => {
    if (section !== "conditions" || scrolled.current) return
    if (sectionY.current === null || !sized.current) return
    scrolled.current = true
    scrollRef.current?.scrollTo({ y: sectionY.current, animated: !reduceMotion })
  }, [section, reduceMotion])

  const onSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      sectionY.current = event.nativeEvent.layout.y
      scrollToSection()
    },
    [scrollToSection],
  )

  const onContentSizeChange = useCallback(() => {
    if (loaded.current) sized.current = true
    scrollToSection()
  }, [scrollToSection])

  // A field of the Conditions that takes focus is brought into view with its label.
  const onFieldFocus = useCallback(
    (y: number) => {
      if (sectionY.current === null) return
      scrollRef.current?.scrollTo({
        y: Math.max(0, sectionY.current + y - FIELD_TOP_MARGIN),
        animated: !reduceMotion,
      })
    },
    [reduceMotion],
  )

  const editWeather = useCallback(
    (update: Parameters<typeof onEditWeather>[1]) => void onEditWeather(surveyId, update),
    [onEditWeather, surveyId],
  )
  const retryWeather = useCallback(() => void onRetryWeather(surveyId), [onRetryWeather, surveyId])
  const refillWeather = useCallback(
    () => void onRefillWeather(surveyId),
    [onRefillWeather, surveyId],
  )

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
      ref={scrollRef}
      collapsingTitle={fr.navigation.headers.surveyContext}
      // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19).
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
      // The Conditions hold text fields: taps reach buttons while the keyboard is up, dragging the
      // page closes it, and iOS lifts the content above it (UI-SPEC 1.6).
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      onContentSizeChange={onContentSizeChange}
    >
      <PageTitle>{fr.navigation.headers.surveyContext}</PageTitle>
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

      <View onLayout={onSectionLayout}>
        <ConditionsSection
          key={surveyId}
          editable={canEditSurvey}
          conditions={conditions}
          viewState={conditionsViewState}
          onEditWeather={editWeather}
          onRetry={retryWeather}
          onRefill={refillWeather}
          onFieldFocus={onFieldFocus}
        />
      </View>
    </TitledScrollView>
  )
}
