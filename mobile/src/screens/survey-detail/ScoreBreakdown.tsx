import { useMemo } from "react"
import { View } from "react-native"
import { IBP_MAX, bandTone, contextBand, standBand, type ScoreTone } from "@cortege/ibp-domain"
import { brandRadius, brandSpacing4 } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppCard } from "../../ui/AppCard"
import { AppText as Text } from "../../ui/AppText"
import { ProgressBar } from "../../ui/ProgressBar"
import { createScoreStyles } from "./score.styles"
import { type DisplayedScores } from "./useLocalDraftSummary"

const t = fr.surveyDetail.scoreScreen
const m = fr.surveyDetail.metric

const SUB_SCORE_BAR = 8

const percent = (value: number, max: number): number =>
  Math.max(0, Math.min(100, Math.round((value / max) * 100)))

function SubScore({
  label,
  value,
  max,
  tone,
  testID,
}: {
  label: string
  value: number
  max: number
  tone: ScoreTone
  testID: string
}) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createScoreStyles(theme), [theme])
  return (
    <View style={styles.subScore} testID={testID}>
      <View style={styles.subScoreHeader}>
        <Text style={styles.subScoreLabel}>{label}</Text>
        <Text style={styles.subScoreValue}>{t.pointsOf({ points: value, max })}</Text>
      </View>
      <ProgressBar
        variant="plain"
        percent={percent(value, max)}
        height={SUB_SCORE_BAR}
        radius={brandRadius.bar}
        fillRadius={brandRadius.bar}
        trackColor={theme.visual.score.track}
        fillColor={theme.visual.score[tone]}
        fillTestID={`${testID}-fill`}
      />
    </View>
  )
}

type ScoreBreakdownProps = {
  scores: DisplayedScores | null
}

/**
 * The total out of 50 and its two sub-scores, stand and management (A to G, out of 35) and context
 * (H to J, out of 15). The factors follow on the same page; this is the only place the split shows.
 * Each sub-score track takes the tone of its own band from the shared package (CLAUDE.md, D-15).
 */
export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createScoreStyles(theme), [theme])
  return (
    <AppCard variant="glass" padding={brandSpacing4.lg}>
      <View style={styles.breakdown}>
        <View style={styles.totalRow}>
          <Text style={scores ? styles.totalValue : styles.totalUnknown}>
            {scores ? scores.ibp_total : m.unknown}
          </Text>
          {scores ? <Text style={styles.totalMax}>{m.outOfTotal}</Text> : null}
        </View>
        {scores ? (
          <>
            <SubScore
              testID="score-stand"
              label={t.standLabel}
              value={scores.ibp_peuplement_gestion}
              max={IBP_MAX.stand}
              tone={bandTone(standBand(scores.ibp_peuplement_gestion))}
            />
            <SubScore
              testID="score-context"
              label={t.contextLabel}
              value={scores.ibp_contexte}
              max={IBP_MAX.context}
              tone={bandTone(contextBand(scores.ibp_contexte))}
            />
          </>
        ) : null}
      </View>
    </AppCard>
  )
}
