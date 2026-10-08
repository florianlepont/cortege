import { useEffect, useRef } from "react"
import { StyleSheet } from "react-native"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import { brandMotion } from "../app/brand-tokens"

type HaloPulseProps = {
  /** The layer pulses once each time this value changes after mount (never on the first mount). */
  trigger: number
  /** Corner radius of the element the halo surrounds. */
  radius: number
  /** A `boxShadow` token, for example `theme.visual.forest.shadow` or `theme.visual.pill.shadow`. */
  shadow: string
  testID?: string
}

const HALF = brandMotion.durations.emphasis / 2

/**
 * One-shot halo for action feedback (submit and sync success, D-08): a static shadow layer whose
 * opacity goes 0 to 1 to 0 over 500 ms. Only the opacity animates, never the shadow itself. No
 * pulse on first mount or under Reduce Motion. Callers fire their own `feedback.notify.success()`.
 */
export function HaloPulse({ trigger, radius, shadow, testID }: HaloPulseProps) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(0)
  const previous = useRef(trigger)

  useEffect(() => {
    if (previous.current === trigger) return
    previous.current = trigger
    if (reduced) return
    opacity.value = withSequence(
      withTiming(1, { duration: HALF, reduceMotion: ReduceMotion.System }),
      withTiming(0, { duration: HALF, reduceMotion: ReduceMotion.System }),
    )
  }, [trigger, reduced, opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: shadow }, animatedStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    />
  )
}
