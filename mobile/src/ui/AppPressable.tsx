import { forwardRef } from "react"
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  View,
  ViewStyle,
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { brandInteraction, brandMotion } from "../app/brand-tokens"

export type AppPressableProps = Omit<PressableProps, "accessibilityLabel"> & {
  /** Required (DS-06): every AppPressable must name what it does for a screen reader. */
  accessibilityLabel: string
  /** Android's ripple color; defaults to a neutral dark overlay that reads on any surface. */
  rippleColor?: string
  /** Opt out of the spring scale — for a control that already animates its own press state. */
  disableScale?: boolean
}

/**
 * The single pressable primitive (DS-06): spring scale on press, Android ripple, and a mandatory
 * accessibility label, replacing the inconsistent pressed-opacity values (0.7, 0.4, 0.76...) spread
 * across individual components. Respects "Reduce Motion" by skipping the scale animation entirely.
 *
 * The scale lives on an inner `Animated.View`, not on the `Pressable` itself: Reanimated's
 * `createAnimatedComponent` can't consume `style` in its function-of-pressed-state form, which
 * callers of the plain RN `Pressable` rely on (`style={({ pressed }) => ...}`) — wrapping instead
 * of replacing keeps that form working.
 */
export const AppPressable = forwardRef<View, AppPressableProps>(function AppPressable(
  {
    accessibilityLabel,
    accessibilityRole,
    style,
    children,
    onPressIn,
    onPressOut,
    rippleColor,
    disableScale,
    disabled,
    ...rest
  },
  ref,
) {
  const reducedMotion = useReducedMotion()
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disableScale && !reducedMotion) {
      scale.value = withSpring(brandInteraction.pressedScale, brandMotion.springs.press)
    }
    onPressIn?.(event)
  }

  const handlePressOut = (event: GestureResponderEvent) => {
    if (!disableScale && !reducedMotion) {
      scale.value = withSpring(1, brandMotion.springs.press)
    }
    onPressOut?.(event)
  }

  const resolveStyle = (state: PressableStateCallbackType): StyleProp<ViewStyle> =>
    typeof style === "function" ? style(state) : style

  return (
    <Pressable
      ref={ref}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: rippleColor ?? brandInteraction.rippleColor }}
      {...rest}
    >
      {(state) => (
        <Animated.View style={[resolveStyle(state), animatedStyle]}>
          {typeof children === "function" ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  )
})
