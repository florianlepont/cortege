import { useMemo } from "react"
import { ScrollView } from "react-native"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppCard } from "../ui/AppCard"
import { FactorBarsChart, factorPointsFromEntries } from "../ui/FactorBarsChart"
import { useFrameInsetBehavior } from "../ui/frame-large-title"
import { PageTitle } from "../ui/PageTitle"
import { FactorsList } from "./survey-detail/FactorsList"
import { ScoreBreakdown } from "./survey-detail/ScoreBreakdown"
import { type SurveyScoreScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { useSubPageContentStyle } from "./survey-detail/useSubPageContent"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"

/**
 * "Score IBP" (OA-46): the total out of 50 with its two sub-scores and the ten factor bars, then the ten factor rows, each
 * opening its entry screen. The only detail of the score on the survey's pages (OA-45).
 */
export function SurveyScoreScreen({
  selectedSurvey,
  surveyDetails,
  detailsLoadingSurveyId,
  onOpenFactor,
}: SurveyScoreScreenProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  // 12.2-17: iOS insets the page under the native large title (PageTitle then draws nothing).
  const insetBehavior = useFrameInsetBehavior()
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)

  const factorPoints = useMemo(
    () => factorPointsFromEntries(data.displayedFactorEntries),
    [data.displayedFactorEntries],
  )

  return (
    <ScrollView
      // The header is transparent: the route's ScreenFrame starts the scroll view below it (D-19).
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior={insetBehavior}
    >
      <PageTitle>{fr.navigation.headers.surveyScore}</PageTitle>
      <ScoreBreakdown scores={data.displayedScores} />
      <AppCard variant="glass">
        <FactorBarsChart entries={factorPoints} animate />
      </AppCard>
      <FactorsList
        factorEntries={data.displayedFactorEntries}
        showLoadingHint={data.showFactorLoadingHint}
        canEditSurvey={data.canEditSurvey}
        onOpenFactor={(factor) => void onOpenFactor(selectedSurvey.id, factor)}
      />
    </ScrollView>
  )
}
