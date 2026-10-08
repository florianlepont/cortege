import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
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
import { glowBarGeometry } from "../app/visual-tokens"

type GlowBarProps = {
  /** Filled share of the track, clamped to 0..1. */
  ratio: number
  /** Grow the fill in on mount (500 ms decelerate after a short delay). */
  animate?: boolean
  delayMs?: number
  testID?: string
}

const [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] = brandMotion.easings.decelerate

/**
 * A 6 pt glowing gauge. The fill keeps its final width and grows with `scaleX` from the left:
 * only the transform animates, never `width` or `boxShadow`. Under Reduce Motion the final state
 * shows at once.
 */
export function GlowBar({
  ratio,
  animate = false,
  delayMs = glowBarGeometry.delayMs,
  testID,
}: GlowBarProps) {
  const theme = useBrandTheme()
  const reduced = useReducedMotion()
  const grows = animate && !reduced
  const scale = useSharedValue(grows ? 0 : 1)
  const clamped = Math.max(0, Math.min(1, ratio))

  useEffect(() => {
    if (!grows) return
    scale.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: brandMotion.durations.emphasis,
        easing: Easing.bezier(EASE_X1, EASE_Y1, EASE_X2, EASE_Y2),
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [grows, delayMs, scale])

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: scale.value }] }))

  return (
    <View
      style={[styles.track, { backgroundColor: theme.visual.forest.glowTrack }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
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

const styles = StyleSheet.create({
  track: {
    height: glowBarGeometry.height,
    borderRadius: glowBarGeometry.radius,
    // No overflow clipping: it would cut off the fill's glow. The fill never exceeds the track.
  },
  fill: {
    height: "100%",
    borderRadius: glowBarGeometry.radius,
    transformOrigin: "left",
  },
})
