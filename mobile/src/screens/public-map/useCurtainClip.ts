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
 * - `active`: the line rests at the centre (it starts where `compare.x` says, the wipe front, and
 *   eases there), the second map shows its side of it.
 * - `leaving`: the line slides to the `leaveTo` edge over 240 ms (at once under Reduce Motion),
 *   then `onLeft` fires once; the screen ends the comparison there (UI-SPEC section 4, quitting).
 * - `covering`: the second map covers the whole width while the screen swaps the Explorer map's
 *   style under it, so the swap never shows (the screen drops the second map afterwards).
 */
export type CurtainPhase = "active" | "leaving" | "covering"

export type UseCurtainClipOptions = {
  /**
   * The comparison; null keeps the line parked on the right edge with nothing of the second map.
   * Only `x` at the moment the comparison appears is read (where the wipe front was).
   */
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
  /** The line's x in points (UI-thread value; the grabber writes it while dragging). */
  lineX: SharedValue<number>
  /** The strip of the second map: from the line to the right edge, or from the left edge to the line. */
  clipLeft: SharedValue<number>
  clipRight: SharedValue<number>
}

/**
 * The line position and the clip of the comparison's second map (28-14, 28-21). When a comparison
 * appears `lineX` starts at the clamped `compare.x` (the wipe front) and eases to the exact centre
 * in `SETTLE_MS` (at once under Reduce Motion), then rests there: it never follows a later
 * `compare.x`, and a width change puts it at the new centre (UI-SPEC section 4). The grabber writes
 * it directly during a drag and springs it back; `clipLeft` and `clipRight` are derived from it on
 * the UI thread, so the second map is cut exactly at the line in every frame. Pass the pair to a
 * `WipeLayer` as its strip.
 */
export function useCurtainClip({
  compare,
  width,
  phase = "active",
  leaveTo = "right",
  onLeft,
}: UseCurtainClipOptions): CurtainClip {
  const comparing = compare !== null
  const x = compare ? clampLine(compare.x, width) : width
  const secondSide = compare?.secondSide ?? "right"
  const reduceMotion = useReducedMotion()
  const lineX = useSharedValue(x)
  // Where the wipe front was when the comparison appeared; read once, by the effect below.
  const frontRef = useRef(x)
  frontRef.current = x
  const settledRef = useRef(false)
  const onLeftRef = useRef(onLeft)
  onLeftRef.current = onLeft
  const leftRef = useRef(false)

  // Parked on the right edge without a comparison; on a new comparison the line starts at the wipe
  // front and eases to the centre; afterwards (a width change) it is simply put at the centre.
  useEffect(() => {
    if (phase !== "active") return undefined
    if (!comparing) {
      settledRef.current = false
      lineX.value = width
      return undefined
    }
    const centre = width / 2
    if (settledRef.current || reduceMotion) {
      settledRef.current = true
      lineX.value = centre
      return undefined
    }
    settledRef.current = true
    lineX.value = frontRef.current
    lineX.value = withTiming(centre, {
      duration: SETTLE_MS,
      easing: Easing.bezier(...brandMotion.easings.standard),
      reduceMotion: ReduceMotion.System,
    })
    return () => cancelAnimation(lineX)
  }, [comparing, lineX, phase, reduceMotion, width])

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
