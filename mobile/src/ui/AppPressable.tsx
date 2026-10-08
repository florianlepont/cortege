import { forwardRef } from "react"
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  StyleSheet,
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
  /**
   * Opt out of the spring scale, for a control that already animates its own press state (a row
   * with a pressed fill) or sits in a `GlassSurface interactive` (Liquid Glass shimmers by itself).
   * Without the scale there is no wrapper view: `style` goes straight to the `Pressable`, exactly
   * like a plain React Native one.
   */
  disableScale?: boolean
  /** Opt out of the Android ripple, when the pressed fill or the host surface already answers. */
  disableRipple?: boolean
}

type FlatStyle = ViewStyle & Record<string, unknown>

/**
 * Keys that place or size the pressable inside its parent. With the scale, they stay on the
 * `Pressable` (the outer box), so a card with `flex: 1`, a margin or an absolute position is laid
 * out as before; everything else (padding, fill, radius, row direction...) goes to the inner view
 * that scales, which grows to fill the outer box.
 */
const OUTER_STYLE_KEYS = new Set([
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "aspectRatio",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "start",
  "end",
  "zIndex",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginHorizontal",
  "marginVertical",
  "marginStart",
  "marginEnd",
])

const SIZE_STYLE_KEYS = new Set([
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
])

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return style.reduce<FlatStyle>((acc, entry) => ({ ...acc, ...flattenStyle(entry) }), {})
  }
  return (style as FlatStyle | null | undefined | false) || {}
}

function splitStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const outer: Record<string, unknown> = {}
  const inner: Record<string, unknown> = {}
  const flat = flattenStyle(style)
  for (const key of Object.keys(flat)) {
    const value = flat[key]
    if (!OUTER_STYLE_KEYS.has(key)) {
      inner[key] = value
      continue
    }
    outer[key] = value
    // A fixed size is repeated on the inner view (same box, so the layout is unchanged); a
    // percentage would compound, so it stays outer only and the inner view grows to fill it.
    if (SIZE_STYLE_KEYS.has(key) && typeof value === "number") inner[key] = value
  }
  return { outer, inner }
}

/**
 * The single pressable primitive (DS-06, charter 12.4): spring scale on press, Android ripple, and a
 * mandatory accessibility label, replacing the inconsistent pressed-opacity values (0.7, 0.4,
 * 0.76...) that were spread across components. Respects "Reduce Motion" by skipping the scale.
 * `accessibilityRole` defaults to `button`; pass `radio`, `tab`, `link`, `none`... when it is not one.
 *
 * The scale lives on an inner `Animated.View`, not on the `Pressable` itself: Reanimated's
 * `createAnimatedComponent` can't consume `style` in its function-of-pressed-state form, which
 * callers of the plain RN `Pressable` rely on (`style={({ pressed }) => ...}`). The layout keys of
 * `style` (size, flex, margin, position...) stay on the `Pressable`, the rest goes to the inner view.
 * With `disableScale` there is no inner view and `style` is the `Pressable`'s own.
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
    disableRipple,
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

  const common = {
    ref,
    accessibilityRole: accessibilityRole ?? "button",
    accessibilityLabel,
    disabled,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    android_ripple: disableRipple
      ? undefined
      : { color: rippleColor ?? brandInteraction.rippleColor },
    ...rest,
  } as const

  if (disableScale) {
    return (
      <Pressable {...common} style={style}>
        {children}
      </Pressable>
    )
  }

  return (
    <Pressable {...common} style={(state) => splitStyle(resolveStyle(state)).outer}>
      {(state) => (
        <Animated.View style={[styles.fill, splitStyle(resolveStyle(state)).inner, animatedStyle]}>
          {typeof children === "function" ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  )
})

const styles = StyleSheet.create({
  fill: { flexGrow: 1 },
})
