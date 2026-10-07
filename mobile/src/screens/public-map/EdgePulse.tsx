import { memo, useEffect } from "react"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { Rect, Svg } from "react-native-svg"
import { useBrandTheme } from "../../app/theme"
import {
  edgeGlowGeometry,
  edgeGlowGreens,
  edgeLightMotion,
  edgePulseMotion,
} from "../../app/visual-tokens"
import { useScreenVisible } from "../../ui/useScreenVisible"

const AnimatedRect = Animated.createAnimatedComponent(Rect)

const { halfCycleMs, minOpacity, stillOpacity } = edgePulseMotion
const { lapMs, fraction, coreWidth, glowWidth, glowOpacity } = edgeLightMotion

/** Length of a rounded rectangle's outline: the four straight sides plus one full circle. */
export function roundedRectPerimeter(width: number, height: number, radius: number): number {
  return 2 * (width + height) - (8 - 2 * Math.PI) * radius
}

/**
 * The outline one stroke of the light follows: a rounded rectangle inset by half the stroke, so the
 * stroke lies on screen along the edge, and a dash `fraction` of its length. Moving the dash offset
 * from 0 to minus the perimeter carries the dash once round, clockwise from the top left.
 */
export function lightPath(width: number, height: number, strokeWidth: number) {
  const inset = strokeWidth / 2
  const rectWidth = Math.max(0, width - strokeWidth)
  const rectHeight = Math.max(0, height - strokeWidth)
  const radius = Math.max(0, edgeGlowGeometry.corner - inset)
  const perimeter = roundedRectPerimeter(rectWidth, rectHeight, radius)
  const dash = perimeter * fraction
  return {
    rect: { x: inset, y: inset, width: rectWidth, height: rectHeight, rx: radius, ry: radius },
    perimeter,
    dashArray: [dash, perimeter - dash],
  }
}

/**
 * The green edge of the Explorer in download mode (12.2-19): an inset glow round the whole screen,
 * with its rounded corners (`edgeGlowGeometry.corner`), a 3 pt line, a tight band and a halo
 * (`theme.visual.edgeGlow`) pulsing gently between 0.7 and full strength, and a brighter light that
 * travels round it clockwise, one lap in 3.2 s (an SVG dash whose offset runs on the UI thread). The
 * Explorer asks for it through `DownloadEdgeGlow`; the navigation layer draws it above the panel and
 * the tab bar. It never takes a touch, and it is hidden from screen readers (the panel's subtitle
 * says the same in words). The loops run only while the screen can be seen; under Reduce Motion the
 * glow is still, at full strength, and no light travels.
 */
export const EdgePulse = memo(function EdgePulse() {
  const theme = useBrandTheme()
  const reduced = useReducedMotion()
  const visible = useScreenVisible()
  const { width, height } = useWindowDimensions()
  const animate = visible && !reduced
  const opacity = useSharedValue<number>(animate ? minOpacity : stillOpacity)
  const lap = useSharedValue(0)

  useEffect(() => {
    if (!animate) {
      cancelAnimation(opacity)
      cancelAnimation(lap)
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
    lap.value = 0
    lap.value = withRepeat(
      withTiming(1, {
        duration: lapMs,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    )
    return () => {
      cancelAnimation(opacity)
      cancelAnimation(lap)
    }
  }, [animate, lap, opacity])

  const haloStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  const glow = lightPath(width, height, glowWidth)
  const core = lightPath(width, height, coreWidth)
  // Each stroke runs its own outline in one lap, so the soft light and its core stay together.
  const glowPerimeter = glow.perimeter
  const corePerimeter = core.perimeter
  const glowProps = useAnimatedProps(() => ({ strokeDashoffset: -lap.value * glowPerimeter }))
  const coreProps = useAnimatedProps(() => ({ strokeDashoffset: -lap.value * corePerimeter }))

  return (
    <View
      testID="explorer-edge-pulse"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View
        testID="explorer-edge-halo"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: edgeGlowGeometry.corner, boxShadow: theme.visual.edgeGlow },
          haloStyle,
        ]}
      />
      {animate ? (
        <Svg testID="explorer-edge-light" width={width} height={height} style={styles.light}>
          <AnimatedRect
            {...glow.rect}
            fill="none"
            stroke={edgeGlowGreens.halo}
            strokeOpacity={glowOpacity}
            strokeWidth={glowWidth}
            strokeLinecap="round"
            strokeDasharray={glow.dashArray}
            animatedProps={glowProps}
          />
          <AnimatedRect
            {...core.rect}
            fill="none"
            stroke={edgeGlowGreens.light}
            strokeWidth={coreWidth}
            strokeLinecap="round"
            strokeDasharray={core.dashArray}
            animatedProps={coreProps}
          />
        </Svg>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  light: { position: "absolute", top: 0, left: 0 },
})
