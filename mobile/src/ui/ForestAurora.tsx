import { useEffect, useMemo, useState } from "react"
import { type LayoutChangeEvent, StyleSheet, View } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { Circle, Defs, LinearGradient, Path, RadialGradient, Stop, Svg } from "react-native-svg"
import {
  auroraCore,
  forestAurora,
  type ForestShieldKey,
  forestShield,
  forestShieldLayers,
} from "../app/forest-aurora-tokens"
import {
  AURORA_DISCS,
  type AuroraDisc,
  type AuroraZone,
  auroraRoam,
  type Box,
  type ClearZone,
  resolveZone,
  TRACE_PATHS,
  TRACE_VIEWBOX,
  traceMotion,
} from "../app/forest-aurora-shape"
import {
  type DiscPlan,
  discPoseAt,
  planAurora,
  type TraceLinePlan,
  traceLineOffset,
} from "../app/forest-motion"
import { useScreenVisible } from "./useScreenVisible"

const AnimatedPath = Animated.createAnimatedComponent(Path)

const TRACE_TONES = ["light", "deep"] as const

export type { AuroraZone } from "../app/forest-aurora-shape"

/**
 * A seamless loop: the phase runs on by 1 from where it stopped, linearly. The plans loop at 1,
 * so a pause never makes anything jump.
 */
function loop(phase: SharedValue<number>, periodMs: number) {
  const from = ((phase.value % 1) + 1) % 1
  phase.value = from
  return withRepeat(
    withTiming(from + 1, {
      duration: periodMs,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    }),
    -1,
    false,
    undefined,
    ReduceMotion.System,
  )
}

/** Runs `phase` while `run`, holds it where it is when not, puts it at `rest` under Reduce Motion. */
function usePhase(start: number, periodMs: number, run: boolean, reduced: boolean) {
  const phase = useSharedValue(start)
  useEffect(() => {
    if (reduced) {
      cancelAnimation(phase)
      phase.value = start
      return undefined
    }
    if (!run) {
      cancelAnimation(phase)
      return undefined
    }
    phase.value = loop(phase, periodMs)
    return () => cancelAnimation(phase)
  }, [periodMs, phase, reduced, run, start])
  return phase
}

type LayerProps = { run: boolean; reduced: boolean; zone: ClearZone }

function Disc({
  disc,
  plan,
  run,
  reduced,
  zone,
}: LayerProps & { disc: AuroraDisc; plan: DiscPlan }) {
  const phase = usePhase(plan.start, disc.legs * disc.legMs, run, reduced)
  const tone = forestAurora[disc.key]
  const id = `forest-aurora-${disc.key}`
  const half = disc.size / 2

  const style = useAnimatedStyle(() => {
    const pose = discPoseAt(phase.value, plan)
    return {
      opacity: pose.alpha,
      transform: [
        { translateX: zone.left + pose.across * (zone.right - zone.left) - half },
        { translateY: pose.down * zone.bottom - half },
        { scale: pose.scale },
      ],
    }
  })

  return (
    <Animated.View
      testID="forest-aurora-disc"
      style={[styles.disc, { width: disc.size, height: disc.size }, style]}
    >
      <Svg width={disc.size} height={disc.size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {forestAurora.falloff.map(([at, share]) => (
              <Stop
                key={at}
                offset={at}
                stopColor={at === 0 ? auroraCore(disc.key) : tone.colour}
                stopOpacity={tone.peak * share}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={half} cy={half} r={half} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  )
}

/** The shield over the text column and the bottom band, each fading into the clear zone. */
function Shield({ zone, tone }: { zone: ClearZone; tone: ForestShieldKey }) {
  const layers = forestShieldLayers[tone]
  const { fade } = forestShield
  return (
    <>
      {zone.left > 0 ? (
        <>
          <View
            testID="forest-shield-column"
            style={[
              styles.panel,
              { left: 0, width: zone.left, height: zone.bottom, backgroundColor: layers.column },
            ]}
          />
          <View
            testID="forest-shield-column-fade"
            style={[
              styles.panel,
              {
                left: zone.left,
                width: fade.column,
                height: zone.bottom,
                experimental_backgroundImage: layers.columnFade,
              },
            ]}
          />
        </>
      ) : null}
      {zone.bottom < zone.height ? (
        <>
          <View
            testID="forest-shield-band-fade"
            style={[
              styles.band,
              {
                top: zone.bottom - fade.band,
                height: fade.band,
                experimental_backgroundImage: layers.bandFade,
              },
            ]}
          />
          <View
            testID="forest-shield-band"
            style={[styles.band, { top: zone.bottom, bottom: 0, backgroundColor: layers.band }]}
          />
        </>
      ) : null}
    </>
  )
}

function TraceLine({ d, index, plan, clock, loopMs, still }: TraceLineProps) {
  const dashProps = useAnimatedProps(() => ({
    strokeDashoffset: still ? 0 : traceLineOffset((((clock.value % 1) + 1) % 1) * loopMs, plan),
  }))
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

type TraceLineProps = {
  d: string
  index: number
  plan: TraceLinePlan
  clock: SharedValue<number>
  loopMs: number
  still: boolean
}

function Trace({ lines, loopMs, start, run, reduced, zone }: TraceProps) {
  const clock = usePhase(start, loopMs, run, reduced)
  const fadeEnd = TRACE_VIEWBOX.width * traceMotion.fadeEnd

  return (
    <View
      testID="forest-trace"
      style={[
        styles.trace,
        { left: zone.left, width: zone.right - zone.left, height: zone.bottom },
      ]}
    >
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
          <TraceLine
            key={d}
            d={d}
            index={index}
            plan={lines[index]}
            clock={clock}
            loopMs={loopMs}
            still={reduced}
          />
        ))}
      </Svg>
    </View>
  )
}

type TraceProps = LayerProps & { lines: TraceLinePlan[]; loopMs: number; start: number }

type ForestAuroraProps = {
  /**
   * The card's clear zone (see `AuroraZone`); `null` while the card is still measuring it (nothing
   * is drawn yet), absent for a card with its text on the left part only (`textReach`).
   */
  zone?: AuroraZone | null
  /** How dark the shield over the text is: `score` for the survey's score card. */
  shield?: ForestShieldKey
  /** Fixes the random plans (tests); a fresh seed per mount otherwise. */
  seed?: number
  testID?: string
}

/**
 * The backdrop of every forest card (12.2-19 fourth and fifth rounds, owner: "un mélange de A et
 * F", then "elle devrait se jouer un peu en continu en mode random", colours "trop light", "dans
 * toutes les autres cartes forêt"): three soft discs of moss, teal and ochre roaming the card's
 * clear zone on random paths of over a minute, each blooming once per path; a shield over the text
 * zones; and four faint contours drawing and erasing themselves in turn in the clear zone, never
 * all at rest. The discs are radial gradients drawn once (no runtime blur); only their transforms
 * and opacity and the lines' dash offset are animated, by worklets on the UI thread that read plans
 * drawn once per mount. It runs only while the screen can be seen and goes on from where it stopped;
 * under Reduce Motion the discs rest and the lines are drawn and still. Decoration only, never
 * touched or read. The card clips it to its corners.
 */
export function ForestAurora({ zone, shield = "standard", seed, testID }: ForestAuroraProps) {
  const visible = useScreenVisible()
  const reduced = useReducedMotion()
  const run = visible && !reduced
  const [box, setBox] = useState<Box | null>(null)
  const [mountSeed] = useState(() => seed ?? Math.floor(Math.random() * 2147483647))
  const plan = useMemo(() => planAurora(mountSeed, AURORA_DISCS), [mountSeed])
  // Kept the same object while the numbers do not change, so the worklets are not rebuilt.
  const measuring = zone === null
  const left = zone?.left
  const bottom = zone?.bottom
  const clear = useMemo(
    () =>
      box && !measuring
        ? resolveZone(box, left === undefined ? undefined : { left, bottom })
        : null,
    [box, measuring, left, bottom],
  )
  const ready = clear !== null
  const reveal = useSharedValue(reduced ? 1 : 0)

  // The aurora fades in once its zone is known, so it never pops in.
  useEffect(() => {
    if (!ready) return
    if (reduced) {
      reveal.value = 1
    } else if (run) {
      reveal.value = withTiming(1, {
        duration: auroraRoam.revealMs,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      })
    }
  }, [ready, reduced, reveal, run])

  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.value }))

  const handleLayout = (event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout
    setBox((previous) =>
      previous && previous.width === width && previous.height === height
        ? previous
        : { width, height },
    )
  }

  return (
    <View
      style={styles.fill}
      onLayout={handleLayout}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {clear ? (
        <Animated.View style={[styles.fill, revealStyle]} testID="forest-aurora-layers">
          {AURORA_DISCS.map((disc, index) => (
            <Disc
              key={disc.key}
              disc={disc}
              plan={plan.discs[index]}
              run={run}
              reduced={reduced}
              zone={clear}
            />
          ))}
          <Shield zone={clear} tone={shield} />
          <Trace
            lines={plan.trace.lines}
            loopMs={plan.trace.loopMs}
            start={plan.trace.start}
            run={run}
            reduced={reduced}
            zone={clear}
          />
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  disc: { position: "absolute", left: 0, top: 0 },
  panel: { position: "absolute", top: 0 },
  band: { position: "absolute", left: 0, right: 0 },
  trace: { position: "absolute", top: 0 },
})
