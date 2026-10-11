import { useEffect, useRef } from "react"
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { brandMotion } from "../../app/brand-tokens"
import { SETTLE_MS } from "../../map/swipe-machine"
import { clampLine } from "../../map/wipe-geometry"
import type { CompareState } from "./map-layers-state"

/**
 * - `active`: the line is where `compare.x` says, the second map shows its side of it.
 * - `leaving`: the line slides to the `leaveTo` edge over 240 ms (at once under Reduce Motion),
 *   then `onLeft` fires once; the screen ends the comparison there (UI-SPEC section 4, quitting).
 * - `covering`: the second map covers the whole width while the screen swaps the Explorer map's
 *   style under it, so the swap never shows (the screen drops the second map afterwards).
 */
export type CurtainPhase = "active" | "leaving" | "covering"

export type UseCurtainClipOptions = {
  /** The comparison; null keeps the line parked on the right edge with nothing of the second map. */
  compare: Pick<CompareState, "secondSide" | "x"> | null
  /** The width of the map area. */
  width: number
  phase?: CurtainPhase
  /** The edge the line slides to when leaving: the pill slides right, keeping side A. */
  leaveTo?: "left" | "right"
  /** Called once when the line has reached the edge. */
  onLeft?: () => void
}

export type CurtainClip = {
  /** The line's x in points (UI-thread value; the handle writes it while dragging). */
  lineX: SharedValue<number>
  /** The strip of the second map: from the line to the right edge, or from the left edge to the line. */
  clipLeft: SharedValue<number>
  clipRight: SharedValue<number>
}

/**
 * The line position and the clip of the comparison's second map (28-14). `lineX` follows
 * `compare.x` while the phase is active (the handle writes it directly during a drag, so the
 * state only has to catch up on release); `clipLeft` and `clipRight` are derived from it on the
 * UI thread, so the second map is cut exactly at the line in every frame. Pass the pair to a
 * `WipeLayer` as its strip.
 */
export function useCurtainClip({
  compare,
  width,
  phase = "active",
  leaveTo = "right",
  onLeft,
}: UseCurtainClipOptions): CurtainClip {
  const x = compare ? clampLine(compare.x, width) : width
  const secondSide = compare?.secondSide ?? "right"
  const reduceMotion = useReducedMotion()
  const lineX = useSharedValue(x)
  const onLeftRef = useRef(onLeft)
  onLeftRef.current = onLeft
  const leftRef = useRef(false)

  // The state catches up with the line (a release, an accessibility step, a new comparison).
  useEffect(() => {
    if (phase === "active") lineX.value = x
  }, [lineX, phase, x])

  useEffect(() => {
    if (phase !== "leaving") {
      leftRef.current = false
      return undefined
    }
    const target = leaveTo === "left" ? 0 : width
    // Once per departure, however many times the slide is restarted (a width change).
    const finish = () => {
      if (leftRef.current) return
      leftRef.current = true
      onLeftRef.current?.()
    }
    if (reduceMotion) {
      lineX.value = target
      finish()
      return undefined
    }
    lineX.value = withTiming(
      target,
      {
        duration: SETTLE_MS,
        easing: Easing.bezier(...brandMotion.easings.standard),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        // An interrupted slide (the phase changed) never reports the line as left.
        if (finished) runOnJS(finish)()
      },
    )
    return () => cancelAnimation(lineX)
  }, [leaveTo, lineX, phase, reduceMotion, width])

  const clipLeft = useDerivedValue(() => {
    if (phase === "covering") return 0
    return secondSide === "right" ? lineX.value : 0
  })
  const clipRight = useDerivedValue(() => {
    if (phase === "covering") return width
    return secondSide === "right" ? width : lineX.value
  })

  return { lineX, clipLeft, clipRight }
}
