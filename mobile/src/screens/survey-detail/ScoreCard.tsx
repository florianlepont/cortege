import { useEffect, useMemo, useRef, useState } from "react"
import { type LayoutChangeEvent, View } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated"
import { IBP_MAX } from "@cortege/ibp-domain"
import { brandMotion, brandRadius } from "../../app/brand-tokens"
import { scoreRatio } from "../../app/ibp-display"
import { useBrandTheme } from "../../app/theme"
import { fr } from "../../i18n"
import { AnimatedNumber } from "../../ui/AnimatedNumber"
import { AppText as Text } from "../../ui/AppText"
import type { ForestTextBlock } from "../../ui/ForestAurora"
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
// The calm "pop" of the card at the finish (D-25): up to 3 percent larger, then back, once.
export const FINISH_POP_SCALE = 1.03
// Width of one digit of the tile value (Sora-SemiBold 16): the counting text keeps its final width.
const TILE_DIGIT_WIDTH = 11
type Rect = ForestTextBlock

/** The rectangle around both `a` and `b`. */
function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

type Measured = { caption: Rect | null; numeral: Rect | null; lower: Rect | null }

/**
 * The card's blocks of text for the mist's shield (12.2-19): the caption with the numeral, and the
 * bar, the tiles and the hint under them (when there is any). Null until the three are measured.
 */
function useScoreBlocks() {
  const [measured, setMeasured] = useState<Measured>({ caption: null, numeral: null, lower: null })
  const measure = (key: keyof Measured) => (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout
    setMeasured((previous) => ({ ...previous, [key]: { x, y, width, height } }))
  }
  const { caption, numeral, lower } = measured
  const blocks =
    caption === null || numeral === null || lower === null
      ? null
      : [union(caption, numeral), ...(lower.height > 0 ? [lower] : [])]
  return {
    blocks,
    onCaptionLayout: measure("caption"),
    onNumeralLayout: measure("numeral"),
    onLowerLayout: measure("lower"),
  }
}

type ScoreCardProps = {
  scores: DisplayedScores | null
  isDraftView: boolean
  /** Factors filled in out of ten; null while the local draft is being read. */
  filledFactorCount: number | null
  /** The halo pulses and the card pops once each time this value changes (a finished survey). */
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
 * At the finish (D-25) the halo pulses and the card pops once, on the UI thread; under Reduce
 * Motion neither moves (the success haptic, fired by the caller, stays). 12.2-19 fifth round
 * (owner): the card carries the forest aurora like Accueil's, in place of its drifting contours,
 * with the darker `score` shield over the numeral column and the band of the bar and tiles.
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

  const pop = useSharedValue(1)
  const previousPulse = useRef(pulseTrigger)
  useEffect(() => {
    if (previousPulse.current === pulseTrigger) return
    previousPulse.current = pulseTrigger
    if (reduced) return
    pop.value = withSequence(
      withSpring(FINISH_POP_SCALE, {
        ...brandMotion.springs.snappy,
        reduceMotion: ReduceMotion.System,
      }),
      withSpring(1, { ...brandMotion.springs.gentle, reduceMotion: ReduceMotion.System }),
    )
  }, [pulseTrigger, reduced, pop])
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))

  const { blocks, onCaptionLayout, onNumeralLayout, onLowerLayout } = useScoreBlocks()

  const filled = filledFactorCount ?? 0
  const caption = isDraftView ? t.draftCaption : t.caption
  const hint =
    filledFactorCount === null ? "" : filled >= FACTOR_COUNT ? t.allFilled : t.factorsFilled(filled)

  return (
    <Animated.View
      style={[styles.scoreWrap, popStyle]}
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
      <ForestCard variant="hero" blocks={blocks} shield="score" contentStyle={styles.scoreContent}>
        <Text style={styles.scoreCaption} onLayout={onCaptionLayout}>
          {caption}
        </Text>
        <Animated.View style={[styles.scoreNumeral, numeralStyle]} onLayout={onNumeralLayout}>
          <GradientNumeral
            value={scores?.ibp_total ?? null}
            unit={fr.surveyDetail.metric.outOfTotal}
          />
        </Animated.View>
        <View onLayout={onLowerLayout} testID="score-card-lower">
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
        </View>
      </ForestCard>
    </Animated.View>
  )
}
