import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import { StyleSheet, View, type NativeSyntheticEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { ReduceMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated"
import type { ViewStateChangeEvent } from "@maplibre/maplibre-react-native"
import { isSwipeSpikeEnabled } from "../../app/feature-flags"
import type { MapRegion } from "../../app/map-viewport"
import type { BasemapKey } from "../../map/basemaps"
import type { BaseLayerKey } from "../../map/layers"
import { regionFromViewChange } from "../../map/maplibre/regions"
import {
  SETTLE_MS,
  beginGesture,
  compareSidesFor,
  moveGesture,
  releaseGesture,
  type WipeGesture,
} from "../../map/swipe-machine"
import {
  clampLine,
  edgeExitKeeps,
  settledStrip,
  sideBounds,
  wipeStrip,
  type SideKey,
} from "../../map/wipe-geometry"
import { useLatestCallback } from "../../state/useLatestCallback"
import type { MapCanvasProps } from "./MapCanvas"
import { useMapSync } from "./MapStack"
import { LineHandle, SpikeStacks, type SpikeIncoming } from "./SpikeStacks"
import { DEFAULT_MAP_REGION } from "./useMapViewport"

// PHASE 28 DEVICE SPIKE DRIVER (temporary scaffolding): measured in plan 28-01 Task 3, deleted by
// plan 28-17 together with the flag (`EXPO_PUBLIC_SWIPE_SPIKE`). It shows no user-facing text.
//
// It proves, on stacked MapLibre maps, the three gestures the real feature needs: a full-width
// wipe (the neighbouring layer clipped to the strip between the finger and the edge it comes from),
// a release in the middle that keeps both layers behind a draggable line (a comparison), and a
// swipe on one side of that comparison that wipes a third map in within the side. The thresholds
// are the real ones (`swipe-machine.ts`, `wipe-geometry.ts`, plans 28-05); only three layers are in
// the cycle (Plan, Satellite, Photos 1950: the expensive pair is Plan against a photograph).
//
// Simplifications, all spike-only: the pan handlers run on the JS thread (`runOnJS`), the stacked
// maps carry no cadastre or parcel layers, the Explorer map is the underlay and a layer shown over
// it is a stacked map clipped to its side.

const SPIKE_LAYERS: readonly BaseLayerKey[] = ["map", "satellite", "photos-1950"]
const isSpikeLayer = (key: BaseLayerKey) => SPIKE_LAYERS.includes(key)

// A committed or kept layer is also mounted as a cover under the settling wipe; the wipe is
// removed only after the cover has had this long to draw its first tiles, so nothing flashes.
const COVER_LOAD_MS = 400
type Model = {
  /** The spike swipe mode (map frozen, the swipe surface takes the touches). */
  swipeOn: boolean
  /** The layer shown without a comparison. */
  base: BaseLayerKey
  /** The two layers of a comparison, left and right of the line. */
  cmp: { a: BaseLayerKey; b: BaseLayerKey } | null
}

type PanEvent = {
  x?: number
  y?: number
  translationX?: number
  translationY?: number
}

export type SwipeSpikeParams = {
  /** The width of the map area in points. */
  width: number
  /** Unused: the stacked maps anchor to the top and bottom of the map area. */
  height?: number
  /** Where the Explorer camera starts; a stacked map mounts on the last view seen instead. */
  initialRegion?: MapRegion
  /** The Explorer map's own layer (the underlay). */
  basemap: BasemapKey
}

export type SwipeSpike = {
  /** True when the build carries the flag; the screen then routes the globe button here. */
  active: boolean
  toggleSwipe: () => void
  /** Props to spread on `MapCanvas`; empty when the flag is off. */
  mapCanvasProps: Pick<MapCanvasProps, "frozen" | "onViewChange" | "rotationLocked" | "hideMarkers">
  /** Rendered right after `MapCanvas`; null when the flag is off. */
  overlay: ReactElement | null
}

const OFF: SwipeSpike = {
  active: false,
  toggleSwipe: () => undefined,
  mapCanvasProps: {},
  overlay: null,
}

// Under the Jest Reanimated mock `useSharedValue` returns a new object on each render; keeping the
// first one makes the driver testable and changes nothing with the real library (already stable).
function useStableShared(initial: number): SharedValue<number> {
  const created = useSharedValue(initial)
  const kept = useRef(created)
  return kept.current
}

export function useSwipeSpike({
  width,
  initialRegion = DEFAULT_MAP_REGION,
  basemap,
}: SwipeSpikeParams): SwipeSpike {
  const enabled = isSwipeSpikeEnabled()
  const underlay: BaseLayerKey = basemap === "satellite" ? "satellite" : "map"
  const [model, setModel] = useState<Model>({ swipeOn: false, base: underlay, cmp: null })
  const [incoming, setIncoming] = useState<SpikeIncoming | null>(null)
  const modelRef = useRef(model)
  const incomingRef = useRef<SpikeIncoming | null>(null)
  const gestureRef = useRef<WipeGesture | null>(null)
  const lineXRef = useRef(width)
  const lastRegionRef = useRef<MapRegion | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // The strips of the stacked maps: the left cover [0, line], the right cover [line, width] and
  // the incoming wipe [inLeft, inRight]. Without a comparison the line sits at the right edge.
  const zero = useStableShared(0)
  const widthShared = useStableShared(width)
  const lineX = useStableShared(width)
  const inLeft = useStableShared(0)
  const inRight = useStableShared(0)

  const coverASync = useMapSync()
  const coverBSync = useMapSync()
  const incomingSync = useMapSync()

  const commitModel = useCallback((next: Model) => {
    modelRef.current = next
    setModel(next)
  }, [])
  const showIncoming = useCallback((next: SpikeIncoming | null) => {
    incomingRef.current = next
    setIncoming(next)
  }, [])
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])
  const clearIncomingAfter = useCallback(
    (delayMs: number) => {
      timers.current.push(setTimeout(() => showIncoming(null), delayMs))
    },
    [showIncoming],
  )
  useEffect(() => clearTimers, [clearTimers])

  const onViewChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { center, bounds } = event.nativeEvent
      lastRegionRef.current = regionFromViewChange({ center, bounds })
      coverASync.syncFrom(event)
      coverBSync.syncFrom(event)
      incomingSync.syncFrom(event)
    },
    [coverASync, coverBSync, incomingSync],
  )

  const layerOf = (side: SideKey): BaseLayerKey => {
    const current = modelRef.current
    if (!current.cmp || side === "full") return current.base
    return side === "left" ? current.cmp.a : current.cmp.b
  }
  const otherOf = (side: SideKey): BaseLayerKey | null => {
    const current = modelRef.current
    if (!current.cmp || side === "full") return null
    return side === "left" ? current.cmp.b : current.cmp.a
  }
  const lineForGesture = () => (modelRef.current.cmp ? lineXRef.current : null)

  const settle = (left: number, right: number) => {
    inLeft.value = withTiming(left, { duration: SETTLE_MS, reduceMotion: ReduceMotion.System })
    inRight.value = withTiming(right, { duration: SETTLE_MS, reduceMotion: ReduceMotion.System })
  }

  const handleBegin = useLatestCallback((event: PanEvent) => {
    if (!modelRef.current.swipeOn) return
    clearTimers()
    gestureRef.current = beginGesture({
      x: event.x ?? 0,
      y: event.y ?? 0,
      lineX: lineForGesture(),
    })
  })

  const handleUpdate = useLatestCallback((event: PanEvent) => {
    const gesture = gestureRef.current
    if (!gesture) return
    const point = {
      x: event.x ?? gesture.x0 + (event.translationX ?? 0),
      y: event.y ?? gesture.y0 + (event.translationY ?? 0),
    }
    const next = moveGesture(gesture, point, {
      width,
      lineX: lineForGesture(),
      layerOf,
      otherOf,
      isAvailable: isSpikeLayer,
    })
    gestureRef.current = next
    if (!next.started || next.incoming === null) return
    const bounds = sideBounds(next.side, lineXRef.current, width)
    const strip = wipeStrip(bounds, next.dx, next.fingerX)
    inLeft.value = strip.left
    inRight.value = strip.right
    const shown = incomingRef.current
    if (!shown || shown.layer !== next.incoming || shown.side !== next.side) {
      showIncoming({ layer: next.incoming, side: next.side })
    }
  })

  const handleEnd = useLatestCallback(() => {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture) return
    const result = releaseGesture(gesture, true)
    const layer = result.incoming
    if (layer === null || !gesture.started) return
    const current = modelRef.current
    const bounds = sideBounds(gesture.side, lineXRef.current, width)
    if (result.outcome === "cancel") {
      const strip = settledStrip(bounds, gesture.dx, "cancel")
      settle(strip.left, strip.right)
      clearIncomingAfter(SETTLE_MS)
      return
    }
    if (result.outcome === "commit") {
      const strip = settledStrip(bounds, gesture.dx, "commit")
      settle(strip.left, strip.right)
      if (!current.cmp) commitModel({ ...current, base: layer })
      else if (gesture.side === "left")
        commitModel({ ...current, cmp: { ...current.cmp, a: layer } })
      else commitModel({ ...current, cmp: { ...current.cmp, b: layer } })
      clearIncomingAfter(SETTLE_MS + COVER_LOAD_MS)
      return
    }
    if (result.outcome === "compare") {
      const sides = compareSidesFor(gesture.dx, current.base, layer)
      const x = clampLine(result.releaseX, width)
      lineXRef.current = x
      lineX.value = x
      // The wipe front becomes the line: the incoming strip ends exactly there.
      inLeft.value = sides.secondSide === "right" ? x : 0
      inRight.value = sides.secondSide === "right" ? width : x
      commitModel({ ...current, cmp: { a: sides.sideA, b: sides.sideB } })
      clearIncomingAfter(SETTLE_MS + COVER_LOAD_MS)
    }
  })

  const swipePan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin(handleBegin)
        .onUpdate(handleUpdate)
        .onEnd(handleEnd),
    [handleBegin, handleUpdate, handleEnd],
  )

  const lineStartRef = useRef(0)
  const handleLineBegin = useLatestCallback(() => {
    lineStartRef.current = lineXRef.current
  })
  const handleLineUpdate = useLatestCallback((event: PanEvent) => {
    const x = clampLine(lineStartRef.current + (event.translationX ?? 0), width)
    lineXRef.current = x
    lineX.value = x
  })
  const handleLineEnd = useLatestCallback(() => {
    const current = modelRef.current
    if (!current.cmp) return
    const keeps = edgeExitKeeps(lineXRef.current, width)
    if (keeps === null) return
    // Dragged to an edge: the comparison ends and the layer that is still visible stays.
    lineXRef.current = width
    lineX.value = width
    commitModel({ ...current, base: keeps === "A" ? current.cmp.a : current.cmp.b, cmp: null })
  })
  const linePan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin(handleLineBegin)
        .onUpdate(handleLineUpdate)
        .onEnd(handleLineEnd),
    [handleLineBegin, handleLineUpdate, handleLineEnd],
  )

  const toggleSwipe = useCallback(() => {
    const current = modelRef.current
    if (current.swipeOn) {
      gestureRef.current = null
      clearTimers()
      showIncoming(null)
    }
    commitModel({ ...current, swipeOn: !current.swipeOn })
  }, [clearTimers, commitModel, showIncoming])

  const comparing = model.cmp !== null
  const mapCanvasProps = useMemo<SwipeSpike["mapCanvasProps"]>(
    () => ({
      frozen: model.swipeOn,
      onViewChange,
      rotationLocked: comparing,
      hideMarkers: comparing,
    }),
    [comparing, model.swipeOn, onViewChange],
  )

  if (!enabled) return OFF

  const coverA = model.cmp ? model.cmp.a : model.base
  const coverB = model.cmp ? model.cmp.b : null
  const stackRegion = lastRegionRef.current ?? initialRegion
  const overlay = (
    <View pointerEvents="box-none" style={styles.overlay} testID="spike-overlay">
      <SpikeStacks
        width={width}
        region={stackRegion}
        underlay={underlay}
        coverA={coverA}
        coverB={coverB}
        incoming={incoming}
        shared={{ zero, widthShared, lineX, inLeft, inRight }}
        syncs={{ coverA: coverASync, coverB: coverBSync, incoming: incomingSync }}
      />
      {model.swipeOn ? (
        <GestureDetector gesture={swipePan}>
          <View testID="spike-swipe-surface" style={styles.surface} />
        </GestureDetector>
      ) : null}
      {comparing ? <LineHandle lineX={lineX} gesture={linePan} /> : null}
    </View>
  )
  return { active: true, toggleSwipe, mapCanvasProps, overlay }
}

const styles = StyleSheet.create({
  overlay: StyleSheet.absoluteFill,
  surface: StyleSheet.absoluteFill,
})
