import { useMemo } from "react"
import { Platform, ScrollView } from "react-native"
import { useHeaderHeight } from "@react-navigation/elements"
import { useBrandTheme } from "../app/theme"
import { FactorsList } from "./survey-detail/FactorsList"
import { ScoreBreakdown } from "./survey-detail/ScoreBreakdown"
import { type SurveyScoreScreenProps } from "./survey-detail/screen-props"
import { createSummaryScreenStyles } from "./survey-detail/summary-screen.styles"
import { useSurveyDetailData } from "./survey-detail/useSurveyDetailData"

/**
 * "Score IBP" (OA-46): the total out of 50 with its two sub-scores, then the ten factors, each
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
  const data = useSurveyDetailData(selectedSurvey, surveyDetails, detailsLoadingSurveyId)

  return (
    <ScrollView
      style={[styles.scroll, Platform.OS === "ios" ? { marginTop: headerHeight } : null]}
      contentContainerStyle={styles.subContent}
    >
      <ScoreBreakdown scores={data.displayedScores} />
      <FactorsList
        factorEntries={data.displayedFactorEntries}
        showLoadingHint={data.showFactorLoadingHint}
        canEditSurvey={data.canEditSurvey}
        onOpenFactor={(factor) => void onOpenFactor(selectedSurvey.id, factor)}
      />
    </ScrollView>
  )
}
