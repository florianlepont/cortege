import { useCallback, useEffect, useState } from "react"
import { LayoutChangeEvent, StyleSheet, View } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { useBrandTheme } from "../app/theme"
import { forestRipples } from "../app/visual-tokens"
import { useScreenVisible } from "./useScreenVisible"

const { size: RING_SIZE, count: RING_COUNT } = forestRipples

export type RipplePoint = { x: number; y: number }
type Size = { width: number; height: number }

/** Where the rings start when the card gives no point: about where its button sits. */
export function defaultRippleOrigin({ width, height }: Size): RipplePoint {
  return { x: width * 0.8, y: height * 0.4 }
}

/** The scale at which a ring started at `origin` covers the card's farthest corner. */
export function rippleEndScale({ width, height }: Size, origin: RipplePoint): number {
  const dx = Math.max(origin.x, width - origin.x)
  const dy = Math.max(origin.y, height - origin.y)
  return Math.max(forestRipples.scaleEarly, (2 * Math.hypot(dx, dy)) / RING_SIZE)
}

/** Opacity and scale of a ring `progress` (0 to 1) through its cycle: the sign-in's keyframes. */
export function rippleAt(progress: number, endScale: number): { opacity: number; scale: number } {
  "worklet"
  const r = forestRipples
  return {
    opacity: interpolate(
      progress,
      [0, r.peakAt, r.fadeAt, 1],
      [0, r.peakOpacity, r.fadeOpacity, 0],
      Extrapolation.CLAMP,
    ),
    scale: interpolate(
      progress,
      [0, r.growAt, 1],
      [r.scaleStart, r.scaleEarly, endScale],
      Extrapolation.CLAMP,
    ),
  }
}

/** Where ring `index` stands in its cycle for a shared phase: each a third of a cycle behind. */
export function ringProgress(phase: number, index: number): number {
  "worklet"
  return (((phase - index / RING_COUNT) % 1) + 1) % 1
}

type RingProps = {
  phase: SharedValue<number>
  index: number
  origin: RipplePoint
  end: number
  colour: string
}

function Ring({ phase, index, origin, end, colour }: RingProps) {
  const ringStyle = useAnimatedStyle(() => {
    const ring = rippleAt(ringProgress(phase.value, index), end)
    return { opacity: ring.opacity, transform: [{ scale: ring.scale }] }
  })
  return (
    <Animated.View
      testID="forest-ripple"
      style={[
        styles.ring,
        { left: origin.x - RING_SIZE / 2, top: origin.y - RING_SIZE / 2, backgroundColor: colour },
        ringStyle,
      ]}
    />
  )
}

type ForestRipplesProps = {
  /** The point the rings spread from, in the card's coordinates: the centre of its button. */
  origin?: RipplePoint | null
  testID?: string
}

/**
 * The ripples of Accueil's forest card (12.2-19 third round, owner: "ce n'est pas l'animation de
 * l'écran de connexion"): the sign-in hero's three blobs, retold as three discs that spread from
 * behind the card's button to its farthest corner and fade out, each a third of a 10 s linear cycle
 * behind the one before. They are a green only slightly lighter than the card gradient and at most
 * 0.14 opaque, so the text over them keeps its contrast (`visual-tokens.test.ts`). The parent clips
 * them to its rounded corners. One loop drives the three, on the UI thread, transforms and opacity
 * only; it carries on from where it stopped, runs only while the screen can be seen, and there are
 * no rings under Reduce Motion (the card is still). Decoration only, never touched or read.
 */
export function ForestRipples({ origin, testID }: ForestRipplesProps) {
  const theme = useBrandTheme()
  const visible = useScreenVisible()
  const reduced = useReducedMotion()
  const [card, setCard] = useState<Size | null>(null)
  const phase = useSharedValue(0)
  const animate = visible && !reduced && card !== null

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setCard((current) =>
      current && current.width === width && current.height === height ? current : { width, height },
    )
  }, [])

  useEffect(() => {
    if (!animate) {
      // Hidden: the rings stop where they are, and go on from there when the screen comes back.
      cancelAnimation(phase)
      return undefined
    }
    const from = phase.value % 1
    phase.value = from
    phase.value = withRepeat(
      withTiming(from + 1, {
        duration: forestRipples.cycleMs,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    )
    return () => cancelAnimation(phase)
  }, [animate, phase])

  const start = card ? (origin ?? defaultRippleOrigin(card)) : null
  const end = card && start ? rippleEndScale(card, start) : forestRipples.scaleEarly

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={handleLayout}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {start && !reduced
        ? Array.from({ length: RING_COUNT }, (_, index) => (
            <Ring
              key={index}
              phase={phase}
              index={index}
              origin={start}
              end={end}
              colour={theme.visual.forest.ripple}
            />
          ))
        : null}
    </View>
  )
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
})
