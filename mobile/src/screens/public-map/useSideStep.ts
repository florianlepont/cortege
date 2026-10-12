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
import { SIDE_WIPE } from "./map-stack-mode"
import { swipeLabel } from "./swipe-labels"
import type { MapLayers } from "./useMapLayersState"

// A side change of the comparison by its tag (Phase 28, UI-SPEC section 4 "Changing a side (tags)",
// CONTEXT items 13 b and 13 d). The new layer of a side enters as a wipe confined to that side's
// half of the fixed centre; a third map draws it, and it stays over the half until the map that
// draws that side has loaded its new style, so the swap never shows. A side change only sets a
// side: it never touches the saved preference.

/** A cover over a style swap is dropped after this long even if no load is reported. */
const COVER_MAX_MS = 8000

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
  /** A map finished loading a style: the cover waiting for it can go. */
  onStyleLoaded: (map: DrawnBy) => void
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
    actions.setSide(step.side === "left" ? "A" : "B", step.layer)
    // The comparison is still on (its end would have changed `generation`): the second map draws
    // its `secondSide`, the Explorer map the other one.
    const waitsFor: DrawnBy = layers.state.compare?.secondSide === step.side ? "second" : "base"
    setCurrent({ ...step, waitsFor })
  })

  const step = useLatestCallback((side: Side, direction: 1 | -1) => {
    if (!comparing || busy.current) return
    const target = candidate(side, direction)
    if (target === null) return
    feedback.selection()
    announce(fr.mapLayers.compare.announceSide({ side, ...swipeLabel(target) }))
    const sideKey = side === "left" ? "A" : "B"
    if (reduceMotion || SIDE_WIPE === "instant") {
      actions.setSide(sideKey, target)
      return
    }
    busy.current = true
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
      if (finished) runOnJS(finish)(id)
    }
    if (direction === 1) {
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

  const onStyleLoaded = useCallback((map: DrawnBy) => {
    setCurrent((now) => (now !== null && now.waitsFor === map ? null : now))
  }, [])

  // The comparison ending drops the step and any timing still running for it.
  useEffect(() => {
    if (comparing) return
    generation.current += 1
    cancelAnimation(clipLeft)
    cancelAnimation(clipRight)
    setCurrent(null)
  }, [comparing, clipLeft, clipRight])

  // Once nothing is shown a new step may start; a cover that never hears of its load goes after a while.
  useEffect(() => {
    if (current === null) {
      busy.current = false
      pending.current = null
      return undefined
    }
    if (current.waitsFor === null) return undefined
    const timer = setTimeout(() => setCurrent(null), COVER_MAX_MS)
    return () => clearTimeout(timer)
  }, [current])

  return {
    canStep,
    step,
    stepping: current ? { side: current.side, layer: current.layer, clipLeft, clipRight } : null,
    onStyleLoaded,
  }
}
