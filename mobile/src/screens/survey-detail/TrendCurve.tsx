import { useEffect, useId, useMemo, useRef, useState } from "react"
import { View } from "react-native"
import type { LayoutChangeEvent } from "react-native"
import { ClipPath, Circle, Defs, G, Path, Rect, Svg, Text as SvgText } from "react-native-svg"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"
import type { SharedValue } from "react-native-reanimated"
import { brandMotion, brandTypography } from "../../app/brand-tokens"
import { useBrandTheme } from "../../app/theme"
import {
  buildTrend,
  TREND_HEIGHT,
  TREND_VALUE_OFFSET,
  TREND_YEAR_BASELINE,
} from "../../app/trend-geometry"
import type { TrendInputPoint } from "../../app/trend-geometry"
import { fr } from "../../i18n"
import { useScreenVisible } from "../../ui/useScreenVisible"

const t = fr.parcelHistory.page.trend

export type TrendRevealMode = "clip" | "dash"

/**
 * The single switch of the curve's draw-in. "clip" is the UI-SPEC wipe (an animated clip rectangle
 * uncovers the curve left to right); "dash" is the proven path of `ScoreRing` (`strokeDashoffset`
 * on the solid runs, the points, links and labels fading in). The simulator spike of plan 24-08
 * showed the clip wipe repainting on iOS 27, so "clip" is the default; if the owner phone check
 * (plan 24-12) shows it misrendering on a device, set "dash" and every curve follows.
 */
export const TREND_REVEAL_MODE: TrendRevealMode = "clip"

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedRect = Animated.createAnimatedComponent(Rect)
const AnimatedG = Animated.createAnimatedComponent(G)

const [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] = brandMotion.easings.decelerate
const REVEAL_DELAY_MS = 120
const LINK_DASH = "4 4"

type TrendCurveProps = {
  points: TrendInputPoint[]
  /** One catalogue text that lists every point; the drawing itself is hidden from assistive tech. */
  accessibilityLabel: string
  revealMode?: TrendRevealMode
}

type RunPathProps = {
  d: string
  length: number
  stroke: string
  progress: SharedValue<number>
}

/** One solid run in "dash" mode; a child component so the hook count does not follow the runs. */
function RunPath({ d, length, stroke, progress }: RunPathProps) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }))
  return (
    <AnimatedPath
      d={d}
      stroke={stroke}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
    />
  )
}

/**
 * The parcel history curve (D-06, D-10): the total of each survey as a line, cut at every method
 * change (solid runs, dashed sage links), a value above and a year below each point. It draws
 * itself once per mount, left to right, and appears complete at once under Reduce Motion.
 */
export function TrendCurve({
  points,
  accessibilityLabel,
  revealMode = TREND_REVEAL_MODE,
}: TrendCurveProps) {
  const { visual } = useBrandTheme()
  const forest = visual.forest
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  const [width, setWidth] = useState(0)
  const clipId = `trend-clip-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`
  const geometry = useMemo(() => buildTrend(points, width), [points, width])

  const progress = useSharedValue(reduced ? 1 : 0)
  const started = useRef(false)

  // One timing per mount: a re-render, a visibility flip or a returning screen never replays it.
  useEffect(() => {
    if (reduced) {
      progress.value = 1
      return
    }
    if (!visible || width <= 0 || started.current) return
    started.current = true
    progress.value = withDelay(
      REVEAL_DELAY_MS,
      withTiming(1, {
        duration: brandMotion.durations.emphasis,
        easing: Easing.bezier(EASE_X1, EASE_Y1, EASE_X2, EASE_Y2),
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [reduced, visible, width, progress])

  const clipProps = useAnimatedProps(() => ({ width: width * progress.value }))
  const fadeProps = useAnimatedProps(() => ({ opacity: progress.value }))

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)

  const dash = revealMode === "dash"
  const drawing = (
    <>
      {geometry.segments.map((segment) =>
        dash ? (
          <RunPath
            key={segment.d}
            d={segment.d}
            length={segment.length}
            stroke={forest.titleAccent}
            progress={progress}
          />
        ) : (
          <Path
            key={segment.d}
            d={segment.d}
            stroke={forest.titleAccent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ),
      )}
    </>
  )
  const decoration = (
    <>
      {geometry.links.map((link) => (
        <Path
          key={link.d}
          d={link.d}
          stroke={forest.sage}
          strokeWidth={2}
          strokeDasharray={LINK_DASH}
          fill="none"
        />
      ))}
      {geometry.points.map((point) => (
        <Circle
          key={point.surveyId}
          cx={point.x}
          cy={point.y}
          r={point.isCurrent ? 6 : 4}
          fill={point.isCurrent ? forest.title : forest.titleAccent}
          stroke={point.isCurrent ? forest.titleAccent : undefined}
          strokeWidth={point.isCurrent ? 2 : undefined}
        />
      ))}
      {geometry.points.map((point) => (
        <SvgText
          key={`value-${point.surveyId}`}
          x={point.x}
          y={point.y - TREND_VALUE_OFFSET}
          fill={forest.title}
          fontFamily={brandTypography.ringValue.fontFamily}
          fontSize={12}
          textAnchor="middle"
        >
          {point.total}
        </SvgText>
      ))}
      {geometry.points.map((point) => (
        <SvgText
          key={`year-${point.surveyId}`}
          x={point.x}
          y={TREND_YEAR_BASELINE}
          fill={forest.body}
          fontFamily={brandTypography.meta.fontFamily}
          fontSize={12}
          textAnchor="middle"
        >
          {point.year !== null ? point.year : t.unknownYear}
        </SvgText>
      ))}
    </>
  )

  return (
    <View
      testID="trend-curve"
      style={{ height: TREND_HEIGHT }}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {width > 0 ? (
        <Svg
          width={width}
          height={TREND_HEIGHT}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {dash ? (
            <>
              {drawing}
              <AnimatedG animatedProps={fadeProps}>{decoration}</AnimatedG>
            </>
          ) : (
            <>
              <Defs>
                <ClipPath id={clipId}>
                  <AnimatedRect x={0} y={0} height={TREND_HEIGHT} animatedProps={clipProps} />
                </ClipPath>
              </Defs>
              <G clipPath={`url(#${clipId})`}>
                {drawing}
                {decoration}
              </G>
            </>
          )}
        </Svg>
      ) : null}
    </View>
  )
}
