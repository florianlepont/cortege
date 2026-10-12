import { useCallback, useMemo, useRef } from "react"
import { LayoutChangeEvent, ScrollView, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"
import { useBrandTheme } from "../app/theme"
import { weatherViewState } from "../app/weather"
import { fr } from "../i18n"
import { useFrameInsetBehavior } from "../ui/frame-large-title"
import { PageTitle } from "../ui/PageTitle"
import { ConditionsSection } from "./survey-detail/conditions/ConditionsSection"
import { useSurveyConditions } from "./survey-detail/conditions/useSurveyConditions"
import { ScoringContextEditor } from "./survey-detail/ScoringContextEditor"
import { type SurveyContextScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { useSubPageContentStyle } from "./survey-detail/useSubPageContent"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"
import { TitledScrollView } from "../ui/TitledScrollView"

/**
 * "Contexte" (OA-46, D-32): the method and the station context, then the weather with its status
 * line and the full dated source sentence (phase 27 D-15). The parcels and their map are the
 * "Parcelles" page; the survey note is a card of the summary (D-33). With the `conditions` section
 * param the page scrolls once to the weather after its first layout; no field takes focus by
 * itself.
 */
export function SurveyContextScreen({
  section,
  weatherRequest,
  selectedSurvey,
  surveyDetails,
  detailsLoadingSurveyId,
  onUpdateRegionVersion,
  onUpdateVegetationStage,
  onUpdateIbpCas,
  onUpdateCas3Scale,
  onSwitchToV32,
  onEditWeather,
  onRetryWeather,
}: SurveyContextScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  // 12.2-17: iOS insets the page under the native large title (PageTitle then draws nothing).
  const insetBehavior = useFrameInsetBehavior()
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)
  const { canEditSurvey, parcelIds } = data
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

  const editWeather = useCallback(
    (update: Parameters<typeof onEditWeather>[1]) => void onEditWeather(surveyId, update),
    [onEditWeather, surveyId],
  )
  const retryWeather = useCallback(() => void onRetryWeather(surveyId), [onRetryWeather, surveyId])

  return (
    <TitledScrollView
      ref={scrollRef}
      collapsingTitle={fr.navigation.headers.surveyContext}
      // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19).
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
      onContentSizeChange={onContentSizeChange}
    >
      <PageTitle>{fr.navigation.headers.surveyContext}</PageTitle>
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
        />
      </View>
    </TitledScrollView>
  )
}
