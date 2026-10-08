import { useEffect, useState } from "react"
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import type { AccessibilityValue, LayoutChangeEvent } from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated"
import { brandMotion } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { downloadBarGeometry, glowBarGeometry } from "../app/visual-tokens"

type ProgressBarBase = {
  testID?: string
}

type GlowProgressBarProps = ProgressBarBase & {
  variant: "glow"
  /** Filled share of the track, clamped to 0..1. */
  ratio: number
  /** Grow the fill in on mount (500 ms decelerate after a short delay). */
  animate?: boolean
  delayMs?: number
}

type SlideProgressBarProps = ProgressBarBase & {
  variant: "slide"
  /** Filled share of the track, 0..1. */
  ratio: number
  fillTestID?: string
  accessibilityLabel: string
  accessibilityValue: AccessibilityValue
}

type PlainProgressBarProps = ProgressBarBase & {
  variant: "plain"
  /** Filled share of the track in percent, clamped to 0..100. */
  percent: number
  height: number
  /** Radius of the track (it clips the fill). */
  radius: number
  /** Radius of the fill itself; square when omitted. */
  fillRadius?: number
  trackColor: string
  fillColor: string
  fillTestID?: string
  style?: StyleProp<ViewStyle>
}

export type ProgressBarProps = GlowProgressBarProps | SlideProgressBarProps | PlainProgressBarProps

const [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] = brandMotion.easings.decelerate

const clamp01 = (ratio: number): number => Math.max(0, Math.min(1, ratio))

/**
 * The one progress bar. Variants:
 * - "glow": the 6 pt glowing gauge of the score card. The fill keeps its final width and grows with
 *   `scaleX` from the left (only the transform animates, never `width` or `boxShadow`); Reduce
 *   Motion shows the final state at once. Hidden from screen readers.
 * - "slide": the 10 pt offline-download bar. A full-width fill slides in from the left
 *   (`translateX`, UI thread) inside the clipped track so its rounded end stays round, and eases to
 *   each new value. A progressbar for screen readers.
 * - "plain": a static track and fill of a given height, radius and colours (sub-score tracks, the
 *   offline prompt). The fill width is a percentage; the fill is square unless `fillRadius` is set.
 */
export function ProgressBar(props: ProgressBarProps) {
  if (props.variant === "glow") return <GlowProgressBar {...props} />
  if (props.variant === "slide") return <SlideProgressBar {...props} />
  return <PlainProgressBar {...props} />
}

function GlowProgressBar({ ratio, animate = false, delayMs, testID }: GlowProgressBarProps) {
  const theme = useBrandTheme()
  const reduced = useReducedMotion()
  const grows = animate && !reduced
  const scale = useSharedValue(grows ? 0 : 1)
  const delay = delayMs ?? glowBarGeometry.delayMs

  useEffect(() => {
    if (!grows) return
    scale.value = withDelay(
      delay,
      withTiming(1, {
        duration: brandMotion.durations.emphasis,
        easing: Easing.bezier(EASE_X1, EASE_Y1, EASE_X2, EASE_Y2),
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [grows, delay, scale])

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: scale.value }] }))

  return (
    <View
      style={[styles.glowTrack, { backgroundColor: theme.visual.forest.glowTrack }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <Animated.View
        style={[
          styles.glowFill,
          {
            width: `${clamp01(ratio) * 100}%`,
            backgroundColor: theme.visual.forest.glowFallback,
            experimental_backgroundImage: theme.visual.forest.glowImage,
            boxShadow: theme.visual.forest.glowShadow,
          },
          fillStyle,
        ]}
      />
    </View>
  )
}

function SlideProgressBar({
  ratio,
  testID,
  fillTestID,
  accessibilityLabel,
  accessibilityValue,
}: SlideProgressBarProps) {
  const theme = useBrandTheme()
  // The track's width, measured once: a state, so the fill is drawn again with it.
  const [width, setWidth] = useState(0)
  const shown = useSharedValue(ratio)

  useEffect(() => {
    shown.value = withTiming(ratio, {
      duration: downloadBarGeometry.smoothMs,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    })
  }, [ratio, shown])

  const fillStyle = useAnimatedStyle(() => ({
    // Hidden until the track is measured, so the fill never flashes full before its first layout.
    opacity: width > 0 ? 1 : 0,
    transform: [{ translateX: (shown.value - 1) * width }],
  }))
  const onLayout = (event: LayoutChangeEvent): void => setWidth(event.nativeEvent.layout.width)

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
      onLayout={onLayout}
      style={[styles.slideTrack, { backgroundColor: theme.visual.downloadBar.track }]}
    >
      <Animated.View
        testID={fillTestID}
        style={[styles.slideFill, { backgroundColor: theme.visual.downloadBar.fill }, fillStyle]}
      />
    </View>
  )
}

function PlainProgressBar({
  percent,
  height,
  radius,
  fillRadius,
  trackColor,
  fillColor,
  testID,
  fillTestID,
  style,
}: PlainProgressBarProps) {
  return (
    <View
      testID={testID}
      style={[
        styles.plainTrack,
        { height, borderRadius: radius, backgroundColor: trackColor },
        style,
      ]}
    >
      <View
        testID={fillTestID}
        style={{
          height,
          borderRadius: fillRadius,
          backgroundColor: fillColor,
          width: `${Math.max(0, Math.min(100, percent))}%`,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  glowTrack: {
    height: glowBarGeometry.height,
    borderRadius: glowBarGeometry.radius,
    // No overflow clipping: it would cut off the fill's glow. The fill never exceeds the track.
  },
  glowFill: {
    height: "100%",
    borderRadius: glowBarGeometry.radius,
    transformOrigin: "left",
  },
  slideTrack: {
    height: downloadBarGeometry.height,
    borderRadius: downloadBarGeometry.height / 2,
    overflow: "hidden",
  },
  slideFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: downloadBarGeometry.height / 2,
  },
  plainTrack: {
    overflow: "hidden",
  },
})
