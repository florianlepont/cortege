import { useMemo } from "react"
import { Platform, ScrollView } from "react-native"
import { useHeaderHeight } from "@react-navigation/elements"
import { useBrandTheme } from "../app/theme"
import { fr } from "../i18n"
import { AppCard } from "../ui/AppCard"
import { FactorBarsChart, factorPointsFromEntries } from "../ui/FactorBarsChart"
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
  const headerHeight = useHeaderHeight()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const contentStyle = useSubPageContentStyle(styles.subContent)
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)

  const factorPoints = useMemo(
    () => factorPointsFromEntries(data.displayedFactorEntries),
    [data.displayedFactorEntries],
  )

  return (
    <ScrollView
      style={[styles.scroll, Platform.OS === "ios" ? { marginTop: headerHeight } : null]}
      contentContainerStyle={contentStyle}
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
