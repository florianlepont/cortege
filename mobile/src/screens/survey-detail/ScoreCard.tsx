import { useEffect, useMemo } from "react"
import { View } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { IBP_MAX } from "@cortege/ibp-domain"
import { brandMotion, brandRadius } from "../../app/brand-tokens"
import { scoreRatio } from "../../app/ibp-display"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AnimatedNumber } from "../../ui/AnimatedNumber"
import { AppText as Text } from "../../ui/AppText"
import { ForestCard } from "../../ui/ForestCard"
import { GlowBar } from "../../ui/GlowBar"
import { GradientNumeral } from "../../ui/GradientNumeral"
import { HaloPulse } from "../../ui/HaloPulse"
import { createSummaryScreenStyles } from "./summary-screen.styles"
import { type DisplayedScores } from "./useLocalDraftSummary"

const t = fr.surveyDetail.scoreCard
const a11y = fr.surveyDetail.a11y
const FACTOR_COUNT = 10
const NUMERAL_TRAVEL = 8
// Width of one digit of the tile value (Sora-SemiBold 16): the counting text keeps its final width.
const TILE_DIGIT_WIDTH = 11

type ScoreCardProps = {
  scores: DisplayedScores | null
  isDraftView: boolean
  /** Factors filled in out of ten; null while the local draft is being read. */
  filledFactorCount: number | null
  /** The halo pulses once each time this value changes (a successful submit). */
  pulseTrigger: number
}

type TileProps = {
  label: string
  value: number
  max: number
  styles: ReturnType<typeof createSummaryScreenStyles>
}

function ScoreTile({ label, value, max, styles }: TileProps) {
  return (
    <View style={styles.scoreTile}>
      <Text style={styles.scoreTileLabel}>{label}</Text>
      <View style={styles.scoreTileValueRow}>
        <AnimatedNumber
          value={value}
          style={[styles.scoreTileValue, { width: String(value).length * TILE_DIGIT_WIDTH }]}
        />
        <Text style={styles.scoreTileOutOf}>{t.outOf({ max })}</Text>
      </View>
    </View>
  )
}

/**
 * The one place the score shows on the summary (OA-45, OA-39): the forest hero card with the thin
 * gradient numeral out of 50, a glow bar filling once per mount, and two glass tiles (stand out of
 * 35, context out of 15) counting up. Not tappable (owner, OA-93): the "Score IBP" row below opens
 * the detail by factor and sub-score. The mount animations do not replay when returning from a
 * sub-page, because the summary stays mounted under it. One summary label reads the whole card.
 */
export function ScoreCard({
  scores,
  isDraftView,
  filledFactorCount,
  pulseTrigger,
}: ScoreCardProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createSummaryScreenStyles(theme), [theme])
  const reduced = useReducedMotion()
  const entrance = useSharedValue(reduced ? 1 : 0)

  useEffect(() => {
    entrance.value = withSpring(1, {
      ...brandMotion.springs.snappy,
      reduceMotion: ReduceMotion.System,
    })
  }, [entrance])

  const numeralStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * NUMERAL_TRAVEL }],
  }))

  const filled = filledFactorCount ?? 0
  const caption = isDraftView ? t.draftCaption : t.caption
  const hint =
    filledFactorCount === null ? "" : filled >= FACTOR_COUNT ? t.allFilled : t.factorsFilled(filled)

  return (
    <View
      style={styles.scoreWrap}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11y.scoreSummary(
        scores ? `${scores.ibp_total} / ${IBP_MAX.total}` : fr.surveyDetail.metric.unknown,
      )}
    >
      <HaloPulse
        trigger={pulseTrigger}
        radius={brandRadius.forestHero}
        shadow={theme.visual.forest.shadow}
      />
      <ForestCard variant="hero" contentStyle={styles.scoreContent}>
        <Text style={styles.scoreCaption}>{caption}</Text>
        <Animated.View style={[styles.scoreNumeral, numeralStyle]}>
          <GradientNumeral
            value={scores?.ibp_total ?? null}
            unit={fr.surveyDetail.metric.outOfTotal}
          />
        </Animated.View>
        {scores ? (
          <>
            <View style={styles.scoreBar}>
              <GlowBar ratio={scoreRatio(scores.ibp_total)} animate />
            </View>
            <View style={styles.scoreTiles}>
              <ScoreTile
                label={fr.components.ibpFactorBars.standGroup}
                value={scores.ibp_peuplement_gestion}
                max={IBP_MAX.stand}
                styles={styles}
              />
              <ScoreTile
                label={fr.components.ibpFactorBars.contextGroup}
                value={scores.ibp_contexte}
                max={IBP_MAX.context}
                styles={styles}
              />
            </View>
          </>
        ) : null}
        {hint ? <Text style={styles.scoreHint}>{hint}</Text> : null}
      </ForestCard>
    </View>
  )
}
