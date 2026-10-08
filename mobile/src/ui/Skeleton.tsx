import { useEffect } from "react"
import { AppState, StyleSheet, View, ViewStyle } from "react-native"
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
import { brandRadius, brandSpacing4 } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"
import { useScreenVisible } from "./useScreenVisible"

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
 * backgrounded and renders a fixed opacity instead of pulsing when "Reduce Motion" is on. The loop
 * also runs only while its screen can be seen (12.2-21 motion audit): a skeleton left under a pushed
 * page, on another tab or under the sign-in overlay stops where it is.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = brandRadius.field,
  style,
}: SkeletonProps) {
  const theme = useBrandTheme()
  const reducedMotion = useReducedMotion()
  const visible = useScreenVisible()
  const opacity = useSharedValue(reducedMotion ? REDUCED_MOTION_OPACITY : 0.5)

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(opacity)
      opacity.value = REDUCED_MOTION_OPACITY
      return undefined
    }
    if (!visible) {
      cancelAnimation(opacity)
      return undefined
    }

    const startPulse = (): void => {
      opacity.value = withRepeat(
        withTiming(1, {
          duration: PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        true,
        undefined,
        ReduceMotion.System,
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
  }, [opacity, reducedMotion, visible])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: theme.colors.panelMuted },
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
