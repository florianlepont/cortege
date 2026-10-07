import { useEffect } from "react"
import { StyleSheet } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { Path, Svg } from "react-native-svg"
import { CONTOUR_PATHS, CONTOUR_VIEWBOX } from "../app/contour-paths"
import { useBrandTheme } from "../app/theme"
import { contourDrift } from "../app/visual-tokens"
import { useScreenFocus } from "./useScreenFocus"

type ContourLinesProps = {
  /** Drift loop on (default). Off draws the static frame; Android passes false if frames drop. */
  animated?: boolean
  testID?: string
}

/**
 * The topographic contour signature of variant I (decoration only). The slow drift runs only while
 * the screen is focused and never under Reduce Motion, which renders the static first frame.
 * Budget: at most two animated instances per visible screen, and never placed over a live map
 * (D-13). Only transforms are animated.
 */
export function ContourLines({ animated = true, testID }: ContourLinesProps) {
  const theme = useBrandTheme()
  const t = useSharedValue(0)
  const focused = useScreenFocus()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!animated || !focused || reduced) {
      cancelAnimation(t)
      return undefined
    }
    t.value = withRepeat(
      withTiming(1, {
        duration: contourDrift.durationMs,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    )
    return () => cancelAnimation(t)
  }, [animated, focused, reduced, t])

  const driftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [...contourDrift.translateX]) },
      { translateY: interpolate(t.value, [0, 1], [...contourDrift.translateY]) },
      { scale: interpolate(t.value, [0, 1], [...contourDrift.scale]) },
    ],
  }))

  return (
    <Animated.View
      style={[styles.layer, driftStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={CONTOUR_VIEWBOX}
        preserveAspectRatio="xMidYMid slice"
      >
        <Path
          d={CONTOUR_PATHS.sage}
          stroke={theme.visual.forest.contourSage}
          strokeWidth={contourDrift.sageWidth}
          strokeOpacity={contourDrift.sageOpacity}
          fill="none"
        />
        <Path
          d={CONTOUR_PATHS.moss}
          stroke={theme.visual.forest.contourMoss}
          strokeWidth={contourDrift.mossWidth}
          strokeOpacity={contourDrift.mossOpacity}
          fill="none"
        />
      </Svg>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: contourDrift.inset,
    left: contourDrift.inset,
    right: contourDrift.inset,
    bottom: contourDrift.inset,
  },
})
