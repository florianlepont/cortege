import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { useWindowDimensions, type NativeSyntheticEvent } from "react-native"
import { useSharedValue, type SharedValue } from "react-native-reanimated"
import type { CameraRef, ViewStateChangeEvent } from "@maplibre/maplibre-react-native"
import type { MapRegion } from "../../app/map-viewport"
import { fr } from "../../i18n"
import { neighbourLayer, skippedCount } from "../../map/layer-cycle"
import { immersiveTarget } from "../../map/wipe-geometry"
import type { BaseLayerKey } from "../../map/layers"
import { useLatestCallback } from "../../state/useLatestCallback"
import { feedback } from "../../ui/feedback"
import { useScreenFocus } from "../../ui/useScreenFocus"
import type { MapCanvasProps, SwipeCanvasKey } from "./MapCanvas"
import { useMapSync, useViewTracker } from "./MapStack"
import { COMPARISON_BUILT, LEFT_MAP_ANDROID_VIEW, WIPE_PRESENTATION } from "./map-stack-mode"
import { useBasemapSwipe, type BasemapSwipe } from "./useBasemapSwipe"
import { useCurtainClip, type CurtainPhase } from "./useCurtainClip"
import type { ExplorerLayers } from "./useExplorerLayers"
import { useCoverRelease } from "./useCoverRelease"
import { immersiveApplies, useImmersive } from "./useImmersive"
import { useSideStep } from "./useSideStep"
import type { MapLayers } from "./useMapLayersState"

// The swipe mode and the comparison of the Explorer (Phase 28, UI-SPEC sections 3 and 4): one
// lifecycle hook above the controller (`useBasemapSwipe`, which owns every zone, hint and zone
// haptic), the curtain clip (`useCurtainClip`) and the stacked maps. It plays only the haptics of
// the UI-SPEC "other actions" row, calls only the `layers.actions` signatures of the layers state,
// and decides which stacked maps are mounted, with which layer and strip.
//
// The swipe mode and the comparison never coexist (CONTEXT item 13 d): the map is free in a
// comparison and the line is decorative. The side tags change a side (`useSideStep`): a wipe inside
// that side's half, drawn by a third map stacked over it until the other map has loaded its style.

/** A stacked map that covers a style swap is dropped after this long even if no event is reported. */
const COVER_MAX_MS = 8000

/** A stacked map kept over a style swap of the Explorer map: after a committed wipe, or a comparison kept. */
type Cover = { kind: "full" | "keep"; layer: BaseLayerKey }

type Wipe = NonNullable<BasemapSwipe["wipe"]>
export type StackedMapView = {
  layer: BaseLayerKey
  clipLeft: SharedValue<number>
  clipRight: SharedValue<number>
  cameraRef: RefObject<CameraRef | null>
}

/** Everything `ExplorerSwipeLayers` needs, so the screen holds one element for the whole feature. */
export type ExplorerSwipeView = {
  width: number
  height: number
  initialRegion: MapRegion
  /** The second map: the wipe's incoming layer, the curtain's second side, or a cover. */
  second: StackedMapView | null
  /** The third map: the layer entering a side of the comparison by its tag, then its cover. */
  third: StackedMapView | null
  swipeMode: boolean
  comparing: boolean
  /** The controller's outputs for the gesture surface and the top stack, passed as they are. */
  controller: Pick<
    BasemapSwipe,
    | "gesture"
    | "hintText"
    | "fingerDown"
    | "indicatorLayer"
    | "introHintVisible"
    | "compareAvailable"
    | "next"
    | "previous"
    | "compareNext"
    | "done"
  >
  /** The line's x (UI-thread value shared by the handle and the tags). */
  lineX: SharedValue<number>
  /** The layers on each side of the line, null without a comparison. */
  leftLayer: BaseLayerKey | null
  rightLayer: BaseLayerKey | null
  /** The grabber entered an edge exit zone (which layer a release keeps) or left it (null). */
  onExitZone: (keeps: "A" | "B" | null) => void
  /** The hint under the quit pill while the grabber is in an exit zone, else null. */
  quitHint: string | null
  onEdgeExit: (keeps: "A" | "B") => void
  /** The grabber is being dragged: the side tags take no touch meanwhile. */
  lineDragging: boolean
  onLineDragging: (dragging: boolean) => void
  /** Another layer exists for that side: false dims and disables its tag. */
  canStep: (side: "left" | "right") => boolean
  /** A tag asked for the next (1) or the previous (-1) layer of its side. */
  onStep: (side: "left" | "right", direction: 1 | -1) => void
}

/** The immersive effect of the swipe mode (UI-SPEC section 3c), for the window and the buttons. */
export type ExplorerImmersive = {
  /** The window's progress: 0 full size, 1 receded. */
  window: SharedValue<number>
  /** The map buttons' opacity: 1 shown, 0 faded out. */
  buttons: SharedValue<number>
  /** The window transform applies on this platform (`immersiveApplies()`). */
  applied: boolean
  /** Where the receded window ends: its scale and vertical shift in points (`immersiveTarget`). */
  target: { scaleX: number; scaleY: number; shiftY: number }
  /** The map buttons take no touch and are out of the accessibility tree: the swipe mode is on. */
  buttonsHidden: boolean
}

export type ExplorerSwipe = {
  /** Props to spread on `MapCanvas`. */
  mapCanvasProps: Pick<MapCanvasProps, SwipeCanvasKey>
  layersView: ExplorerSwipeView
  /** The receding window and the fading buttons: the swipe mode only, never the comparison. */
  immersive: ExplorerImmersive
  /** "Quitter la comparaison" shows: a comparison exists (the map is free in it). */
  quitPillVisible: boolean
  /** The "N fonds non téléchargés sont ignorés" pill (entry of the swipe mode). */
  skippedVisible: boolean
  /** The notices column's top, below the swipe stack or the quit pill when one holds the top. */
  noticesTop: number
  /** The Explorer map finished loading a style: a cover over it can go (after it rendered). */
  onBaseStyleLoaded: () => void
  /** A stacked map is ready and about to show: it aligns to the Explorer camera first. */
  onStackedReady: (map: "second" | "third") => void
  /** The second map is visible with its layer: a side change cover over it can go. */
  onSecondStyleLoaded: () => void
  /** The third map (a side change) is visible: the step may apply its side. */
  onThirdReady: () => void
  /** A panel (the bubble or the card) opened: the swipe mode ends, a comparison stays. */
  onPanelOpen: () => void
  /** The globe: closes the panels, then enters or leaves the swipe mode. */
  toggleSwipe: () => void
  /** "Quitter la comparaison": the line slides to the right edge, then side A stays. */
  quit: () => void
}

export type ExplorerSwipeInput = {
  /** What the Explorer derives from the layers state (state, availability, capsule, notices). */
  layers: ExplorerLayers
  /** The Explorer map's camera, reset to north up and flat when a stacked map needs the same view. */
  cameraRef: RefObject<CameraRef | null>
  region: MapRegion
  /** Closes the bubble and the download card (entering the swipe mode). */
  closePanels: () => void
  /** The receded window keeps this far from the top of the screen (safe area plus a margin). */
  windowTop: number
  /** The receded window keeps this far from the bottom: the tab bar and the info row. */
  windowBottom: number
}

/** The cover a finished wipe leaves behind, or null when it cancelled or changed nothing. */
function coverAfter(wipe: Wipe, layers: MapLayers): Cover | null {
  const committed = layers.state.compare === null && layers.state.loadingBase === wipe.incoming
  return committed ? { kind: "full", layer: wipe.incoming } : null
}

export function useExplorerSwipe({
  layers: explorerLayers,
  cameraRef,
  region,
  closePanels,
  windowTop,
  windowBottom,
}: ExplorerSwipeInput): ExplorerSwipe {
  // The stacked maps and the curtain cover the window: the map area is the whole screen.
  const { width, height } = useWindowDimensions()
  const { layers, isAvailable, noticesTop } = explorerLayers
  const { actions, state } = layers
  const swipeMode = state.swipeMode
  const compare = COMPARISON_BUILT ? state.compare : null
  const comparing = compare !== null

  // The effect belongs to the swipe mode only; the comparison is full size with every button.
  const immersive = useImmersive(swipeMode)
  const windowApplied = immersiveApplies()
  const target = useMemo(
    () => immersiveTarget(height, windowTop, windowBottom),
    [height, windowTop, windowBottom],
  )

  const controller = useBasemapSwipe({
    layers,
    width,
    isAvailable,
    skippedCount: skippedCount(isAvailable),
    windowProgress: immersive.window,
    windowApplied,
    windowScale: target.scaleX,
  })
  const { wipe } = controller

  const [cover, setCover] = useState<Cover | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [inExitZone, setInExitZone] = useState(false)
  const [lineDragging, setLineDragging] = useState(false)

  // A finished wipe may leave a cover, derived while rendering (never unmounted for a frame). A new
  // comparison drops every cover; the end of one drops the slide under way.
  const [seen, setSeen] = useState({ wipe, comparing })
  if (seen.wipe !== wipe || seen.comparing !== comparing) {
    setSeen({ wipe, comparing })
    if (seen.comparing !== comparing) {
      if (comparing) setCover(null)
      else setLeaving(false)
      // A comparison that ends, or starts, never keeps the hint of an exit zone or a drag.
      setInExitZone(false)
      setLineDragging(false)
    } else if (seen.wipe !== null && wipe === null) {
      const next = coverAfter(seen.wipe, layers)
      if (next) setCover(next)
    }
  }

  // The layer the second map draws: a wipe's, the curtain's, or a cover over the style swap of the
  // map under it (valid only while what it covers is still true).
  const fullWipeLayer =
    wipe !== null && WIPE_PRESENTATION === "wipe" && !comparing ? wipe.incoming : null
  // A full cover lives until `useCoverRelease` drops it: the state clearing `loadingBase` at the
  // style load must not uncover an Explorer map that has not rendered its tiles yet.
  const coversBase = (layer: BaseLayerKey) =>
    state.loadingBase === layer || layers.displayedBase === layer
  const fullCoverLayer =
    cover?.kind === "full" && !comparing && coversBase(cover.layer) ? cover.layer : null
  const keepLayer = cover?.kind === "keep" && !comparing ? cover.layer : null

  // The curtain: the line follows the state; the quit slide and the keep cover come from here.
  const handleLeft = useLatestCallback(() => {
    setLeaving(false)
    if (compare?.secondSide === "left") setCover({ kind: "keep", layer: compare.sideA })
    layers.actions.quitCompare("A")
  })
  const phase: CurtainPhase = leaving ? "leaving" : keepLayer !== null ? "covering" : "active"
  const curtain = useCurtainClip({ compare, width, phase, leaveTo: "right", onLeft: handleLeft })

  const sideStep = useSideStep({ layers, isAvailable, width })
  const secondSync = useMapSync()
  const thirdSync = useMapSync()
  const view = useViewTracker()
  // The swipe mode preloads the next layer in the second map (zero-width strip): no blank reveal.
  const preloadLayer =
    swipeMode && !comparing && WIPE_PRESENTATION === "wipe"
      ? neighbourLayer(layers.displayedBase, 1, { isAvailable })
      : null
  const secondLayer = comparing
    ? layers.secondMapLayer
    : (fullWipeLayer ?? fullCoverLayer ?? keepLayer ?? preloadLayer)
  // The wipe and its cover are cut by the controller's strip, the curtain by the line.
  const idleClip = useSharedValue(0)
  const secondStrip =
    comparing || keepLayer !== null
      ? curtain
      : (fullWipeLayer ?? fullCoverLayer)
        ? controller
        : { clipLeft: idleClip, clipRight: idleClip }
  const second: StackedMapView | null = secondLayer
    ? { layer: secondLayer, ...strip(secondStrip), cameraRef: secondSync.cameraRef }
    : null
  const { stepping } = sideStep
  const third: StackedMapView | null = stepping
    ? { ...stepping, cameraRef: thirdSync.cameraRef }
    : null
  const stacked = second !== null || third !== null

  const onViewChange = useCallback(
    (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      secondSync.syncFrom(event)
      thirdSync.syncFrom(event)
    },
    [secondSync, thirdSync],
  )

  // The stacked maps are north up and flat: the Explorer map too, when the swipe mode or a comparison starts.
  const regionRef = useRef(region)
  regionRef.current = region
  const northUp = useCallback(() => {
    const { latitude, longitude } = regionRef.current
    cameraRef.current?.jumpTo({ center: [longitude, latitude], bearing: 0, pitch: 0 })
  }, [cameraRef])
  useEffect(() => {
    if (swipeMode) northUp()
  }, [swipeMode, northUp])
  useEffect(() => {
    if (!comparing) return
    northUp()
  }, [comparing, northUp])

  // A cover goes when the map under it rendered (`useCoverRelease`), or after a while at most.
  useEffect(() => {
    if (cover === null) return undefined
    const timer = setTimeout(() => setCover(null), COVER_MAX_MS)
    return () => clearTimeout(timer)
  }, [cover])
  const coverRelease = useCoverRelease({
    covered: cover !== null,
    swipeMode,
    release: () => setCover(null),
  })
  const onRenderedFully = useLatestCallback(
    () => (coverRelease.onRenderedFully(), sideStep.onRendered()),
  )
  const onBaseStyleLoaded = useLatestCallback(() => {
    // A full cover waits for the committed style's own load, not one of another style in flight.
    if (cover?.kind !== "full" || state.loadingBase === cover.layer) coverRelease.onStyleLoaded()
    sideStep.onStyleLoaded("base")
  })
  const onStackedReady = useLatestCallback((map: "second" | "third") =>
    view.alignTo((map === "second" ? secondSync : thirdSync).cameraRef),
  )
  // Covers go (and the step applies its side) only once the map is visible, never at "ready".
  const onSecondStyleLoaded = useLatestCallback(() => sideStep.onStyleLoaded("second"))

  // Leaving the Explorer tab ends the swipe mode (a comparison stays).
  const focused = useScreenFocus()
  useEffect(() => {
    if (!focused) actions.exitSwipe()
  }, [focused, actions])
  const onPanelOpen = useLatestCallback(() => actions.exitSwipe())
  const toggleSwipe = useLatestCallback(() => {
    closePanels()
    actions.toggleSwipe()
  })

  // The actions of the curtain. The haptic is the UI-SPEC "other actions" tick, once each.
  const quit = useLatestCallback(() => {
    if (!compare) return
    feedback.selection()
    setLeaving(true)
  })
  const onExitZone = useLatestCallback((keeps: "A" | "B" | null) => setInExitZone(keeps !== null))
  const onEdgeExit = useLatestCallback((keeps: "A" | "B") => {
    if (!compare) return
    feedback.selection()
    const keepsSecond = (keeps === "A") === (compare.secondSide === "left")
    if (keepsSecond) {
      const layer = keeps === "A" ? compare.sideA : compare.sideB
      setCover({ kind: "keep", layer })
    }
    actions.quitCompare(keeps)
  })
  const quitPillVisible = comparing

  const mapCanvasProps = useMemo<ExplorerSwipe["mapCanvasProps"]>(
    () => ({
      frozen: swipeMode,
      onViewChange: stacked ? onViewChange : undefined,
      rotationLocked: comparing,
      hideMarkers: comparing,
      androidView: LEFT_MAP_ANDROID_VIEW,
      onRenderedFully,
      onViewSettled: view.track,
      bare: swipeMode,
    }),
    [comparing, onRenderedFully, view.track, onViewChange, stacked, swipeMode],
  )

  const layersView: ExplorerSwipeView = {
    width,
    height,
    initialRegion: region,
    second,
    third,
    swipeMode,
    comparing,
    controller,
    lineX: curtain.lineX,
    leftLayer: comparing ? layers.layerOfSide("left") : null,
    rightLayer: comparing ? layers.layerOfSide("right") : null,
    onExitZone,
    quitHint: comparing && inExitZone ? fr.mapLayers.compare.hintExit : null,
    onEdgeExit,
    lineDragging,
    onLineDragging: setLineDragging,
    canStep: sideStep.canStep,
    onStep: sideStep.step,
  }

  return {
    mapCanvasProps,
    layersView,
    immersive: {
      window: immersive.window,
      buttons: immersive.buttons,
      applied: windowApplied,
      target,
      buttonsHidden: swipeMode,
    },
    quitPillVisible,
    skippedVisible: controller.skippedVisible,
    noticesTop,
    onBaseStyleLoaded,
    onStackedReady,
    onSecondStyleLoaded,
    onThirdReady: sideStep.onThirdReady,
    onPanelOpen,
    toggleSwipe,
    quit,
  }
}

function strip(source: { clipLeft: SharedValue<number>; clipRight: SharedValue<number> }) {
  return { clipLeft: source.clipLeft, clipRight: source.clipRight }
}
