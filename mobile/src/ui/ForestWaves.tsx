import { useCallback, useEffect, useMemo, useState } from "react"
import { LayoutChangeEvent, StyleSheet, View } from "react-native"
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
import { Path, Svg } from "react-native-svg"
import { useBrandTheme } from "../app/theme"
import { forestWaves } from "../app/visual-tokens"
import { useScreenVisible } from "./useScreenVisible"

const { baselines, amplitudeRatio, periodRatio } = forestWaves
const TURN = 2 * Math.PI

/** One endless linear loop of a phase, carried on from where it stands, so a pause never jumps. */
function loopFrom(from: number, durationMs: number) {
  return withRepeat(
    withTiming(from + 1, {
      duration: durationMs,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    }),
    -1,
    false,
    undefined,
    ReduceMotion.System,
  )
}

type Size = { width: number; height: number }

/**
 * The three wave lines of a card `width` by `height`, as one path. Each line is a run of quadratic
 * arcs (a smooth wave, close to a sine), starting one wavelength before the card and ending one after
 * it, so the layer can slide by a whole wavelength and loop with no seam. The lines are a third of a
 * wavelength apart, and each is a little flatter than the one above it.
 */
export function buildWavePath({ width, height }: Size): string {
  const period = width * periodRatio
  if (period <= 0 || height <= 0) return ""
  const half = period / 2
  const end = width + period * 2
  return baselines
    .map((baseline, index) => {
      const y = round(height * baseline)
      const crest = round(height * amplitudeRatio * (1 - index * 0.2) * 2)
      let x = -period + (index * period) / 3
      const parts = [
        `M ${round(x)} ${y}`,
        `Q ${round(x + half / 2)} ${y - crest} ${round(x + half)} ${y}`,
      ]
      x += half
      while (x < end) {
        x += half
        parts.push(`T ${round(x)} ${y}`)
      }
      return parts.join(" ")
    })
    .join(" ")
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * The flowing waves of Accueil's forest card (12.2-19 fix round): the sign-in screen's ripples,
 * retold as slow sage wave lines that drift sideways (one wavelength in 12 s, linear) and breathe up
 * and down on a sine over a 10 s cycle, the sign-in's. Both loops carry on from where they stopped,
 * so leaving and coming back to Accueil never makes the waves jump. Decoration only: one SVG path in
 * one animated layer, transforms only, on the UI thread, no per-frame JS (the path is built once per
 * card size). The parent clips it to its rounded corners. The loops run only while the screen can be
 * seen and never under Reduce Motion, which draws the still first frame. Counts as one animated
 * instance of the screen's budget of two (D-13).
 */
export function ForestWaves({ testID }: { testID?: string }) {
  const theme = useBrandTheme()
  const visible = useScreenVisible()
  const reduced = useReducedMotion()
  const [size, setSize] = useState<Size | null>(null)
  const period = useSharedValue(0)
  // Two phases, read modulo 1: the drift (a wavelength per lap) and the breath (a sine per lap).
  const drift = useSharedValue(0)
  const breath = useSharedValue(0)
  const animate = visible && !reduced && size !== null

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout
      period.value = width * periodRatio
      setSize((current) =>
        current && current.width === width && current.height === height
          ? current
          : { width, height },
      )
    },
    [period],
  )

  useEffect(() => {
    if (!animate) {
      // Hidden: the waves stop where they are. Reduce Motion: the still first frame.
      cancelAnimation(drift)
      cancelAnimation(breath)
      if (reduced) {
        drift.value = 0
        breath.value = 0
      }
      return undefined
    }
    const driftFrom = drift.value % 1
    const breathFrom = breath.value % 1
    drift.value = driftFrom
    breath.value = breathFrom
    drift.value = loopFrom(driftFrom, forestWaves.travelMs)
    breath.value = loopFrom(breathFrom, forestWaves.breatheMs)
    return () => {
      cancelAnimation(drift)
      cancelAnimation(breath)
    }
  }, [animate, breath, drift, reduced])

  const flowStyle = useAnimatedStyle(() => {
    const swell = Math.sin((breath.value % 1) * TURN)
    return {
      transform: [
        { translateX: -(drift.value % 1) * period.value },
        { translateY: swell * forestWaves.breatheY },
        { scaleY: 1 + swell * forestWaves.breatheScaleY },
      ],
    }
  })

  const path = useMemo(() => (size ? buildWavePath(size) : ""), [size])
  const layerWidth = size ? size.width * (1 + periodRatio) : 0

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={handleLayout}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {size ? (
        <Animated.View style={[styles.flow, { width: layerWidth }, flowStyle]}>
          <Svg width={layerWidth} height={size.height}>
            <Path
              d={path}
              stroke={theme.visual.forest.contourSage}
              strokeWidth={forestWaves.width}
              strokeOpacity={forestWaves.opacity}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flow: { position: "absolute", top: 0, bottom: 0, left: 0 },
})
