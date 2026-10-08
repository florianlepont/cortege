import { useEffect, useId, useMemo, useState } from "react"
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
import {
  Circle,
  Defs,
  Ellipse,
  G,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
} from "react-native-svg"
import { buildTextShield, forestAurora, type ForestShieldKey } from "../app/forest-aurora-tokens"
import {
  type Box,
  defaultBlocks,
  flowMotion,
  type ForestTextBlock,
  layLines,
  MIST_DISCS,
  type MistDisc,
  mistMotion,
  textEllipse,
} from "../app/forest-aurora-shape"
import { discPose, flowOffset, planMist } from "../app/forest-motion"
import { useScreenVisible } from "./useScreenVisible"

export type { ForestTextBlock } from "../app/forest-aurora-shape"

const AnimatedPath = Animated.createAnimatedComponent(Path)

type Live = { run: boolean; reduced: boolean }

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

type DiscProps = { disc: MistDisc; legMs: number; start: number; live: Live; id: string }

function Disc({ disc, legMs, start, live, id }: DiscProps) {
  // A there-and-back is a phase of 2: one leg each way.
  const phase = usePhase(start, 0, 2, 2 * legMs, live)
  const tone = forestAurora[disc.key]
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

type FlowLightProps = { d: string; periodMs: number; start: number; live: Live }

const DASH = [flowMotion.dash, flowMotion.gap]

/** The dash of light flowing along one line, a soft glow under it. */
function FlowLight({ d, periodMs, start, live }: FlowLightProps) {
  const phase = usePhase(start, 0, 1, periodMs, live)
  const lines = forestAurora.lines
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
        strokeDasharray={DASH}
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
        strokeDasharray={DASH}
        animatedProps={lightProps}
        testID="forest-flow-light"
      />
    </>
  )
}

type FlowProps = {
  box: Box
  blocks: ForestTextBlock[]
  flows: { periodMs: number; start: number }[]
  live: Live
  id: string
}

/**
 * The four diagonal lines over the whole card, through a mask that lets only `floor` of them show
 * behind each block of text, feathered softly around it, so the shields can stay light.
 */
function Flow({ box, blocks, flows, live, id }: FlowProps) {
  const lines = forestAurora.lines
  const laid = useMemo(() => layLines(box), [box])
  const hidden = 1 - lines.floor
  return (
    <Svg
      testID="forest-flow"
      style={styles.fill}
      width={box.width}
      height={box.height}
      viewBox={`0 0 ${box.width} ${box.height}`}
    >
      <Defs>
        {blocks.map((block, index) => (
          <RadialGradient key={index} id={`${id}-hole-${index}`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={lines.hidden} stopOpacity={hidden} />
            <Stop offset={textEllipse(block).inner} stopColor={lines.hidden} stopOpacity={hidden} />
            <Stop offset={1} stopColor={lines.hidden} stopOpacity={0} />
          </RadialGradient>
        ))}
        <Mask
          id={`${id}-mask`}
          x={0}
          y={0}
          width={box.width}
          height={box.height}
          maskUnits="userSpaceOnUse"
        >
          <Rect x={0} y={0} width={box.width} height={box.height} fill={lines.shown} />
          {blocks.map((block, index) => {
            const { cx, cy, rx, ry } = textEllipse(block)
            return (
              <Ellipse
                key={index}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill={`url(#${id}-hole-${index})`}
                testID="forest-flow-hole"
              />
            )
          })}
        </Mask>
      </Defs>
      <G mask={`url(#${id}-mask)`}>
        {laid.map(({ d }) => (
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
          : laid.map(({ d }, index) => (
              <FlowLight
                key={d}
                d={d}
                periodMs={flows[index].periodMs}
                start={flows[index].start}
                live={live}
              />
            ))}
      </G>
    </Svg>
  )
}

/** Around each block of text, a soft ellipse of shield: a gradient from nothing, never an edge. */
function Shield({ blocks, tone }: { blocks: ForestTextBlock[]; tone: ForestShieldKey }) {
  return (
    <>
      {blocks.map((block, index) => {
        const { cx, cy, rx, ry, inner } = textEllipse(block)
        return (
          <View
            key={index}
            testID="forest-shield"
            style={[
              styles.shield,
              {
                left: cx - rx,
                top: cy - ry,
                width: 2 * rx,
                height: 2 * ry,
                experimental_backgroundImage: buildTextShield(block.tone ?? tone, inner),
              },
            ]}
          />
        )
      })}
    </>
  )
}

type ForestAuroraProps = {
  /**
   * The card's blocks of text, measured by the card (`null` while it measures them: nothing is
   * drawn yet); absent for a card whose text fills its left part (`textReach`).
   */
  blocks?: ForestTextBlock[] | null
  /** How dark the shield around the text is: `score` for the survey's score card. */
  shield?: ForestShieldKey
  /** Fixes the random plan (tests); a fresh seed per mount otherwise. */
  seed?: number
  testID?: string
}

/**
 * The backdrop of every forest card (12.2-19), as the owner validated it in sketch 010
 * `round5.html` ("c'est parfait, je veux exactement ça"): three soft discs of moss, teal and ochre
 * drifting there and back (7, 9 and 11.5 s each way, a few percent apart per mount), four faint
 * diagonal S curves over the whole card with a dash of light flowing endlessly along each, and
 * around each block of text a soft ellipse of shield, as light as the text's contrast allows, over
 * the mist and the lines, the lines fading behind it through a soft mask. Gradients only: no edge and no flat zone. Only the discs' transforms and
 * the dashes' offsets are animated, by worklets on the UI thread. It runs only while the screen
 * can be seen and goes on from where it stopped; under Reduce Motion the discs rest and the lines
 * are drawn without their light. Decoration only, never touched or read. The card clips it.
 */
export function ForestAurora({ blocks, shield = "standard", seed, testID }: ForestAuroraProps) {
  const visible = useScreenVisible()
  const reduced = useReducedMotion()
  const live = useMemo(() => ({ run: visible && !reduced, reduced }), [visible, reduced])
  const [box, setBox] = useState<Box | null>(null)
  const [mountSeed] = useState(() => seed ?? Math.floor(Math.random() * 2147483647))
  const plan = useMemo(() => planMist(mountSeed), [mountSeed])
  const id = `forest-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`
  const measured = blocks === null ? null : box && (blocks ?? defaultBlocks(box))
  const ready = Boolean(box && measured)
  const reveal = useSharedValue(reduced ? 1 : 0)

  // The mist fades in once the card is measured, so it never pops in.
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
      {box && measured ? (
        <Animated.View style={[styles.fill, revealStyle]} testID="forest-aurora-layers">
          {MIST_DISCS.map((disc, index) => (
            <Disc
              key={disc.key}
              disc={disc}
              legMs={plan.discs[index].legMs}
              start={plan.discs[index].start}
              live={live}
              id={`${id}-${disc.key}`}
            />
          ))}
          <Flow box={box} blocks={measured} flows={plan.flows} live={live} id={id} />
          <Shield blocks={measured} tone={shield} />
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  disc: { position: "absolute" },
  shield: { position: "absolute" },
})
