import { useEffect, useMemo, useState } from "react"
import { type LayoutChangeEvent, StyleSheet, View } from "react-native"
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
import { Circle, Defs, Path, RadialGradient, Stop, Svg } from "react-native-svg"
import {
  buildBandShield,
  buildColumnShield,
  forestAurora,
  type ForestShieldKey,
  forestShield,
  forestVeilImage,
} from "../app/forest-aurora-tokens"
import {
  type AuroraZone,
  type Box,
  type ClearZone,
  FLOW_PATHS,
  FLOW_VIEWBOX,
  flowMotion,
  MIST_DISCS,
  type MistDisc,
  mistMotion,
  resolveZone,
} from "../app/forest-aurora-shape"
import { discPose, flowOffset, planMist } from "../app/forest-motion"
import { useScreenVisible } from "./useScreenVisible"

export type { AuroraZone } from "../app/forest-aurora-shape"

const AnimatedPath = Animated.createAnimatedComponent(Path)

/**
 * Runs `phase` on by `span` every `periodMs`, linearly and endlessly, from where it stopped (the
 * poses loop at `span`, so a pause never makes anything jump); holds it while not `run`; puts it at
 * `rest` under Reduce Motion.
 */
function usePhase(start: number, rest: number, span: number, periodMs: number, live: Live) {
  const phase = useSharedValue(live.reduced ? rest : start)
  const { run, reduced } = live
  useEffect(() => {
    if (reduced) {
      cancelAnimation(phase)
      phase.value = rest
      return undefined
    }
    if (!run) {
      cancelAnimation(phase)
      return undefined
    }
    const from = ((phase.value % span) + span) % span
    phase.value = from
    phase.value = withRepeat(
      withTiming(from + span, {
        duration: periodMs,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    )
    return () => cancelAnimation(phase)
  }, [periodMs, phase, reduced, rest, run, span])
  return phase
}

type Live = { run: boolean; reduced: boolean }

function Disc({
  disc,
  legMs,
  start,
  live,
}: {
  disc: MistDisc
  legMs: number
  start: number
  live: Live
}) {
  // A there-and-back is a phase of 2: one leg each way.
  const phase = usePhase(start, 0, 2, 2 * legMs, live)
  const tone = forestAurora[disc.key]
  const id = `forest-mist-${disc.key}`
  const half = disc.size / 2

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
      testID="forest-mist-disc"
      style={[styles.disc, { width: disc.size, height: disc.size, ...disc.anchor }, driftStyle]}
    >
      <Svg width={disc.size} height={disc.size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={tone.colour} stopOpacity={tone.peak} />
            <Stop offset={1} stopColor={tone.colour} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={half} cy={half} r={half} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  )
}

/** The dash of light flowing along one line, a soft glow under it. */
function FlowLight({
  d,
  periodMs,
  start,
  live,
}: {
  d: string
  periodMs: number
  start: number
  live: Live
}) {
  const phase = usePhase(start, 0, 1, periodMs, live)
  const lines = forestAurora.lines
  const dash = [flowMotion.dash, flowMotion.gap]
  const glowProps = useAnimatedProps(() => ({ strokeDashoffset: flowOffset(phase.value) }))
  const lightProps = useAnimatedProps(() => ({ strokeDashoffset: flowOffset(phase.value) }))
  return (
    <>
      <AnimatedPath
        d={d}
        fill="none"
        stroke={lines.glow}
        strokeOpacity={lines.glowOpacity}
        strokeWidth={lines.glowWidth}
        strokeLinecap="round"
        strokeDasharray={dash}
        animatedProps={glowProps}
        testID="forest-flow-glow"
      />
      <AnimatedPath
        d={d}
        fill="none"
        stroke={lines.light}
        strokeOpacity={lines.lightOpacity}
        strokeWidth={lines.width}
        strokeLinecap="round"
        strokeDasharray={dash}
        animatedProps={lightProps}
        testID="forest-flow-light"
      />
    </>
  )
}

function Flow({ zone, flows, live }: { zone: ClearZone; flows: FlowPlan; live: Live }) {
  const lines = forestAurora.lines
  return (
    <View
      testID="forest-flow"
      style={[styles.flow, { left: zone.left, width: zone.right - zone.left, height: zone.bottom }]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${FLOW_VIEWBOX.width} ${FLOW_VIEWBOX.height}`}
        preserveAspectRatio="xMinYMax slice"
      >
        {FLOW_PATHS.map((d) => (
          <Path
            key={d}
            d={d}
            fill="none"
            stroke={lines.base}
            strokeOpacity={lines.baseOpacity}
            strokeWidth={lines.width}
            strokeLinecap="round"
            testID="forest-flow-base"
          />
        ))}
        {/* Under Reduce Motion the lines stay, without the flowing light. */}
        {live.reduced
          ? null
          : FLOW_PATHS.map((d, index) => (
              <FlowLight
                key={d}
                d={d}
                periodMs={flows[index].periodMs}
                start={flows[index].start}
                live={live}
              />
            ))}
      </Svg>
    </View>
  )
}

type FlowPlan = { periodMs: number; start: number }[]

/** The text shield: gradients only, from nothing, so no edge or flat zone ever shows. */
function Shield({ zone, tone }: { zone: ClearZone; tone: ForestShieldKey }) {
  const bandTop = Math.max(0, zone.bottom - forestShield.feather)
  return (
    <>
      <View
        testID="forest-shield-column"
        style={[
          styles.fill,
          { experimental_backgroundImage: buildColumnShield(tone, zone.right, zone.left) },
        ]}
      />
      {zone.bottom < zone.height ? (
        <View
          testID="forest-shield-band"
          style={[
            styles.band,
            {
              top: bandTop,
              experimental_backgroundImage: buildBandShield(tone, zone.height - bandTop),
            },
          ]}
        />
      ) : null}
    </>
  )
}

type ForestAuroraProps = {
  /**
   * The card's clear zone (see `AuroraZone`); `null` while the card is still measuring it (nothing
   * is drawn yet), absent for a card with its text on the left part only (`textReach`).
   */
  zone?: AuroraZone | null
  /** How dark the shield over the text is: `score` for the survey's score card. */
  shield?: ForestShieldKey
  /** Fixes the random plan (tests); a fresh seed per mount otherwise. */
  seed?: number
  testID?: string
}

/**
 * The backdrop of every forest card (12.2-19), as the owner tuned it in sketch 010 `round4.html`:
 * three soft discs of moss, teal and ochre drifting there and back behind the content (7, 9 and
 * 11.5 s each way, a few percent apart per mount so they never fall into step), three faint
 * contour lines in the card's clear zone with a dash of light flowing endlessly along each, a veil
 * fading the left of the card, and a shield over the text made of gradients only, with no edge
 * and no flat zone. The discs are radial gradients drawn once; only their transforms and the
 * dashes' offsets are animated, by worklets on the UI thread. It runs only while the screen can be
 * seen and goes on from where it stopped; under Reduce Motion the discs rest and the lines are
 * drawn without their light. Decoration only, never touched or read. The card clips it.
 */
export function ForestAurora({ zone, shield = "standard", seed, testID }: ForestAuroraProps) {
  const visible = useScreenVisible()
  const reduced = useReducedMotion()
  const live = useMemo(() => ({ run: visible && !reduced, reduced }), [visible, reduced])
  const [box, setBox] = useState<Box | null>(null)
  const [mountSeed] = useState(() => seed ?? Math.floor(Math.random() * 2147483647))
  const plan = useMemo(() => planMist(mountSeed), [mountSeed])
  // Kept the same object while the numbers do not change.
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

  // The mist fades in once its zone is known, so it never pops in.
  useEffect(() => {
    if (!ready) return
    if (reduced) {
      reveal.value = 1
    } else if (live.run) {
      reveal.value = withTiming(1, {
        duration: mistMotion.revealMs,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      })
    }
  }, [ready, reduced, reveal, live.run])

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
          {MIST_DISCS.map((disc, index) => (
            <Disc
              key={disc.key}
              disc={disc}
              legMs={plan.discs[index].legMs}
              start={plan.discs[index].start}
              live={live}
            />
          ))}
          <Flow zone={clear} flows={plan.flows} live={live} />
          <View style={[styles.fill, styles.veil]} testID="forest-veil" />
          <Shield zone={clear} tone={shield} />
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  disc: { position: "absolute" },
  veil: { experimental_backgroundImage: forestVeilImage },
  band: { position: "absolute", left: 0, right: 0, bottom: 0 },
  flow: { position: "absolute", top: 0 },
})
