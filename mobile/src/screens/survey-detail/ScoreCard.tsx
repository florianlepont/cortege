import { useMemo } from "react"
import { View } from "react-native"
import { IBP_MAX } from "@cortege/ibp-domain"
import { brandOnDarkColors } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { createSummaryScreenStyles } from "./summary-screen.styles"
import { type DisplayedScores } from "./useLocalDraftSummary"

const t = fr.surveyDetail.scoreCard
const a11y = fr.surveyDetail.a11y
const SEGMENT_COUNT = 10

type ScoreCardProps = {
  scores: DisplayedScores | null
  isDraftView: boolean
  /** Factors filled in out of ten; null while the local draft is being read. */
  filledFactorCount: number | null
}

/**
 * The one place the score shows on the summary (OA-45, OA-39): the total out of 50 and a ten-step
 * bar of the factors filled in. Not tappable (owner, OA-93): the "Score IBP" row below it opens the
 * detail by factor and sub-score.
 */
export function ScoreCard({ scores, isDraftView, filledFactorCount }: ScoreCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const filled = filledFactorCount ?? 0
  const caption = isDraftView ? t.draftCaption : t.caption
  const hint =
    filledFactorCount === null
      ? ""
      : filled >= SEGMENT_COUNT
        ? t.allFilled
        : t.factorsFilled(filled)

  return (
    <View
      style={styles.scoreCard}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11y.scoreSummary(
        scores ? `${scores.ibp_total} / ${IBP_MAX.total}` : fr.surveyDetail.metric.unknown,
      )}
    >
      <View style={styles.scoreTopRow}>
        <View style={styles.scoreValueRow}>
          <Text style={styles.scoreValue}>{scores ? scores.ibp_total : "—"}</Text>
          <Text style={styles.scoreMax}>{fr.surveyDetail.metric.outOfTotal}</Text>
        </View>
        <View style={styles.scoreCaptionRow}>
          <Text style={styles.scoreCaption}>{caption}</Text>
        </View>
      </View>
      <View style={styles.scoreSegments}>
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
          <View
            key={`segment-${index}`}
            style={[
              styles.scoreSegment,
              {
                backgroundColor:
                  index < filled
                    ? theme.semanticColors.accent
                    : brandOnDarkColors.heroBorderStrongOnDark,
              },
            ]}
          />
        ))}
      </View>
      {hint ? <Text style={styles.scoreHint}>{hint}</Text> : null}
    </View>
  )
}
