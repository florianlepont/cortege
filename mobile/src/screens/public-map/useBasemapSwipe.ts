import { useEffect, useMemo, useRef, useState } from "react"
import { AccessibilityInfo } from "react-native"
import { Gesture, type PanGesture } from "react-native-gesture-handler"
import {
  Easing,
  ReduceMotion,
  runOnJS,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { brandMotion } from "../../app/brand-tokens"
import { fr } from "../../i18n"
import { canCompare, neighbourLayer, type LayerAvailability } from "../../map/layer-cycle"
import type { BasemapKey } from "../../map/basemaps"
import type { BaseLayerKey } from "../../map/layers"
import {
  SETTLE_MS,
  beginGesture,
  compareSidesFor,
  moveGesture,
  releaseGesture,
  releaseHaptic,
  zoneHaptic,
  type HapticCue,
  type ReleaseResult,
  type SwipeZone,
  type WipeGesture,
} from "../../map/swipe-machine"
import {
  clampLine,
  settledStrip,
  sideBounds,
  windowX,
  wipeStrip,
  type SideKey,
  type Strip,
} from "../../map/wipe-geometry"
import { useLatestCallback } from "../../state/useLatestCallback"
import { feedback } from "../../ui/feedback"
import { COMPARISON_BUILT, WIPE_PRESENTATION } from "./map-stack-mode"
import { swipeLabel } from "./swipe-labels"
import { useSwipeModeTimers } from "./useSwipeModeTimers"
import type { MapLayers } from "./useMapLayersState"

// The controller of the basemap swipe mode (Phase 28, UI-SPEC section 3 and 4, CONTEXT items 3, 4
// and 11). The rules, the zones (thirds of the revealed fraction, with hysteresis) and the haptic
// cues all live in `map/swipe-machine.ts`; this hook only feeds the machine with the pan events,
// plays the cues it returns, animates the strip and applies the outcome to the layers state. It
// never compares the revealed fraction with a number.
//
// The swipe mode and the comparison never coexist (CONTEXT item 13 d): the swipe surface is not
// active in a comparison, so every gesture here is full width and a compare release starts the
// comparison, which ends the swipe mode in the layers state.
//
// Like the 28-01 spike driver, the pan handlers run on the JS thread (`runOnJS(true)`): the layer
// context is JS state and the strip reaches the stacked maps through shared values. The settle
// animation runs on the UI thread and hands the state change back with `runOnJS`.

const t = fr.mapLayers.basemap

/** The hint of each zone while the finger is down (the machine's own `liveHint` says nothing when cancelling). */
const ZONE_HINT: Record<SwipeZone, string> = {
  cancel: t.hintCancel,
  compare: t.hintRelease,
  commit: t.hintChange,
}

export type BasemapSwipeParams = {
  layers: MapLayers
  /** The saved basemap: the state already resolves the displayed base, so it is only accepted for the call sites. */
  savedBasemap?: BasemapKey
  /** The width of the map area in points. */
  width: number
  isAvailable: LayerAvailability
  /** How many layers of the cycle are skipped here (the entry notice). */
  skippedCount: number
  /** The receded window's progress from `useImmersive` (0 full size, 1 receded). */
  windowProgress?: SharedValue<number>
  /** `immersiveApplies()`: false keeps the window at full size, so touches are not mapped. */
  windowApplied?: boolean
  /** The scale the receded window ends at (`immersiveTarget`), 1 when it does not recede. */
  windowScale?: number
}

export type BasemapSwipe = {
  /** The pan gesture of the swipe surface. */
  gesture: PanGesture
  /** The incoming layer under the finger while a wipe is drawn, else null (never under Reduce Motion). */
  wipe: { side: SideKey; incoming: BaseLayerKey } | null
  /** The strip of the incoming layer, in points from the left edge of the map area. */
  clipLeft: SharedValue<number>
  clipRight: SharedValue<number>
  /** The zone the finger is in while it is down. */
  zone: SwipeZone | null
  /** The live hint of the zone; null while no finger is down or before the slop. */
  hintText: string | null
  fingerDown: boolean
  /** The incoming layer while a wipe is under way, else the displayed base. */
  indicatorLayer: BaseLayerKey
  introHintVisible: boolean
  skippedVisible: boolean
  /** The "Comparer avec le fond suivant" action exists (built and a next layer). */
  compareAvailable: boolean
  next: () => void
  previous: () => void
  compareNext: () => void
  done: () => void
}

type PanEvent = { x?: number; y?: number }
type Live = { zone: SwipeZone | null; blocked: boolean; incoming: BaseLayerKey | null }
type WipeState = BasemapSwipe["wipe"]

/** Plays a haptic cue of the machine: the detent is a medium impact, the tick a selection. */
export function playHapticCue(cue: HapticCue | null): void {
  if (cue === "detent") feedback.impact.medium()
  else if (cue === "tick") feedback.selection()
}

// The Jest Reanimated mock returns a new shared value on each render; keeping the first changes nothing for the real library.
function useStableShared(initial: number): SharedValue<number> {
  const created = useSharedValue(initial)
  const kept = useRef(created)
  return kept.current
}

/** Shallow equality of two flat state objects, so a move that changes nothing renders nothing. */
function same<T extends object>(a: T | null, b: T | null): boolean {
  if (a === null || b === null) return a === b
  return (Object.keys(a) as (keyof T)[]).every((key) => a[key] === b[key])
}

export function useBasemapSwipe({
  layers,
  width,
  isAvailable,
  skippedCount,
  windowProgress,
  windowApplied = false,
  windowScale = 1,
}: BasemapSwipeParams): BasemapSwipe {
  const reduced = useReducedMotion()
  const clipLeft = useStableShared(0)
  const clipRight = useStableShared(0)
  const [wipe, setWipe] = useState<WipeState>(null)
  const [live, setLive] = useState<Live | null>(null)
  const [fingerDown, setFingerDown] = useState(false)
  const gestureRef = useRef<WipeGesture | null>(null)
  const liveRef = useRef<Live | null>(null)
  const wipeRef = useRef<WipeState>(null)
  const pendingRef = useRef<(() => void) | null>(null)

  const swipeMode = layers.state.swipeMode
  const displayed = layers.displayedBase

  const publishLive = (next: Live | null) => {
    if (same(liveRef.current, next)) return
    liveRef.current = next
    setLive(next)
  }
  const publishWipe = (next: WipeState) => {
    if (same(wipeRef.current, next)) return
    wipeRef.current = next
    setWipe(next)
  }

  const announce = (text: string) => AccessibilityInfo.announceForAccessibility(text)
  const timers = useSwipeModeTimers({
    swipeMode,
    skippedCount,
    gestureActive: () => gestureRef.current !== null,
    exitSwipe: layers.actions.exitSwipe,
    onEnter: () => announce(t.announceEnter(swipeLabel(layers.layerOfSide("left")))),
    // Leaving (or never entered): nothing stays drawn, no gesture is followed.
    onLeave: () => {
      gestureRef.current = null
      pendingRef.current = null
      setFingerDown(false)
      publishLive(null)
      publishWipe(null)
    },
  })

  useEffect(
    () => () => {
      pendingRef.current = null
    },
    [],
  )
  // A comparison needs two layers available for the view (offline: fewer and it cannot open).
  const compareOk = COMPARISON_BUILT && canCompare(isAvailable)
  const moveContext = () => ({
    width,
    layerOf: () => displayed,
    isAvailable,
    comparisonAllowed: compareOk,
  })
  const isInstant = () => reduced || WIPE_PRESENTATION === "instant"
  // The gesture is measured on the receded window (UI-SPEC section 3): `windowX` with the scale
  // shown at that frame; a touch in the margin counts as the nearest edge. No window, no mapping.
  const toWindow = (x: number) => {
    if (!windowApplied || !windowProgress) return x
    return windowX(x, width, 1 - (1 - windowScale) * windowProgress.value)
  }

  // Applies a pending settle at once (a new touch must not find the old outcome half applied).
  const flushPending = () => pendingRef.current?.()

  // Animates the strip to `strip`, then applies the outcome and takes the wipe down.
  const settle = (strip: Strip, apply: () => void) => {
    const run = () => {
      if (pendingRef.current !== run) return
      pendingRef.current = null
      apply()
      publishLive(null)
      publishWipe(null)
    }
    pendingRef.current = run
    const timing = {
      duration: SETTLE_MS,
      easing: Easing.bezier(...brandMotion.easings.standard),
      reduceMotion: ReduceMotion.System,
    }
    clipLeft.value = withTiming(strip.left, timing)
    clipRight.value = withTiming(strip.right, timing, () => {
      "worklet"
      runOnJS(run)()
    })
    setTimeout(run, SETTLE_MS + 120) // a completion that never came is applied anyway
  }

  const handleBegin = useLatestCallback((event: PanEvent) => {
    if (!layers.state.swipeMode) return
    flushPending()
    timers.clearIdle()
    timers.dismissIntro()
    setFingerDown(true)
    gestureRef.current = beginGesture({ x: toWindow(event.x ?? 0), y: event.y ?? 0 })
  })

  const handleUpdate = useLatestCallback((event: PanEvent) => {
    const gesture = gestureRef.current
    if (!gesture) return
    const next = moveGesture(
      gesture,
      { x: event.x === undefined ? gesture.fingerX : toWindow(event.x), y: event.y ?? gesture.y0 },
      moveContext(),
    )
    gestureRef.current = next
    if (next.zone !== null) playHapticCue(zoneHaptic(gesture.zone, next.zone))
    const wiping = next.started && next.incoming !== null
    publishLive(
      wiping || next.blocked
        ? { zone: next.zone, blocked: next.blocked, incoming: next.incoming }
        : null,
    )
    if (!wiping || isInstant()) return
    const strip = wipeStrip(sideBounds("full", 0, width), next.dx, next.fingerX)
    clipLeft.value = strip.left
    clipRight.value = strip.right
    publishWipe({ side: next.side, incoming: next.incoming as BaseLayerKey })
  })

  const applyRelease = (gesture: WipeGesture, result: ReleaseResult) => {
    const { incoming } = result
    const bounds = sideBounds("full", 0, width)
    const instant = isInstant()
    if (result.outcome === "tap") {
      layers.actions.exitSwipe()
      return
    }
    if (incoming === null) return
    if (result.outcome === "compare") {
      const { sideA, sideB } = compareSidesFor(gesture.dx, displayed, incoming)
      layers.actions.startCompare({ sideA, sideB, x: clampLine(result.releaseX, width) })
      announce(
        fr.mapLayers.compare.announceStart({
          left: swipeLabel(sideA).name,
          right: swipeLabel(sideB).name,
        }),
      )
      publishLive(null)
      publishWipe(null)
      return
    }
    if (result.outcome === "commit") {
      const apply = () => {
        layers.actions.commitBase(incoming)
        announce(t.announceChanged(swipeLabel(incoming)))
      }
      if (instant) {
        apply()
        publishLive(null)
        publishWipe(null)
      } else {
        settle(settledStrip(bounds, gesture.dx, "commit"), apply)
      }
      return
    }
    // cancel (or a started gesture the system took away): spring back, nothing changes.
    publishLive(null)
    if (instant) publishWipe(null)
    else settle(settledStrip(bounds, gesture.dx, "cancel"), () => undefined)
  }

  const finish = (success: boolean) => {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture) return
    const result: ReleaseResult =
      success || !gesture.started
        ? releaseGesture(gesture, compareOk)
        : {
            outcome: "cancel",
            incoming: gesture.incoming,
            side: gesture.side,
            releaseX: gesture.fingerX,
          }
    playHapticCue(releaseHaptic(result.outcome))
    applyRelease(gesture, result)
    timers.armIdle()
  }

  const handleEnd = useLatestCallback((_event: PanEvent, success?: boolean) => {
    finish(success !== false)
  })
  // A touch that never moved ends here (the pan did not activate); so does a cancelled gesture.
  const handleFinalize = useLatestCallback((_event: PanEvent, success?: boolean) => {
    setFingerDown(false)
    finish(success === true)
  })

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin(handleBegin)
        .onUpdate(handleUpdate)
        .onEnd(handleEnd)
        .onFinalize(handleFinalize),
    [handleBegin, handleUpdate, handleEnd, handleFinalize],
  )

  // The non-gesture path (UI-SPEC accessibility alternative): the same rules as a commit.
  const step = (dir: 1 | -1) => {
    const target = neighbourLayer(displayed, dir, { isAvailable })
    if (target === null) return
    playHapticCue("tick")
    layers.actions.commitBase(target)
    announce(t.announceChanged(swipeLabel(target)))
    timers.armIdle()
  }
  const next = useLatestCallback(() => step(1))
  const previous = useLatestCallback(() => step(-1))
  const compareTarget = compareOk ? neighbourLayer(displayed, 1, { isAvailable }) : null
  const compareNext = useLatestCallback(() => {
    if (compareTarget === null) return
    playHapticCue("detent")
    layers.actions.startCompare({
      sideA: displayed,
      sideB: compareTarget,
      x: clampLine(width / 2, width),
    })
    announce(
      fr.mapLayers.compare.announceStart({
        left: swipeLabel(displayed).name,
        right: swipeLabel(compareTarget).name,
      }),
    )
    timers.armIdle()
  })
  const done = useLatestCallback(() => layers.actions.exitSwipe())

  const hintText = !fingerDown || live === null ? null : liveHint(live)
  return {
    gesture,
    wipe,
    clipLeft,
    clipRight,
    zone: fingerDown ? (live?.zone ?? null) : null,
    hintText,
    fingerDown,
    indicatorLayer: live?.incoming ?? displayed,
    introHintVisible: timers.introHintVisible,
    skippedVisible: timers.skippedVisible,
    compareAvailable: compareTarget !== null,
    next,
    previous,
    compareNext,
    done,
  }
}

function liveHint(live: Live): string | null {
  if (live.blocked) return t.hintNoneAvailable
  return live.zone === null ? null : ZONE_HINT[live.zone]
}
