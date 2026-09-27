import { useEffect } from "react"
import { AppState, StyleSheet, View, ViewStyle } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { brandColors, brandRadius, brandSpacing4 } from "../app/brand-tokens"

const PULSE_DURATION_MS = 900
const REDUCED_MOTION_OPACITY = 0.75

type SkeletonProps = {
  width?: number | `${number}%`
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

/**
 * A pulsing loading placeholder (DS-08, audit §4: opacity 0.5 → 1, 900ms), replacing the static
 * grey boxes that gave no signal a load was in progress. Pauses the loop while the app is
 * backgrounded and renders a fixed opacity instead of pulsing when "Reduce Motion" is on.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = brandRadius.field,
  style,
}: SkeletonProps) {
  const reducedMotion = useReducedMotion()
  const opacity = useSharedValue(reducedMotion ? REDUCED_MOTION_OPACITY : 0.5)

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = REDUCED_MOTION_OPACITY
      return
    }

    const startPulse = (): void => {
      opacity.value = withRepeat(
        withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      )
    }
    startPulse()

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        startPulse()
      } else {
        cancelAnimation(opacity)
      }
    })

    return () => {
      cancelAnimation(opacity)
      subscription.remove()
    }
  }, [opacity, reducedMotion])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: brandColors.panelMuted },
        style,
        animatedStyle,
      ]}
    />
  )
}

/** A leading-block-plus-two-lines row, shaped like the card rows it stands in for (draft, parcel). */
export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} borderRadius={brandRadius.avatar} />
      <View style={styles.lines}>
        <Skeleton width="60%" height={12} />
        <Skeleton width="40%" height={10} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: brandSpacing4.smd,
  },
  lines: {
    flex: 1,
    gap: brandSpacing4.xs,
  },
})
