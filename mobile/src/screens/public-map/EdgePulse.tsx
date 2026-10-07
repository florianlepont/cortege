import { memo, useEffect } from "react"
import { StyleSheet } from "react-native"
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
import { edgePulseMotion } from "../../app/visual-tokens"
import { useScreenVisible } from "../../ui/useScreenVisible"

const { halfCycleMs, minOpacity, stillOpacity } = edgePulseMotion

/**
 * The green edge of the Explorer map in download mode (12.2-19): an inset glow over the whole map,
 * pulsing gently (opacity only, on the UI thread, a 1.6 s cycle) so the area shown reads as the one
 * that will be downloaded. Mounted only while that mode lasts. It never takes a touch, and it is
 * hidden from screen readers (the panel's subtitle says the same in words). The loop runs only
 * while the screen can be seen; under Reduce Motion the glow is still.
 */
export const EdgePulse = memo(function EdgePulse() {
  const theme = useBrandTheme()
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  const opacity = useSharedValue<number>(reduced ? stillOpacity : minOpacity)

  useEffect(() => {
    if (reduced || !visible) {
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
  }, [opacity, reduced, visible])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      testID="explorer-edge-pulse"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { boxShadow: theme.visual.edgeGlow }, animatedStyle]}
    />
  )
})
