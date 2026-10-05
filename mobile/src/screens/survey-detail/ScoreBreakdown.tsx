import { useMemo } from "react"
import { View } from "react-native"
import { IBP_MAX } from "@cortege/ibp-domain"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AppText as Text } from "../../ui/AppText"
import { createScoreStyles } from "./score.styles"
import { type DisplayedScores } from "./useLocalDraftSummary"

const t = fr.surveyDetail.scoreScreen
const m = fr.surveyDetail.metric

const percent = (value: number, max: number): `${number}%` =>
  `${Math.max(0, Math.min(100, Math.round((value / max) * 100)))}%`

function SubScore({
  label,
  value,
  max,
  testID,
}: {
  label: string
  value: number
  max: number
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
      <View style={styles.track}>
        <View style={[styles.fill, { width: percent(value, max) }]} />
      </View>
    </View>
  )
}

type ScoreBreakdownProps = {
  scores: DisplayedScores | null
}

/**
 * The total out of 50 and its two sub-scores, stand and management (A to G, out of 35) and context
 * (H to J, out of 15). The factors follow on the same page; this is the only place the split shows.
 */
export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createScoreStyles(theme), [theme])
  return (
    <View style={styles.breakdown}>
      <View style={styles.totalRow}>
        <Text style={styles.totalValue}>{scores ? scores.ibp_total : m.unknown}</Text>
        <Text style={styles.totalMax}>{m.outOfTotal}</Text>
      </View>
      {scores ? (
        <>
          <SubScore
            testID="score-stand"
            label={t.standLabel}
            value={scores.ibp_peuplement_gestion}
            max={IBP_MAX.stand}
          />
          <SubScore
            testID="score-context"
            label={t.contextLabel}
            value={scores.ibp_contexte}
            max={IBP_MAX.context}
          />
        </>
      ) : null}
    </View>
  )
}
