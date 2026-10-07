import { ReactNode, useState } from "react"
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
} from "react-native"
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { brandMotion, brandRadius } from "../app/brand-tokens"
import { useBrandTheme } from "../app/theme"

export type RipplePressableProps = Omit<PressableProps, "children"> & {
  children: ReactNode
  /** Corner radius the wave is clipped to: the radius of the surface (the glass card by default). */
  rippleRadius?: number
}

export type PressWaveInput = {
  /** Touch point in the surface, from `nativeEvent.locationX` and `locationY`. */
  x: number | undefined
  y: number | undefined
  width: number
  height: number
  reduced: boolean
}

export type PressWaveGeometry = {
  /** Where the circle centre sits in the surface. */
  translateX: number
  translateY: number
  /** The circle is drawn at its largest size; these are fractions of it. */
  fromScale: number
  toScale: number
}

function clampToSurface(value: number | undefined, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return max / 2
  return Math.min(max, Math.max(0, value))
}

/**
 * Where the green wave starts and how far it must grow (D-21). The circle is drawn once at the radius
 * of the surface diagonal, so it can cover the surface from any point. A normal press starts at the
 * touch point, as a small disc, and ends with a radius that reaches the farthest corner. Under
 * Reduce Motion nothing travels: the circle sits at the centre at full size, covering the surface,
 * and the caller only fades it.
 */
export function computePressWave({
  x,
  y,
  width,
  height,
  reduced,
}: PressWaveInput): PressWaveGeometry {
  const drawnRadius = Math.hypot(width, height)
  if (reduced) {
    return { translateX: width / 2, translateY: height / 2, fromScale: 1, toScale: 1 }
  }
  const touchX = clampToSurface(x, width)
  const touchY = clampToSurface(y, height)
  const reach = Math.hypot(Math.max(touchX, width - touchX), Math.max(touchY, height - touchY))
  return {
    translateX: touchX,
    translateY: touchY,
    fromScale: Math.min(1, brandMotion.pressWave.startRadius / drawnRadius),
    toScale: reach / drawnRadius,
  }
}

/**
 * A `Pressable` with the green wave of a pressed list row (D-21): a moss circle grows from the touch
 * point to cover the surface in about 420 ms (decelerate) while it fades out, clipped to the
 * surface radius. The wave only draws; the press itself is the plain `Pressable` one, so `onPress`
 * fires at once and is never delayed. It works inside a swipe row, because the swipe gesture is
 * not touched. Under Reduce Motion there is no spatial wave, only a short highlight fade.
 *
 * The wave layer is the last child, covers the surface and receives the touch (so the touch point
 * is read relative to the surface, not to a text inside it): the children must not be pressable
 * themselves. It is hidden from accessibility, and `style`, `testID` and the accessibility props go
 * to the `Pressable` unchanged. Use it for list rows; `AppPressable` keeps its spring scale.
 */
export function RipplePressable({
  children,
  rippleRadius = brandRadius.card,
  onPressIn,
  ...pressableProps
}: RipplePressableProps) {
  const theme = useBrandTheme()
  const reduced = useReducedMotion()
  const [size, setSize] = useState({ width: 0, height: 0 })
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0)

  const waveStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setSize((previous) =>
      previous.width === width && previous.height === height ? previous : { width, height },
    )
  }

  const handlePressIn = (event: GestureResponderEvent) => {
    onPressIn?.(event)
    if (size.width <= 0 || size.height <= 0) return
    const wave = computePressWave({
      x: event.nativeEvent?.locationX,
      y: event.nativeEvent?.locationY,
      width: size.width,
      height: size.height,
      reduced,
    })
    cancelAnimation(scale)
    cancelAnimation(opacity)
    translateX.value = wave.translateX
    translateY.value = wave.translateY
    scale.value = wave.fromScale
    opacity.value = 1
    if (reduced) {
      // A highlight is not travel: it is allowed under Reduce Motion, so it opts out of the
      // system setting that would jump straight to the end value.
      opacity.value = withTiming(0, {
        duration: brandMotion.pressWave.reducedFadeMs,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.Never,
      })
      return
    }
    scale.value = withTiming(wave.toScale, {
      duration: brandMotion.pressWave.durationMs,
      easing: Easing.bezier(...brandMotion.easings.decelerate),
      reduceMotion: ReduceMotion.System,
    })
    opacity.value = withTiming(0, {
      duration: brandMotion.pressWave.durationMs,
      easing: Easing.bezier(...brandMotion.easings.accelerate),
      reduceMotion: ReduceMotion.System,
    })
  }

  const drawnRadius = Math.hypot(size.width, size.height)

  return (
    <Pressable {...pressableProps} onPressIn={handlePressIn}>
      {children}
      <View
        style={[styles.layer, { borderRadius: rippleRadius }]}
        onLayout={handleLayout}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID="ripple-layer"
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wave,
            {
              backgroundColor: theme.visual.pressWave,
              left: -drawnRadius,
              top: -drawnRadius,
              width: drawnRadius * 2,
              height: drawnRadius * 2,
              borderRadius: drawnRadius,
            },
            waveStyle,
          ]}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  wave: {
    position: "absolute",
    opacity: 0,
  },
})
