import { memo, useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { useBrandTheme } from "../../app/theme"
import { edgeGlowGeometry, edgePulseMotion } from "../../app/visual-tokens"
import { useScreenVisible } from "../../ui/useScreenVisible"

const { halfCycleMs, minOpacity, stillOpacity } = edgePulseMotion

/** Opacity of the deeper halo for a given beat opacity: nothing at the low point, full at the top. */
export function deepHaloOpacity(beat: number): number {
  "worklet"
  return Math.min(1, Math.max(0, (beat - minOpacity) / (1 - minOpacity)))
}

/**
 * The green edge of the Explorer in download mode (12.2-19): an inset glow round the whole screen,
 * with its rounded corners (`edgeGlowGeometry.corner`), a 3 pt line, a tight band and a halo
 * (`theme.visual.edgeGlow`) beating strongly between 0.35 and full strength on a 1.5 s cycle, and a
 * deeper halo (`theme.visual.edgeGlowDeep`, 52 pt) that swells in at the top of each beat. Third fix
 * round (owner: "j'aurais préféré juste un pulse plus fort, pas le truc qui tourne"): the light that
 * travelled round the edge is gone, only the pulse is left. The Explorer asks for it through
 * `DownloadEdgeGlow`; the navigation layer draws it above the panel and the tab bar. It never takes
 * a touch, and it is hidden from screen readers (the panel's subtitle says the same in words). The
 * beat runs on the UI thread (opacity only) and only while the screen can be seen; under Reduce
 * Motion the glow is still, at full strength with its deep halo.
 */
export const EdgePulse = memo(function EdgePulse() {
  const theme = useBrandTheme()
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  const animate = visible && !reduced
  const opacity = useSharedValue<number>(animate ? minOpacity : stillOpacity)

  useEffect(() => {
    if (!animate) {
      cancelAnimation(opacity)
      opacity.value = stillOpacity
      return undefined
    }
    opacity.value = minOpacity
    opacity.value = withRepeat(
      withTiming(1, {
        duration: halfCycleMs,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    )
    return () => cancelAnimation(opacity)
  }, [animate, opacity])

  const haloStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const deepStyle = useAnimatedStyle(() => ({ opacity: deepHaloOpacity(opacity.value) }))

  return (
    <View
      testID="explorer-edge-pulse"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View
        testID="explorer-edge-deep"
        style={[
          StyleSheet.absoluteFill,
          styles.corner,
          { boxShadow: theme.visual.edgeGlowDeep },
          deepStyle,
        ]}
      />
      <Animated.View
        testID="explorer-edge-halo"
        style={[
          StyleSheet.absoluteFill,
          styles.corner,
          { boxShadow: theme.visual.edgeGlow },
          haloStyle,
        ]}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  corner: { borderRadius: edgeGlowGeometry.corner },
})
