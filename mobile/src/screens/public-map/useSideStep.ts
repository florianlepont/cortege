import { useCallback, useEffect, useRef, useState } from "react"
import { AccessibilityInfo } from "react-native"
import {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { brandMotion } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { neighbourLayer, type LayerAvailability } from "../../map/layer-cycle"
import type { BaseLayerKey } from "../../map/layers"
import { SETTLE_MS } from "../../map/swipe-machine"
import { halfBounds } from "../../map/wipe-geometry"
import { useLatestCallback } from "../../state/useLatestCallback"
import { feedback } from "../../ui/feedback"
import { useCoverRelease } from "./useCoverRelease"
import { SIDE_WIPE } from "./map-stack-mode"
import { swipeLabel } from "./swipe-labels"
import type { MapLayers } from "./useMapLayersState"

// A side change of the comparison by its tag (Phase 28, UI-SPEC section 4 "Changing a side (tags)",
// CONTEXT items 13 b and 13 d). Double buffering: the new layer of a side enters as a wipe confined
// to that side's half, drawn by a third map that is revealed only once it is loaded and rendered.
// The state (and so the style of the map that draws that side) changes only when the third map is
// fully shown, and the third map stays over the half until that map is ready too: a visible map
// is never retargeted, so the half shows the old layer and then, at once, the new one. A side
// change only sets a side: it never touches the saved preference.

/** A cover over a style swap is dropped after this long even if no load is reported. */
const COVER_MAX_MS = 8000
/** A step goes ahead this long (ms) after its wipe even if the third map never reports ready. */
export const STEP_READY_WAIT_MS = 2500
/** Presses made while a step runs wait for it, up to this many. */
const MAX_QUEUED = 4

const announce = (text: string) => AccessibilityInfo.announceForAccessibility(text)

type Side = "left" | "right"
/** The map that draws a side once the layers state has changed: the second map, or the Explorer map. */
type DrawnBy = "second" | "base"

/** The third map's view of a side change under way: the layer it draws and the strip it shows. */
export type SideStepping = {
  side: Side
  layer: BaseLayerKey
  clipLeft: SharedValue<number>
  clipRight: SharedValue<number>
}

type Step = { side: Side; layer: BaseLayerKey; waitsFor: DrawnBy | null }

export type SideStep = {
  /** Another layer exists for this side (the other side's layer and the unavailable ones left out). */
  canStep: (side: Side) => boolean
  /** The next (1) or the previous (-1) layer of this side. */
  step: (side: Side, direction: 1 | -1) => void
  /** The third map's content, null when no side change is under way. */
  stepping: SideStepping | null
  /** The map that draws a side shows its new layer (the second: ready; the Explorer map: style loaded). */
  onStyleLoaded: (map: DrawnBy) => void
  /** The Explorer map reported it rendered: with its style load, the cover over its half can go. */
  onRendered: () => void
  /** The third map is loaded and rendered: the step may apply the side. */
  onThirdReady: () => void
}

export type SideStepInput = {
  layers: MapLayers
  isAvailable: LayerAvailability
  /** The width of the map area. */
  width: number
}

export function useSideStep({ layers, isAvailable, width }: SideStepInput): SideStep {
  const reduceMotion = useReducedMotion()
  const { actions } = layers
  const comparing = layers.state.compare !== null
  const clipLeft = useSharedValue(width)
  const clipRight = useSharedValue(width)
  const [current, setCurrent] = useState<Step | null>(null)
  // Set while a step runs, until its cover is dropped; read synchronously so two presses in a row
  // cannot start two steps. `generation` tells a finished timing that its step is gone.
  const busy = useRef(false)
  const generation = useRef(0)
  // The step whose timing is running: `finish` reads it back on the JS thread.
  const pending = useRef<Step | null>(null)
  // A step applies its side when its wipe has ended AND the third map is ready (or after a while).
  const wipeEnded = useRef(false)
  const thirdReady = useRef(false)
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queued = useRef<{ side: Side; direction: 1 | -1 }[]>([])

  const other = (side: Side): Side => (side === "left" ? "right" : "left")
  const candidate = (side: Side, direction: 1 | -1) =>
    neighbourLayer(layers.layerOfSide(side), direction, {
      isAvailable,
      exclude: layers.layerOfSide(other(side)),
    })
  const canStep = (side: Side) => comparing && candidate(side, 1) !== null

  const finish = useLatestCallback((id: number) => {
    const step = pending.current
    if (id !== generation.current || step === null) return
    if (waitTimer.current) clearTimeout(waitTimer.current)
    waitTimer.current = null
    pending.current = null
    actions.setSide(step.side === "left" ? "A" : "B", step.layer)
    // The comparison is still on (its end would have changed `generation`): the second map draws
    // its `secondSide`, the Explorer map the other one.
    const waitsFor: DrawnBy = layers.state.compare?.secondSide === step.side ? "second" : "base"
    setCurrent({ ...step, waitsFor })
  })
  const tryFinish = (id: number) => {
    if (wipeEnded.current && thirdReady.current) finish(id)
  }
  const onWipeEnded = useLatestCallback((id: number) => {
    if (id !== generation.current) return
    wipeEnded.current = true
    tryFinish(id)
  })
  const onThirdReady = useLatestCallback(() => {
    if (pending.current === null) return
    thirdReady.current = true
    tryFinish(generation.current)
  })

  const step = useLatestCallback((side: Side, direction: 1 | -1) => {
    if (!comparing) return
    if (busy.current) {
      if (queued.current.length < MAX_QUEUED) queued.current.push({ side, direction })
      return
    }
    const target = candidate(side, direction)
    if (target === null) return
    feedback.selection()
    announce(fr.mapLayers.compare.announceSide({ side, ...swipeLabel(target) }))
    const sideKey = side === "left" ? "A" : "B"
    if (SIDE_WIPE === "instant") {
      actions.setSide(sideKey, target)
      return
    }
    busy.current = true
    wipeEnded.current = false
    thirdReady.current = false
    generation.current += 1
    const id = generation.current
    pending.current = { side, layer: target, waitsFor: null }
    // The new layer enters from the half's right bound going forward, from its left bound going back.
    const [from, to] = halfBounds(side, width)
    const config = {
      duration: SETTLE_MS,
      easing: Easing.bezier(...brandMotion.easings.standard),
      reduceMotion: ReduceMotion.System,
    }
    const done = (finished?: boolean) => {
      "worklet"
      if (finished) runOnJS(onWipeEnded)(id)
    }
    waitTimer.current = setTimeout(() => {
      wipeEnded.current = true
      thirdReady.current = true
      finish(id)
    }, SETTLE_MS + STEP_READY_WAIT_MS)
    if (reduceMotion) {
      // No motion: the half is open at once, as soon as the third map is ready.
      clipLeft.value = from
      clipRight.value = to
      wipeEnded.current = true
    } else if (direction === 1) {
      clipLeft.value = to
      clipRight.value = to
      clipLeft.value = withTiming(from, config, done)
    } else {
      clipLeft.value = from
      clipRight.value = from
      clipRight.value = withTiming(to, config, done)
    }
    setCurrent(pending.current)
  })

  const dropCover = useCallback((map: DrawnBy) => {
    setCurrent((now) => (now !== null && now.waitsFor === map ? null : now))
  }, [])
  // The Explorer map's half is uncovered once its style loaded and it rendered after that.
  const baseRelease = useCoverRelease({
    covered: current?.waitsFor === "base",
    swipeMode: false,
    release: () => dropCover("base"),
  })
  const { onStyleLoaded: baseStyleLoaded, onRenderedFully: onRendered } = baseRelease
  const onStyleLoaded = useCallback(
    (map: DrawnBy) => (map === "base" ? baseStyleLoaded() : dropCover("second")),
    [baseStyleLoaded, dropCover],
  )

  // The comparison ending drops the step and any timing still running for it.
  useEffect(() => {
    if (comparing) return
    generation.current += 1
    if (waitTimer.current) clearTimeout(waitTimer.current)
    waitTimer.current = null
    queued.current = []
    cancelAnimation(clipLeft)
    cancelAnimation(clipRight)
    setCurrent(null)
  }, [comparing, clipLeft, clipRight])
  useEffect(
    () => () => {
      if (waitTimer.current) clearTimeout(waitTimer.current)
    },
    [],
  )

  // Once nothing is shown a new step may start; a cover that never hears of its load goes after a while.
  useEffect(() => {
    if (current === null) {
      busy.current = false
      pending.current = null
      const next = queued.current.shift()
      if (next) step(next.side, next.direction)
      return undefined
    }
    if (current.waitsFor === null) return undefined
    const timer = setTimeout(() => setCurrent(null), COVER_MAX_MS)
    return () => clearTimeout(timer)
  }, [current, step])

  return {
    canStep,
    step,
    stepping: current ? { side: current.side, layer: current.layer, clipLeft, clipRight } : null,
    onStyleLoaded,
    onRendered,
    onThirdReady,
  }
}
