import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { Circle, Defs, LinearGradient, Path, RadialGradient, Stop, Svg } from "react-native-svg"
import {
  AURORA_DISCS,
  type AuroraDisc,
  TRACE_PATHS,
  TRACE_TOTAL_MS,
  TRACE_VIEWBOX,
  traceMotion,
} from "../app/forest-aurora-shape"
import { forestAurora, forestShieldImage } from "../app/visual-tokens"
import { useScreenVisible } from "./useScreenVisible"

const AnimatedPath = Animated.createAnimatedComponent(Path)

const TRACE_TONES = ["light", "deep"] as const

/** 0 to 1 and back over a phase of period 2, eased in and out: the alternate drift of a disc. */
export function pingPong(phase: number): number {
  "worklet"
  const p = ((phase % 2) + 2) % 2
  const x = p <= 1 ? p : 2 - p
  return x * x * (3 - 2 * x)
}

/** Offset and scale of a disc at `phase`: at rest for 0, at the far end of its drift for 1. */
export function discPose(
  phase: number,
  disc: AuroraDisc,
): { translateX: number; translateY: number; scale: number } {
  "worklet"
  const k = pingPong(phase)
  const [from, to] = disc.travel.scale
  return {
    translateX: disc.travel.x * k,
    translateY: disc.travel.y * k,
    scale: from + (to - from) * k,
  }
}

/** Dash offset of line `index` when the tracing is `drawn` (0 to 1) through: `dash` hides it. */
export function traceOffset(drawn: number, index: number): number {
  "worklet"
  const { dash, drawMs, staggerMs } = traceMotion
  const local = Math.min(1, Math.max(0, (drawn * TRACE_TOTAL_MS - index * staggerMs) / drawMs))
  return dash * (1 - local * local * (3 - 2 * local))
}

/** Opacity of the drawn contours at a breathing `phase`: full at rest, `breatheLow` at most. */
export function breathOpacity(phase: number): number {
  "worklet"
  return 1 - (1 - traceMotion.breatheLow) * pingPong(phase)
}

/** A seamless loop: the phase runs on by 2 (there and back) from where it stopped, linearly. */
function loop(phase: SharedValue<number>, halfCycleMs: number) {
  const from = phase.value % 2
  phase.value = from
  return withRepeat(
    withTiming(from + 2, {
      duration: 2 * halfCycleMs,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    }),
    -1,
    false,
    undefined,
    ReduceMotion.System,
  )
}

type LayerProps = { run: boolean; reduced: boolean }

function Disc({ disc, run, reduced }: LayerProps & { disc: AuroraDisc }) {
  const phase = useSharedValue(0)
  const tone = forestAurora[disc.key]
  const id = `forest-aurora-${disc.key}`

  useEffect(() => {
    if (reduced) {
      // Still, at its rest.
      cancelAnimation(phase)
      phase.value = 0
      return undefined
    }
    if (!run) {
      // Hidden: it stops where it is and drifts on from there when the screen comes back.
      cancelAnimation(phase)
      return undefined
    }
    phase.value = loop(phase, disc.halfCycleMs)
    return () => cancelAnimation(phase)
  }, [disc.halfCycleMs, phase, reduced, run])

  const driftStyle = useAnimatedStyle(() => {
    const pose = discPose(phase.value, disc)
    return {
      transform: [
        { translateX: pose.translateX },
        { translateY: pose.translateY },
        { scale: pose.scale },
      ],
    }
  })

  return (
    <Animated.View
      testID="forest-aurora-disc"
      style={[styles.disc, { width: disc.size, height: disc.size, ...disc.anchor }, driftStyle]}
    >
      <Svg width={disc.size} height={disc.size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {forestAurora.falloff.map(([at, share]) => (
              <Stop key={at} offset={at} stopColor={tone.colour} stopOpacity={tone.peak * share} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={disc.size / 2} cy={disc.size / 2} r={disc.size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  )
}

function TraceLine({ d, index, drawn }: { d: string; index: number; drawn: SharedValue<number> }) {
  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: traceOffset(drawn.value, index) }))
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={`url(#forest-trace-${TRACE_TONES[index % 2]})`}
      strokeWidth={forestAurora.trace.width}
      strokeLinecap="round"
      strokeDasharray={[traceMotion.dash, traceMotion.dash]}
      animatedProps={dashProps}
    />
  )
}

function Trace({ start, run, reduced }: LayerProps & { start: number }) {
  const drawn = useSharedValue(reduced ? 1 : 0)
  const breath = useSharedValue(0)

  useEffect(() => {
    if (reduced) {
      // Fully drawn and still.
      cancelAnimation(drawn)
      cancelAnimation(breath)
      drawn.value = 1
      breath.value = 0
      return undefined
    }
    if (!run) {
      cancelAnimation(drawn)
      cancelAnimation(breath)
      return undefined
    }
    // Drawn once: what is left of it, then the breathing starts from full strength.
    const left = TRACE_TOTAL_MS * (1 - drawn.value)
    if (left > 0) {
      drawn.value = withTiming(1, {
        duration: left,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      })
    }
    breath.value = withDelay(left, loop(breath, traceMotion.breatheHalfMs))
    return () => {
      cancelAnimation(drawn)
      cancelAnimation(breath)
    }
  }, [breath, drawn, reduced, run])

  const breathStyle = useAnimatedStyle(() => ({ opacity: breathOpacity(breath.value) }))
  const fadeEnd = TRACE_VIEWBOX.width * traceMotion.fadeEnd

  return (
    <Animated.View testID="forest-trace" style={[styles.trace, { left: start }, breathStyle]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${TRACE_VIEWBOX.width} ${TRACE_VIEWBOX.height}`}
        preserveAspectRatio="xMinYMax slice"
      >
        <Defs>
          {TRACE_TONES.map((tone) => (
            <LinearGradient
              key={tone}
              id={`forest-trace-${tone}`}
              x1={0}
              y1={0}
              x2={fadeEnd}
              y2={0}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset={0} stopColor={forestAurora.trace[tone]} stopOpacity={0} />
              <Stop
                offset={1}
                stopColor={forestAurora.trace[tone]}
                stopOpacity={forestAurora.trace.maxOpacity}
              />
            </LinearGradient>
          ))}
        </Defs>
        {TRACE_PATHS.map((d, index) => (
          <TraceLine key={d} d={d} index={index} drawn={drawn} />
        ))}
      </Svg>
    </Animated.View>
  )
}

type ForestAuroraProps = {
  /**
   * Where the text column ends, in the card's space: the contours are drawn right of it only, and
   * not at all until it is known.
   */
  traceStart?: number | null
  testID?: string
}

/**
 * The hero of Accueil's forest card (12.2-19 fourth round, owner: "un mélange de A et F", sketch
 * 010): three soft discs of moss, teal and ochre drifting slowly behind the content (the aurora),
 * a shield darkening the text side over them, and four faint contour lines that trace themselves
 * once right of the text, then breathe. The discs are radial gradients drawn once (no runtime
 * blur); only their transforms, the lines' dash offset and the contours' opacity are animated, on
 * the UI thread. It is the card's and Accueil's one animated layer: it runs only while the screen
 * can be seen, stops where it is when hidden, and under Reduce Motion the discs rest and the lines
 * are drawn and still. Decoration only, never touched or read. The parent clips it to its corners.
 */
export function ForestAurora({ traceStart, testID }: ForestAuroraProps) {
  const visible = useScreenVisible()
  const reduced = useReducedMotion()
  const run = visible && !reduced

  return (
    <View
      style={styles.fill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {AURORA_DISCS.map((disc) => (
        <Disc key={disc.key} disc={disc} run={run} reduced={reduced} />
      ))}
      <View style={styles.shield} testID="forest-aurora-shield" />
      {traceStart === null || traceStart === undefined ? null : (
        <Trace start={traceStart} run={run} reduced={reduced} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  disc: { position: "absolute" },
  shield: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    experimental_backgroundImage: forestShieldImage,
  },
  trace: { position: "absolute", top: 0, right: 0, bottom: 0 },
})
