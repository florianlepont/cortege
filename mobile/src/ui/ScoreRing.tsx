import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import { Circle, Svg } from "react-native-svg"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"
import { brandFontScaleCaps, brandMotion, brandTypography } from "../app/brand-tokens"
import { scoreRatio, totalTone } from "../app/ibp-display"
import { useBrandTheme } from "../app/theme"
import { scoreRingGeometry } from "../app/visual-tokens"
import { fr } from "../i18n"
import { AppText } from "./AppText"
import { useScreenVisible } from "./useScreenVisible"

const t = fr.components.scoreRing

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] = brandMotion.easings.decelerate

function clamp(progress: number): number {
  return Math.min(1, Math.max(0, progress))
}

/** Geometry of the arc: radius, full circumference and the dash offset that leaves `progress` drawn. */
export function ringGeometry(size: number, stroke: number, progress: number) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return { radius, circumference, dashOffset: circumference * (1 - clamp(progress)) }
}

// Rings that already played their entrance in this session, keyed by survey and score. A list that
// remounts its rows (scrolling back, a tab switch) must not replay the animation (RESEARCH Pitfall 6).
const animatedRingKeys = new Set<string>()

/**
 * True once per key: the first mount of a ring for rows 0 to 7, never under Reduce Motion and never
 * for a ring without a key. Records the key when it answers true.
 */
export function shouldAnimateRing(
  key: string | undefined,
  index: number,
  reduced: boolean,
): boolean {
  if (reduced || key === undefined || index >= brandMotion.staggerMax) return false
  if (animatedRingKeys.has(key)) return false
  animatedRingKeys.add(key)
  return true
}

export function resetAnimatedRingKeys(): void {
  animatedRingKeys.clear()
}

type ScoreRingProps = {
  /** Total out of 50, or null when the survey has no score. */
  score: number | null
  /** Share of the ten factors filled (0 to 1), shown as a neutral arc for a draft without score. */
  completion?: number | null
  /** Row index in the list, drives the entrance stagger. */
  index?: number
  /** Stable key (survey id and score) so the entrance plays once. */
  animationKey?: string
  size?: number
  testID?: string
}

/**
 * The 38 pt list score ring (D-15): an arc coloured by the shared /50 band, the total in the
 * middle. Without a score it is a dashed neutral track, or a neutral completion arc for a draft.
 * One accessible image; not interactive.
 */
export function ScoreRing({
  score,
  completion,
  index = 0,
  animationKey,
  size = scoreRingGeometry.size,
  testID,
}: ScoreRingProps) {
  const theme = useBrandTheme()
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  const [animateIn] = useState(() => shouldAnimateRing(animationKey, index, reduced))

  const hasScore = score !== null
  const hasCompletion = completion !== undefined && completion !== null
  const ratio = hasScore ? scoreRatio(score) : clamp(completion ?? 0)
  const tone = hasScore ? totalTone(score) : null
  const arcColor = tone ? theme.visual.score[tone] : theme.visual.score.neutral
  const showArc = hasScore || hasCompletion
  const { radius, circumference } = ringGeometry(size, scoreRingGeometry.stroke, ratio)
  const centre = size / 2

  const progress = useSharedValue(animateIn ? 0 : ratio)

  // The fill starts when the screen is visible, not at mount: the list mounts at launch under the
  // splash, so a mount-time fill had ended before anyone saw it (12.2-11 fix).
  useEffect(() => {
    // A ring that does not play its entrance follows its ratio as it is: the score or the completion
    // can arrive after the first mount (the row is reused when the survey detail loads), and the
    // shared value was created for the ratio the ring had at mount.
    if (!animateIn) {
      progress.value = ratio
      return
    }
    if (!visible) return
    progress.value = withDelay(
      index * brandMotion.staggerMs,
      withTiming(ratio, {
        duration: brandMotion.durations.slow,
        easing: Easing.bezier(EASE_X1, EASE_Y1, EASE_X2, EASE_Y2),
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [animateIn, visible, index, ratio, progress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }))

  const label = hasScore
    ? t.label({ score })
    : hasCompletion
      ? t.draft({ filled: Math.round(clamp(completion) * 10) })
      : t.none

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size }}
      testID={testID}
    >
      <Svg
        width={size}
        height={size}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {showArc ? (
          <Circle
            key="track"
            cx={centre}
            cy={centre}
            r={radius}
            stroke={theme.visual.score.track}
            strokeWidth={scoreRingGeometry.stroke}
            fill="none"
          />
        ) : (
          <Circle
            key="dashed"
            cx={centre}
            cy={centre}
            r={radius}
            stroke={theme.visual.score.neutral}
            strokeWidth={scoreRingGeometry.stroke}
            strokeDasharray={scoreRingGeometry.dash}
            fill="none"
          />
        )}
        {showArc ? (
          <AnimatedCircle
            cx={centre}
            cy={centre}
            r={radius}
            stroke={arcColor}
            strokeWidth={scoreRingGeometry.stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            fill="none"
            rotation={-90}
            origin={`${centre}, ${centre}`}
            animatedProps={animatedProps}
          />
        ) : null}
      </Svg>
      {hasScore ? (
        <View style={styles.centre} pointerEvents="none">
          <AppText
            style={[brandTypography.ringValue, { color: theme.colors.textPrimary }]}
            maxFontSizeMultiplier={brandFontScaleCaps.label}
          >
            {score}
          </AppText>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  centre: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
})
